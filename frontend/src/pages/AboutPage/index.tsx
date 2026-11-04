// Static page that describes the project.
import { Typography } from "antd"

export function AboutPage() {
  return (
    <>
      <Typography.Title level={2}>About LostSpot</Typography.Title>
      <Typography.Paragraph type="secondary">
        LostSpot is a location-focused lost and found app for campus, built as a FastAPI REST API with a React frontend. This MVP covers item create, list, view, update, resolve and delete.
      </Typography.Paragraph>

      <Typography.Title level={4}>Tech stack</Typography.Title>
      <Typography.Paragraph type="secondary">
        React 19 · TypeScript · Vite · Ant Design · React Router · FastAPI · SQLModel · SQLite (local) / PostgreSQL (production)
      </Typography.Paragraph>

      <Typography.Title level={4}>Backend layers</Typography.Title>
      <Typography.Paragraph type="secondary">
        Router (routes) → Service (business rules) → Repository (database) → Model (table), with schemas for request and response shapes.
      </Typography.Paragraph>

      <Typography.Title level={4}>Built by</Typography.Title>
      <Typography.Paragraph type="secondary">Rifat Abdullah Khan (2311188)</Typography.Paragraph>
    </>
  )
}
