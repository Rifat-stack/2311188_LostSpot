// Who is logged in, shared with every page.
//
// When the app opens we ask the server "is my login cookie still good?" (restoreSession).
// Until the answer comes, `loading` is true and App shows a loading screen, so a logged-in
// user never sees the guest version of the page flash first.

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import * as auth from "./api/auth"
import { whenLoggedOut } from "./api/client"
import type { User } from "./types"

interface AuthState {
  user: User | null // null = nobody is logged in
  loading: boolean // true while we check the login cookie
  notice: string // why the user was logged out (shown on the login page)
  logIn: (email: string, password: string) => Promise<void>
  signUp: (name: string, email: string, password: string) => Promise<void>
  logOut: () => Promise<void>
  setUser: (user: User) => void // after the name changes
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState("")

  useEffect(() => {
    // If the server rejects us later (session ended, banned), forget the user
    whenLoggedOut((reason) => {
      setUser(null)
      setNotice(reason)
    })

    auth
      .restoreSession()
      .then((me) => setUser(me))
      .catch(() => setUser(null)) // e.g. the server could not be reached
      .finally(() => setLoading(false))
  }, [])

  async function logIn(email: string, password: string) {
    setUser(await auth.logIn(email, password))
    setNotice("")
  }

  async function signUp(name: string, email: string, password: string) {
    setUser(await auth.signUp(name, email, password))
    setNotice("")
  }

  async function logOut() {
    await auth.logOut()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, notice, logIn, signUp, logOut, setUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthState {
  const state = useContext(AuthContext)
  if (state === null) {
    throw new Error("useAuth() only works inside <AuthProvider>")
  }
  return state
}
