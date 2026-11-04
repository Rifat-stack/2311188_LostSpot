// TypeScript shapes that mirror the backend schemas.
export type ItemType = "lost" | "found"

export type Item = {
  id: string
  type: ItemType
  title: string
  description: string | null
  location: string
  event_date: string
  contact: string | null
  is_resolved: boolean
  created_at: string
  updated_at: string
}

// Matches ItemPage on the backend; total counts every item, not just this page.
export type ItemPage = {
  items: Item[]
  total: number
  offset: number
  limit: number
}

// Matches ItemCreate on the backend.
export type ItemInput = {
  type: ItemType
  title: string
  description: string | null
  location: string
  event_date: string
  contact: string | null
}

// Matches ItemUpdate on the backend: only the fields sent are changed.
export type ItemPatch = Partial<ItemInput & { is_resolved: boolean }>
