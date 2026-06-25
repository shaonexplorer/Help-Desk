/**
 * Simple API client utilities for the Help‑Desk front‑end.
 * Uses the fetch API and provides typed responses.
 */
export interface HelloResponse {
  message: string;
}

/**
 * Fetch the greeting from the Express back‑end.
 * Returns a promise that resolves to {@link HelloResponse}.
 * Errors are caught and re‑thrown with a consistent shape.
 */
export async function fetchHello(): Promise<HelloResponse> {
  try {
    const resp = await fetch('/api/hello');
    if (!resp.ok) {
      const errorText = await resp.text();
      throw new Error(`Server responded ${resp.status}: ${errorText}`);
    }
    const data = (await resp.json()) as HelloResponse;
    return data;
  } catch (err) {
    // Preserve stack trace for debugging in development
    if (process.env.NODE_ENV !== 'production') {
      console.error('fetchHello error:', err);
    }
    throw err;
  }
}
