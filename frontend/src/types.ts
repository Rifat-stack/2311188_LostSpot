// The shape of the data the backend sends and receives.
// Each type matches a schema in the backend (the file is named next to it).

export type Kind = "lost" | "found"
export type Role = "user" | "admin"

// backend/app/users/schemas.py: UserResponse
export interface User {
  id: number
  name: string
  email: string
  role: Role
  created_at: string
}

// backend/app/items/schemas.py: ItemResponse
export interface Item {
  id: number
  kind: Kind
  item_name: string
  description: string | null
  location: string
  date_happened: string // "YYYY-MM-DD"
  contact: string | null
  is_returned: boolean
  owner_id: number | null
  owner_name: string | null
  group_id: number | null
  group_name: string | null
  assigned_to_id: number | null
  assigned_to_name: string | null
  allowed: string[] // what I may do with it: "update", "delete", "assign"
  created_at: string
  updated_at: string
}

// What the item form holds
export interface ItemFormData {
  kind: Kind
  item_name: string
  description: string
  location: string
  date_happened: string
  contact: string
  is_returned: boolean
  group_id: number | null // only used when posting a new item
}

// backend/app/users/schemas.py: SessionResponse
export interface LoginSession {
  id: number
  ip: string
  browser: string
  created_at: string
  last_used_at: string
  expires_at: string
  is_current: boolean
}

// backend/app/groups/schemas.py
export type GroupPermission = "create" | "update" | "assign" | "manage"

export interface Group {
  id: number
  name: string
  description: string | null
  owner_id: number
  owner_name: string
  member_count: number
  my_permissions: GroupPermission[]
  created_at: string
}

export interface Member {
  user_id: number
  name: string
  email: string
  is_owner: boolean
  can_create: boolean
  can_update: boolean
  can_assign: boolean
}

export interface GroupDetail extends Group {
  members: Member[]
}

// backend/app/admin: one page of a list
export interface Page<T> {
  items: T[]
  total: number
  page: number
  size: number
}

export interface AdminUser {
  id: number
  name: string
  email: string
  role: Role
  is_banned: boolean
  ban_reason: string | null
  banned_at: string | null
  failed_logins: number
  locked_until: string | null
  created_at: string
}

export interface ActivityEntry {
  id: number
  user_id: number | null
  user_name: string | null
  email: string | null
  action: string
  detail: string
  ip: string
  browser: string
  created_at: string
}

export interface AdminGroup {
  id: number
  name: string
  description: string | null
  owner_id: number
  owner_name: string
  member_count: number
  item_count: number
  created_at: string
}

export interface UserDetail {
  user: AdminUser
  items: Item[]
  groups: { id: number; name: string; is_owner: boolean }[]
  sessions: LoginSession[]
  activity: ActivityEntry[]
}

export interface BulkResult {
  done: number[]
  skipped: { id: number; reason: string }[]
}

export type Stats = Record<string, number>

export interface SecurityView {
  days: number
  by_ip: { ip: string; count: number; last_seen: string }[]
  by_account: { email: string | null; count: number; last_seen: string }[]
  locked_accounts: { id: number; email: string; locked_until: string }[]
}
