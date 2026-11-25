// The coloured panel on the left of every page.
// Top: the logo and the menu. The menu depends on the role, like the server's rules:
//   guests see "All posts", users also "My posts" and "Groups", admins also "Admin dashboard".
// Middle: the page's own buttons (children).  Bottom: who is logged in.

import type { ReactNode } from "react"
import { Link, NavLink } from "react-router"
import { useAuth } from "../AuthContext"

export default function Sidebar({ children }: { children?: ReactNode }) {
  const { user } = useAuth()

  return (
    <aside className="sidebar">
      <Link to="/" className="brand">
        <span className="brand-pin" />
        <span>
          LostSpot
          <small>campus lost &amp; found</small>
        </span>
      </Link>

      <nav className="menu">
        <NavLink to="/" end>
          All posts
        </NavLink>
        {user && <NavLink to="/my-posts">My posts</NavLink>}
        {user && <NavLink to="/groups">Groups</NavLink>}
        {user?.role === "admin" && <NavLink to="/admin">Admin dashboard</NavLink>}
      </nav>

      <div className="sidebar-body">{children}</div>

      <div className="sidebar-account">
        {user ? (
          <>
            <p className="signed-in">
              Signed in as
              <strong>{user.name}</strong>
              <span className={`role-badge ${user.role}`}>{user.role}</span>
            </p>
            <Link to="/profile" className="account-btn solid">
              My profile
            </Link>
          </>
        ) : (
          <div className="account-buttons">
            <Link to="/login" className="account-btn">
              Log in
            </Link>
            <Link to="/signup" className="account-btn solid">
              Sign up
            </Link>
          </div>
        )}
      </div>
    </aside>
  )
}
