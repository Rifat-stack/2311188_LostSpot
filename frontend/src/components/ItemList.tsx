// Shows items with resolve, view and delete actions; every change goes up through callbacks.
import { DeleteOutlined, EnvironmentOutlined, EyeOutlined } from "@ant-design/icons"
import { Button, Checkbox, Empty, List, Popconfirm, Space, Tag, Tooltip, Typography } from "antd"
import type { Item } from "../types/item"

type Props = {
  items: Item[]
  loading: boolean
  hasMore: boolean
  onToggle: (item: Item) => void
  onDelete: (id: string) => void
  onView: (id: string) => void
  onLoadMore: () => void
}

export function ItemList({ items, loading, hasMore, onToggle, onDelete, onView, onLoadMore }: Props) {
  return (
    <List
      loading={loading}
      dataSource={items}
      locale={{ emptyText: <Empty description="No items yet — post one above." /> }}
      loadMore={
        hasMore && (
          <div style={{ textAlign: "center", marginTop: 12 }}>
            <Button onClick={onLoadMore}>Load more</Button>
          </div>
        )
      }
      renderItem={(item) => (
        <List.Item
          actions={[
            <Button key="view" type="text" icon={<EyeOutlined />} aria-label="View item" onClick={() => onView(item.id)} />,
            <Popconfirm
              key="delete"
              title="Delete this item?"
              okText="Delete"
              okButtonProps={{ danger: true }}
              onConfirm={() => onDelete(item.id)}
            >
              <Button type="text" danger icon={<DeleteOutlined />} aria-label="Delete item" />
            </Popconfirm>,
          ]}
        >
          <List.Item.Meta
            avatar={
              <Tooltip title={item.is_resolved ? "Resolved" : "Mark as resolved"}>
                <Checkbox checked={item.is_resolved} onChange={() => onToggle(item)} aria-label="Resolved" />
              </Tooltip>
            }
            title={
              <Space wrap>
                <Tag color={item.type === "lost" ? "red" : "green"}>{item.type === "lost" ? "Lost" : "Found"}</Tag>
                <Typography.Text delete={item.is_resolved} type={item.is_resolved ? "secondary" : undefined}>
                  {item.title}
                </Typography.Text>
                <Tag>{item.event_date}</Tag>
              </Space>
            }
            description={
              <>
                <EnvironmentOutlined /> {item.location}
              </>
            }
          />
        </List.Item>
      )}
    />
  )
}
