// My posts (/my-posts): only the items I posted. The server picks them using my login.

import { useEffect, useState } from "react"
import { Alert, Spinner } from "react-bootstrap"
import { getMyItems } from "../api/items"
import ItemRow from "../components/ItemRow"
import Layout from "../components/Layout"
import type { Item } from "../types"

export default function MyPostsPage() {
  const [items, setItems] = useState<Item[] | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    getMyItems()
      .then(setItems)
      .catch((err) => setError(err.message))
  }, [])

  return (
    <Layout>
      <div className="feed-header">
        <h2>My posts</h2>
        {items && <span>{items.length} item(s)</span>}
      </div>
      {error && <Alert variant="danger">{error}</Alert>}
      {items === null && !error && (
        <div className="text-center my-5">
          <Spinner animation="border" />
        </div>
      )}
      {items?.length === 0 && (
        <div className="empty-feed">
          <p>You haven't posted anything yet. Use "I lost something" or "I found something" on the home page.</p>
        </div>
      )}
      <div className="feed">
        {items?.map((item) => (
          <ItemRow key={item.id} item={item} />
        ))}
      </div>
    </Layout>
  )
}
