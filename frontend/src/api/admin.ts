// Every call to /api/admin. The server checks the admin role on each one.

import type { ActivityEntry, AdminGroup, AdminUser, BulkResult, Item, Page, Role, SecurityView, Stats, UserDetail } from "../types"
import { api, downloadFile, queryString } from "./client"

export type Filters = Record<string, string | number | null | undefined>

export const getStats = (): Promise<Stats> => api("/api/admin/stats")

export const getUsers = (filters: Filters): Promise<Page<AdminUser>> => api(`/api/admin/users${queryString(filters)}`)

export const getUserDetail = (id: number): Promise<UserDetail> => api(`/api/admin/users/${id}`)

export const banUser = (id: number, reason: string) => api(`/api/admin/users/${id}/ban`, { method: "POST", body: { reason } })

export const unbanUser = (id: number) => api(`/api/admin/users/${id}/unban`, { method: "POST" })

export const changeRole = (id: number, role: Role) => api(`/api/admin/users/${id}/role`, { method: "PUT", body: { role } })

export const revokeSessions = (id: number): Promise<{ message: string }> =>
  api(`/api/admin/users/${id}/revoke-sessions`, { method: "POST" })

export const bulkBan = (userIds: number[], reason: string): Promise<BulkResult> =>
  api("/api/admin/users/bulk-ban", { method: "POST", body: { user_ids: userIds, reason } })

export const bulkUnban = (userIds: number[]): Promise<BulkResult> =>
  api("/api/admin/users/bulk-unban", { method: "POST", body: { ids: userIds } })

export const getAllItems = (filters: Filters): Promise<Page<Item>> => api(`/api/admin/items${queryString(filters)}`)

export const deleteItems = (ids: number[]): Promise<BulkResult> => api("/api/admin/items/delete", { method: "POST", body: { ids } })

export const getAllGroups = (filters: Filters): Promise<Page<AdminGroup>> => api(`/api/admin/groups${queryString(filters)}`)

export const deleteGroups = (ids: number[]): Promise<BulkResult> => api("/api/admin/groups/delete", { method: "POST", body: { ids } })

export const getActivity = (filters: Filters): Promise<Page<ActivityEntry>> => api(`/api/admin/activity${queryString(filters)}`)

export const getSecurity = (days: number): Promise<SecurityView> => api(`/api/admin/security?days=${days}`)

// The export uses the same filters as the list on screen
export const exportCsv = (what: "users" | "items" | "activity", filters: Filters) =>
  downloadFile(`/api/admin/export/${what}.csv${queryString(filters)}`)
