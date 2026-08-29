/**
 * Typed server errors.
 *
 * Services throw these; server actions catch them and translate into the
 * `ActionResult` shape the UI understands. Raw exceptions never reach the
 * client — spec §39 ("Do not expose raw stack traces to users").
 */

export class NotFoundError extends Error {
  constructor(what = 'Record') {
    super(`${what} not found.`)
    this.name = 'NotFoundError'
  }
}

export class ValidationError extends Error {
  fieldErrors?: Record<string, string>
  constructor(message: string, fieldErrors?: Record<string, string>) {
    super(message)
    this.name = 'ValidationError'
    this.fieldErrors = fieldErrors
  }
}

export class ConflictError extends Error {
  fieldErrors?: Record<string, string>
  constructor(message: string, fieldErrors?: Record<string, string>) {
    super(message)
    this.name = 'ConflictError'
    this.fieldErrors = fieldErrors
  }
}
