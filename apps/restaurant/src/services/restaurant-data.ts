import { z } from "zod";
import { GoApiError } from "@sizzle/api-client";
import { apiOrigin } from "../api-origin";
import { isDemo } from "../api";

export const dietaryAttributes = [
  ["vegan", "Vegan"],
  ["vegetarian", "Vegetarian"],
  ["gluten-free", "Gluten free"],
  ["dairy-free", "Dairy free"],
  ["nut-free", "Nut free"],
  ["spicy", "Spicy"],
] as const;

const itemSchema = z.object({
  name: z.string(),
  description: z.string(),
  price: z.number().min(0).max(999999),
  attributes: z.enum(dietaryAttributes.map(([key]) => key)).array(),
  options: z
    .object({
      label: z.string(),
      priceAdjustment: z.number().min(-999999).max(999999).optional(),
    })
    .array()
    .optional(),
  highlighted: z.boolean().optional(),
  designNotes: z.string().optional(),
});
const snapshotSchema = z.object({
  version: z.number().int().nonnegative(),
  name: z.string(),
  slogan: z.string(),
  address: z.string(),
  phone: z.string(),
  hours: z.string(),
  website: z.string(),
  email: z.string(),
  customFields: z.object({ label: z.string(), value: z.string() }).array(),
  menu: z
    .object({
      name: z.string(),
      description: z.string(),
      items: itemSchema.array(),
    })
    .array(),
});

export type RestaurantData = z.infer<typeof snapshotSchema>;
export type MenuItem = z.infer<typeof itemSchema>;
export type MenuGroup = RestaurantData["menu"][number];

const storageKey = "sizzle-restaurant-data";
function demoData(): RestaurantData {
  const saved = localStorage.getItem(storageKey);
  return saved
    ? snapshotSchema.parse(JSON.parse(saved))
    : {
        version: 0,
        name: "Sunday Table",
        slogan: "",
        address: "",
        phone: "",
        hours: "",
        website: "",
        email: "",
        customFields: [],
        menu: [],
      };
}

async function request(data?: RestaurantData): Promise<RestaurantData> {
  const response = await fetch(
    `${apiOrigin.replace(/\/$/, "")}/api/v1/restaurant-data`,
    {
      credentials: "include",
      method: data ? "PUT" : "GET",
      headers: data ? { "Content-Type": "application/json" } : undefined,
      body: data ? JSON.stringify(data) : undefined,
    },
  );
  if (response.status === 400) {
    const error = await response.json();
    throw new Error(error.message);
  }
  if (!response.ok) throw new GoApiError(response.status);
  return snapshotSchema.parse(await response.json());
}

export const restaurantData = {
  async load() {
    return isDemo ? demoData() : request();
  },
  async save(data: RestaurantData) {
    if (!isDemo) return request(data);
    if (demoData().version !== data.version) throw new GoApiError(409);
    const saved = snapshotSchema.parse({ ...data, version: data.version + 1 });
    localStorage.setItem(storageKey, JSON.stringify(saved));
    return saved;
  },
};
