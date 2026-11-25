// A small pop-up that asks "are you sure?", and can also ask for a reason (for bans).

import { useState } from "react"
import { Button, Form, Modal } from "react-bootstrap"

interface Props {
  title: string
  message: string
  confirmText: string
  askReason?: boolean // show a "reason" box that must be filled in
  onConfirm: (reason: string) => void
  onCancel: () => void
}

export default function AskModal({ title, message, confirmText, askReason, onConfirm, onCancel }: Props) {
  const [reason, setReason] = useState("")

  return (
    <Modal show onHide={onCancel} centered>
      <Modal.Header closeButton>
        <Modal.Title className="h5">{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p>{message}</p>
        {askReason && (
          <Form.Group controlId="reason">
            <Form.Label>Reason</Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              maxLength={300}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="For example: posting spam"
              autoFocus
            />
          </Form.Group>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="light" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="danger" disabled={askReason && reason.trim() === ""} onClick={() => onConfirm(reason.trim())}>
          {confirmText}
        </Button>
      </Modal.Footer>
    </Modal>
  )
}
