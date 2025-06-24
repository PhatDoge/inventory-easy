import { ConvexError } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getClerkIdentity, getClerkUser } from "./auth";

/**
 * Stores a new user from Clerk into the Convex database or updates existing user.
 *
 * This mutation should be called by the client shortly after a user signs in
 * or when the application loads for an authenticated user to ensure their
 * data is synchronized with the Convex database.
 *
 * It uses the Clerk user ID (`identity.subject`) as the unique key for the `clerkId` field.
 */
export const storeUser = mutation({
  args: {}, // No arguments needed as it gets user data from Clerk identity via ctx.auth
  handler: async (ctx) => {
    const identity = await getClerkIdentity(ctx); // Ensures user is authenticated

    // Check if user already exists
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (user !== null) {
      // User already exists. Optionally update if their details changed.
      // For example, if email or name can change in Clerk and you want to sync it.
      // For simplicity, we'll just check if an update is needed for email.
      // You can expand this to other fields like name, imageUrl.
      const updatedFields: Partial<typeof user> = {};
      if (identity.email && user.email !== identity.email) {
        updatedFields.email = identity.email;
      }
      // Add checks for other fields like firstName, lastName, imageUrl if they are provided by Clerk identity
      // and you want to sync them.
      // Example: identity.givenName, identity.familyName, identity.picture

      // Clerk's `identity` object structure:
      // identity.subject: string; // The user's ID
      // identity.issuer: string; // The issuer of the token
      // identity.name?: string; // The user's full name
      // identity.givenName?: string; // The user's given name
      // identity.familyName?: string; // The user's family name
      // identity.email?: string; // The user's email address
      // identity.emailVerified?: boolean; // Whether the user's email address has been verified
      // identity.phoneNumber?: string; // The user's phone number
      // identity.phoneNumberVerified?: boolean; // Whether the user's phone number has been verified
      // identity.picture?: string; // The user's profile picture URL

      if (identity.givenName && user.firstName !== identity.givenName) {
        updatedFields.firstName = identity.givenName;
      }
      if (identity.familyName && user.lastName !== identity.familyName) {
        updatedFields.lastName = identity.familyName;
      }
      if (identity.picture && user.imageUrl !== identity.picture) {
        updatedFields.imageUrl = identity.picture;
      }

      if (Object.keys(updatedFields).length > 0) {
        await ctx.db.patch(user._id, updatedFields);
      }
      return user._id;
    }

    // User doesn't exist, create new user
    const newUser = {
      clerkId: identity.subject,
      email: identity.email!, // Assuming email is always present for your use case
      firstName: identity.givenName,
      lastName: identity.familyName,
      imageUrl: identity.picture,
      createdAt: Date.now(),
    };

    // Validate that email is present, as it's not optional in your schema
    if (!newUser.email) {
      throw new ConvexError(
        "User email is missing from Clerk identity, but is required."
      );
    }

    const userId = await ctx.db.insert("users", newUser);
    return userId;
  },
});

/**
 * Gets the Convex user ID for the currently authenticated Clerk user.
 * This is a convenience query often used by the client to get its own Convex user ID.
 */
export const getMyConvexUserId = query({
  args: {},
  handler: async (ctx) => {
    const identity = await getClerkIdentity(ctx);
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      // This should ideally not happen if storeUser is called correctly on the client.
      throw new ConvexError(
        "Authenticated user not found in Convex 'users' table."
      );
    }
    return user._id;
  },
});

/**
 * Retrieves the full user document for the currently authenticated Clerk user.
 * Used by actions or other server functions that need the full user object.
 */
export const getMyUserDoc = query({
  args: {},
  handler: async (ctx) => {
    // getClerkUser already handles the logic of finding the user by Clerk ID
    // and throws an error if not found or not authenticated.
    return await getClerkUser(ctx);
  },
});

/**
 * INTERNAL MUTATION: Creates or updates a user from a Clerk webhook.
 *
 * This mutation is called by an HTTP action when Clerk sends a "user.created"
 * or "user.updated" webhook event. It takes user data directly as arguments.
 */
export const internalCreateUser = internalMutation({
  args: {
    clerkId: v.string(),
    email: v.string(), // Assuming email is always present from webhook
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (existingUser) {
      // User exists, update their information if necessary
      const updatedFields: Partial<typeof existingUser> = {};
      if (args.email && existingUser.email !== args.email) {
        updatedFields.email = args.email;
      }
      if (args.firstName && existingUser.firstName !== args.firstName) {
        updatedFields.firstName = args.firstName;
      } else if (
        args.firstName === undefined &&
        existingUser.firstName !== undefined
      ) {
        updatedFields.firstName = undefined; // Handle case where name is removed
      }
      if (args.lastName && existingUser.lastName !== args.lastName) {
        updatedFields.lastName = args.lastName;
      } else if (
        args.lastName === undefined &&
        existingUser.lastName !== undefined
      ) {
        updatedFields.lastName = undefined; // Handle case where name is removed
      }
      if (args.imageUrl && existingUser.imageUrl !== args.imageUrl) {
        updatedFields.imageUrl = args.imageUrl;
      } else if (
        args.imageUrl === undefined &&
        existingUser.imageUrl !== undefined
      ) {
        updatedFields.imageUrl = undefined; // Handle case where image is removed
      }

      if (Object.keys(updatedFields).length > 0) {
        await ctx.db.patch(existingUser._id, updatedFields);
      }
      return existingUser._id;
    } else {
      // User doesn't exist, create new user
      if (!args.email) {
        // Should not happen if webhook sends email, but good to guard
        throw new ConvexError("User email is missing from webhook data.");
      }
      const userId = await ctx.db.insert("users", {
        clerkId: args.clerkId,
        email: args.email,
        firstName: args.firstName,
        lastName: args.lastName,
        imageUrl: args.imageUrl,
        createdAt: Date.now(),
      });
      return userId;
    }
  },
});
