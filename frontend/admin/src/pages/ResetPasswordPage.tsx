import { Alert, Box, Button, TextField } from '@mui/material'
import { useState, type FormEvent } from 'react'
import type { FieldErrors } from '../auth/types'
import { FormCard } from '../components/FormCard'

type ResetPasswordPageProps = {
  email: string
  submitting: boolean
  errorMessage: string | null
  fieldErrors: FieldErrors
  onSubmit: (email: string, password: string, passwordConfirmation: string) => void
}

export function ResetPasswordPage({
  email,
  submitting,
  errorMessage,
  fieldErrors,
  onSubmit,
}: ResetPasswordPageProps) {
  const [address, setAddress] = useState(email)
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [clientErrors, setClientErrors] = useState<FieldErrors>({})

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors: FieldErrors = {}

    if (address.trim() === '') {
      nextErrors.email = ['Enter the email address for this reset link.']
    }

    if (password.length < 12) {
      nextErrors.password = ['Use at least 12 characters, with upper and lower case letters, a number, and a symbol.']
    }

    if (confirmation !== password) {
      nextErrors.password_confirmation = ['Enter the same password again.']
    }

    setClientErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) {
      return
    }

    onSubmit(address.trim(), password, confirmation)
  }

  const emailMessage = clientErrors.email?.[0] ?? fieldErrors.email?.[0] ?? null
  const passwordMessage = clientErrors.password?.[0] ?? fieldErrors.password?.[0] ?? null
  const confirmationMessage =
    clientErrors.password_confirmation?.[0] ?? fieldErrors.password_confirmation?.[0] ?? null

  return (
    <FormCard
      title="Choose a new password"
      description="The new password must be at least 12 characters and include upper and lower case letters, a number, and a symbol."
    >
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
          value={address}
          onChange={(event) => {
            setAddress(event.target.value)
          }}
          error={emailMessage !== null}
          helperText={emailMessage ?? ' '}
          slotProps={{ htmlInput: { 'aria-invalid': emailMessage !== null } }}
        />
        <TextField
          label="New password"
          type="password"
          name="password"
          autoComplete="new-password"
          fullWidth
          margin="normal"
          required
          value={password}
          onChange={(event) => {
            setPassword(event.target.value)
          }}
          error={passwordMessage !== null}
          helperText={passwordMessage ?? ' '}
          slotProps={{ htmlInput: { 'aria-invalid': passwordMessage !== null } }}
        />
        <TextField
          label="Confirm new password"
          type="password"
          name="password_confirmation"
          autoComplete="new-password"
          fullWidth
          margin="normal"
          required
          value={confirmation}
          onChange={(event) => {
            setConfirmation(event.target.value)
          }}
          error={confirmationMessage !== null}
          helperText={confirmationMessage ?? ' '}
          slotProps={{ htmlInput: { 'aria-invalid': confirmationMessage !== null } }}
        />
        <Button type="submit" variant="contained" fullWidth disabled={submitting} sx={{ mt: 2 }}>
          {submitting ? 'Saving…' : 'Save password'}
        </Button>
      </Box>
    </FormCard>
  )
}
