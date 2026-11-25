// Sign up, log in, log out, and everything on the profile page.

import type { LoginSession, User } from "../types"
import { api, getErrorMessage, refreshSession, setAccessToken, type AuthAnswer } from "./client"

async function postForTokens(url: string, body: unknown): Promise<User> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  if (!response.ok) {
    throw new Error(await getErrorMessage(response))
  }
  const answer: AuthAnswer = await response.json()
  setAccessToken(answer.access_token) // the refresh token was put in the cookie by the server
  return answer.user
}

// POST /api/auth/register
export function signUp(name: string, email: string, password: string): Promise<User> {
  return postForTokens("/api/auth/register", { name, email, password })
}

// POST /api/auth/login
export function logIn(email: string, password: string): Promise<User> {
  return postForTokens("/api/auth/login", { email, password })
}

// When the page opens: is there still a login cookie? Then we get a new access token and the user.
export async function restoreSession(): Promise<User | null> {
  const answer = await refreshSession()
  return answer ? answer.user : null
}

// POST /api/auth/logout: the server ends the session and deletes the cookie
export async function logOut(): Promise<void> {
  try {
    await fetch("/api/auth/logout", { method: "POST" })
  } finally {
    setAccessToken(null)
  }
}

export function updateMyName(name: string): Promise<User> {
  return api("/api/users/me", { method: "PATCH", body: { name } })
}

export function changeMyPassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
  return api("/api/users/me/password", {
    method: "PUT",
    body: { current_password: currentPassword, new_password: newPassword },
  })
}

export function getMySessions(): Promise<LoginSession[]> {
  return api("/api/users/me/sessions")
}

export function revokeMySession(id: number): Promise<{ message: string }> {
  return api(`/api/users/me/sessions/${id}`, { method: "DELETE" })
}
