// Every call to /api/groups.

import type { Group, GroupDetail } from "../types"
import { api } from "./client"

export interface MemberRights {
  can_create: boolean
  can_update: boolean
  can_assign: boolean
}

export function getMyGroups(): Promise<Group[]> {
  return api("/api/groups")
}

export function createGroup(name: string, description: string): Promise<Group> {
  return api("/api/groups", { method: "POST", body: { name, description: description.trim() || null } })
}

export function getGroup(id: number): Promise<GroupDetail> {
  return api(`/api/groups/${id}`)
}

export function renameGroup(id: number, name: string, description: string): Promise<GroupDetail> {
  return api(`/api/groups/${id}`, { method: "PATCH", body: { name, description: description.trim() || null } })
}

export function deleteGroup(id: number): Promise<{ message: string }> {
  return api(`/api/groups/${id}`, { method: "DELETE" })
}

export function addMember(groupId: number, email: string, rights: MemberRights): Promise<GroupDetail> {
  return api(`/api/groups/${groupId}/members`, { method: "POST", body: { email, ...rights } })
}

export function changeMember(groupId: number, userId: number, rights: MemberRights): Promise<GroupDetail> {
  return api(`/api/groups/${groupId}/members/${userId}`, { method: "PATCH", body: rights })
}

export function removeMember(groupId: number, userId: number): Promise<{ message: string }> {
  return api(`/api/groups/${groupId}/members/${userId}`, { method: "DELETE" })
}
