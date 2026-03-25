import { eq, and, lte, ilike, desc, sql } from 'drizzle-orm';
import { db } from '../../db/connection.js';
import { packages } from '../../db/schema.js';

export interface SearchPackagesInput {
  location?: string;
  category?: string;
  maxPrice?: number;
}

export interface CreatePackageInput {
  title: string;
  location: string;
  category: string;
  price: number;
  numberOfDays?: number;
  itinerary?: string;
  included?: string;
  excluded?: string;
  isFeatured?: boolean;
}

export interface UpdatePackageInput {
  title?: string;
  location?: string;
  category?: string;
  price?: number;
  numberOfDays?: number;
  itinerary?: string;
  included?: string;
  excluded?: string;
  isFeatured?: boolean;
}

// Task 9.1: Search packages with optional filters; featured first
export async function searchPackages(input: SearchPackagesInput) {
  const conditions = [];

  if (input.location) {
    conditions.push(ilike(packages.location, `%${input.location}%`));
  }
  if (input.category) {
    conditions.push(ilike(packages.category, `%${input.category}%`));
  }
  if (input.maxPrice !== undefined) {
    conditions.push(lte(packages.price, String(input.maxPrice)));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  // Featured packages first, then by createdAt desc
  const results = await db
    .select()
    .from(packages)
    .where(where)
    .orderBy(desc(packages.isFeatured), desc(packages.createdAt));

  return results;
}

// Task 9.2: Create a package
export async function createPackage(input: CreatePackageInput) {
  if (!input.title || !input.location || !input.category || input.price === undefined) {
    const err = Object.assign(new Error('Missing required fields: title, location, category, price'), {
      statusCode: 400,
    });
    throw err;
  }

  const [pkg] = await db
    .insert(packages)
    .values({
      title: input.title,
      location: input.location,
      category: input.category,
      price: String(input.price),
      numberOfDays: input.numberOfDays ?? null,
      itinerary: input.itinerary ?? null,
      included: input.included ?? null,
      excluded: input.excluded ?? null,
      isFeatured: input.isFeatured ?? false,
    })
    .returning();

  return pkg;
}

// Task 9.3: Update a package (including featured flag)
export async function updatePackage(id: string, input: UpdatePackageInput) {
  const [existing] = await db
    .select()
    .from(packages)
    .where(eq(packages.id, id))
    .limit(1);

  if (!existing) {
    const err = Object.assign(new Error('Package not found'), { statusCode: 404 });
    throw err;
  }

  const updateValues: Partial<typeof packages.$inferInsert> = {};
  if (input.title !== undefined) updateValues.title = input.title;
  if (input.location !== undefined) updateValues.location = input.location;
  if (input.category !== undefined) updateValues.category = input.category;
  if (input.price !== undefined) updateValues.price = String(input.price);
  if (input.numberOfDays !== undefined) updateValues.numberOfDays = input.numberOfDays;
  if (input.itinerary !== undefined) updateValues.itinerary = input.itinerary;
  if (input.included !== undefined) updateValues.included = input.included;
  if (input.excluded !== undefined) updateValues.excluded = input.excluded;
  if (input.isFeatured !== undefined) updateValues.isFeatured = input.isFeatured;

  const [updated] = await db
    .update(packages)
    .set(updateValues)
    .where(eq(packages.id, id))
    .returning();

  return updated;
}
