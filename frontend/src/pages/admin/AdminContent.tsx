// Content moderation (/admin/content): every post and every group, with filters,
// and deleting one or many at once.

import { useEffect, useState, type FormEvent } from "react"
import { Alert, Button, Form, Spinner, Table } from "react-bootstrap"
import { Link } from "react-router"
import { deleteGroups, deleteItems, exportCsv, getAllGroups, getAllItems } from "../../api/admin"
import AskModal from "../../components/AskModal"
import Pager from "../../components/Pager"
import type { AdminGroup, BulkResult, Item, Page } from "../../types"
import { formatDate, formatDateTime } from "../../utils"

export default function AdminContent() {
  const [tab, setTab] = useState<"items" | "groups">("items")
  return (
    <>
      <div className="admin-subtabs">
        <button className={tab === "items" ? "active" : ""} onClick={() => setTab("items")}>
          Posts
        </button>
        <button className={tab === "groups" ? "active" : ""} onClick={() => setTab("groups")}>
          Groups
        </button>
      </div>
      {tab === "items" ? <ItemsList /> : <GroupsList />}
    </>
  )
}

function resultText(result: BulkResult): string {
  const skipped = result.skipped.map((s) => `#${s.id}: ${s.reason}`).join("; ")
  return `${result.done.length} deleted.` + (skipped ? ` Skipped ${skipped}` : "")
}

