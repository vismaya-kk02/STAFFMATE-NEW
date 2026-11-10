import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined'
import LockPersonOutlinedIcon from '@mui/icons-material/LockPersonOutlined'
import VerifiedUserOutlinedIcon from '@mui/icons-material/VerifiedUserOutlined'
import {
  Alert,
  Box,
  Button,
  Link,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useState, type FormEvent, type ReactNode } from 'react'
import type { FieldErrors } from '../auth/types'

type SignInPageProps = {
  productName: string
  submitting: boolean
  errorMessage: string | null
  notice: string | null
  fieldErrors: FieldErrors
  onSubmit: (email: string, password: string) => void
  onForgotPassword: () => void
}

const GREEN = '#1b7a43'
const GREEN_LIGHT = '#34B76A'
const DARK = '#0f1f18'

const features: Array<{ icon: ReactNode; text: string }> = [
  {
    icon: <VerifiedUserOutlinedIcon />,
    text: 'Two-step sign-in with an authenticator app',
  },
  {
    icon: <LockPersonOutlinedIcon />,
    text: 'Coordinators see only their own projects and workers',
  },
  {
    icon: <HistoryOutlinedIcon />,
    text: 'Every change is recorded in the audit history',
  },
]

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
  const accountLabel = productName.replace(/ Admin$/u, '')

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#fff' }}>
      <Box
        sx={{
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          flex: '0 0 55%',
          minWidth: 0,
          bgcolor: DARK,
          color: '#fff',
          borderLeft: `4px solid ${GREEN_LIGHT}`,
          px: 8,
          py: 7,
        }}
      >
        <Logo productName={productName} />

        <Box sx={{ mt: 8, maxWidth: 480 }}>
          <Typography
            component="h1"
            sx={{ fontSize: 36, fontWeight: 700, lineHeight: 1.15, letterSpacing: '-0.01em' }}
          >
            Your workforce, one place.
          </Typography>
          <Typography sx={{ mt: 2, fontSize: 15, lineHeight: 1.6, color: 'rgba(255,255,255,0.78)' }}>
            Workers, projects, accommodation and daily work status for Staffmate — with access
            that matches each person&apos;s role.
          </Typography>
        </Box>

        <Box sx={{ mt: 5, maxWidth: 470 }}>
          {features.map((feature, index) => (
            <Stack
              key={feature.text}
              direction="row"
              spacing={1.5}
              sx={{
                alignItems: 'center',
                py: 1.75,
                borderTop: '1px solid rgba(255,255,255,0.14)',
                borderBottom:
                  index === features.length - 1 ? '1px solid rgba(255,255,255,0.14)' : 'none',
                '& svg': { color: GREEN_LIGHT, fontSize: 20 },
              }}
            >
              {feature.icon}
              <Typography sx={{ fontSize: 14 }}>{feature.text}</Typography>
            </Stack>
          ))}
        </Box>

        <Typography sx={{ mt: 'auto', pt: 4, color: 'rgba(255,255,255,0.65)', fontSize: 12 }}>
          Secure Staffmate Admin access · sessions are logged
        </Typography>
      </Box>

      <Box
        sx={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          px: { xs: 3, md: 6 },
          py: { xs: 5, md: 3 },
        }}
      >
        <Box sx={{ display: { xs: 'block', md: 'none' }, mb: 4, alignSelf: 'flex-start' }}>
          <Logo productName={productName} />
        </Box>

        <Box
          component="form"
          onSubmit={handleSubmit}
          noValidate
          aria-busy={submitting}
          sx={{ width: '100%', maxWidth: 392 }}
        >
          <Typography component="h2" sx={{ fontSize: 24, fontWeight: 700, lineHeight: 1.2 }}>
            Sign in
          </Typography>
          <Typography sx={{ mt: 0.5, fontSize: 14, color: 'text.secondary' }}>
            Use your {accountLabel} employee account.
          </Typography>

          {notice ? (
            <Alert severity="success" sx={{ mt: 3 }}>
              {notice}
            </Alert>
          ) : null}
          {errorMessage ? (
            <Alert severity="error" sx={{ mt: 3 }}>
              {errorMessage}
            </Alert>
          ) : null}

          <Typography
            component="label"
            htmlFor="staffmate-sign-in-email"
            sx={{ mt: 3, mb: 0.75, display: 'block', fontWeight: 700, fontSize: 12 }}
          >
            Email
          </Typography>
          <TextField
            id="staffmate-sign-in-email"
            fullWidth
            type="email"
            name="email"
            autoComplete="username"
            required
            placeholder="name@example.com"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value)
            }}
            error={emailMessages.length > 0}
            helperText={emailMessages[0] ?? ' '}
            disabled={submitting}
            slotProps={{
              htmlInput: {
                'aria-invalid': emailMessages.length > 0,
              },
            }}
            sx={fieldSx}
          />

          <Typography
            component="label"
            htmlFor="staffmate-sign-in-password"
            sx={{ mt: 1, mb: 0.75, display: 'block', fontWeight: 700, fontSize: 12 }}
          >
            Password
          </Typography>
          <TextField
            id="staffmate-sign-in-password"
            fullWidth
            type="password"
            name="password"
            autoComplete="current-password"
            required
            placeholder="Password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value)
            }}
            error={passwordMessages.length > 0}
            helperText={passwordMessages[0] ?? ' '}
            disabled={submitting}
            slotProps={{
              htmlInput: {
                'aria-invalid': passwordMessages.length > 0,
              },
            }}
            sx={fieldSx}
          />

          <Box sx={{ textAlign: 'right', mt: 0.5 }}>
            <Link
              component="button"
              type="button"
              underline="none"
              onClick={onForgotPassword}
              disabled={submitting}
              sx={{ color: GREEN, fontWeight: 600, fontSize: 12 }}
            >
              Forgot password?
            </Link>
          </Box>

          <Button
            type="submit"
            fullWidth
            variant="contained"
            disabled={submitting}
            sx={{
              mt: 4,
              minHeight: 46,
              fontSize: 14,
              bgcolor: GREEN,
              boxShadow: 'none',
              '&:hover': { bgcolor: '#115C2F', boxShadow: 'none' },
            }}
          >
            {submitting ? 'Signing in…' : 'Continue'}
          </Button>

          <Typography
            sx={{
              mt: 4,
              width: '100%',
              textAlign: 'center',
              fontSize: 10,
              color: 'text.secondary',
            }}
          >
            © Staffmate s.r.o. · Access is logged
          </Typography>
        </Box>
      </Box>
    </Box>
  )
}

function Logo({ productName }: { productName: string }) {
  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        alignSelf: 'flex-start',
        height: 54,
        px: 2,
        bgcolor: '#fff',
        borderRadius: '6px',
      }}
    >
      <Box
        component="img"
        src="/staffmate-logo.png"
        alt={`${productName} logo`}
        sx={{ height: 34, width: 'auto', display: 'block' }}
      />
    </Box>
  )
}

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    bgcolor: '#f4f4f2',
    fontSize: 16,
    borderRadius: '6px',
    '& input': { py: 1.25, px: 2 },
    '& fieldset': { borderColor: '#c9c9c4' },
    '&:hover fieldset': { borderColor: '#9ca3af' },
    '&.Mui-focused fieldset': { borderColor: GREEN, borderWidth: 2 },
    '& input:-webkit-autofill': {
      WebkitBoxShadow: '0 0 0 100px #f4f4f2 inset',
      WebkitTextFillColor: '#111827',
      borderRadius: 'inherit',
    },
  },
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
