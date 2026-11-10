import { Box, Typography } from '@mui/material'
import type { SessionHome } from '../auth/types'
import { FormCard } from '../components/FormCard'

type DashboardPageProps = {
  home: SessionHome
}

export function DashboardPage({ home }: DashboardPageProps) {
  return (
    <FormCard title="Admin home" maxWidth={720}>
      <Typography variant="subtitle1" component="h3" gutterBottom>
        Signed in
      </Typography>
      <Typography variant="body1">{home.name}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {home.email}
      </Typography>
      <Typography variant="subtitle1" component="h3" gutterBottom>
        Roles
      </Typography>
      {home.roles.length === 0 ? (
        <Typography variant="body2">No roles are assigned.</Typography>
      ) : (
        <Box component="ul" sx={{ m: 0, pl: 3 }}>
          {home.roles.map((role) => (
            <Typography key={role} component="li" variant="body1">
              {role}
            </Typography>
          ))}
        </Box>
      )}
    </FormCard>
  )
}
