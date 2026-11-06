// The shape of the data the backend sends and receives.
// These match backend/app/items/schemas.py

export type Kind = "lost" | "found"

// One item as it comes back from the API
export interface Item {
  id: number
  kind: Kind
  item_name: string
  description: string | null
  location: string
  date_happened: string // "YYYY-MM-DD"
  contact: string | null
  is_returned: boolean
  created_at: string
  updated_at: string
}

// What we send when creating or editing an item
export interface ItemFormData {
  kind: Kind
  item_name: string
  description: string
  location: string
  date_happened: string
  contact: string
  is_returned: boolean
}
