import { api, ApiError, isApiError } from './api'
import type { QrCode, SecretKey } from './types'

export type EnrollmentSetup = {
  qr: QrCode
  secret: SecretKey
}

let enrollmentSetup: Promise<EnrollmentSetup> | null = null

export function beginEnrollment(): Promise<EnrollmentSetup> {
  enrollmentSetup ??= createEnrollment().catch((error: unknown) => {
    enrollmentSetup = null
    throw error
  })

  return enrollmentSetup
}

export function resetEnrollmentSetup(): void {
  enrollmentSetup = null
}

export async function confirmPassword(password: string): Promise<void> {
  await api('/user/confirm-password', {
    method: 'POST',
    body: JSON.stringify({ password }),
  })
}

export async function confirmEnrollment(code: string): Promise<string[]> {
  await api('/user/confirmed-two-factor-authentication', {
    method: 'POST',
    body: JSON.stringify({ code }),
  })

  const codes = await api<unknown>('/user/two-factor-recovery-codes')
  resetEnrollmentSetup()

  if (!Array.isArray(codes) || !codes.every((item) => typeof item === 'string')) {
    throw new Error('Recovery codes were not returned.')
  }

  return codes
}

async function createEnrollment(): Promise<EnrollmentSetup> {
  try {
    await api('/user/two-factor-authentication', {
      method: 'POST',
      body: JSON.stringify({}),
    })
  } catch (error) {
    if (isApiError(error) && error.status === 423) {
      throw error
    }

    throw error
  }

  const qr = await api<QrCode>('/user/two-factor-qr-code')
  const secret = await api<SecretKey>('/user/two-factor-secret-key')

  if (typeof qr.svg !== 'string' || typeof secret.secretKey !== 'string' || secret.secretKey === '') {
    throw new ApiError(502, { message: 'The authenticator setup details were incomplete.' })
  }

  return { qr, secret }
}
