// Home page: the sidebar with buttons and filters on the left, the feed of items on the right.

import { useEffect, useState, type FormEvent } from "react"
import { Alert, Form, Spinner } from "react-bootstrap"
import { createItem, getItems } from "../api/items"
import ItemFormDrawer from "../components/ItemFormDrawer"
import ItemRow from "../components/ItemRow"
import Sidebar from "../components/Sidebar"
import type { Item, ItemFormData, Kind } from "../types"
import { emptyForm } from "../utils"

// The three choices in the "Show" filter
const SHOW_OPTIONS: { value: Kind | "all"; label: string }[] = [
  { value: "all", label: "Everything" },
  { value: "lost", label: "Lost items" },
  { value: "found", label: "Found items" },
]

export default function HomePage() {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  // Filters
  const [kind, setKind] = useState<Kind | "all">("all")
  const [searchText, setSearchText] = useState("") // what is typed in the box
  const [search, setSearch] = useState("")         // what we actually searched for
  const [hideReturned, setHideReturned] = useState(false)

  // Which form is open: "lost", "found" or none (null)
  const [formKind, setFormKind] = useState<Kind | null>(null)

  // Load the items from the backend. Runs when the page opens and whenever a filter changes.
  useEffect(() => {
    setLoading(true)
    setError("")
    getItems(kind, search)
      .then((data) => setItems(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [kind, search])

  function handleSearch(event: FormEvent) {
    event.preventDefault()
    setSearch(searchText)
  }

  // Called by the form when the user clicks "Post it"
  async function handleCreate(form: ItemFormData) {
    const newItem = await createItem(form) // if this fails, the form shows the error
    setItems([newItem, ...items])          // put the new item at the top of the feed
    setFormKind(null)
    setSuccess(`"${newItem.item_name}" is now on LostSpot.`)
  }

  // "Hide returned" is done here in the browser; the other filters are done by the backend
  const visibleItems = hideReturned ? items.filter((item) => !item.is_returned) : items

  return (
    <div className="layout">
      <Sidebar>
        <button className="report-btn lost" onClick={() => setFormKind("lost")}>
          😟 I lost something
        </button>
        <button className="report-btn found" onClick={() => setFormKind("found")}>
          🙌 I found something
        </button>

        <p className="sidebar-label">Show</p>
        {SHOW_OPTIONS.map((option) => (
          <button
            key={option.value}
            className={`filter-btn ${kind === option.value ? "active" : ""}`}
            onClick={() => setKind(option.value)}
          >
            {option.label}
          </button>
        ))}

        <Form.Check
          id="hide-returned"
          type="switch"
          className="sidebar-switch"
          label="Hide returned items"
          checked={hideReturned}
          onChange={(e) => setHideReturned(e.target.checked)}
        />
      </Sidebar>

      <main className="content">
        <form className="search-box" onSubmit={handleSearch}>
          <span>🔍</span>
          <input
            placeholder="Search for a key, a bag, a place..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            aria-label="Search"
          />
          <button type="submit">Search</button>
        </form>

        {success && (
          <Alert variant="success" dismissible onClose={() => setSuccess("")}>
            {success}
          </Alert>
        )}
        {error && <Alert variant="danger">{error}</Alert>}

        <div className="feed-header">
          <h2>{search ? `Results for "${search}"` : "Latest posts"}</h2>
          <span>{visibleItems.length} item(s)</span>
        </div>

        {loading ? (
          <div className="text-center my-5">
            <Spinner animation="border" />
          </div>
        ) : visibleItems.length === 0 ? (
          <div className="empty-feed">
            <p className="empty-icon">🧐</p>
            <p>Nothing here yet. Lost or found something? Post it with the buttons on the left.</p>
          </div>
        ) : (
          <div className="feed">
            {visibleItems.map((item) => (
              <ItemRow key={item.id} item={item} />
            ))}
          </div>
        )}
      </main>

      {/* The slide-in form. It only exists while it is open, so it starts empty each time. */}
      {formKind && (
        <ItemFormDrawer
          show={true}
          title={formKind === "lost" ? "Report a lost item" : "Report a found item"}
          startValues={{ ...emptyForm(), kind: formKind }}
          isEditing={false}
          onClose={() => setFormKind(null)}
          onSave={handleCreate}
        />
      )}
    </div>
  )
}
