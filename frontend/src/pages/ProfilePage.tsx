// Profile page (/profile): change your name and password, see where you are logged in, log out.
// RequireLogin in App.tsx makes sure only logged-in users get here.

import { useEffect, useState, type FormEvent } from "react"
import { Alert, Button, Form, Spinner, Table } from "react-bootstrap"
import { useNavigate } from "react-router"
import { changeMyPassword, getMySessions, revokeMySession, updateMyName } from "../api/auth"
import { useAuth } from "../AuthContext"
import Layout from "../components/Layout"
import type { LoginSession } from "../types"
import { formatDateTime, passwordProblem } from "../utils"

export default function ProfilePage() {
  const { user, setUser, logOut } = useAuth()
  const navigate = useNavigate()

  const [name, setName] = useState(user?.name ?? "")
  const [nameMessage, setNameMessage] = useState("")
  const [nameError, setNameError] = useState("")

  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [repeatPassword, setRepeatPassword] = useState("")
  const [passwordMessage, setPasswordMessage] = useState("")
  const [passwordError, setPasswordError] = useState("")

  const [sessions, setSessions] = useState<LoginSession[] | null>(null)
  const [sessionsError, setSessionsError] = useState("")

  function loadSessions() {
    getMySessions()
      .then(setSessions)
      .catch((err) => setSessionsError(err.message))
  }

  useEffect(loadSessions, [])

  if (!user) return null // RequireLogin already handles this

  async function saveName(event: FormEvent) {
    event.preventDefault()
    setNameMessage("")
    setNameError("")
    try {
      const updated = await updateMyName(name)
      setUser(updated) // the sidebar shows the new name straight away
      setNameMessage("Your name has been saved.")
    } catch (err) {
      setNameError(err instanceof Error ? err.message : "Could not save your name")
    }
  }

  async function savePassword(event: FormEvent) {
    event.preventDefault()
    setPasswordMessage("")
    setPasswordError("")
    const problem = passwordProblem(newPassword)
    if (problem) return setPasswordError(problem)
    if (newPassword !== repeatPassword) return setPasswordError("The two new passwords are not the same")

    try {
      const answer = await changeMyPassword(currentPassword, newPassword)
      setCurrentPassword("")
      setNewPassword("")
      setRepeatPassword("")
      setPasswordMessage(answer.message)
      loadSessions() // the other sessions are gone now
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : "Could not change your password")
    }
  }

  async function endSession(session: LoginSession) {
    try {
      await revokeMySession(session.id)
      if (session.is_current) {
        await logOut()
        navigate("/login")
      } else {
        loadSessions()
      }
    } catch (err) {
      setSessionsError(err instanceof Error ? err.message : "Could not end the session")
    }
  }

  async function handleLogOut() {
    await logOut()
    navigate("/")
  }

  return (
    <Layout>
      <div className="profile-header">
        <span className="avatar">{user.name.charAt(0).toUpperCase()}</span>
        <div>
          <h1>{user.name}</h1>
          <p>
            {user.email} · <span className={`role-badge ${user.role}`}>{user.role}</span> · member since{" "}
            {new Date(user.created_at).toLocaleDateString()}
          </p>
        </div>
        <Button variant="outline-danger" className="ms-auto" onClick={handleLogOut}>
          Log out
        </Button>
      </div>

      <div className="profile-grid">
        <Form className="panel" onSubmit={saveName}>
          <h2>Your details</h2>
          {nameMessage && <Alert variant="success">{nameMessage}</Alert>}
          {nameError && <Alert variant="danger">{nameError}</Alert>}
          <Form.Group className="mb-3" controlId="profile-name">
            <Form.Label>Name</Form.Label>
            <Form.Control required maxLength={100} value={name} onChange={(e) => setName(e.target.value)} />
          </Form.Group>
          <Form.Group className="mb-4" controlId="profile-email">
            <Form.Label>Email</Form.Label>
            <Form.Control value={user.email} disabled />
            <Form.Text>Your email can't be changed.</Form.Text>
          </Form.Group>
          <Button type="submit" className="btn-main">
            Save name
          </Button>
        </Form>

        <Form className="panel" onSubmit={savePassword}>
          <h2>Change password</h2>
          {passwordMessage && <Alert variant="success">{passwordMessage}</Alert>}
          {passwordError && <Alert variant="danger">{passwordError}</Alert>}
          <Form.Group className="mb-3" controlId="current-password">
            <Form.Label>Current password</Form.Label>
            <Form.Control
              type="password"
              required
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </Form.Group>
          <Form.Group className="mb-3" controlId="new-password">
            <Form.Label>New password</Form.Label>
            <Form.Control
              type="password"
              required
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <Form.Text>At least 8 characters, with a letter and a number.</Form.Text>
          </Form.Group>
          <Form.Group className="mb-4" controlId="repeat-new-password">
            <Form.Label>Type the new password again</Form.Label>
            <Form.Control
              type="password"
              required
              autoComplete="new-password"
              value={repeatPassword}
              onChange={(e) => setRepeatPassword(e.target.value)}
            />
          </Form.Group>
          <Button type="submit" className="btn-main">
            Change password
          </Button>
        </Form>
      </div>

      <div className="panel mt-4">
        <h2>Where you are logged in</h2>
        {sessionsError && <Alert variant="danger">{sessionsError}</Alert>}
        {sessions === null ? (
          <Spinner animation="border" size="sm" />
        ) : (
          <Table responsive size="sm" className="mb-0 align-middle">
            <thead>
              <tr>
                <th>Browser</th>
                <th>IP address</th>
                <th>Logged in</th>
                <th>Last used</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {sessions.map((session) => (
                <tr key={session.id}>
                  <td>
                    {session.browser} {session.is_current && <span className="role-badge user">this browser</span>}
                  </td>
                  <td>{session.ip}</td>
                  <td>{formatDateTime(session.created_at)}</td>
                  <td>{formatDateTime(session.last_used_at)}</td>
                  <td className="text-end">
                    <Button size="sm" variant="outline-danger" onClick={() => endSession(session)}>
                      {session.is_current ? "Log out here" : "End session"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </div>
    </Layout>
  )
}
