// Every call to /api/items.

import type { Item, ItemFormData, Kind } from "../types"
import { api, queryString } from "./client"

// The backend wants null instead of empty text for the optional fields
function toBody(form: ItemFormData) {
  return {
    ...form,
    description: form.description.trim() || null,
    contact: form.contact.trim() || null,
  }
}

// GET /api/items?kind=lost&search=key&group_id=3
export function getItems(kind: Kind | "all", search: string, groupId?: number): Promise<Item[]> {
  return api(`/api/items${queryString({ kind: kind === "all" ? null : kind, search, group_id: groupId })}`)
}

// GET /api/items/mine
export function getMyItems(): Promise<Item[]> {
  return api("/api/items/mine")
}

// GET /api/items/5
export function getItem(id: number): Promise<Item> {
  return api(`/api/items/${id}`)
}

// POST /api/items
export function createItem(form: ItemFormData): Promise<Item> {
  return api("/api/items", { method: "POST", body: toBody(form) })
}

// PUT /api/items/5 (the group can't be changed here)
export function updateItem(id: number, form: ItemFormData): Promise<Item> {
  const { group_id: _ignored, ...fields } = toBody(form)
  return api(`/api/items/${id}`, { method: "PUT", body: fields })
}

// DELETE /api/items/5
export function deleteItem(id: number): Promise<{ message: string }> {
  return api(`/api/items/${id}`, { method: "DELETE" })
}

// PUT /api/items/5/assign
export function assignItem(id: number, userId: number | null): Promise<Item> {
  return api(`/api/items/${id}/assign`, { method: "PUT", body: { user_id: userId } })
}
