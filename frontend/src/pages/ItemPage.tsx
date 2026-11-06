// Item page (/items/5): shows one item, and lets you edit it, mark it returned or delete it.

import { useEffect, useState } from "react"
import { Alert, Button, Modal, Spinner } from "react-bootstrap"
import { Link, useNavigate, useParams } from "react-router"
import { deleteItem, getItem, updateItem } from "../api/items"
import ItemFormDrawer from "../components/ItemFormDrawer"
import Sidebar from "../components/Sidebar"
import type { Item, ItemFormData } from "../types"
import { formatDate, itemToForm } from "../utils"

export default function ItemPage() {
  const { id } = useParams() // the number in the URL, e.g. "5"
  const navigate = useNavigate()

  const [item, setItem] = useState<Item | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [showEdit, setShowEdit] = useState(false)
  const [showDelete, setShowDelete] = useState(false)

  // Load the item when the page opens
  useEffect(() => {
    getItem(Number(id))
      .then((data) => setItem(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [id])

  async function handleEdit(form: ItemFormData) {
    const updated = await updateItem(Number(id), form)
    setItem(updated)
    setShowEdit(false)
    setSuccess("Changes saved.")
  }

  // Flip "returned" on or off without opening the form
  async function toggleReturned() {
    if (!item) return
    try {
      const updated = await updateItem(item.id, { ...itemToForm(item), is_returned: !item.is_returned })
      setItem(updated)
      setSuccess(updated.is_returned ? "Great, marked as returned to its owner." : "Marked as not returned.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update the item")
    }
  }

  async function handleDelete() {
    try {
      await deleteItem(Number(id))
      navigate("/") // back to the feed
    } catch (err) {
      setShowDelete(false)
      setError(err instanceof Error ? err.message : "Could not delete the item")
    }
  }

  return (
    <div className="layout">
      <Sidebar>
        <Link to="/" className="filter-btn active text-decoration-none">
          ← Back to all posts
        </Link>
      </Sidebar>

      <main className="content">
        {success && (
          <Alert variant="success" dismissible onClose={() => setSuccess("")}>
            {success}
          </Alert>
        )}
        {error && <Alert variant="danger">{error}</Alert>}

        {loading && (
          <div className="text-center my-5">
            <Spinner animation="border" />
          </div>
        )}

        {!loading && !item && <p className="text-secondary">This item could not be found.</p>}

        {item && (
          <div className="detail-card">
            {/* Coloured side: LOST or FOUND in big letters */}
            <div className={`detail-side ${item.kind}`}>
              <span className="detail-kind">{item.kind === "lost" ? "LOST" : "FOUND"}</span>
              <span>{formatDate(item.date_happened)}</span>
              {item.is_returned && <span className="detail-returned">✓ Returned to owner</span>}
            </div>

            {/* Details */}
            <div className="detail-main">
              <h1>{item.item_name}</h1>
              <p className="detail-place">📍 {item.location}</p>
              <p>{item.description || <span className="text-secondary">No description given.</span>}</p>

              <dl className="detail-facts">
                <dt>Contact</dt>
                <dd>{item.contact || "Not given"}</dd>
                <dt>Status</dt>
                <dd>{item.is_returned ? "Back with its owner" : "Still waiting"}</dd>
                <dt>Posted</dt>
                <dd>{new Date(item.created_at).toLocaleString()}</dd>
                <dt>Last change</dt>
                <dd>{new Date(item.updated_at).toLocaleString()}</dd>
              </dl>

              <div className="detail-actions">
                <Button className="btn-main" onClick={toggleReturned}>
                  {item.is_returned ? "Undo returned" : "✓ Mark as returned"}
                </Button>
                <Button variant="outline-dark" onClick={() => setShowEdit(true)}>
                  Edit
                </Button>
                <Button variant="link" className="text-danger ms-auto" onClick={() => setShowDelete(true)}>
                  Delete post
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>

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

      {/* Ask before deleting */}
      <Modal show={showDelete} onHide={() => setShowDelete(false)} centered size="sm">
        <Modal.Body className="text-center p-4">
          <p className="fs-1 mb-2">🗑️</p>
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
    </div>
  )
}
