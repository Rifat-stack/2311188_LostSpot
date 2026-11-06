// The coloured panel on the left of every page.
// It always shows the logo and my name; each page puts its own buttons in the middle (children).

import type { ReactNode } from "react"
import { Link } from "react-router"

export default function Sidebar({ children }: { children: ReactNode }) {
  return (
    <aside className="sidebar">
      <Link to="/" className="brand">
        <span className="brand-pin">📍</span>
        <span>
          LostSpot
          <small>campus lost &amp; found</small>
        </span>
      </Link>

      <div className="sidebar-body">{children}</div>

      <p className="sidebar-footer">Made by Rifat Abdullah Khan · 2311188</p>
    </aside>
  )
}
