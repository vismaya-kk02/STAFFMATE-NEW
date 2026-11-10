import { Alert, Box, Button, Link, TextField } from '@mui/material'
import { useState, type FormEvent } from 'react'
import type { FieldErrors } from '../auth/types'
import { FormCard } from '../components/FormCard'

type MfaChallengePageProps = {
  mode: 'code' | 'recovery'
  submitting: boolean
  errorMessage: string | null
  fieldErrors: FieldErrors
  onSubmitCode: (code: string) => void
  onSubmitRecovery: (recoveryCode: string) => void
  onUseRecovery: () => void
  onUseCode: () => void
}

export function MfaChallengePage({
  mode,
  submitting,
  errorMessage,
  fieldErrors,
  onSubmitCode,
  onSubmitRecovery,
  onUseRecovery,
  onUseCode,
}: MfaChallengePageProps) {
  const [code, setCode] = useState('')
  const [recoveryCode, setRecoveryCode] = useState('')
  const [clientError, setClientError] = useState<string | null>(null)

  function handleCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!/^\d{6}$/.test(code)) {
      setClientError('Enter the six-digit code from your authenticator.')

      return
    }

    setClientError(null)
    onSubmitCode(code)
  }

  function handleRecovery(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmed = recoveryCode.trim()

    if (trimmed === '') {
      setClientError('Enter a recovery code.')

      return
    }

    setClientError(null)
    onSubmitRecovery(trimmed)
  }

  const codeMessage = clientError ?? fieldErrors.code?.[0] ?? null
  const recoveryMessage = clientError ?? fieldErrors.recovery_code?.[0] ?? null

  if (mode === 'recovery') {
    return (
      <FormCard
        title="Use a recovery code"
        description="Each recovery code works once. After it is accepted, it cannot be used again."
      >
        {errorMessage ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {errorMessage}
          </Alert>
        ) : null}
        <Box component="form" onSubmit={handleRecovery} noValidate aria-busy={submitting}>
          <TextField
            label="Recovery code"
            name="recovery_code"
            autoComplete="off"
            fullWidth
            margin="normal"
            required
            value={recoveryCode}
            onChange={(event) => {
              setRecoveryCode(event.target.value)
            }}
            error={recoveryMessage !== null}
            helperText={recoveryMessage ?? ' '}
            slotProps={{ htmlInput: { 'aria-invalid': recoveryMessage !== null } }}
          />
          <Button type="submit" variant="contained" fullWidth disabled={submitting} sx={{ mt: 2 }}>
            {submitting ? 'Checking…' : 'Continue'}
          </Button>
        </Box>
        <Link component="button" type="button" onClick={onUseCode} sx={{ mt: 2, display: 'inline-flex' }}>
          Use an authenticator code
        </Link>
      </FormCard>
    )
  }

  return (
    <FormCard
      title="Authenticator challenge"
      description="Enter the six-digit code from your authenticator app to finish signing in."
    >
      {errorMessage ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorMessage}
        </Alert>
      ) : null}
      <Box component="form" onSubmit={handleCode} noValidate aria-busy={submitting}>
        <TextField
          label="Authenticator code"
          name="code"
          autoComplete="one-time-code"
          fullWidth
          margin="normal"
          required
          value={code}
          onChange={(event) => {
            setCode(event.target.value.replace(/\D/g, '').slice(0, 6))
          }}
          error={codeMessage !== null}
          helperText={codeMessage ?? ' '}
          slotProps={{
            htmlInput: {
              inputMode: 'numeric',
              pattern: '[0-9]*',
              maxLength: 6,
              'aria-invalid': codeMessage !== null,
            },
          }}
        />
        <Button type="submit" variant="contained" fullWidth disabled={submitting} sx={{ mt: 2 }}>
          {submitting ? 'Checking…' : 'Verify'}
        </Button>
      </Box>
      <Link component="button" type="button" onClick={onUseRecovery} sx={{ mt: 2, display: 'inline-flex' }}>
        Use a recovery code
      </Link>
    </FormCard>
  )
}
