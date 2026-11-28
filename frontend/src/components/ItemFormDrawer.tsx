// A panel that slides in from the right with the item form.
// Used for both "I lost / I found something" (create) and "Edit" (update).

import { useState, type FormEvent } from "react"
import { Alert, Button, Form, Offcanvas } from "react-bootstrap"
import { findPlace, KIND_NAMES, PLACES, type PlaceKind } from "../floorPlan"
import type { Group, ItemFormData } from "../types"
import { todayString } from "../utils"
import FloorMap from "./FloorMap"

interface Props {
  show: boolean
  title: string
  startValues: ItemFormData
  isEditing: boolean
  onClose: () => void
  onSave: (form: ItemFormData) => Promise<void>
  groups?: Group[] // groups the user may post in (only when creating)
}

export default function ItemFormDrawer({ show, title, startValues, isEditing, onClose, onSave, groups = [] }: Props) {
  const [form, setForm] = useState<ItemFormData>(startValues)
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  // Update one field of the form when the user types
  function updateField(field: keyof ItemFormData, value: string | boolean | number | null) {
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
              I lost it
            </button>
            <button
              type="button"
              className={`kind-option found ${form.kind === "found" ? "selected" : ""}`}
              onClick={() => updateField("kind", "found")}
            >
              I found it
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

          {/* Where: only places on the 5th-floor map. Pick on the map or in the list; both stay in sync. */}
          <Form.Group className="mb-3" controlId="location">
            <Form.Label>Where on the 5th floor?</Form.Label>
            <Form.Select required value={findPlace(form.location) ? form.location : ""} onChange={(e) => updateField("location", e.target.value)}>
              <option value="">Pick a place on the map or here</option>
              {(Object.keys(KIND_NAMES) as PlaceKind[]).map((kind) => (
                <optgroup key={kind} label={KIND_NAMES[kind]}>
                  {PLACES.filter((place) => place.kind === kind).map((place) => (
                    <option key={place.name} value={place.name}>
                      {place.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </Form.Select>
            <FloorMap selected={form.location} onSelect={(name) => updateField("location", name)} />
            <Form.Text>
              {findPlace(form.location) ? (
                <>
                  Selected: <strong className="picked-place">{form.location}</strong>
                </>
              ) : (
                "Tap a room or area on the map. It turns green."
              )}
            </Form.Text>
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

          {/* Post it just for me, or into one of my groups */}
          {!isEditing && groups.length > 0 && (
            <Form.Group className="mb-4" controlId="group_id">
              <Form.Label>Post as</Form.Label>
              <Form.Select
                value={form.group_id ?? ""}
                onChange={(e) => updateField("group_id", e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">Just me (a personal post)</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    Group: {group.name}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          )}

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
