// Converts between form values and API shapes, and holds the form validation rules.
import dayjs, { type Dayjs } from "dayjs"
import type { Item, ItemInput, ItemType } from "../types/item"

export type ItemFormValues = {
  type: ItemType
  title: string
  description?: string
  location: string
  event_date: Dayjs
  contact?: string
}

export const toItemInput = (values: ItemFormValues): ItemInput => ({
  type: values.type,
  title: values.title.trim(),
  description: values.description?.trim() || null,
  location: values.location.trim(),
  event_date: values.event_date.format("YYYY-MM-DD"),
  contact: values.contact?.trim() || null,
})

export const toFormValues = (item: Item): ItemFormValues => ({
  type: item.type,
  title: item.title,
  description: item.description ?? "",
  location: item.location,
  event_date: dayjs(item.event_date),
  contact: item.contact ?? "",
})

// Days after today can't be picked: an item can't be lost or found in the future.
export const disableFutureDates = (day: Dayjs) => day.isAfter(dayjs(), "day")

export const titleRules = [
  { required: true, whitespace: true, message: "Title is required" },
  { max: 200, message: "Title must be at most 200 characters" },
]

export const locationRules = [
  { required: true, whitespace: true, message: "Location is required" },
  { max: 200, message: "Location must be at most 200 characters" },
]

export const dateRules = [{ required: true, message: "Date is required" }]

export const descriptionRules = [{ max: 1000, message: "Description must be at most 1000 characters" }]

export const contactRules = [{ max: 100, message: "Contact must be at most 100 characters" }]
