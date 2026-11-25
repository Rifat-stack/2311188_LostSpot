// Sign up page (/signup)

import { useState, type FormEvent } from "react"
import { Alert, Button, Form } from "react-bootstrap"
import { Link, Navigate, useNavigate } from "react-router"
import { useAuth } from "../AuthContext"
import Layout from "../components/Layout"
import { passwordProblem } from "../utils"

export default function SignupPage() {
  const { user, signUp } = useAuth()
  const navigate = useNavigate()

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [repeatPassword, setRepeatPassword] = useState("")
  const [error, setError] = useState("")
  const [sending, setSending] = useState(false)

  if (user && !sending) {
    return <Navigate to="/" replace />
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError("")

    // Check the password here first, so the user gets a quick answer (the server checks again)
    const problem = passwordProblem(password)
    if (problem) {
      setError(problem)
      return
    }
    if (password !== repeatPassword) {
      setError("The two passwords are not the same")
      return
    }

    setSending(true)
    try {
      await signUp(name, email, password) // you are logged in straight after signing up
      navigate("/")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the account")
      setSending(false)
    }
  }

  return (
    <Layout>
      <div className="auth-card">
        <div className="auth-side">
          <h1>Join LostSpot</h1>
          <p>Make an account to post what you lost or found, and to work together in groups.</p>
        </div>

        <Form className="auth-form" onSubmit={handleSubmit}>
          <h2>Sign up</h2>
          {error && <Alert variant="danger">{error}</Alert>}

          <Form.Group className="mb-3" controlId="name">
            <Form.Label>Your name</Form.Label>
            <Form.Control required maxLength={100} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
          </Form.Group>

          <Form.Group className="mb-3" controlId="email">
            <Form.Label>Email</Form.Label>
            <Form.Control type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Form.Group>

          <Form.Group className="mb-3" controlId="password">
            <Form.Label>Password</Form.Label>
            <Form.Control
              type="password"
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Form.Text>At least 8 characters, with a letter and a number.</Form.Text>
          </Form.Group>

          <Form.Group className="mb-4" controlId="repeat-password">
            <Form.Label>Type the password again</Form.Label>
            <Form.Control
              type="password"
              required
              autoComplete="new-password"
              value={repeatPassword}
              onChange={(e) => setRepeatPassword(e.target.value)}
            />
          </Form.Group>

          <Button type="submit" className="btn-main w-100" size="lg" disabled={sending}>
            {sending ? "Creating your account..." : "Create account"}
          </Button>

          <p className="auth-switch">
            Already have an account? <Link to="/login">Log in</Link>
          </p>
        </Form>
      </div>
    </Layout>
  )
}
