import { z } from "zod";

export const designNameSchema = z
  .string()
  .trim()
  .min(1, "Give your design a name.")
  .max(80, "Use 80 characters or fewer.");
export const designSchema = z.object({
  id: z.string().min(1),
  name: designNameSchema,
  template: z.string(),
  type: z.string(),
  edited: z.number(),
  pages: z.number().int().positive(),
  status: z.string(),
  menuTitle: z.string().optional(),
});
export const templateSchema = z.object({
  id: z.string(),
  name: z.string(),
  style: z.string(),
  type: z.string(),
  color: z.enum(["Warm", "Cool"]),
  tag: z.string(),
  title: z.string(),
  kicker: z.string(),
  sub: z.string(),
  section: z.string(),
  items: z.array(z.tuple([z.string(), z.string(), z.string()])),
  footer: z.string(),
});
export const assetSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  size: z.string(),
  data: z.string().optional(),
});
export const orderSchema = z.object({
  id: z.string(),
  name: z.string(),
  template: z.string(),
  qty: z.number(),
  date: z.string(),
  status: z.enum(["In production", "Delivered", "Cancelled"]),
  total: z.number(),
  delivery: z.string(),
  paper: z.string(),
});
export type Design = z.infer<typeof designSchema>;
export type Template = z.infer<typeof templateSchema>;
export type BrandAsset = z.infer<typeof assetSchema>;
export type PrintOrder = z.infer<typeof orderSchema>;
export type NewDesign = Omit<Design, "id" | "edited">;
export type NewAsset = Omit<BrandAsset, "id">;
export interface TemplateFilters {
  q: string;
  style: string;
  type: string;
  color: string;
}
