// Item list page: loads items from the API, owns the list state and passes it to the components below.
import { Alert, App as AntApp, Flex, Segmented, Switch, Typography } from "antd"
import { useEffect, useState } from "react"
import { useNavigate } from "react-router"
import { ItemForm } from "../../components/ItemForm"
import { ItemList } from "../../components/ItemList"
import { ItemStats } from "../../components/ItemStats"
import { PAGE_SIZE, apiService } from "../../services/api"
import type { Item, ItemInput, ItemPatch, ItemType } from "../../types/item"

const messageOf = (err: unknown) => (err instanceof Error ? err.message : "Something went wrong")

export function HomePage() {
  const navigate = useNavigate()
  const { message } = AntApp.useApp()

  // useState stores a value; calling its setter re-renders the page with the new value.
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [error, setError] = useState("")
  const [typeFilter, setTypeFilter] = useState<"all" | ItemType>("all")
  const [showResolved, setShowResolved] = useState(true)

  const hasMore = items.length < total

  // Reload as many rows as are already shown, so edits and deletes keep the list in place.
  const reload = async (shown: number) => {
    const size = Math.min(Math.max(shown, PAGE_SIZE), 100)
    const page = await apiService.getItems(0, size)
    setItems(page.items)
    setTotal(page.total)
  }

  // useEffect runs after render; the empty [] means only once, so items load when the page opens.
  useEffect(() => {
    const loadOnOpen = async () => {
      try {
        await reload(PAGE_SIZE)
      } catch (err) {
        setError(messageOf(err))
      } finally {
        setLoading(false)
      }
    }
    loadOnOpen()
  }, [])

  // Keep the browser tab title in sync with the number of open items.
  useEffect(() => {
    const open = items.filter((i) => !i.is_resolved).length
    document.title = open > 0 ? `(${open}) LostSpot` : "LostSpot"
  }, [items])

  // Runs a change, refreshes the list and reports the result; returns false on failure.
  const run = async (action: () => Promise<unknown>, success: string): Promise<boolean> => {
    try {
      await action()
      await reload(items.length)
      message.success(success)
      return true
    } catch (err) {
      message.error(messageOf(err))
      return false
    }
  }

  const addItem = (data: ItemInput) => run(() => apiService.createItem(data), "Item posted")

  const toggleItem = (item: Item) => {
    const patch: ItemPatch = { is_resolved: !item.is_resolved }
    return run(() => apiService.updateItem(item.id, patch), item.is_resolved ? "Marked as open" : "Marked as resolved")
  }

  const deleteItem = (id: string) => run(() => apiService.deleteItem(id), "Item deleted")

  const clearResolved = () =>
    run(
      () => Promise.all(items.filter((i) => i.is_resolved).map((i) => apiService.deleteItem(i.id))),
      "Resolved items cleared",
    )

  const loadMore = async () => {
    try {
      const page = await apiService.getItems(items.length, PAGE_SIZE)
      setItems((prev) => [...prev, ...page.items])
      setTotal(page.total)
    } catch (err) {
      message.error(messageOf(err))
    }
  }

  // Derived value: no extra state needed for the filters.
  const visibleItems = items.filter(
    (i) => (typeFilter === "all" || i.type === typeFilter) && (showResolved || !i.is_resolved),
  )

  return (
    <>
      <Typography.Title level={2}>LostSpot</Typography.Title>
      <Typography.Paragraph type="secondary">
        Lost something on campus, or found something that isn't yours? Post it with where it happened.
      </Typography.Paragraph>

      {error && <Alert type="error" title={error} showIcon style={{ marginBottom: 16 }} />}

      <ItemForm onAdd={addItem} />

      {items.length > 0 && (
        <>
          <ItemStats items={items} onClearResolved={clearResolved} />
          <Flex gap={16} align="center" wrap>
            <Segmented
              value={typeFilter}
              onChange={(value) => setTypeFilter(value as "all" | ItemType)}
              options={[
                { label: "All", value: "all" },
                { label: "Lost", value: "lost" },
                { label: "Found", value: "found" },
              ]}
            />
            <span>
              <Switch size="small" checked={showResolved} onChange={setShowResolved} />{" "}
              <Typography.Text type="secondary">Show resolved</Typography.Text>
            </span>
          </Flex>
          <Typography.Paragraph type="secondary" style={{ margin: "8px 0 0" }}>
            Showing {items.length} of {total}
          </Typography.Paragraph>
        </>
      )}

      <ItemList
        items={visibleItems}
        loading={loading}
        hasMore={hasMore}
        onToggle={toggleItem}
        onDelete={deleteItem}
        onView={(id) => navigate(`/items/${id}`)}
        onLoadMore={loadMore}
      />
    </>
  )
}
