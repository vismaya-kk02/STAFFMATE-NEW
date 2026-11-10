import { Alert, Box, Button, Checkbox, FormControlLabel, Typography } from '@mui/material'
import { useState } from 'react'
import { FormCard } from '../components/FormCard'

type RecoveryCodesPageProps = {
  codes: string[]
  onAcknowledge: () => void
}

export function RecoveryCodesPage({ codes, onAcknowledge }: RecoveryCodesPageProps) {
  const [stored, setStored] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  function handleContinue() {
    if (!stored) {
      setErrorMessage('Confirm that you have stored these recovery codes before continuing.')

      return
    }

    onAcknowledge()
  }

  return (
    <FormCard
      title="Save your recovery codes"
      description="These codes are shown only on this screen. They are not saved in this browser. Store them somewhere safe before you continue. A refresh clears this page."
      maxWidth={560}
    >
      {errorMessage ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorMessage}
        </Alert>
      ) : null}
      <Box
        component="ul"
        aria-label="Recovery codes"
        sx={{
          pl: 3,
          py: 1,
          mb: 2,
          fontFamily: 'ui-monospace, Consolas, monospace',
          bgcolor: 'action.hover',
          borderRadius: 1,
        }}
      >
        {codes.map((code) => (
          <Typography key={code} component="li" variant="body1" sx={{ py: 0.5 }}>
            {code}
          </Typography>
        ))}
      </Box>
      <FormControlLabel
        control={
          <Checkbox
            checked={stored}
            onChange={(event) => {
              setStored(event.target.checked)
              setErrorMessage(null)
            }}
            slotProps={{ input: { 'aria-describedby': 'recovery-acknowledgement' } }}
          />
        }
        label="I have stored these recovery codes in a safe place."
      />
      <Typography id="recovery-acknowledgement" variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Staffmate cannot show these codes again after you continue, and this page does not keep a copy.
      </Typography>
      <Button type="button" variant="contained" fullWidth disabled={!stored} onClick={handleContinue}>
        Continue to Admin
      </Button>
    </FormCard>
  )
}
