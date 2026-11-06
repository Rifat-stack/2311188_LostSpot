// The app: shows whichever page matches the URL.

import { Route, Routes } from "react-router"
import HomePage from "./pages/HomePage"
import ItemPage from "./pages/ItemPage"

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/items/:id" element={<ItemPage />} />
      <Route path="*" element={<p className="p-5">Page not found.</p>} />
    </Routes>
  )
}
