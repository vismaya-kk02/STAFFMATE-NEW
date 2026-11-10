import { Alert, Box, Button, Link, TextField } from '@mui/material'
import { useState, type FormEvent } from 'react'
import type { FieldErrors } from '../auth/types'
import { FormCard } from '../components/FormCard'

type SignInPageProps = {
  productName: string
  submitting: boolean
  errorMessage: string | null
  notice: string | null
  fieldErrors: FieldErrors
  onSubmit: (email: string, password: string) => void
  onForgotPassword: () => void
}

export function SignInPage({
  productName,
  submitting,
  errorMessage,
  notice,
  fieldErrors,
  onSubmit,
  onForgotPassword,
}: SignInPageProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [clientErrors, setClientErrors] = useState<FieldErrors>({})

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors: FieldErrors = {}
    const emailError = validateEmail(email)

    if (emailError !== null) {
      nextErrors.email = [emailError]
    }

    if (password === '') {
      nextErrors.password = ['Enter your password.']
    }

    setClientErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) {
      return
    }

    onSubmit(email.trim(), password)
  }

  const emailMessages = clientErrors.email ?? fieldErrors.email ?? []
  const passwordMessages = clientErrors.password ?? fieldErrors.password ?? []

  return (
    <FormCard
      title={`${productName} sign-in`}
      description="Use the email and password for your Staffmate employee account."
    >
      {notice ? (
        <Alert severity="success" sx={{ mb: 2 }}>
          {notice}
        </Alert>
      ) : null}
      {errorMessage ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorMessage}
        </Alert>
      ) : null}
      <Box component="form" onSubmit={handleSubmit} noValidate aria-busy={submitting}>
        <TextField
          label="Email"
          type="email"
          name="email"
          autoComplete="username"
          fullWidth
          margin="normal"
          required
          value={email}
          onChange={(event) => {
            setEmail(event.target.value)
          }}
          error={emailMessages.length > 0}
          helperText={emailMessages[0] ?? ' '}
          slotProps={{
            htmlInput: {
              'aria-invalid': emailMessages.length > 0,
            },
          }}
        />
        <TextField
          label="Password"
          type="password"
          name="password"
          autoComplete="current-password"
          fullWidth
          margin="normal"
          required
          value={password}
          onChange={(event) => {
            setPassword(event.target.value)
          }}
          error={passwordMessages.length > 0}
          helperText={passwordMessages[0] ?? ' '}
          slotProps={{
            htmlInput: {
              'aria-invalid': passwordMessages.length > 0,
            },
          }}
        />
        <Button type="submit" variant="contained" fullWidth disabled={submitting} sx={{ mt: 2 }}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </Button>
      </Box>
      <Link
        component="button"
        type="button"
        onClick={onForgotPassword}
        sx={{ mt: 2, display: 'inline-flex' }}
      >
        Forgot your password?
      </Link>
    </FormCard>
  )
}

function validateEmail(value: string): string | null {
  const trimmed = value.trim()

  if (trimmed === '') {
    return 'Enter your email address.'
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return 'Enter a valid email address.'
  }

  return null
}
