import { Auth, GenericDatabaseReader } from "convex/server";
import { Doc } from "./_generated/dataModel";
import { ConvexError } from "convex/values";

/**
 * Get the Clerk user identity from the Convex context.
 * Throws an error if the user is not authenticated.
 * @param ctx The Convex context.
 * @returns The Clerk user identity.
 * @throws ConvexError if the user is not authenticated.
 */
export async function getClerkIdentity(ctx: { auth: Auth }) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new ConvexError("User is not authenticated.");
  }
  // The `subject` property is the Clerk User ID.
  // Other useful properties: identity.issuer, identity.name, identity.email
  return identity;
}

/**
 * Retrieves the Convex user document corresponding to the authenticated Clerk user.
 * Ensures that a user record exists in the 'users' table for the given Clerk ID.
 *
 * @param ctx - The Convex query or mutation context, providing database access and authentication info.
 * @returns The Convex user document (Doc<"users">).
 * @throws ConvexError if the user is not authenticated or no corresponding user record is found.
 */
export async function getClerkUser(ctx: {
  db: GenericDatabaseReader;
  auth: Auth;
}): Promise<Doc<"users">> {
  const identity = await getClerkIdentity(ctx);

  // Find the user document in Convex by the Clerk user ID (subject)
  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
    .unique();

  if (!user) {
    // This case should ideally be rare if storeUser is called on frontend after login.
    // It indicates that the user is authenticated with Clerk but doesn't have a record in the Convex 'users' table yet.
    // Depending on the desired behavior, you could auto-create the user here,
    // but it's generally better to handle user creation explicitly via a mutation like `storeUser`.
    throw new ConvexError(
      "Authenticated user not found in Convex database. Please ensure 'storeUser' mutation has been called."
    );
  }
  return user;
}

/**
 * A more permissive version that returns null if the user is not found or not authenticated.
 * Useful for queries that can operate for both authenticated and unauthenticated users.
 */
export async function tryGetClerkUser(ctx: {
  db: GenericDatabaseReader;
  auth: Auth;
}): Promise<Doc<"users"> | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    return null;
  }
  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
    .unique();

  return user;
}

// We will define storeUser in a separate users.ts file or directly in the component that calls it.
// For now, this auth.ts focuses on retrieving the authenticated user.

// Example of how to use it in a query:
// export const getMyData = query({
//   handler: async (ctx) => {
//     const user = await getClerkUser(ctx);
//     // Now you have user._id and user.clerkId, user.email etc.
//     // Example: return await ctx.db.query("someData").filter(q => q.eq(q.field("ownerId"), user._id)).collect();
//     return `User ${user.email} is authenticated. Convex User ID: ${user._id}`;
//   }
// });
