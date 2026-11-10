import { Box } from '@mui/material'
import { useAuth } from '../auth/useAuth'
import { CrmWorkspace } from './CrmWorkspace'
import { SectionNav } from './SectionNav'

export function CrmSection() {
  const { home } = useAuth()

  if (home === null) {
    return null
  }

  return (
    <Box sx={{ width: '100%', maxWidth: 960 }}>
      <SectionNav home={home} />
      <CrmWorkspace home={home} />
    </Box>
  )
}
