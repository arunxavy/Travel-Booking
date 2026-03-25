import { eq, and } from 'drizzle-orm';
import { db } from '../../db/connection.js';
import { wishlist, packages } from '../../db/schema.js';

// Task 10.1: Add package to wishlist (idempotent)
export async function addToWishlist(memberId: string, packageId: string) {
  // Check package exists
  const [pkg] = await db
    .select({ id: packages.id })
    .from(packages)
    .where(eq(packages.id, packageId))
    .limit(1);

  if (!pkg) {
    const err = Object.assign(new Error('Package not found'), { statusCode: 404 });
    throw err;
  }

  // Check if already saved
  const [existing] = await db
    .select()
    .from(wishlist)
    .where(and(eq(wishlist.memberId, memberId), eq(wishlist.packageId, packageId)))
    .limit(1);

  if (existing) {
    return { already_saved: true, entry: existing };
  }

  const [entry] = await db
    .insert(wishlist)
    .values({ memberId, packageId })
    .returning();

  return { already_saved: false, entry };
}

// Task 10.2: Remove package from wishlist
export async function removeFromWishlist(memberId: string, packageId: string) {
  const [existing] = await db
    .select()
    .from(wishlist)
    .where(and(eq(wishlist.memberId, memberId), eq(wishlist.packageId, packageId)))
    .limit(1);

  if (!existing) {
    const err = Object.assign(new Error('Wishlist entry not found'), { statusCode: 404 });
    throw err;
  }

  await db
    .delete(wishlist)
    .where(and(eq(wishlist.memberId, memberId), eq(wishlist.packageId, packageId)));
}

// Task 10.3: Get all saved packages for a member
export async function getWishlist(memberId: string) {
  const entries = await db
    .select({
      id: wishlist.id,
      savedAt: wishlist.savedAt,
      package: {
        id: packages.id,
        title: packages.title,
        location: packages.location,
        category: packages.category,
        price: packages.price,
        isFeatured: packages.isFeatured,
        createdAt: packages.createdAt,
      },
    })
    .from(wishlist)
    .innerJoin(packages, eq(wishlist.packageId, packages.id))
    .where(eq(wishlist.memberId, memberId))
    .orderBy(wishlist.savedAt);

  return entries;
}
