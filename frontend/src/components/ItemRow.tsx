// One row in the feed on the home page. Clicking it opens the item page.

import { Link } from "react-router"
import type { Item } from "../types"
import { formatDate } from "../utils"

export default function ItemRow({ item }: { item: Item }) {
  return (
    <Link to={`/items/${item.id}`} className={`item-row ${item.is_returned ? "is-returned" : ""}`}>
      {/* A coloured circle with the first letter of the item's name */}
      <span className={`item-letter ${item.kind}`}>{item.item_name.charAt(0).toUpperCase()}</span>

      <span className="item-main">
        <span className="item-name">{item.item_name}</span>
        <span className="item-place">📍 {item.location}</span>
      </span>

      <span className="item-side">
        <span className={`kind-tag ${item.kind}`}>{item.kind === "lost" ? "Lost" : "Found"}</span>
        <span className="item-date">{formatDate(item.date_happened)}</span>
        {item.is_returned && <span className="returned-tag">✓ Returned</span>}
      </span>
    </Link>
  )
}
