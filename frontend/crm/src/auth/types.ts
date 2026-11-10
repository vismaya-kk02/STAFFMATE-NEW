export type CurrentUser = {
  id: number
  name: string
  email: string
}

export type IdentityState = {
  email_verified: boolean
  mfa_enrolled: boolean
  mfa_confirmed: boolean
  portal: string | null
}

export type CrmHome = {
  name: string
  email: string
  roles: string[]
  navigation: Array<{ key: string; label: string }>
}

export type QrCode = {
  svg: string
  url: string
}

export type SecretKey = {
  secretKey: string
}

export type FieldErrors = Record<string, string[]>
