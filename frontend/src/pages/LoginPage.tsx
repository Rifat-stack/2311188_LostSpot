// Log in page (/login)

import { useState, type FormEvent } from "react"
import { Alert, Button, Form } from "react-bootstrap"
import { Link, Navigate, useLocation, useNavigate } from "react-router"
import { useAuth } from "../AuthContext"
import Layout from "../components/Layout"

// Test accounts for the instructor (demo data only). Copy one into the form to log in.
// To change them, edit this list. The accounts must also exist (sign them up on the site).
const TEST_ACCOUNTS = [
  { role: "Admin", email: "admin1@lostspot-demo.com", password: "Admin12345" },
  { role: "Admin", email: "admin2@lostspot-demo.com", password: "Admin67890" },
  { role: "User", email: "owner@lostspot-demo.com", password: "User12345" },
  { role: "User", email: "poster@lostspot-demo.com", password: "User67890" },
]

export default function LoginPage() {
  const { user, logIn, notice } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  // The page the user wanted before being sent here (set by RequireLogin)
  const goBackTo: string = location.state?.from ?? "/"

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [sending, setSending] = useState(false)

  if (user && !sending) {
    return <Navigate to={goBackTo} replace /> // already logged in
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError("")
    setSending(true)
    try {
      await logIn(email, password)
      navigate(goBackTo, { replace: true })
    } catch (err) {
      // e.g. "Wrong email or password", "Too many wrong passwords...", "Your account has been banned: ..."
      setError(err instanceof Error ? err.message : "Could not log in")
      setSending(false)
    }
  }

  return (
    <Layout>
      <div className="auth-card">
        <div className="auth-side">
          <h1>Welcome back</h1>
          <p>Log in to post items, join groups and manage your account.</p>

          <div className="demo-logins">
            <p className="demo-title">Test accounts</p>
            {TEST_ACCOUNTS.map((account) => (
              <div key={account.email} className="demo-login">
                <strong>{account.role}</strong>
                <span>{account.email}</span>
                <span>{account.password}</span>
              </div>
            ))}
            <p className="demo-hint">Copy an email and password into the form.</p>
          </div>
        </div>

        <Form className="auth-form" onSubmit={handleSubmit}>
          <h2>Log in</h2>
          {notice && !error && <Alert variant="warning">{notice}</Alert>}
          {error && <Alert variant="danger">{error}</Alert>}

          <Form.Group className="mb-3" controlId="email">
            <Form.Label>Email</Form.Label>
            <Form.Control type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Form.Group>

          <Form.Group className="mb-4" controlId="password">
            <Form.Label>Password</Form.Label>
            <Form.Control
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Form.Group>

          <Button type="submit" className="btn-main w-100" size="lg" disabled={sending}>
            {sending ? "Logging in..." : "Log in"}
          </Button>

          <p className="auth-switch">
            No account yet? <Link to="/signup">Sign up</Link>
          </p>
        </Form>
      </div>
    </Layout>
  )
}
