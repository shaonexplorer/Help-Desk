import axios from "axios";

/**
 * Shared axios instance for every Help-Desk API call.
 *
 * `baseURL` is empty on purpose: in dev the Vite proxy forwards `/api/*` to
 * the Express server (see vite.config.ts), and in production the client is
 * served by that same origin. Keeping requests relative means one config works
 * in both. `withCredentials` carries the Better Auth session cookie.
 */
export const apiClient = axios.create({
  baseURL: "",
  withCredentials: true,
});
