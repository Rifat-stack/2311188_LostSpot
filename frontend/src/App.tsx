// The app: shows whichever page matches the URL.
//
// While the login is being restored (see AuthContext) we show a loading screen,
// so a logged-in user never sees the guest version of a page flash first.
// RequireLogin and RequireAdmin guard the pages; the server checks the same rules again.

import { Spinner } from "react-bootstrap"
import { Route, Routes } from "react-router"
import { useAuth } from "./AuthContext"
import { RequireAdmin, RequireLogin } from "./components/Guards"
import Layout from "./components/Layout"
import AdminActivity from "./pages/admin/AdminActivity"
import AdminContent from "./pages/admin/AdminContent"
import AdminLayout from "./pages/admin/AdminLayout"
import AdminOverview from "./pages/admin/AdminOverview"
import AdminSecurity from "./pages/admin/AdminSecurity"
import AdminUserDetail from "./pages/admin/AdminUserDetail"
import AdminUsers from "./pages/admin/AdminUsers"
import GroupPage from "./pages/GroupPage"
import GroupsPage from "./pages/GroupsPage"
import HomePage from "./pages/HomePage"
import ItemPage from "./pages/ItemPage"
import LoginPage from "./pages/LoginPage"
import MyPostsPage from "./pages/MyPostsPage"
import ProfilePage from "./pages/ProfilePage"
import SignupPage from "./pages/SignupPage"

export default function App() {
  const { loading } = useAuth()

  if (loading) {
    return (
      <div className="loading-screen">
        <span className="brand-pin" />
        <Spinner animation="border" size="sm" />
      </div>
    )
  }

  return (
    <Routes>
      {/* Anyone */}
      <Route path="/" element={<HomePage />} />
      <Route path="/items/:id" element={<ItemPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />

      {/* Logged-in users */}
      <Route path="/profile" element={<RequireLogin><ProfilePage /></RequireLogin>} />
      <Route path="/my-posts" element={<RequireLogin><MyPostsPage /></RequireLogin>} />
      <Route path="/groups" element={<RequireLogin><GroupsPage /></RequireLogin>} />
      <Route path="/groups/:id" element={<RequireLogin><GroupPage /></RequireLogin>} />

      {/* Admins only */}
      <Route path="/admin" element={<RequireAdmin><AdminLayout /></RequireAdmin>}>
        <Route index element={<AdminOverview />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="users/:id" element={<AdminUserDetail />} />
        <Route path="content" element={<AdminContent />} />
        <Route path="activity" element={<AdminActivity />} />
        <Route path="security" element={<AdminSecurity />} />
      </Route>

      <Route path="*" element={<Layout><div className="empty-feed"><h2 className="h4">Page not found</h2></div></Layout>} />
    </Routes>
  )
}
