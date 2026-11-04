// Lost, found and resolved counts, plus the clear-resolved button.
import { Button, Flex, Popconfirm, Typography } from "antd"
import type { Item } from "../types/item"

type Props = {
  items: Item[]
  onClearResolved: () => void
}

export function ItemStats({ items, onClearResolved }: Props) {
  // Derived during render, so no extra state is needed.
  const open = items.filter((i) => !i.is_resolved)
  const lostCount = open.filter((i) => i.type === "lost").length
  const foundCount = open.length - lostCount
  const resolvedCount = items.length - open.length

  return (
    <Flex justify="space-between" align="center" style={{ marginBottom: 8 }}>
      <Typography.Text type="secondary">
        {lostCount} lost · {foundCount} found · {resolvedCount} resolved
      </Typography.Text>
      {resolvedCount > 0 && (
        <Popconfirm title={`Delete ${resolvedCount} resolved item(s)?`} okText="Delete" okButtonProps={{ danger: true }} onConfirm={onClearResolved}>
          <Button danger size="small">
            Clear resolved ({resolvedCount})
          </Button>
        </Popconfirm>
      )}
    </Flex>
  )
}
