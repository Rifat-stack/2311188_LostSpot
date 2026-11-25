// Log in page (/login)

import { useEffect, useState, type FormEvent } from "react"
import { Alert, Button, Form } from "react-bootstrap"
import { Link, Navigate, useLocation, useNavigate } from "react-router"
import { getDemoLogins, type DemoLogin } from "../api/auth"
import { useAuth } from "../AuthContext"
import Layout from "../components/Layout"

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
  const [demoLogins, setDemoLogins] = useState<DemoLogin[]>([])

  // The test accounts for the instructor (only if they are set on the server)
  useEffect(() => {
    getDemoLogins().then(setDemoLogins)
  }, [])

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

          {demoLogins.length > 0 && (
            <div className="demo-logins">
              <p className="demo-title">Test accounts</p>
              {demoLogins.map((demo) => (
                <button
                  key={demo.email}
                  type="button"
                  className="demo-login"
                  onClick={() => {
                    setEmail(demo.email) // fill the form; the user still clicks "Log in"
                    setPassword(demo.password)
                  }}
                >
                  <strong>{demo.label}</strong>
                  <span>{demo.email}</span>
                  <span>{demo.password}</span>
                </button>
              ))}
              <p className="demo-hint">Click one to fill in the form.</p>
            </div>
          )}
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
