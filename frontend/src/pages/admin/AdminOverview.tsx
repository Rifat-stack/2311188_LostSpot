// Admin overview (/admin): the numbers at a glance.

import { useEffect, useState } from "react"
import { Alert, Spinner } from "react-bootstrap"
import { getStats } from "../../api/admin"
import type { Stats } from "../../types"

// Which numbers to show, in which order, and what to call them
const CARDS: { key: string; label: string; warn?: boolean }[] = [
  { key: "users", label: "Users" },
  { key: "admins", label: "Admins" },
  { key: "banned_users", label: "Banned users", warn: true },
  { key: "new_users_7d", label: "New users (7 days)" },
  { key: "items", label: "Posts" },
  { key: "lost_items", label: "Lost" },
  { key: "found_items", label: "Found" },
  { key: "returned_items", label: "Returned" },
  { key: "new_items_7d", label: "New posts (7 days)" },
  { key: "groups", label: "Groups" },
  { key: "new_groups_7d", label: "New groups (7 days)" },
  { key: "failed_logins_24h", label: "Failed logins (24 h)", warn: true },
  { key: "active_sessions", label: "Active sessions" },
]

export default function AdminOverview() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    getStats()
      .then(setStats)
      .catch((err) => setError(err.message))
  }, [])

  if (error) return <Alert variant="danger">{error}</Alert>
  if (!stats) return <Spinner animation="border" />

  return (
    <div className="stat-grid">
      {CARDS.map((card) => (
        <div key={card.key} className={`stat-card ${card.warn && stats[card.key] > 0 ? "warn" : ""}`}>
          <span className="stat-number">{stats[card.key]}</span>
          <span className="stat-label">{card.label}</span>
        </div>
      ))}
    </div>
  )
}
