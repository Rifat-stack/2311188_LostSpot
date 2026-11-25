// The frame of every page: the sidebar on the left, the page on the right.
// A page can add its own buttons to the sidebar with the `sidebar` prop.

import type { ReactNode } from "react"
import Sidebar from "./Sidebar"

interface Props {
  sidebar?: ReactNode
  wide?: boolean // admin pages use the full width for their tables
  children: ReactNode
}

export default function Layout({ sidebar, wide, children }: Props) {
  return (
    <div className="layout">
      <Sidebar>{sidebar}</Sidebar>
      <main className={wide ? "content wide" : "content"}>{children}</main>
    </div>
  )
}
