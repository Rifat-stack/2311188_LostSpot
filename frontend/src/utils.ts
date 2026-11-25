// Small helpers used by more than one page.

import type { Item, ItemFormData } from "./types"

// Today's date as "YYYY-MM-DD" in the user's own time zone (used as the max date in the form)
export function todayString(): string {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")
  return `${now.getFullYear()}-${month}-${day}`
}

// An empty form for a new post
export function emptyForm(): ItemFormData {
  return {
    kind: "lost",
    item_name: "",
    description: "",
    location: "",
    date_happened: todayString(),
    contact: "",
    is_returned: false,
    group_id: null,
  }
}

// Fill the form with an existing item (for editing)
export function itemToForm(item: Item): ItemFormData {
  return {
    kind: item.kind,
    item_name: item.item_name,
    description: item.description ?? "",
    location: item.location,
    date_happened: item.date_happened,
    contact: item.contact ?? "",
    is_returned: item.is_returned,
    group_id: item.group_id,
  }
}

// "2026-11-06" -> "6 Nov 2026"
export function formatDate(dateText: string): string {
  const [year, month, day] = dateText.split("-").map(Number)
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

// The same password rule as the backend: at least 8 characters, a letter and a number.
// Gives back what is wrong, or "" when the password is fine.
export function passwordProblem(password: string): string {
  if (password.length < 8) return "The password needs at least 8 characters"
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    return "The password needs at least one letter and one number"
  }
  return ""
}

// "2026-11-25T18:26:43Z" -> "25 Nov 2026, 12:26 am" in the user's own time zone
export function formatDateTime(text: string | null): string {
  if (!text) return "-"
  return new Date(text).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
}

// Turn an action name from the activity log into words: "login_failed" -> "Login failed"
export function actionLabel(action: string): string {
  const words = action.replace(/_/g, " ")
  return words.charAt(0).toUpperCase() + words.slice(1)
}
