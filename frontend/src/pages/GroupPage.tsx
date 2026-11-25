// One group (/groups/3): its members with their permissions, and its posts.
//
// What you see depends on your permissions in this group (sent by the server as my_permissions):
//   manage  (owner only)  rename, delete, add and remove members, tick their permissions
//   create                "Post in this group"
//   update / assign       used on the item pages
// The server checks every one of these again when the request arrives.

import { useEffect, useState, type FormEvent } from "react"
import { Alert, Button, Form, Spinner, Table } from "react-bootstrap"
import { Link, useNavigate, useParams } from "react-router"
import { useAuth } from "../AuthContext"
import { addMember, changeMember, deleteGroup, getGroup, removeMember, renameGroup, type MemberRights } from "../api/groups"
import { createItem, getItems } from "../api/items"
import AskModal from "../components/AskModal"
import ItemFormDrawer from "../components/ItemFormDrawer"
import ItemRow from "../components/ItemRow"
import Layout from "../components/Layout"
import type { GroupDetail, Item, ItemFormData, Member } from "../types"
import { emptyForm } from "../utils"

const RIGHTS: { key: keyof MemberRights; label: string }[] = [
  { key: "can_create", label: "Create" },
  { key: "can_update", label: "Update" },
  { key: "can_assign", label: "Assign" },
]

