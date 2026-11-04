// View, edit and delete one item at /items/:itemId.
import { Alert, App as AntApp, Button, Checkbox, DatePicker, Descriptions, Flex, Form, Input, Popconfirm, Radio, Result, Spin, Tag, Typography } from "antd"
import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router"
import { apiService } from "../../services/api"
import type { Item } from "../../types/item"
import {
  contactRules,
  dateRules,
  descriptionRules,
  disableFutureDates,
  locationRules,
  titleRules,
  toFormValues,
  toItemInput,
  type ItemFormValues,
} from "../../utils/itemForm"

type EditValues = ItemFormValues & { is_resolved: boolean }

export function ItemDetailsPage() {
  const { itemId } = useParams<{ itemId: string }>()
  const navigate = useNavigate()
  const { message } = AntApp.useApp()
  const [form] = Form.useForm<EditValues>()

  const [item, setItem] = useState<Item | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [isEditing, setIsEditing] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        setItem(await apiService.getItem(itemId ?? ""))
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load item")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [itemId])

  const handleSave = async (values: EditValues) => {
    if (!item) return
    try {
      const updated = await apiService.updateItem(item.id, { ...toItemInput(values), is_resolved: values.is_resolved })
      setItem(updated)
      setIsEditing(false)
      message.success("Item updated")
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Failed to save changes")
    }
  }

  const handleDelete = async () => {
    if (!item) return
    try {
      await apiService.deleteItem(item.id)
      message.success("Item deleted")
      navigate("/")
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Failed to delete item")
    }
  }

  if (loading) return <Spin style={{ display: "block", marginTop: 64 }} />

  if (!item) {
    return (
      <Result
        status="404"
        title="Item not found"
        subTitle={error}
        extra={<Button type="primary" onClick={() => navigate("/")}>Back to items</Button>}
      />
    )
  }

  return (
    <>
      <Button type="link" onClick={() => navigate("/")} style={{ paddingLeft: 0 }}>
        ← Back to items
      </Button>
      <Typography.Title level={2}>{isEditing ? "Edit item" : "Item details"}</Typography.Title>
      {error && <Alert type="error" title={error} showIcon style={{ marginBottom: 16 }} />}

      {isEditing ? (
        <Form form={form} layout="vertical" initialValues={{ ...toFormValues(item), is_resolved: item.is_resolved }} onFinish={handleSave}>
          <Form.Item name="type" label="Type">
            <Radio.Group optionType="button" buttonStyle="solid">
              <Radio.Button value="lost">Lost</Radio.Button>
              <Radio.Button value="found">Found</Radio.Button>
            </Radio.Group>
          </Form.Item>
          <Form.Item name="title" label="Title" rules={titleRules}>
            <Input />
          </Form.Item>
          <Form.Item name="location" label="Location" rules={locationRules}>
            <Input />
          </Form.Item>
          <Form.Item name="event_date" label="Date lost or found" rules={dateRules}>
            <DatePicker format="YYYY-MM-DD" disabledDate={disableFutureDates} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="description" label="Description" rules={descriptionRules}>
            <Input.TextArea rows={4} />
          </Form.Item>
          <Form.Item name="contact" label="Contact" rules={contactRules}>
            <Input />
          </Form.Item>
          <Form.Item name="is_resolved" valuePropName="checked">
            <Checkbox>Resolved (back with its owner)</Checkbox>
          </Form.Item>
          <Flex gap={8}>
            <Button type="primary" htmlType="submit">Save changes</Button>
            <Button onClick={() => setIsEditing(false)}>Cancel</Button>
          </Flex>
        </Form>
      ) : (
        <>
          <Descriptions
            bordered
            column={1}
            items={[
              { key: "type", label: "Type", children: <Tag color={item.type === "lost" ? "red" : "green"}>{item.type === "lost" ? "Lost" : "Found"}</Tag> },
              { key: "title", label: "Title", children: item.title },
              { key: "location", label: "Location", children: item.location },
              { key: "date", label: item.type === "lost" ? "Date lost" : "Date found", children: item.event_date },
              { key: "description", label: "Description", children: item.description || "(No description)" },
              { key: "contact", label: "Contact", children: item.contact || "(No contact given)" },
              { key: "status", label: "Status", children: <Tag color={item.is_resolved ? "green" : "gold"}>{item.is_resolved ? "Resolved" : "Open"}</Tag> },
              { key: "created", label: "Posted", children: new Date(item.created_at).toLocaleString() },
              { key: "updated", label: "Updated", children: new Date(item.updated_at).toLocaleString() },
            ]}
          />
          <Flex gap={8} style={{ marginTop: 16 }}>
            <Button type="primary" onClick={() => setIsEditing(true)}>Edit</Button>
            <Popconfirm title="Delete this item?" okText="Delete" okButtonProps={{ danger: true }} onConfirm={handleDelete}>
              <Button danger>Delete</Button>
            </Popconfirm>
          </Flex>
        </>
      )}
    </>
  )
}
