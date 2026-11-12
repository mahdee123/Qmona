/** An error that is safe to show to API clients. Rendered as { detail, code, errors }. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly errors: Record<string, string[]> = {},
    public readonly extra: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = "ApiError";
  }

  static validation(errors: Record<string, string[]>, detail = "Please correct the highlighted fields.") {
    return new ApiError(400, "validation_error", detail, errors);
  }
  static fieldError(field: string, message: string) {
    return new ApiError(400, "validation_error", message, { [field]: [message] });
  }
  static notAuthenticated() {
    // 403 (not 401) keeps compatibility with the session-auth behaviour the frontend was written against.
    return new ApiError(403, "not_authenticated", "Authentication credentials were not provided.");
  }
  static forbidden(message = "You do not have permission to perform this action.") {
    return new ApiError(403, "permission_denied", message);
  }
  static notFound(message = "Not found.") {
    return new ApiError(404, "not_found", message);
  }
  static conflict(code: string, message: string, extra: Record<string, unknown> = {}) {
    return new ApiError(409, code, message, {}, extra);
  }
}
