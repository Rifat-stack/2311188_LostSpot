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
