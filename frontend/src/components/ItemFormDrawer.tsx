// A panel that slides in from the right with the item form.
// Used for both "I lost / I found something" (create) and "Edit" (update).

import { useState, type FormEvent } from "react"
import { Alert, Button, Form, Offcanvas } from "react-bootstrap"
import type { ItemFormData } from "../types"
import { todayString } from "../utils"

interface Props {
  show: boolean
  title: string
  startValues: ItemFormData
  isEditing: boolean
  onClose: () => void
  onSave: (form: ItemFormData) => Promise<void>
}

export default function ItemFormDrawer({ show, title, startValues, isEditing, onClose, onSave }: Props) {
  const [form, setForm] = useState<ItemFormData>(startValues)
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  // Update one field of the form when the user types
  function updateField(field: keyof ItemFormData, value: string | boolean) {
    setForm({ ...form, [field]: value })
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault() // stop the browser from reloading the page
    setError("")
    setSaving(true)
    try {
      await onSave(form)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the item")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Offcanvas show={show} onHide={onClose} placement="end" className="form-drawer">
      <Offcanvas.Header closeButton>
        <Offcanvas.Title>{title}</Offcanvas.Title>
      </Offcanvas.Header>

      <Offcanvas.Body>
        <Form onSubmit={handleSubmit}>
          {error && <Alert variant="danger">{error}</Alert>}

          {/* Two big choices instead of a dropdown */}
          <div className="kind-choice mb-4">
            <button
              type="button"
              className={`kind-option lost ${form.kind === "lost" ? "selected" : ""}`}
              onClick={() => updateField("kind", "lost")}
            >
              😟 I lost it
            </button>
            <button
              type="button"
              className={`kind-option found ${form.kind === "found" ? "selected" : ""}`}
              onClick={() => updateField("kind", "found")}
            >
              🙌 I found it
            </button>
          </div>

          <Form.Group className="mb-3" controlId="item_name">
            <Form.Label>What is it?</Form.Label>
            <Form.Control
              required
              maxLength={100}
              placeholder="Black car key"
              value={form.item_name}
              onChange={(e) => updateField("item_name", e.target.value)}
            />
          </Form.Group>

          <Form.Group className="mb-3" controlId="location">
            <Form.Label>Where?</Form.Label>
            <Form.Control
              required
              maxLength={150}
              placeholder="CSE Building, Floor 2, near Lab 1"
              value={form.location}
              onChange={(e) => updateField("location", e.target.value)}
            />
          </Form.Group>

          <Form.Group className="mb-3" controlId="date_happened">
            <Form.Label>{form.kind === "lost" ? "When did you lose it?" : "When did you find it?"}</Form.Label>
            <Form.Control
              required
              type="date"
              max={todayString()}
              value={form.date_happened}
              onChange={(e) => updateField("date_happened", e.target.value)}
            />
          </Form.Group>

          <Form.Group className="mb-3" controlId="description">
            <Form.Label>Description</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              maxLength={500}
              placeholder="Colour, brand, anything that helps (optional)"
              value={form.description}
              onChange={(e) => updateField("description", e.target.value)}
            />
          </Form.Group>

          <Form.Group className="mb-4" controlId="contact">
            <Form.Label>How can people reach you?</Form.Label>
            <Form.Control
              maxLength={100}
              placeholder="Email or phone (optional)"
              value={form.contact}
              onChange={(e) => updateField("contact", e.target.value)}
            />
            <Form.Text>Everyone on LostSpot can see this.</Form.Text>
          </Form.Group>

          {isEditing && (
            <Form.Check
              id="is_returned"
              type="switch"
              className="mb-4"
              label="It has been returned to its owner"
              checked={form.is_returned}
              onChange={(e) => updateField("is_returned", e.target.checked)}
            />
          )}

          <div className="d-grid gap-2">
            <Button type="submit" className="btn-main" size="lg" disabled={saving}>
              {saving ? "Saving..." : isEditing ? "Save changes" : "Post it"}
            </Button>
            <Button variant="link" className="text-secondary" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </Form>
      </Offcanvas.Body>
    </Offcanvas>
  )
}
