import {
  Alert,
  Box,
  Button,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { api, isApiError } from '../auth/api'
import type { AdminHome } from '../auth/types'
import { FormCard } from '../components/FormCard'


type Employee = {
  id: number
  name: string
  email: string
  status: string
  roles: string[]
  email_verified: boolean
  mfa_enrolled?: boolean
  invitation_pending?: boolean
  invitation_expires_at?: string | null
}

type EmployeePage = {
  data: Employee[]
  meta: {
    current_page: number
    last_page: number
    per_page: number
    total: number
  }
}

type RoleOption = {
  id: number
  name: string
  assignable: boolean
}

type EmployeesPageProps = {
  home: AdminHome
}

export function EmployeesPage({ home }: EmployeesPageProps) {
  const canInvite = home.permissions.includes('identity.users.invite')
  const canStatus = home.permissions.includes('identity.users.update-status')
  const canAssign = home.permissions.includes('identity.users.assign-role')
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [employees, setEmployees] = useState<EmployeePage | null>(null)
  const [selected, setSelected] = useState<Employee | null>(null)
  const [roles, setRoles] = useState<RoleOption[]>([])
  const [mode, setMode] = useState<'list' | 'invite' | 'detail'>('list')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [roleId, setRoleId] = useState('')
  const [status, setStatus] = useState('active')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  

  const load = useCallback(async () => {
    setLoading(true)
    setErrorMessage(null)

    try {
      const params = new URLSearchParams({ page: String(page) })

      if (query !== '') {
        params.set('search', query)
      }

      const result = await api<EmployeePage>(`/api/v1/admin/employees?${params.toString()}`)
      setEmployees(result)
    } catch (error) {
      setErrorMessage(isApiError(error) ? error.message : 'Employees could not be loaded.')
    } finally {
      setLoading(false)
    }
  }, [page, query])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!canInvite && !canAssign) {
      return
    }

    void api<{ roles: RoleOption[] }>('/api/v1/admin/roles')
      .then((result) => {
        setRoles(result.roles.filter((role) => role.assignable))
      })
      .catch(() => {
        setRoles([])
      })
  }, [canAssign, canInvite])

  async function openEmployee(id: number) {
    setSubmitting(true)
    setErrorMessage(null)
    setNotice(null)

    try {
      const employee = await api<Employee>(`/api/v1/admin/employees/${id}`)
      setSelected(employee)
      setRoleId(String(roles.find((role) => role.name === employee.roles[0])?.id ?? ''))
      setStatus(employee.status === 'suspended' ? 'suspended' : 'active')
      setMode('detail')
    } catch (error) {
      setErrorMessage(isApiError(error) ? error.message : 'That employee could not be opened.')
    } finally {
      setSubmitting(false)
    }
  }

  async function submitInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setErrorMessage(null)
    setNotice(null)

    try {
      await api('/api/v1/admin/employees', {
        method: 'POST',
        body: JSON.stringify({
          name,
          email,
          role_id: Number(roleId),
        }),
      })
      setName('')
      setEmail('')
      setRoleId('')
      setMode('list')
      setNotice('Invitation sent.')
      await load()
    } catch (error) {
      setErrorMessage(isApiError(error) ? error.message : 'The invitation could not be sent.')
    } finally {
      setSubmitting(false)
    }
  }

  async function saveStatus() {
    if (selected === null) {
      return
    }

    setSubmitting(true)
    setErrorMessage(null)

    try {
      const employee = await api<Employee>(`/api/v1/admin/employees/${selected.id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      })
      setSelected(employee)
      setNotice('Status saved. A suspended employee loses their current session.')
      await load()
    } catch (error) {
      setErrorMessage(isApiError(error) ? error.message : 'The status could not be saved.')
    } finally {
      setSubmitting(false)
    }
  }

  async function saveRole() {
    if (selected === null || roleId === '') {
      return
    }

    setSubmitting(true)
    setErrorMessage(null)

    try {
      const employee = await api<Employee>(`/api/v1/admin/employees/${selected.id}/role`, {
        method: 'PUT',
        body: JSON.stringify({ role_id: Number(roleId) }),
      })
      setSelected(employee)
      setNotice('Role saved. The employee’s current session must sign in again.')
      await load()
    } catch (error) {
      setErrorMessage(isApiError(error) ? error.message : 'The role could not be saved.')
    } finally {
      setSubmitting(false)
    }
  }

  async function resend() {
    if (selected === null) {
      return
    }

    setSubmitting(true)
    setErrorMessage(null)

    try {
      const employee = await api<Employee>(`/api/v1/admin/employees/${selected.id}/invitation`, {
        method: 'POST',
        body: JSON.stringify({}),
      })
      setSelected(employee)
      setNotice('A new invitation was sent. The previous link no longer works.')
    } catch (error) {
      setErrorMessage(isApiError(error) ? error.message : 'The invitation could not be sent again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (mode === 'invite') {
    return (
      <FormCard title="Invite an employee" description="The employee receives a one-time link and cannot sign in until they accept it and enroll an authenticator." maxWidth={640}>
        {errorMessage ? <Alert severity="error" sx={{ mb: 2 }}>{errorMessage}</Alert> : null}
        <Box component="form" onSubmit={(event) => void submitInvite(event)} noValidate>
          <TextField label="Name" name="name" required fullWidth margin="normal" value={name} onChange={(event) => setName(event.target.value)} />
          <TextField label="Email" name="email" type="email" autoComplete="off" required fullWidth margin="normal" value={email} onChange={(event) => setEmail(event.target.value)} />
          <TextField select label="Role" name="role_id" required fullWidth margin="normal" value={roleId} onChange={(event) => setRoleId(event.target.value)}>
            {roles.map((role) => (
              <MenuItem key={role.id} value={String(role.id)}>{role.name}</MenuItem>
            ))}
          </TextField>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 2 }}>
            <Button type="submit" variant="contained" disabled={submitting || roleId === ''}>Send invitation</Button>
            <Button type="button" variant="text" onClick={() => setMode('list')}>Back</Button>
          </Stack>
        </Box>
      </FormCard>
    )
  }

  if (mode === 'detail' && selected !== null) {
    return (
      <FormCard title={selected.name} description={selected.email} maxWidth={640}>
        {errorMessage ? <Alert severity="error" sx={{ mb: 2 }}>{errorMessage}</Alert> : null}
        {notice ? <Alert severity="success" sx={{ mb: 2 }}>{notice}</Alert> : null}
        <Typography variant="body2">Status: {selected.status}</Typography>
        <Typography variant="body2">Email verified: {selected.email_verified ? 'Yes' : 'No'}</Typography>
        <Typography variant="body2" sx={{ mb: 2 }}>
          Authenticator enrolled: {selected.mfa_enrolled ? 'Yes' : 'No'}
        </Typography>
        {selected.invitation_pending ? (
          <Typography variant="body2" sx={{ mb: 2 }}>
            Invitation pending{selected.invitation_expires_at ? ` until ${selected.invitation_expires_at}` : ''}.
          </Typography>
        ) : null}
        {canStatus && selected.status !== 'invited' ? (
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mb: 2 }}>
            <TextField select label="Account status" value={status} onChange={(event) => setStatus(event.target.value)}>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="suspended">Suspended</MenuItem>
            </TextField>
            <Button type="button" variant="contained" disabled={submitting} onClick={() => void saveStatus()}>Save status</Button>
          </Stack>
        ) : null}
        {canAssign ? (
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mb: 2 }}>
            <TextField select label="Role" value={roleId} onChange={(event) => setRoleId(event.target.value)}>
              {roles.map((role) => (
                <MenuItem key={role.id} value={String(role.id)}>{role.name}</MenuItem>
              ))}
            </TextField>
            <Button type="button" variant="contained" disabled={submitting || roleId === ''} onClick={() => void saveRole()}>Save role</Button>
          </Stack>
        ) : null}
        {canInvite && selected.invitation_pending ? (
          <Button type="button" variant="outlined" disabled={submitting} onClick={() => void resend()} sx={{ mr: 1 }}>
            Send invitation again
          </Button>
        ) : null}
        <Button type="button" variant="text" onClick={() => { setMode('list'); setNotice(null) }}>Back to employees</Button>
      </FormCard>
    )
  }

  return (
    <FormCard title="Employees" description="Search by name or email." maxWidth={960}>
      {errorMessage ? <Alert severity="error" sx={{ mb: 2 }}>{errorMessage}</Alert> : null}
      {notice ? <Alert severity="success" sx={{ mb: 2 }}>{notice}</Alert> : null}
      <Box component="form" onSubmit={(event) => { event.preventDefault(); setPage(1); setQuery(search.trim()) }} sx={{ mb: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
          <TextField label="Search employees" name="search" value={search} onChange={(event) => setSearch(event.target.value)} fullWidth />
          <Button type="submit" variant="contained">Search</Button>
          {canInvite ? <Button type="button" variant="outlined" onClick={() => { setMode('invite'); setErrorMessage(null); setNotice(null) }}>Invite employee</Button> : null}
        </Stack>
      </Box>
      {loading ? <Typography>Loading employees…</Typography> : null}
      {!loading && employees !== null && employees.data.length === 0 ? <Typography>No employees match this search.</Typography> : null}
      {employees !== null && employees.data.length > 0 ? (
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small" aria-label="Employees">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Roles</TableCell>
                <TableCell>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {employees.data.map((employee) => (
                <TableRow key={employee.id}>
                  <TableCell>{employee.name}</TableCell>
                  <TableCell>{employee.email}</TableCell>
                  <TableCell>{employee.status}</TableCell>
                  <TableCell>{employee.roles.join(', ') || 'None'}</TableCell>
                  <TableCell>
                    <Button type="button" onClick={() => void openEmployee(employee.id)} disabled={submitting}>Open</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      ) : null}
      {employees !== null ? (
        <Stack direction="row" spacing={1} sx={{ mt: 2 }} aria-label="Employee pages">
          <Button type="button" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>Previous</Button>
          <Typography sx={{ alignSelf: 'center' }}>Page {employees.meta.current_page} of {employees.meta.last_page}</Typography>
          <Button type="button" disabled={page >= employees.meta.last_page} onClick={() => setPage((current) => current + 1)}>Next</Button>
        </Stack>
      ) : null}
    </FormCard>
  )
}