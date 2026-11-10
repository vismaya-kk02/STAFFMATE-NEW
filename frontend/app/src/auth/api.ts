import type { FieldErrors } from './types'

export class ApiError extends Error {
  readonly status: number
  readonly errors: FieldErrors
  readonly reason: string | null

  constructor(status: number, body: unknown) {
    super(status >= 500 ? 'Something went wrong. Please try again.' : messageFrom(body))
    this.name = 'ApiError'
    this.status = status
    this.errors = errorsFrom(body)
    this.reason = reasonFrom(body)
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

let csrfReady = false

export async function api<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  if (!csrfReady) {
    await ensureCsrf()
    csrfReady = true
  }

  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')
  headers.set('X-Requested-With', 'XMLHttpRequest')

  if (init.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const token = xsrfToken()

  if (token !== null) {
    headers.set('X-XSRF-TOKEN', token)
  }

  const response = await fetch(path, {
    ...init,
    credentials: 'same-origin',
    headers,
  })

  if (response.status === 419 && retry) {
    csrfReady = false
    await ensureCsrf()
    csrfReady = true

    return api<T>(path, init, false)
  }

  const body = await readBody(response)

  if (!response.ok) {
    throw new ApiError(response.status, body)
  }

  return body as T
}

async function ensureCsrf(): Promise<void> {
  const response = await fetch('/sanctum/csrf-cookie', {
    method: 'GET',
    credentials: 'same-origin',
    headers: {
      Accept: 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    },
  })

  if (!response.ok) {
    throw new ApiError(response.status, await readBody(response))
  }
}

function xsrfToken(): string | null {
  const parts = document.cookie.split('; ')
  const pair = parts.find((item) => item.startsWith('XSRF-TOKEN='))

  if (pair === undefined) {
    return null
  }

  return decodeURIComponent(pair.slice('XSRF-TOKEN='.length))
}

async function readBody(response: Response): Promise<unknown> {
  if (response.status === 204 || response.status === 205) {
    return null
  }

  const text = await response.text()

  if (text.trim() === '') {
    return null
  }

  try {
    return JSON.parse(text) as unknown
  } catch {
    return { message: 'The server returned an unexpected response.' }
  }
}

function messageFrom(body: unknown): string {
  if (isRecord(body) && typeof body.message === 'string' && body.message !== '') {
    return body.message
  }

  return 'The request could not be completed.'
}

function reasonFrom(body: unknown): string | null {
  if (isRecord(body) && typeof body.reason === 'string') {
    return body.reason
  }

  return null
}

function errorsFrom(body: unknown): FieldErrors {
  if (!isRecord(body) || !isRecord(body.errors)) {
    return {}
  }

  const errors: FieldErrors = {}

  for (const [key, value] of Object.entries(body.errors)) {
    if (Array.isArray(value)) {
      const messages = value.filter((item): item is string => typeof item === 'string')

      if (messages.length > 0) {
        errors[key] = messages
      }
    }
  }

  return errors
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
