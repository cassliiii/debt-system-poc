export class ApiError extends Error {
  /**
   * @param {number} status
   * @param {string} message
   * @param {{ errors?: string[], details?: unknown }} [extra]
   */
  constructor(status, message, { errors, details } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.errors = errors
    this.details = details
  }
}

export class AuthError extends Error {
  /**
   * @param {'INVALID' | 'LOCKED'} code
   * @param {string} message
   */
  constructor(code, message) {
    super(message)
    this.name = 'AuthError'
    this.code = code
  }
}
