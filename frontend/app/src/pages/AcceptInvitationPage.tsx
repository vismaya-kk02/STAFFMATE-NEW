import { Alert, Box, Button, TextField } from '@mui/material'
import { useState, type FormEvent } from 'react'
import type { FieldErrors } from '../auth/types'
import { FormCard } from '../components/FormCard'

type AcceptInvitationPageProps = {
  submitting: boolean
  errorMessage: string | null
  fieldErrors: FieldErrors
  onSubmit: (password: string, confirmation: string) => void
}

export function AcceptInvitationPage({
  submitting,
  errorMessage,
  fieldErrors,
  onSubmit,
}: AcceptInvitationPageProps) {
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSubmit(password, confirmation)
  }

  return (
    <FormCard
      title="Accept your invitation"
      description="Choose a password for this invitation. You will sign in next and enroll an authenticator before Staffmate opens."
    >
      {errorMessage ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorMessage}
        </Alert>
      ) : null}
      <Box component="form" onSubmit={handleSubmit} noValidate aria-busy={submitting}>
        <TextField
          label="Password"
          type="password"
          name="password"
          autoComplete="new-password"
          required
          fullWidth
          margin="normal"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={(fieldErrors.password?.length ?? 0) > 0}
          helperText={
            fieldErrors.password?.[0] ??
            'At least 12 characters, with upper and lower case letters, a number, and a symbol.'
          }
        />
        <TextField
          label="Confirm password"
          type="password"
          name="password_confirmation"
          autoComplete="new-password"
          required
          fullWidth
          margin="normal"
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          error={(fieldErrors.password_confirmation?.length ?? 0) > 0}
          helperText={fieldErrors.password_confirmation?.[0] ?? ' '}
        />
        <Button type="submit" variant="contained" fullWidth disabled={submitting} sx={{ mt: 2 }}>
          {submitting ? 'Saving…' : 'Create account password'}
        </Button>
      </Box>
    </FormCard>
  )
}
