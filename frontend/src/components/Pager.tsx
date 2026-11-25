// "Previous / Page 2 of 5 / Next" under the admin tables.

import { Button } from "react-bootstrap"

interface Props {
  page: number
  size: number
  total: number
  onChange: (page: number) => void
}

export default function Pager({ page, size, total, onChange }: Props) {
  const lastPage = Math.max(1, Math.ceil(total / size))
  return (
    <div className="pager">
      <span>
        {total} result(s) · page {page} of {lastPage}
      </span>
      <Button size="sm" variant="outline-secondary" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        Previous
      </Button>
      <Button size="sm" variant="outline-secondary" disabled={page >= lastPage} onClick={() => onChange(page + 1)}>
        Next
      </Button>
    </div>
  )
}
