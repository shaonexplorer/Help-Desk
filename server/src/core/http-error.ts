/**
 * A controlled failure. Throw this from a controller to produce a non-500 JSON
 * error — `errorHandler` translates it into `{ error: message }` with this
 * status. It's the only intended way to signal "the request was understood but
 * can't be fulfilled" (404 not found, 400 bad input, 403 forbidden, ...).
 */
export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}
