import { Alert, Box, Button, Link, TextField } from '@mui/material'
import { useState, type FormEvent } from 'react'
import type { FieldErrors } from '../auth/types'
import { FormCard } from '../components/FormCard'

type ForgotPasswordPageProps = {
  submitting: boolean
  errorMessage: string | null
  successMessage: string | null
  fieldErrors: FieldErrors
  onSubmit: (email: string) => void
  onBack: () => void
}

export function ForgotPasswordPage({
  submitting,
  errorMessage,
  successMessage,
  fieldErrors,
  onSubmit,
  onBack,
}: ForgotPasswordPageProps) {
  const [email, setEmail] = useState('')
  const [clientError, setClientError] = useState<string | null>(null)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmed = email.trim()

    if (trimmed === '' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setClientError('Enter the email address for your account.')

      return
    }

    setClientError(null)
    onSubmit(trimmed)
  }

  const emailMessage = clientError ?? fieldErrors.email?.[0] ?? null

  return (
    <FormCard
      title="Reset your password"
      description="If an account exists for that address, a reset link will be sent. The response is the same when no account exists."
    >
      {errorMessage ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorMessage}
        </Alert>
      ) : null}
      {successMessage ? (
        <Alert severity="success" sx={{ mb: 2 }}>
          {successMessage}
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
          error={emailMessage !== null}
          helperText={emailMessage ?? ' '}
          slotProps={{
            htmlInput: {
              'aria-invalid': emailMessage !== null,
            },
          }}
        />
        <Button type="submit" variant="contained" fullWidth disabled={submitting} sx={{ mt: 2 }}>
          {submitting ? 'Sending…' : 'Send reset link'}
        </Button>
      </Box>
      <Link component="button" type="button" onClick={onBack} sx={{ mt: 2, display: 'inline-flex' }}>
        Back to sign-in
      </Link>
    </FormCard>
  )
}