export default function GroupPage() {
  const { id } = useParams()
  const groupId = Number(id)
  const { user } = useAuth()
  const navigate = useNavigate()

  const [group, setGroup] = useState<GroupDetail | null>(null)
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")

  const [editing, setEditing] = useState(false)
  const [newName, setNewName] = useState("")
  const [newDescription, setNewDescription] = useState("")
  const [askDelete, setAskDelete] = useState(false)
  const [showPostForm, setShowPostForm] = useState(false)

  const [email, setEmail] = useState("")
  const [rights, setRights] = useState<MemberRights>({ can_create: true, can_update: false, can_assign: false })

  useEffect(() => {
    Promise.all([getGroup(groupId), getItems("all", "", groupId)])
      .then(([groupData, groupItems]) => {
        setGroup(groupData)
        setItems(groupItems)
      })
      .catch((err) => setError(err.message)) // e.g. "You are not a member of this group" (403)
      .finally(() => setLoading(false))
  }, [groupId])

  const may = (permission: string) => group?.my_permissions.includes(permission as never) ?? false

  // Run an action, show its error if it fails
  async function run(action: () => Promise<void>, done: string) {
    setError("")
    setMessage("")
    try {
      await action()
      setMessage(done)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    }
  }

  function startEditing() {
    if (!group) return
    setNewName(group.name)
    setNewDescription(group.description ?? "")
    setEditing(true)
  }

  function saveName(event: FormEvent) {
    event.preventDefault()
    run(async () => {
      setGroup(await renameGroup(groupId, newName, newDescription))
      setEditing(false)
    }, "Group renamed.")
  }

  function handleAddMember(event: FormEvent) {
    event.preventDefault()
    run(async () => {
      setGroup(await addMember(groupId, email, rights))
      setEmail("")
    }, "Member added.")
  }

  function toggleRight(member: Member, key: keyof MemberRights) {
    const current: MemberRights = { can_create: member.can_create, can_update: member.can_update, can_assign: member.can_assign }
    run(async () => setGroup(await changeMember(groupId, member.user_id, { ...current, [key]: !current[key] })), `Permissions of ${member.name} saved.`)
  }

  function handleRemove(member: Member) {
    const leaving = member.user_id === user?.id
    run(async () => {
      await removeMember(groupId, member.user_id)
      if (leaving) navigate("/groups")
      else setGroup(await getGroup(groupId))
    }, `${member.name} removed.`)
  }

  async function handlePost(form: ItemFormData) {
    const item = await createItem({ ...form, group_id: groupId })
    setItems([item, ...items])
    setShowPostForm(false)
    setMessage(`"${item.item_name}" posted in the group.`)
  }

  if (loading) {
    return (
      <Layout>
        <Spinner animation="border" />
      </Layout>
    )
  }

  if (!group) {
    return (
      <Layout>
        <Alert variant="danger">{error || "This group could not be found."}</Alert>
        <Link to="/groups">Back to my groups</Link>
      </Layout>
    )
  }

  return (
    <Layout
      sidebar={
        <Link to="/groups" className="filter-btn text-decoration-none">
          ← Back to my groups
        </Link>
      }
    >
      {message && (
        <Alert variant="success" dismissible onClose={() => setMessage("")}>
          {message}
        </Alert>
      )}
      {error && (
        <Alert variant="danger" dismissible onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      <div className="panel mb-4">
        {editing ? (
          <Form onSubmit={saveName}>
            <Form.Control className="mb-2" required maxLength={80} value={newName} onChange={(e) => setNewName(e.target.value)} />
            <Form.Control className="mb-3" maxLength={300} value={newDescription} onChange={(e) => setNewDescription(e.target.value)} />
            <Button type="submit" className="btn-main me-2">
              Save
            </Button>
            <Button variant="light" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </Form>
        ) : (
          <div className="group-header">
            <div>
              <h1 className="h3 mb-1">{group.name}</h1>
              <p className="text-secondary mb-2">{group.description}</p>
              <p className="small mb-0">
                Owner: <strong>{group.owner_name}</strong> · You may:{" "}
                {group.my_permissions.length === 0 ? (
                  <span className="text-secondary">only look (admin view)</span>
                ) : (
                  group.my_permissions.map((permission) => (
                    <span key={permission} className="permission-pill">
                      {permission}
                    </span>
                  ))
                )}
              </p>
            </div>
            <div className="group-buttons">
              {may("create") && (
                <Button className="btn-main" onClick={() => setShowPostForm(true)}>
                  Post in this group
                </Button>
              )}
              {may("manage") && (
                <>
                  <Button variant="outline-dark" onClick={startEditing}>
                    Rename
                  </Button>
                  <Button variant="outline-danger" onClick={() => setAskDelete(true)}>
                    Delete group
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="panel mb-4">
        <h2>Members</h2>
        <Table responsive size="sm" className="align-middle">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              {RIGHTS.map((right) => (
                <th key={right.key} className="text-center">
                  {right.label}
                </th>
              ))}
              <th />
            </tr>
          </thead>
          <tbody>
            {group.members.map((member) => (
              <tr key={member.user_id}>
                <td>
                  {member.name} {member.is_owner && <span className="role-badge admin">owner</span>}
                </td>
                <td>{member.email}</td>
                {RIGHTS.map((right) => (
                  <td key={right.key} className="text-center">
                    <Form.Check
                      aria-label={`${right.label} for ${member.name}`}
                      checked={member[right.key]}
                      disabled={member.is_owner || !may("manage")}
                      onChange={() => toggleRight(member, right.key)}
                    />
                  </td>
                ))}
                <td className="text-end">
                  {!member.is_owner && (may("manage") || member.user_id === user?.id) && (
                    <Button size="sm" variant="outline-danger" onClick={() => handleRemove(member)}>
                      {member.user_id === user?.id ? "Leave" : "Remove"}
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>

        {may("manage") && (
          <Form className="add-member" onSubmit={handleAddMember}>
            <Form.Control
              type="email"
              required
              placeholder="Email of the person to add"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-label="Email of the new member"
            />
            {RIGHTS.map((right) => (
              <Form.Check
                key={right.key}
                id={`new-${right.key}`}
                label={right.label}
                checked={rights[right.key]}
                onChange={() => setRights({ ...rights, [right.key]: !rights[right.key] })}
              />
            ))}
            <Button type="submit" className="btn-main">
              Add member
            </Button>
          </Form>
        )}
      </div>

      <div className="feed-header">
        <h2>Posts in this group</h2>
        <span>{items.length} item(s)</span>
      </div>
      {items.length === 0 ? (
        <div className="empty-feed">
          <p>No posts in this group yet.</p>
        </div>
      ) : (
        <div className="feed">
          {items.map((item) => (
            <ItemRow key={item.id} item={item} />
          ))}
        </div>
      )}

      {showPostForm && (
        <ItemFormDrawer
          show={true}
          title={`Post in ${group.name}`}
          startValues={{ ...emptyForm(), kind: "found", group_id: groupId }}
          isEditing={false}
          onClose={() => setShowPostForm(false)}
          onSave={handlePost}
        />
      )}

      {askDelete && (
        <AskModal
          title="Delete this group?"
          message="The members are removed. The posts stay on LostSpot, but they are no longer in a group."
          confirmText="Delete group"
          onCancel={() => setAskDelete(false)}
          onConfirm={() =>
            run(async () => {
              await deleteGroup(groupId)
              navigate("/groups")
            }, "Group deleted.")
          }
        />
      )}
    </Layout>
  )
}
