"use client";
import { SignInButton } from "@clerk/nextjs";

export function SignInForm() {
  return (
    <div className="w-full">
      <SignInButton mode="modal">
        <button className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105">
          Sign In to Get Started
        </button>
      </SignInButton>

      <p className="text-sm text-gray-500 mt-4 text-center">
        Join developers creating perfect AI prompts
      </p>
    </div>
  );
}
