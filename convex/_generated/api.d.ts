/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as aiReports from "../aiReports.js";
import type * as auth from "../auth.js";
import type * as forecasting from "../forecasting.js";
import type * as http from "../http.js";
import type * as products from "../products.js";
import type * as reordering from "../reordering.js";
import type * as sales from "../sales.js";
import type * as users from "../users.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  aiReports: typeof aiReports;
  auth: typeof auth;
  forecasting: typeof forecasting;
  http: typeof http;
  products: typeof products;
  reordering: typeof reordering;
  sales: typeof sales;
  users: typeof users;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
