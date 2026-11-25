// One user, for admins (/admin/users/7): their posts, groups, sessions and recent activity,
// and the actions: change role, ban / unban, end all sessions.

import { useEffect, useState } from "react"
import { Alert, Button, Form, Spinner, Table } from "react-bootstrap"
import { Link, useParams } from "react-router"
import { banUser, changeRole, getUserDetail, revokeSessions, unbanUser } from "../../api/admin"
import { useAuth } from "../../AuthContext"
import AskModal from "../../components/AskModal"
import type { Role, UserDetail } from "../../types"
import { actionLabel, formatDateTime } from "../../utils"

export default function AdminUserDetail() {
  const { id } = useParams()
  const userId = Number(id)
  const { user: me } = useAuth()

  const [detail, setDetail] = useState<UserDetail | null>(null)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [askBan, setAskBan] = useState(false)

  function load() {
    getUserDetail(userId)
      .then(setDetail)
      .catch((err) => setError(err.message))
  }

  useEffect(load, [userId])

  async function run(action: () => Promise<unknown>, done: string) {
    setError("")
    setMessage("")
    try {
      await action()
      setMessage(done)
      load()
    } catch (err) {
      // e.g. "Admins can't be banned" or "You can't change your own role" (403 from the server)
      setError(err instanceof Error ? err.message : "Could not do that")
    }
  }

  if (!detail) return error ? <Alert variant="danger">{error}</Alert> : <Spinner animation="border" />

  const { user } = detail
  const isMe = user.id === me?.id

  return (
    <>
      <Link to="/admin/users" className="d-inline-block mb-3">
        ← All users
      </Link>

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
        <div className="profile-header mb-3">
          <span className="avatar">{user.name.charAt(0).toUpperCase()}</span>
          <div>
            <h2 className="h4 mb-0">
              {user.name} <span className={`role-badge ${user.role}`}>{user.role}</span>
            </h2>
            <p className="mb-0">
              {user.email} · user #{user.id} · joined {formatDateTime(user.created_at)}
            </p>
            {user.is_banned && (
              <p className="status-banned mb-0">
                Banned {formatDateTime(user.banned_at)}: {user.ban_reason}
              </p>
            )}
          </div>
        </div>

        <div className="d-flex flex-wrap gap-2 align-items-center">
          <Form.Select
            style={{ width: "auto" }}
            value={user.role}
            disabled={isMe}
            onChange={(e) => run(() => changeRole(user.id, e.target.value as Role), "Role changed.")}
            aria-label="Role"
          >
            <option value="user">user</option>
            <option value="admin">admin</option>
          </Form.Select>
          {isMe && <span className="small text-secondary">You can't change your own role.</span>}

          {user.is_banned ? (
            <Button variant="outline-success" onClick={() => run(() => unbanUser(user.id), "User unbanned.")}>
              Unban
            </Button>
          ) : (
            <Button variant="outline-danger" onClick={() => setAskBan(true)}>
              Ban
            </Button>
          )}
          <Button variant="outline-dark" onClick={() => run(() => revokeSessions(user.id), "All sessions ended.")}>
            End all sessions
          </Button>
          <Link to={`/admin/activity?user_id=${user.id}`} className="ms-auto">
            All activity of this user
          </Link>
        </div>
      </div>

      <div className="profile-grid">
        <div className="panel">
          <h2>Posts ({detail.items.length})</h2>
          {detail.items.length === 0 ? (
            <p className="text-secondary">No posts.</p>
          ) : (
            <ul className="plain-list">
              {detail.items.map((item) => (
                <li key={item.id}>
                  <Link to={`/items/${item.id}`}>{item.item_name}</Link>{" "}
                  <span className={`kind-tag ${item.kind}`}>{item.kind}</span>
                  {item.group_name && <span className="text-secondary small"> · {item.group_name}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="panel">
          <h2>Groups ({detail.groups.length})</h2>
          {detail.groups.length === 0 ? (
            <p className="text-secondary">Not in any group.</p>
          ) : (
            <ul className="plain-list">
              {detail.groups.map((group) => (
                <li key={group.id}>
                  <Link to={`/groups/${group.id}`}>{group.name}</Link> {group.is_owner && <span className="role-badge admin">owner</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="panel mt-4">
        <h2>Active sessions ({detail.sessions.length})</h2>
        {detail.sessions.length === 0 ? (
          <p className="text-secondary mb-0">Not logged in anywhere.</p>
        ) : (
          <Table responsive size="sm" className="mb-0">
            <thead>
              <tr>
                <th>Browser</th>
                <th>IP</th>
                <th>Logged in</th>
                <th>Last used</th>
              </tr>
            </thead>
            <tbody>
              {detail.sessions.map((session) => (
                <tr key={session.id}>
                  <td>{session.browser}</td>
                  <td>{session.ip}</td>
                  <td>{formatDateTime(session.created_at)}</td>
                  <td>{formatDateTime(session.last_used_at)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </div>

      <div className="panel mt-4">
        <h2>Recent activity</h2>
        {detail.activity.length === 0 ? (
          <p className="text-secondary mb-0">Nothing yet.</p>
        ) : (
          <Table responsive size="sm" className="mb-0">
            <thead>
              <tr>
                <th>Time</th>
                <th>Action</th>
                <th>Detail</th>
                <th>IP</th>
              </tr>
            </thead>
            <tbody>
              {detail.activity.map((entry) => (
                <tr key={entry.id}>
                  <td>{formatDateTime(entry.created_at)}</td>
                  <td>{actionLabel(entry.action)}</td>
                  <td>{entry.detail}</td>
                  <td>{entry.ip}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </div>

      {askBan && (
        <AskModal
          title={`Ban ${user.name}?`}
          message="They are logged out at once and can't log in until you unban them."
          confirmText="Ban"
          askReason
          onCancel={() => setAskBan(false)}
          onConfirm={(reason) => {
            setAskBan(false)
            run(() => banUser(user.id, reason), "User banned.")
          }}
        />
      )}
    </>
  )
}
