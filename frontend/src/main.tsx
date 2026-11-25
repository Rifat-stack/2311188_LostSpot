// Starting point of the React app.

import "bootstrap/dist/css/bootstrap.min.css" // Bootstrap's styles
import "./index.css"                          // our own small extra styles

import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter } from "react-router"
import App from "./App"
import { AuthProvider } from "./AuthContext"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      {/* AuthProvider lets every page know who is logged in */}
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
