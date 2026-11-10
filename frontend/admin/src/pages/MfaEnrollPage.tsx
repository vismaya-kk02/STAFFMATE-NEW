import { Alert, Box, Button, CircularProgress, TextField, Typography } from '@mui/material'
import { useEffect, useState, type FormEvent } from 'react'
import { isApiError } from '../auth/api'
import {
  beginEnrollment,
  confirmEnrollment,
  confirmPassword,
  resetEnrollmentSetup,
} from '../auth/enrollment'
import type { EnrollmentSetup } from '../auth/enrollment'
import type { FieldErrors } from '../auth/types'
import { FormCard } from '../components/FormCard'

type MfaEnrollPageProps = {
  onEnrolled: (codes: string[]) => void
}

export function MfaEnrollPage({ onEnrolled }: MfaEnrollPageProps) {
  const [setup, setSetup] = useState<EnrollmentSetup | null>(null)
  const [needsPassword, setNeedsPassword] = useState(false)
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  useEffect(() => {
    let active = true

    void beginEnrollment()
      .then((next) => {
        if (!active) {
          return
        }

        setSetup(next)
        setNeedsPassword(false)
        setLoading(false)
      })
      .catch((error: unknown) => {
        if (!active) {
          return
        }

        if (isApiError(error) && error.status === 423) {
          setNeedsPassword(true)
          setLoading(false)

          return
        }

        setErrorMessage(isApiError(error) ? error.message : 'Authenticator setup could not be started.')
        setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  async function handlePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (password === '') {
      setFieldErrors({ password: ['Enter your password to continue enrollment.'] })

      return
    }

    setSubmitting(true)
    setErrorMessage(null)
    setFieldErrors({})

    try {
      await confirmPassword(password)
      resetEnrollmentSetup()
      const next = await beginEnrollment()
      setSetup(next)
      setNeedsPassword(false)
      setPassword('')
    } catch (error) {
      setErrorMessage(isApiError(error) ? error.message : 'Password confirmation failed.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleConfirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!/^\d{6}$/.test(code)) {
      setFieldErrors({ code: ['Enter the six-digit code from your authenticator.'] })

      return
    }

    setSubmitting(true)
    setErrorMessage(null)
    setFieldErrors({})

    try {
      const codes = await confirmEnrollment(code)
      onEnrolled(codes)
    } catch (error) {
      const messages = isApiError(error) ? error.errors.code : undefined
      setFieldErrors(messages ? { code: messages } : {})
      setErrorMessage(isApiError(error) ? error.message : 'The authenticator code could not be confirmed.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <FormCard title="Set up your authenticator" description="Preparing a new authenticator key.">
        <CircularProgress aria-label="Loading authenticator setup" />
      </FormCard>
    )
  }

  if (setup === null && !needsPassword) {
    return (
      <FormCard title="Set up your authenticator" description="Authenticator setup did not start.">
        {errorMessage ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {errorMessage}
          </Alert>
        ) : null}
        <Button
          type="button"
          variant="contained"
          onClick={() => {
            resetEnrollmentSetup()
            setLoading(true)
            setErrorMessage(null)
            void beginEnrollment()
              .then((next) => {
                setSetup(next)
                setNeedsPassword(false)
                setLoading(false)
              })
              .catch((error: unknown) => {
                if (isApiError(error) && error.status === 423) {
                  setNeedsPassword(true)
                  setLoading(false)

                  return
                }

                setErrorMessage(
                  isApiError(error) ? error.message : 'Authenticator setup could not be started.',
                )
                setLoading(false)
              })
          }}
        >
          Try again
        </Button>
      </FormCard>
    )
  }

  if (needsPassword || setup === null) {
    return (
      <FormCard
        title="Confirm your password"
        description="Enrollment changes require a recent password confirmation."
      >
        {errorMessage ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {errorMessage}
          </Alert>
        ) : null}
        <Box component="form" onSubmit={handlePassword} noValidate aria-busy={submitting}>
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
            error={(fieldErrors.password?.length ?? 0) > 0}
            helperText={fieldErrors.password?.[0] ?? ' '}
            slotProps={{
              htmlInput: { 'aria-invalid': (fieldErrors.password?.length ?? 0) > 0 },
            }}
          />
          <Button type="submit" variant="contained" fullWidth disabled={submitting} sx={{ mt: 2 }}>
            {submitting ? 'Confirming…' : 'Continue'}
          </Button>
        </Box>
      </FormCard>
    )
  }

  const svg = setup.qr.svg.trimStart().startsWith('<svg') ? setup.qr.svg : ''

  return (
    <FormCard
      title="Set up your authenticator"
      description="Scan the QR code or enter the key in an authenticator app, then enter the six-digit code."
      maxWidth={520}
    >
      {errorMessage ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorMessage}
        </Alert>
      ) : null}
      {svg !== '' ? (
        <Box
          role="img"
          aria-label="Authenticator QR code"
          sx={{
            mb: 2,
            p: 1,
            bgcolor: 'common.white',
            border: 1,
            borderColor: 'divider',
            display: 'inline-flex',
            '& svg': { display: 'block', width: 180, height: 180 },
          }}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      ) : (
        <Alert severity="warning" sx={{ mb: 2 }}>
          The QR code could not be shown. Enter the key manually.
        </Alert>
      )}
      <TextField
        label="Manual entry key"
        value={setup.secret.secretKey}
        fullWidth
        margin="normal"
        slotProps={{
          htmlInput: { readOnly: true, 'aria-readonly': true },
        }}
      />
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Keep this key in your authenticator. It is not stored in this browser.
      </Typography>
      <Box component="form" onSubmit={handleConfirm} noValidate aria-busy={submitting}>
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
          error={(fieldErrors.code?.length ?? 0) > 0}
          helperText={fieldErrors.code?.[0] ?? ' '}
          slotProps={{
            htmlInput: {
              inputMode: 'numeric',
              pattern: '[0-9]*',
              maxLength: 6,
              'aria-invalid': (fieldErrors.code?.length ?? 0) > 0,
            },
          }}
        />
        <Button type="submit" variant="contained" fullWidth disabled={submitting} sx={{ mt: 2 }}>
          {submitting ? 'Confirming…' : 'Confirm authenticator'}
        </Button>
      </Box>
    </FormCard>
  )
}
