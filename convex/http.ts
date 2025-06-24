"use server";
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { WebhookEvent } from "@clerk/nextjs/server";

// Alternative: Direct import if internal.users doesn't work
// import { createUser } from "./users";

const http = httpRouter();

http.route({
  path: "/clerk",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const payloadString = await request.text();
    const headerPayload = request.headers;

    try {
      const result: WebhookEvent = await ctx.runAction(internal.clerk.fulfill, {
        payload: payloadString,
        headers: {
          "svix-id": headerPayload.get("svix-id")!,
          "svix-timestamp": headerPayload.get("svix-timestamp")!,
          "svix-signature": headerPayload.get("svix-signature")!,
        },
      });

      switch (result.type) {
        case "user.created":
        case "user.updated": // Also handle user.updated events
          const eventData = result.data;
          const emailAddress = eventData.email_addresses?.find(
            (email) => email.id === eventData.primary_email_address_id
          )?.email_address;

          if (!emailAddress) {
            console.warn(
              `Webhook Error: Primary email not found for user ${eventData.id}. Skipping user creation/update.`
            );
            // Optionally, you could decide to proceed without email or use another email if available,
            // but primary email is generally expected.
            // Consider throwing an error or returning a specific response if email is critical.
            return new Response("Webhook Error: Primary email not found", {
              status: 400,
            });
          }

          await ctx.runMutation(internal.users.internalCreateUser, {
            clerkId: eventData.id,
            email: emailAddress,
            firstName: eventData.first_name || undefined,
            lastName: eventData.last_name || undefined,
            imageUrl: eventData.image_url || undefined,
          });
          break;

        // Handle user deletion if necessary
        // case "user.deleted":
        //   // Ensure this event is idempotent and handles cases where the user might already be deleted.
        //   // You'll need a corresponding internalMutation to delete the user by clerkId.
        //   if (result.data.id) {
        //     // Example: await ctx.runMutation(internal.users.internalDeleteUser, { clerkId: result.data.id });
        //   }
        //   break;

        case "organizationMembership.updated":
        case "organizationMembership.created":
          await ctx.runMutation(internal.memberships.addUserIdToOrg, {
            userId: `https://${process.env.CLERK_HOSTNAME}|${result.data.public_user_data.user_id}`,
            orgId: result.data.organization.id,
          });
          break;

        case "organizationMembership.deleted":
          await ctx.runMutation(internal.memberships.removeUserIdFromOrg, {
            userId: `https://${process.env.CLERK_HOSTNAME}|${result.data.public_user_data.user_id}`,
            orgId: result.data.organization.id,
          });
          break;
      }

      return new Response(null, {
        status: 200,
      });
    } catch (err) {
      console.log(err);
      return new Response("Webhook Error", {
        status: 400,
      });
    }
  }),
});

export default http;
