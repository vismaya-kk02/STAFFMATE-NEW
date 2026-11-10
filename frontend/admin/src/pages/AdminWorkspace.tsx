import { Box, Button, Stack } from '@mui/material'
import { useState } from 'react'
import type { AdminHome } from '../auth/types'
import { DashboardPage } from './DashboardPage'
import { EmployeesPage } from './EmployeesPage'
import { RolesPage } from './RolesPage'
import  AddWorkerPage  from './AddWorkerPage'

type Panel = 'home' | 'employees' | 'roles' | 'add-worker'

export function AdminWorkspace({ home }: { home: AdminHome }) {
  const [panel, setPanel] = useState<Panel>('home')
  const permissions = home.permissions

  return (
    <Box sx={{ width: '100%', maxWidth: 960 }}>
      <Stack
        component="nav"
        aria-label="Admin sections"
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        sx={{ mb: 2 }}
      >
        <Button
          type="button"
          variant={panel === 'home' ? 'contained' : 'outlined'}
          onClick={() => {
            setPanel('home')
          }}
        >
          Home
        </Button>
        {permissions.includes('identity.users.view') ? (
          <Button
            type="button"
            variant={panel === 'employees' ? 'contained' : 'outlined'}
            onClick={() => {
              setPanel('employees')
            }}
          >
            Employees
          </Button>
        ) : null}
        {permissions.includes('identity.roles.view') ? (
          <Button
            type="button"
            variant={panel === 'roles' ? 'contained' : 'outlined'}
            onClick={() => {
              setPanel('roles')
            }}
          >
            Roles
          </Button>
        ) : null}
        <Button
          type="button"
          variant={panel === 'add-worker' ? 'contained' : 'outlined'}
          onClick={() => setPanel('add-worker')}
        >
          Add Worker
        </Button>
      </Stack>
      {panel === 'home' ? <DashboardPage home={home} /> : null}
      {panel === 'employees' ? <EmployeesPage home={home} /> : null}
      {panel === 'roles' ? <RolesPage home={home} /> : null}
      {panel === 'add-worker' ? <AddWorkerPage /> : null}
    </Box>
  )
}
