export type CurrentUser = {
  id: number
  name: string
  email: string
}

export type AppSections = {
  admin: boolean
  crm: boolean
}

export type IdentityState = {
  email_verified: boolean
  mfa_enrolled: boolean
  mfa_confirmed: boolean
  roles: string[]
  permissions: string[]
  sections: AppSections
}

export type AdminHome = {
  name: string
  email: string
  roles: string[]
  permissions: string[]
  sections?: AppSections
}

export type CrmHome = {
  name: string
  email: string
  roles: string[]
  permissions: string[]
  sections?: AppSections
  navigation: Array<{ key: string; label: string }>
}

export type SessionHome = {
  name: string
  email: string
  roles: string[]
  permissions: string[]
  sections: AppSections
  crmNavigation: Array<{ key: string; label: string }>
}

export type QrCode = {
  svg: string
  url: string
}

export type SecretKey = {
  secretKey: string
}

export type FieldErrors = Record<string, string[]>