function ItemsList() {
  const [searchText, setSearchText] = useState("")
  const [search, setSearch] = useState("")
  const [kind, setKind] = useState("")
  const [status, setStatus] = useState("")
  const [page, setPage] = useState(1)
  const [data, setData] = useState<Page<Item> | null>(null)
  const [selected, setSelected] = useState<number[]>([])
  const [askDelete, setAskDelete] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [reload, setReload] = useState(0)

  const filters = { search, kind, status }

  useEffect(() => {
    getAllItems({ ...filters, page, size: 10 })
      .then((answer) => {
        setData(answer)
        setSelected([])
      })
      .catch((err) => setError(err.message))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, kind, status, page, reload])

  function applySearch(event: FormEvent) {
    event.preventDefault()
    setPage(1)
    setSearch(searchText)
  }

  async function handleDelete() {
    setAskDelete(false)
    try {
      setMessage(resultText(await deleteItems(selected)))
      setReload(reload + 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete")
    }
  }

  return (
    <>
      <div className="admin-toolbar">
        <Form className="d-flex gap-2 flex-wrap" onSubmit={applySearch}>
          <Form.Control placeholder="Search posts" value={searchText} onChange={(e) => setSearchText(e.target.value)} />
          <Form.Select value={kind} onChange={(e) => { setPage(1); setKind(e.target.value) }} aria-label="Kind">
            <option value="">Lost and found</option>
            <option value="lost">Lost</option>
            <option value="found">Found</option>
          </Form.Select>
          <Form.Select value={status} onChange={(e) => { setPage(1); setStatus(e.target.value) }} aria-label="Status">
            <option value="">Any status</option>
            <option value="open">Open</option>
            <option value="returned">Returned</option>
          </Form.Select>
          <Button type="submit" className="btn-main">
            Search
          </Button>
        </Form>
        <div className="d-flex gap-2">
          <Button variant="outline-danger" disabled={selected.length === 0} onClick={() => setAskDelete(true)}>
            Delete selected ({selected.length})
          </Button>
          <Button variant="outline-dark" onClick={() => exportCsv("items", filters).catch((err) => setError(err.message))}>
            Export CSV
          </Button>
        </div>
      </div>

      {message && <Alert variant="info" dismissible onClose={() => setMessage("")}>{message}</Alert>}
      {error && <Alert variant="danger" dismissible onClose={() => setError("")}>{error}</Alert>}

      {!data ? (
        <Spinner animation="border" />
      ) : data.items.length === 0 ? (
        <div className="empty-feed">No posts match these filters.</div>
      ) : (
        <div className="panel p-0">
          <Table responsive hover className="mb-0 align-middle admin-table">
            <thead>
              <tr>
                <th>
                  <Form.Check
                    aria-label="Select all on this page"
                    checked={selected.length === data.items.length}
                    onChange={() => setSelected(selected.length === data.items.length ? [] : data.items.map((i) => i.id))}
                  />
                </th>
                <th>Post</th>
                <th>Kind</th>
                <th>Posted by</th>
                <th>Group</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <Form.Check
                      aria-label={`Select ${item.item_name}`}
                      checked={selected.includes(item.id)}
                      onChange={() =>
                        setSelected(selected.includes(item.id) ? selected.filter((x) => x !== item.id) : [...selected, item.id])
                      }
                    />
                  </td>
                  <td>
                    <Link to={`/items/${item.id}`}>{item.item_name}</Link>
                  </td>
                  <td>
                    <span className={`kind-tag ${item.kind}`}>{item.kind}</span>
                  </td>
                  <td>{item.owner_name ?? "-"}</td>
                  <td>{item.group_name ?? "-"}</td>
                  <td>{item.is_returned ? "Returned" : "Open"}</td>
                  <td>{formatDate(item.date_happened)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      )}
      {data && <Pager page={data.page} size={data.size} total={data.total} onChange={setPage} />}

      {askDelete && (
        <AskModal
          title={`Delete ${selected.length} post(s)?`}
          message="This can't be undone."
          confirmText="Delete"
          onCancel={() => setAskDelete(false)}
          onConfirm={handleDelete}
        />
      )}
    </>
  )
}

function GroupsList() {
  const [searchText, setSearchText] = useState("")
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [data, setData] = useState<Page<AdminGroup> | null>(null)
  const [selected, setSelected] = useState<number[]>([])
  const [askDelete, setAskDelete] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [reload, setReload] = useState(0)

  useEffect(() => {
    getAllGroups({ search, page, size: 10 })
      .then((answer) => {
        setData(answer)
        setSelected([])
      })
      .catch((err) => setError(err.message))
  }, [search, page, reload])

  async function handleDelete() {
    setAskDelete(false)
    try {
      setMessage(resultText(await deleteGroups(selected)))
      setReload(reload + 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete")
    }
  }

  return (
    <>
      <div className="admin-toolbar">
        <Form
          className="d-flex gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            setPage(1)
            setSearch(searchText)
          }}
        >
          <Form.Control placeholder="Search groups" value={searchText} onChange={(e) => setSearchText(e.target.value)} />
          <Button type="submit" className="btn-main">
            Search
          </Button>
        </Form>
        <Button variant="outline-danger" disabled={selected.length === 0} onClick={() => setAskDelete(true)}>
          Delete selected ({selected.length})
        </Button>
      </div>

      {message && <Alert variant="info" dismissible onClose={() => setMessage("")}>{message}</Alert>}
      {error && <Alert variant="danger" dismissible onClose={() => setError("")}>{error}</Alert>}

      {!data ? (
        <Spinner animation="border" />
      ) : data.items.length === 0 ? (
        <div className="empty-feed">No groups found.</div>
      ) : (
        <div className="panel p-0">
          <Table responsive hover className="mb-0 align-middle admin-table">
            <thead>
              <tr>
                <th />
                <th>Group</th>
                <th>Owner</th>
                <th>Members</th>
                <th>Posts</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((group) => (
                <tr key={group.id}>
                  <td>
                    <Form.Check
                      aria-label={`Select ${group.name}`}
                      checked={selected.includes(group.id)}
                      onChange={() =>
                        setSelected(selected.includes(group.id) ? selected.filter((x) => x !== group.id) : [...selected, group.id])
                      }
                    />
                  </td>
                  <td>
                    <Link to={`/groups/${group.id}`}>{group.name}</Link>
                  </td>
                  <td>{group.owner_name}</td>
                  <td>{group.member_count}</td>
                  <td>{group.item_count}</td>
                  <td>{formatDateTime(group.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      )}
      {data && <Pager page={data.page} size={data.size} total={data.total} onChange={setPage} />}

      {askDelete && (
        <AskModal
          title={`Delete ${selected.length} group(s)?`}
          message="The members are removed. The posts stay, but they are no longer in a group."
          confirmText="Delete"
          onCancel={() => setAskDelete(false)}
          onConfirm={handleDelete}
        />
      )}
    </>
  )
}
