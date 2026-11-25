// How the frontend talks to the backend when someone is logged in.
//
// The ACCESS token (15 minutes) is kept only in this file's memory, never in localStorage.
// The REFRESH token is in an httpOnly cookie: JavaScript can't read it at all, the browser
// simply sends it along when we call /api/auth/refresh.
//
// When a request answers 401 (the access token expired, or the session was ended),
// we ask /api/auth/refresh for a new access token ONCE and repeat the request.
// If that fails too, the user is logged out.

let accessToken: string | null = null

export function setAccessToken(token: string | null) {
  accessToken = token
}

// AuthContext tells us what to do when the session is over (show the login page)
let handleLoggedOut: (reason: string) => void = () => {}

export function whenLoggedOut(callback: (reason: string) => void) {
  handleLoggedOut = callback
}

// Turn an error answer from FastAPI into a short message we can show on screen.
// FastAPI sends either {"detail": "some text"} or {"detail": [{loc: [...], msg: "..."}]}
export async function getErrorMessage(response: Response): Promise<string> {
  try {
    const body = await response.json()
    if (typeof body.detail === "string") {
      return body.detail
    }
    if (Array.isArray(body.detail)) {
      return body.detail
        .map((problem: { loc: string[]; msg: string }) => {
          const field = problem.loc[problem.loc.length - 1]
          return `${field}: ${problem.msg.replace("Value error, ", "")}`
        })
        .join(", ")
    }
  } catch {
    // the answer was not JSON
  }
  return `Something went wrong (error ${response.status})`
}

// What register, login and refresh answer with
export interface AuthAnswer {
  access_token: string
  expires_in: number
  user: import("../types").User
}

// If several requests find an expired token at the same time, they share ONE refresh call,
// because the refresh token changes every time it is used.
let refreshInProgress: Promise<AuthAnswer | null> | null = null

export function refreshSession(): Promise<AuthAnswer | null> {
  if (refreshInProgress === null) {
    refreshInProgress = (async () => {
      const response = await fetch("/api/auth/refresh", { method: "POST" }) // the cookie goes along by itself
      // 204 = there is no login cookie (a guest), 401 = the cookie is no longer good
      if (response.status === 204 || !response.ok) {
        accessToken = null
        if (response.status === 403) {
          handleLoggedOut(await getErrorMessage(response)) // banned: show the reason on the login page
        }
        return null
      }
      const answer: AuthAnswer = await response.json()
      accessToken = answer.access_token
      return answer
    })().finally(() => {
      refreshInProgress = null
    })
  }
  return refreshInProgress
}

interface RequestOptions {
  method?: string
  body?: unknown
}

function send(url: string, options: RequestOptions): Promise<Response> {
  const headers: Record<string, string> = {}
  if (options.body !== undefined) headers["Content-Type"] = "application/json"
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`
  return fetch(url, {
    method: options.method ?? "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  })
}

// Send a request, refresh the token once if needed, and give back the Response
async function request(url: string, options: RequestOptions = {}): Promise<Response> {
  const hadToken = accessToken !== null
  let response = await send(url, options)

  if (response.status === 401 && hadToken) {
    const renewed = await refreshSession()
    if (renewed) {
      response = await send(url, options) // try again with the new token
    } else {
      handleLoggedOut("Your session has ended. Please log in again.")
    }
  }

  // A banned user is thrown out at once
  if (response.status === 403) {
    const message = await getErrorMessage(response.clone())
    if (message.startsWith("Your account has been banned")) {
      accessToken = null
      handleLoggedOut(message)
    }
  }
  return response
}

// Send a request and give back the JSON answer, or throw an Error with a readable message
export async function api<T>(url: string, options: RequestOptions = {}): Promise<T> {
  const response = await request(url, options)
  if (!response.ok) {
    throw new Error(await getErrorMessage(response))
  }
  return response.json()
}

// Download a file (the CSV exports need the access token, so a plain link would not work)
export async function downloadFile(url: string): Promise<void> {
  const response = await request(url)
  if (!response.ok) {
    throw new Error(await getErrorMessage(response))
  }
  const disposition = response.headers.get("Content-Disposition") ?? ""
  const filename = disposition.match(/filename="(.+)"/)?.[1] ?? "export.csv"

  const link = document.createElement("a")
  link.href = URL.createObjectURL(await response.blob())
  link.download = filename
  link.click()
  URL.revokeObjectURL(link.href)
}

// Build "?search=a&role=user" from a filter object, leaving out empty values
export function queryString(filters: Record<string, string | number | null | undefined>): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) {
    if (value !== null && value !== undefined && String(value).trim() !== "") {
      params.set(key, String(value).trim())
    }
  }
  const text = params.toString()
  return text ? `?${text}` : ""
}
