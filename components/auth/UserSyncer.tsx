"use client";

import { useUser } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { useEffect, useState } from "react";
import { api } from "@/convex/_generated/api";

/**
 * This component ensures that the Clerk user data is stored in the Convex database.
 * It should be rendered within the ClerkProvider and ConvexProvider context,
 * typically in a layout or a wrapper for authenticated content.
 */
export function UserSyncer() {
  const { isSignedIn, user, isLoaded: isClerkLoaded } = useUser();
  const storeUser = useMutation(api.users.storeUser);
  const [isUserStored, setIsUserStored] = useState(false);

  useEffect(() => {
    // Ensure Clerk is loaded and we have an authenticated user
    if (!isClerkLoaded || !isSignedIn || !user) {
      setIsUserStored(false); // Reset if user logs out or clerk is not ready
      return;
    }

    // Avoid calling mutation multiple times unnecessarily if already stored in this session/load
    // or if the mutation is already in flight (though useMutation handles some of this).
    // A more robust check might involve checking if the user ID has changed.
    if (isUserStored) {
      return;
    }

    const callStoreUser = async () => {
      try {
        // console.log("UserSyncer: Calling storeUser for Clerk user:", user.id);
        await storeUser();
        setIsUserStored(true); // Mark as stored for this session/user
        // console.log("UserSyncer: storeUser successful.");
      } catch (error) {
        console.error("UserSyncer: Error calling storeUser:", error);
        setIsUserStored(false); // Allow retry on next effect trigger if it failed
      }
    };

    callStoreUser();

    // Dependency array: re-run if isSignedIn, user.id changes, or storeUser function identity changes.
    // isClerkLoaded ensures we don't run prematurely.
  }, [isSignedIn, user?.id, storeUser, isClerkLoaded, isUserStored]);

  return null; // This component does not render anything visible
}
