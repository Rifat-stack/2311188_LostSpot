// Activity log (/admin/activity): every login, failed login, ban, delete, export and so on,
// with who did it, their IP address and browser, and when. Filters, search, export.

import { useEffect, useState, type FormEvent } from "react"
import { Alert, Button, Form, Spinner, Table } from "react-bootstrap"
import { Link, useSearchParams } from "react-router"
import { exportCsv, getActivity } from "../../api/admin"
import Pager from "../../components/Pager"
import type { ActivityEntry, Page } from "../../types"
import { actionLabel, formatDateTime } from "../../utils"

// The same action names as backend/app/activity/service.py
const ACTIONS = [
  "signup",
  "login",
  "login_failed",
  "logout",
  "profile_update",
  "password_change",
  "password_change_failed",
  "session_revoke",
  "role_change",
  "ban",
  "unban",
  "item_delete",
  "group_delete",
  "export",
]

export default function AdminActivity() {
  const [params, setParams] = useSearchParams()
  const userId = params.get("user_id") // set by the "All activity of this user" link

  const [searchText, setSearchText] = useState("")
  const [search, setSearch] = useState("")
  const [action, setAction] = useState("")
  const [page, setPage] = useState(1)
  const [data, setData] = useState<Page<ActivityEntry> | null>(null)
  const [error, setError] = useState("")

  const filters = { search, action, user_id: userId }

  useEffect(() => {
    getActivity({ ...filters, page, size: 15 })
      .then(setData)
      .catch((err) => setError(err.message))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, action, userId, page])

  function applySearch(event: FormEvent) {
    event.preventDefault()
    setPage(1)
    setSearch(searchText)
  }

  return (
    <>
      <div className="admin-toolbar">
        <Form className="d-flex gap-2 flex-wrap" onSubmit={applySearch}>
          <Form.Control placeholder="Search email, IP, browser, detail" value={searchText} onChange={(e) => setSearchText(e.target.value)} />
          <Form.Select value={action} onChange={(e) => { setPage(1); setAction(e.target.value) }} aria-label="Action">
            <option value="">All actions</option>
            {ACTIONS.map((name) => (
              <option key={name} value={name}>
                {actionLabel(name)}
              </option>
            ))}
          </Form.Select>
          <Button type="submit" className="btn-main">
            Search
          </Button>
        </Form>
        <Button variant="outline-dark" onClick={() => exportCsv("activity", filters).catch((err) => setError(err.message))}>
          Export CSV
        </Button>
      </div>

      {userId && (
        <Alert variant="light" className="border">
          Showing only user #{userId}. <Link to="/admin/activity" onClick={() => setParams({})}>Show everyone</Link>
        </Alert>
      )}
      {error && <Alert variant="danger">{error}</Alert>}

      {!data ? (
        <Spinner animation="border" />
      ) : data.items.length === 0 ? (
        <div className="empty-feed">Nothing matches these filters.</div>
      ) : (
        <div className="panel p-0">
          <Table responsive hover size="sm" className="mb-0 align-middle admin-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Action</th>
                <th>User</th>
                <th>Detail</th>
                <th>IP address</th>
                <th>Browser</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((entry) => (
                <tr key={entry.id}>
                  <td className="text-nowrap">{formatDateTime(entry.created_at)}</td>
                  <td>
                    <span className={`action-tag ${entry.action}`}>{actionLabel(entry.action)}</span>
                  </td>
                  <td>
                    {entry.user_id ? <Link to={`/admin/users/${entry.user_id}`}>{entry.user_name ?? entry.email}</Link> : entry.email}
                  </td>
                  <td>{entry.detail}</td>
                  <td>{entry.ip}</td>
                  <td>{entry.browser}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      )}
      {data && <Pager page={data.page} size={data.size} total={data.total} onChange={setPage} />}
    </>
  )
}
