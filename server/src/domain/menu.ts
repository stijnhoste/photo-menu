import { z } from 'zod';

const shortText = (max: number) => z.string().trim().min(1).max(max);
const optionalText = (max: number) => z.string().trim().max(max).nullable();

export const dietaryTagSchema = z.enum([
  'vegetarian',
  'vegan',
  'gluten-free',
  'dairy-free',
  'nut-free',
  'halal',
  'kosher',
  'spicy'
]);

export const dishSchema = z.object({
  id: z.uuid(),
  name: shortText(200),
  description: optionalText(500),
  price: optionalText(30),
  priceValue: z.number().finite().nonnegative().nullable(),
  category: shortText(60),
  categoryOrder: z.number().int().nonnegative(),
  itemOrder: z.number().int().nonnegative(),
  imageUrl: z.url().nullable(),
  imageIsRepresentative: z.boolean(),
  ingredients: z.array(shortText(100)).max(50),
  allergens: z.array(shortText(60)).max(30),
  dietaryTags: z.array(dietaryTagSchema).max(dietaryTagSchema.options.length)
});

export const menuMetadataSchema = z.object({
  restaurantName: optionalText(120),
  menuName: optionalText(120),
  currency: optionalText(10),
  sourceLanguage: optionalText(60)
});

export const menuDocumentSchema = menuMetadataSchema.extend({
  version: z.literal(2),
  id: z.uuid(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  dishes: z.array(dishSchema).min(1).max(300)
});

export const extractedDishSchema = z.object({
  name: shortText(200),
  description: optionalText(500).default(null),
  price: optionalText(30).default(null),
  priceValue: z.number().finite().nonnegative().nullable().default(null),
  category: shortText(60).default('Other'),
  categoryOrder: z.number().int().nonnegative().default(0),
  itemOrder: z.number().int().nonnegative().default(0),
  imageSearch: shortText(200),
  ingredients: z.array(shortText(100)).max(50).default([]),
  allergens: z.array(shortText(60)).max(30).default([]),
  dietaryTags: z.array(dietaryTagSchema).max(dietaryTagSchema.options.length).default([])
});

export const extractedMenuSchema = menuMetadataSchema.extend({
  dishes: z.array(extractedDishSchema).min(1).max(300)
});

export type DietaryTag = z.infer<typeof dietaryTagSchema>;
export type Dish = z.infer<typeof dishSchema>;
export type MenuMetadata = z.infer<typeof menuMetadataSchema>;
export type MenuDocument = z.infer<typeof menuDocumentSchema>;
export type ExtractedDish = z.infer<typeof extractedDishSchema>;
export type ExtractedMenu = z.infer<typeof extractedMenuSchema>;
