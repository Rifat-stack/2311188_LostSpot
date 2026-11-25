// Item page (/items/5): shows one item.
// The buttons depend on `item.allowed`, which the server works out with the same RBAC rules
// it uses to check the request. If someone forces a request anyway, the server answers 403.

import { useEffect, useState } from "react"
import { Alert, Button, Form, Modal, Spinner } from "react-bootstrap"
import { Link, useNavigate, useParams } from "react-router"
import { getGroup } from "../api/groups"
import { assignItem, deleteItem, getItem, updateItem } from "../api/items"
import ItemFormDrawer from "../components/ItemFormDrawer"
import Layout from "../components/Layout"
import type { Item, ItemFormData, Member } from "../types"
import { formatDate, itemToForm } from "../utils"

export default function ItemPage() {
  const { id } = useParams() // the number in the URL, e.g. "5"
  const navigate = useNavigate()

  const [item, setItem] = useState<Item | null>(null)
  const [members, setMembers] = useState<Member[]>([]) // for the "assign to" list
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [showEdit, setShowEdit] = useState(false)
  const [showDelete, setShowDelete] = useState(false)

  useEffect(() => {
    getItem(Number(id))
      .then((data) => {
        setItem(data)
        // Only people who may assign need the member list
        if (data.group_id && data.allowed.includes("assign")) {
          getGroup(data.group_id)
            .then((group) => setMembers(group.members))
            .catch(() => setMembers([]))
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [id])

  const can = (action: string) => item?.allowed.includes(action) ?? false

  async function handleEdit(form: ItemFormData) {
    const updated = await updateItem(Number(id), form)
    setItem(updated)
    setShowEdit(false)
    setSuccess("Changes saved.")
  }

  async function toggleReturned() {
    if (!item) return
    try {
      const updated = await updateItem(item.id, { ...itemToForm(item), is_returned: !item.is_returned })
      setItem(updated)
      setSuccess(updated.is_returned ? "Marked as returned to its owner." : "Marked as not returned.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update the item")
    }
  }

  async function handleAssign(value: string) {
    if (!item) return
    try {
      const updated = await assignItem(item.id, value ? Number(value) : null)
      setItem(updated)
      setSuccess(updated.assigned_to_name ? `Assigned to ${updated.assigned_to_name}.` : "Nobody is assigned now.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not assign the item")
    }
  }

  async function handleDelete() {
    try {
      await deleteItem(Number(id))
      navigate("/")
    } catch (err) {
      setShowDelete(false)
      setError(err instanceof Error ? err.message : "Could not delete the item")
    }
  }

  return (
    <Layout
      sidebar={
        <Link to="/" className="filter-btn text-decoration-none">
          ← Back to all posts
        </Link>
      }
    >
      {success && (
        <Alert variant="success" dismissible onClose={() => setSuccess("")}>
          {success}
        </Alert>
      )}
      {error && (
        <Alert variant="danger" dismissible onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      {loading && (
        <div className="text-center my-5">
          <Spinner animation="border" />
        </div>
      )}

      {!loading && !item && <p className="text-secondary">This item could not be found.</p>}

      {item && (
        <div className="detail-card">
          <div className={`detail-side ${item.kind}`}>
            <span className="detail-kind">{item.kind === "lost" ? "LOST" : "FOUND"}</span>
            <span>{formatDate(item.date_happened)}</span>
            {item.is_returned && <span className="detail-returned">Returned to owner</span>}
          </div>

          <div className="detail-main">
            <h1>{item.item_name}</h1>
            <p className="detail-place">{item.location}</p>
            <p>{item.description || <span className="text-secondary">No description given.</span>}</p>

            <dl className="detail-facts">
              <dt>Posted by</dt>
              <dd>{item.owner_name ?? "Before accounts existed"}</dd>
              {item.group_id && (
                <>
                  <dt>Group</dt>
                  <dd>
                    <Link to={`/groups/${item.group_id}`}>{item.group_name}</Link>
                  </dd>
                  <dt>Handled by</dt>
                  <dd>{item.assigned_to_name ?? "Nobody yet"}</dd>
                </>
              )}
              <dt>Contact</dt>
              <dd>{item.contact || "Not given"}</dd>
              <dt>Status</dt>
              <dd>{item.is_returned ? "Back with its owner" : "Still waiting"}</dd>
              <dt>Posted</dt>
              <dd>{new Date(item.created_at).toLocaleString()}</dd>
            </dl>

            {can("assign") && (
              <Form.Group className="mb-3 assign-box" controlId="assign">
                <Form.Label>Assign to a group member</Form.Label>
                <Form.Select value={item.assigned_to_id ?? ""} onChange={(e) => handleAssign(e.target.value)}>
                  <option value="">Nobody</option>
                  {members.map((member) => (
                    <option key={member.user_id} value={member.user_id}>
                      {member.name}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            )}

            {(can("update") || can("delete")) && (
              <div className="detail-actions">
                {can("update") && (
                  <>
                    <Button className="btn-main" onClick={toggleReturned}>
                      {item.is_returned ? "Undo returned" : "Mark as returned"}
                    </Button>
                    <Button variant="outline-dark" onClick={() => setShowEdit(true)}>
                      Edit
                    </Button>
                  </>
                )}
                {can("delete") && (
                  <Button variant="link" className="text-danger ms-auto" onClick={() => setShowDelete(true)}>
                    Delete post
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {item && showEdit && (
        <ItemFormDrawer
          show={true}
          title="Edit this post"
          startValues={itemToForm(item)}
          isEditing={true}
          onClose={() => setShowEdit(false)}
          onSave={handleEdit}
        />
      )}

      <Modal show={showDelete} onHide={() => setShowDelete(false)} centered size="sm">
        <Modal.Body className="text-center p-4">
          <p className="fw-semibold mb-1">Delete "{item?.item_name}"?</p>
          <p className="text-secondary small">This can't be undone.</p>
          <div className="d-flex gap-2 justify-content-center">
            <Button variant="light" onClick={() => setShowDelete(false)}>
              Keep it
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              Delete
            </Button>
          </div>
        </Modal.Body>
      </Modal>
    </Layout>
  )
}
