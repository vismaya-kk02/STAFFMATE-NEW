import { Alert, Button, Stack } from '@mui/material'
import { FormCard } from '../components/FormCard'

type StatusPageProps = {
  title: string
  message: string
  severity?: 'error' | 'warning' | 'info' | 'success'
  actionLabel?: string
  onAction?: () => void
  secondaryLabel?: string
  onSecondary?: () => void
  busy?: boolean
}

export function StatusPage({
  title,
  message,
  severity = 'info',
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondary,
  busy = false,
}: StatusPageProps) {
  return (
    <FormCard title={title}>
      <Alert severity={severity} sx={{ mb: 3 }}>
        {message}
      </Alert>
      <Stack spacing={1}>
        {actionLabel && onAction ? (
          <Button type="button" variant="contained" onClick={onAction} disabled={busy}>
            {actionLabel}
          </Button>
        ) : null}
        {secondaryLabel && onSecondary ? (
          <Button type="button" variant="outlined" onClick={onSecondary} disabled={busy}>
            {secondaryLabel}
          </Button>
        ) : null}
      </Stack>
    </FormCard>
  )
}
