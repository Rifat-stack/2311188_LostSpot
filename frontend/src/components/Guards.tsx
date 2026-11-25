// Route guards: they wrap pages in App.tsx.
//
// These only decide what the browser SHOWS. The real protection is on the server,
// which checks the login and the role on every request.

import type { ReactNode } from "react"
import { Link, Navigate, useLocation } from "react-router"
import { useAuth } from "../AuthContext"
import Layout from "./Layout"

// Only for logged-in users. Guests go to the login page, and come back here afterwards.
export function RequireLogin({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const location = useLocation()
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  return children
}

// Only for admins. A logged-in normal user sees a "no access" message.
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const location = useLocation()
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  if (user.role !== "admin") {
    return (
      <Layout>
        <div className="empty-feed">
          <h2 className="h4">No access</h2>
          <p>This page is only for admins.</p>
          <Link to="/">Back to all posts</Link>
        </div>
      </Layout>
    )
  }
  return children
}
