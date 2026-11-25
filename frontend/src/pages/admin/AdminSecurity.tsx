// Security view (/admin/security): failed logins grouped by IP address and by account,
// and the accounts that are locked right now.

import { useEffect, useState } from "react"
import { Alert, Form, Spinner, Table } from "react-bootstrap"
import { getSecurity } from "../../api/admin"
import type { SecurityView } from "../../types"
import { formatDateTime } from "../../utils"

export default function AdminSecurity() {
  const [days, setDays] = useState(7)
  const [data, setData] = useState<SecurityView | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    getSecurity(days)
      .then(setData)
      .catch((err) => setError(err.message))
  }, [days])

  if (error) return <Alert variant="danger">{error}</Alert>
  if (!data) return <Spinner animation="border" />

  return (
    <>
      <div className="admin-toolbar">
        <Form.Select style={{ width: "auto" }} value={days} onChange={(e) => setDays(Number(e.target.value))} aria-label="Time range">
          <option value={1}>Last 24 hours</option>
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
        </Form.Select>
      </div>

      <div className="profile-grid">
        <div className="panel">
          <h2>Failed logins by IP address</h2>
          {data.by_ip.length === 0 ? (
            <p className="text-secondary mb-0">No failed logins.</p>
          ) : (
            <Table size="sm" className="mb-0">
              <thead>
                <tr>
                  <th>IP address</th>
                  <th>Failed</th>
                  <th>Last time</th>
                </tr>
              </thead>
              <tbody>
                {data.by_ip.map((row) => (
                  <tr key={row.ip}>
                    <td>{row.ip}</td>
                    <td>{row.count}</td>
                    <td>{formatDateTime(row.last_seen)}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </div>

        <div className="panel">
          <h2>Failed logins by account</h2>
          {data.by_account.length === 0 ? (
            <p className="text-secondary mb-0">No failed logins.</p>
          ) : (
            <Table size="sm" className="mb-0">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Failed</th>
                  <th>Last time</th>
                </tr>
              </thead>
              <tbody>
                {data.by_account.map((row) => (
                  <tr key={row.email ?? "unknown"}>
                    <td>{row.email ?? "-"}</td>
                    <td>{row.count}</td>
                    <td>{formatDateTime(row.last_seen)}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </div>
      </div>

      <div className="panel mt-4">
        <h2>Locked accounts</h2>
        <p className="small text-secondary">An account is locked for 15 minutes after 5 wrong passwords in a row.</p>
        {data.locked_accounts.length === 0 ? (
          <p className="text-secondary mb-0">No account is locked right now.</p>
        ) : (
          <ul className="plain-list mb-0">
            {data.locked_accounts.map((account) => (
              <li key={account.id}>
                {account.email}, locked until {formatDateTime(account.locked_until)}
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  )
}
