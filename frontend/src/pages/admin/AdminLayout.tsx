// The frame of every admin page: the tabs at the top, and the chosen page below (<Outlet />).
// App.tsx wraps this in RequireAdmin, and the server checks the admin role on every /api/admin call.

import { NavLink, Outlet } from "react-router"
import Layout from "../../components/Layout"

const TABS = [
  { to: "/admin", label: "Overview", end: true },
  { to: "/admin/users", label: "Users" },
  { to: "/admin/content", label: "Content" },
  { to: "/admin/activity", label: "Activity log" },
  { to: "/admin/security", label: "Security" },
]

export default function AdminLayout() {
  return (
    <Layout wide>
      <h1 className="admin-title">Admin dashboard</h1>
      <nav className="admin-tabs">
        {TABS.map((tab) => (
          <NavLink key={tab.to} to={tab.to} end={tab.end}>
            {tab.label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </Layout>
  )
}
