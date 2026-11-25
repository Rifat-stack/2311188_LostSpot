// Admin users (/admin/users): search, filter, page through users, ban or unban many at once, export.

import { useEffect, useState, type FormEvent } from "react"
import { Alert, Button, Form, Spinner, Table } from "react-bootstrap"
import { Link } from "react-router"
import { bulkBan, bulkUnban, exportCsv, getUsers } from "../../api/admin"
import AskModal from "../../components/AskModal"
import Pager from "../../components/Pager"
import type { AdminUser, BulkResult, Page } from "../../types"
import { formatDateTime } from "../../utils"

export default function AdminUsers() {
  const [searchText, setSearchText] = useState("")
  const [search, setSearch] = useState("")
  const [role, setRole] = useState("")
  const [status, setStatus] = useState("")
  const [page, setPage] = useState(1)

  const [data, setData] = useState<Page<AdminUser> | null>(null)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [selected, setSelected] = useState<number[]>([])
  const [askBan, setAskBan] = useState(false)
  const [reload, setReload] = useState(0) // change it to load the list again

  const filters = { search, role, status }

  useEffect(() => {
    getUsers({ ...filters, page, size: 10 })
      .then((answer) => {
        setData(answer)
        setSelected([])
      })
      .catch((err) => setError(err.message))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, role, status, page, reload])

  function applySearch(event: FormEvent) {
    event.preventDefault()
    setPage(1)
    setSearch(searchText)
  }

  function toggle(id: number) {
    setSelected(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id])
  }

  function showResult(result: BulkResult, verb: string) {
    const skipped = result.skipped.map((s) => `#${s.id}: ${s.reason}`).join("; ")
    setMessage(`${result.done.length} user(s) ${verb}.` + (skipped ? ` Skipped ${skipped}` : ""))
    setReload(reload + 1)
  }

  async function handleBulk(action: "ban" | "unban", reason = "") {
    setAskBan(false)
    setError("")
    try {
      showResult(action === "ban" ? await bulkBan(selected, reason) : await bulkUnban(selected), action === "ban" ? "banned" : "unbanned")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not do that")
    }
  }

  async function handleExport() {
    try {
      await exportCsv("users", filters)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not export")
    }
  }

  return (
    <>
      <div className="admin-toolbar">
        <Form className="d-flex gap-2 flex-wrap" onSubmit={applySearch}>
          <Form.Control placeholder="Search name or email" value={searchText} onChange={(e) => setSearchText(e.target.value)} />
          <Form.Select value={role} onChange={(e) => {
              setPage(1)
              setRole(e.target.value)
            }} aria-label="Role">
            <option value="">All roles</option>
            <option value="user">Users</option>
            <option value="admin">Admins</option>
          </Form.Select>
          <Form.Select value={status} onChange={(e) => {
              setPage(1)
              setStatus(e.target.value)
            }} aria-label="Status">
            <option value="">Any status</option>
            <option value="active">Active</option>
            <option value="banned">Banned</option>
          </Form.Select>
          <Button type="submit" className="btn-main">
            Search
          </Button>
        </Form>
        <div className="d-flex gap-2 flex-wrap">
          <Button variant="outline-danger" disabled={selected.length === 0} onClick={() => setAskBan(true)}>
            Ban selected ({selected.length})
          </Button>
          <Button variant="outline-success" disabled={selected.length === 0} onClick={() => handleBulk("unban")}>
            Unban selected
          </Button>
          <Button variant="outline-dark" onClick={handleExport}>
            Export CSV
          </Button>
        </div>
      </div>

      {message && (
        <Alert variant="info" dismissible onClose={() => setMessage("")}>
          {message}
        </Alert>
      )}
      {error && (
        <Alert variant="danger" dismissible onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      {!data ? (
        <Spinner animation="border" />
      ) : data.items.length === 0 ? (
        <div className="empty-feed">No users match these filters.</div>
      ) : (
        <div className="panel p-0">
          <Table responsive hover className="mb-0 align-middle admin-table">
            <thead>
              <tr>
                <th />
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((user) => (
                <tr key={user.id}>
                  <td>
                    <Form.Check aria-label={`Select ${user.name}`} checked={selected.includes(user.id)} onChange={() => toggle(user.id)} />
                  </td>
                  <td>
                    <Link to={`/admin/users/${user.id}`}>{user.name}</Link>
                  </td>
                  <td>{user.email}</td>
                  <td>
                    <span className={`role-badge ${user.role}`}>{user.role}</span>
                  </td>
                  <td>
                    {user.is_banned ? (
                      <span className="status-banned" title={user.ban_reason ?? ""}>
                        Banned
                      </span>
                    ) : (
                      "Active"
                    )}
                  </td>
                  <td>{formatDateTime(user.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      )}
      {data && <Pager page={data.page} size={data.size} total={data.total} onChange={setPage} />}

      {askBan && (
        <AskModal
          title={`Ban ${selected.length} user(s)?`}
          message="They are logged out at once and can't log in again until you unban them. Admins are skipped."
          confirmText="Ban"
          askReason
          onCancel={() => setAskBan(false)}
          onConfirm={(reason) => handleBulk("ban", reason)}
        />
      )}
    </>
  )
}
