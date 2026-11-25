// Groups (/groups): the groups I own or belong to, and a form to make a new one.

import { useEffect, useState, type FormEvent } from "react"
import { Alert, Button, Form, Spinner } from "react-bootstrap"
import { Link } from "react-router"
import { createGroup, getMyGroups } from "../api/groups"
import Layout from "../components/Layout"
import type { Group } from "../types"

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[] | null>(null)
  const [error, setError] = useState("")
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [formError, setFormError] = useState("")

  useEffect(() => {
    getMyGroups()
      .then(setGroups)
      .catch((err) => setError(err.message))
  }, [])

  async function handleCreate(event: FormEvent) {
    event.preventDefault()
    setFormError("")
    try {
      const group = await createGroup(name, description)
      setGroups([...(groups ?? []), group])
      setName("")
      setDescription("")
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not create the group")
    }
  }

  return (
    <Layout>
      <div className="feed-header">
        <h2>My groups</h2>
        {groups && <span>{groups.length} group(s)</span>}
      </div>
      <p className="text-secondary">
        A group is a shared lost and found desk, for example for one building or club. The owner decides what each member may do.
      </p>

      {error && <Alert variant="danger">{error}</Alert>}
      {groups === null && !error && <Spinner animation="border" />}
      {groups?.length === 0 && (
        <div className="empty-feed">
          <p>You are not in any group yet. Make one below, or ask a group owner to add you.</p>
        </div>
      )}

      <div className="group-grid">
        {groups?.map((group) => (
          <Link key={group.id} to={`/groups/${group.id}`} className="group-card">
            <strong>{group.name}</strong>
            <span className="text-secondary small">
              Owner: {group.owner_name} · {group.member_count} member(s)
            </span>
            <span className="permission-list">
              {group.my_permissions.map((permission) => (
                <span key={permission} className="permission-pill">
                  {permission}
                </span>
              ))}
            </span>
          </Link>
        ))}
      </div>

      <Form className="panel mt-4" onSubmit={handleCreate}>
        <h2>Make a new group</h2>
        {formError && <Alert variant="danger">{formError}</Alert>}
        <Form.Group className="mb-3" controlId="group-name">
          <Form.Label>Name</Form.Label>
          <Form.Control
            required
            maxLength={80}
            placeholder="Library Lost & Found Desk"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Form.Group>
        <Form.Group className="mb-3" controlId="group-description">
          <Form.Label>Description</Form.Label>
          <Form.Control maxLength={300} placeholder="Optional" value={description} onChange={(e) => setDescription(e.target.value)} />
        </Form.Group>
        <Button type="submit" className="btn-main">
          Create group
        </Button>
      </Form>
    </Layout>
  )
}
