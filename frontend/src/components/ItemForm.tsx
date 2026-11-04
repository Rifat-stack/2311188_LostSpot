// Post-item form; passes the validated values up to the page through onAdd.
import { PlusOutlined } from "@ant-design/icons"
import { Button, DatePicker, Form, Input, Radio } from "antd"
import dayjs from "dayjs"
import type { ItemInput } from "../types/item"
import {
  contactRules,
  dateRules,
  descriptionRules,
  disableFutureDates,
  locationRules,
  titleRules,
  toItemInput,
  type ItemFormValues,
} from "../utils/itemForm"

type Props = {
  onAdd: (data: ItemInput) => Promise<boolean>
}

export function ItemForm({ onAdd }: Props) {
  const [form] = Form.useForm<ItemFormValues>()
  const initialValues = { type: "lost" as const, event_date: dayjs() }

  const handleFinish = async (values: ItemFormValues) => {
    if (await onAdd(toItemInput(values))) form.resetFields()
  }

  return (
    <Form form={form} layout="vertical" initialValues={initialValues} onFinish={handleFinish} style={{ marginBottom: 24 }}>
      <Form.Item name="type" style={{ marginBottom: 12 }}>
        <Radio.Group optionType="button" buttonStyle="solid">
          <Radio.Button value="lost">I lost something</Radio.Button>
          <Radio.Button value="found">I found something</Radio.Button>
        </Radio.Group>
      </Form.Item>
      <Form.Item name="title" rules={titleRules} style={{ marginBottom: 12 }}>
        <Input placeholder="What is it? e.g. Black car key" aria-label="Item title" />
      </Form.Item>
      <Form.Item name="location" rules={locationRules} style={{ marginBottom: 12 }}>
        <Input placeholder="Where? e.g. CSE Building, Floor 2, near Lab 1" aria-label="Location" />
      </Form.Item>
      <Form.Item name="event_date" rules={dateRules} style={{ marginBottom: 12 }}>
        <DatePicker format="YYYY-MM-DD" disabledDate={disableFutureDates} placeholder="Date lost or found" style={{ width: "100%" }} />
      </Form.Item>
      <Form.Item name="description" rules={descriptionRules} style={{ marginBottom: 12 }}>
        <Input.TextArea rows={2} placeholder="Description (optional): colour, brand, anything that helps" aria-label="Item description" />
      </Form.Item>
      <Form.Item name="contact" rules={contactRules} style={{ marginBottom: 12 }}>
        <Input placeholder="Contact (optional): email or phone, shown publicly" aria-label="Contact" />
      </Form.Item>
      <Button type="primary" htmlType="submit" icon={<PlusOutlined />}>
        Post item
      </Button>
    </Form>
  )
}
