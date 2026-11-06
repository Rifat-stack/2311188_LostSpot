// Every call to the backend lives in this file.
// Each function sends one HTTP request to /api/items and returns the JSON answer.

import type { Item, ItemFormData, Kind } from "../types"

const BASE_URL = "/api/items"

// Turn an error answer from FastAPI into a short message we can show on screen.
// FastAPI sends either {"detail": "some text"} or {"detail": [{loc: [...], msg: "..."}]}
async function getErrorMessage(response: Response): Promise<string> {
  try {
    const body = await response.json()
    if (typeof body.detail === "string") {
      return body.detail
    }
    if (Array.isArray(body.detail)) {
      return body.detail
        .map((problem: { loc: string[]; msg: string }) => {
          const field = problem.loc[problem.loc.length - 1]
          const message = problem.msg.replace("Value error, ", "")
          return `${field}: ${message}`
        })
        .join(", ")
    }
  } catch {
    // the answer was not JSON
  }
  return `Something went wrong (error ${response.status})`
}

// Send a request and return the JSON, or throw an error with a readable message
async function sendRequest(url: string, options: RequestInit = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json" },
  })
  if (!response.ok) {
    throw new Error(await getErrorMessage(response))
  }
  return response.json()
}

// The backend wants null instead of empty text for the optional fields
function toRequestBody(form: ItemFormData) {
  return JSON.stringify({
    ...form,
    description: form.description.trim() || null,
    contact: form.contact.trim() || null,
  })
}

// READ LIST: GET /api/items?kind=lost&search=key
export function getItems(kind: Kind | "all", search: string): Promise<Item[]> {
  const params = new URLSearchParams()
  if (kind !== "all") params.set("kind", kind)
  if (search.trim()) params.set("search", search.trim())
  const query = params.toString()
  return sendRequest(query ? `${BASE_URL}?${query}` : BASE_URL)
}

// READ ONE: GET /api/items/5
export function getItem(id: number): Promise<Item> {
  return sendRequest(`${BASE_URL}/${id}`)
}

// CREATE: POST /api/items
export function createItem(form: ItemFormData): Promise<Item> {
  return sendRequest(BASE_URL, { method: "POST", body: toRequestBody(form) })
}

// UPDATE: PUT /api/items/5
export function updateItem(id: number, form: ItemFormData): Promise<Item> {
  return sendRequest(`${BASE_URL}/${id}`, { method: "PUT", body: toRequestBody(form) })
}

// DELETE: DELETE /api/items/5
export function deleteItem(id: number): Promise<{ message: string }> {
  return sendRequest(`${BASE_URL}/${id}`, { method: "DELETE" })
}
