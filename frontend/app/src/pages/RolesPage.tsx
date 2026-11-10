import {
  Alert,
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import { useEffect, useState, type FormEvent } from 'react'
import { api, isApiError } from '../auth/api'
import type { SessionHome } from '../auth/types'
import { FormCard } from '../components/FormCard'

type PermissionOption = {
  name: string
  label: string
}

type RoleRecord = {
  id: number
  name: string
  system: boolean
  permissions: string[]
  assignable: boolean
}

type RoleCatalog = {
  permissions: PermissionOption[]
  roles: RoleRecord[]
}

export function RolesPage({ home }: { home: SessionHome }) {
  const canManage = home.permissions.includes('identity.roles.manage')
  const [catalog, setCatalog] = useState<RoleCatalog | null>(null)
  const [editing, setEditing] = useState<RoleRecord | null>(null)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false

    void (async () => {
      try {
        const result = await api<RoleCatalog>('/api/v1/admin/roles')

        if (cancelled) {
          return
        }

        setCatalog(result)
        setErrorMessage(null)
        setLoading(false)
      } catch (error) {
        if (cancelled) {
          return
        }

        setErrorMessage(isApiError(error) ? error.message : 'Roles could not be loaded.')
        setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  async function reloadRoles() {
    setLoading(true)
    setErrorMessage(null)

    try {
      setCatalog(await api<RoleCatalog>('/api/v1/admin/roles'))
    } catch (error) {
      setErrorMessage(isApiError(error) ? error.message : 'Roles could not be loaded.')
    } finally {
      setLoading(false)
    }
  }

  function startCreate() {
    setCreating(true)
    setEditing(null)
    setName('')
    setSelected([])
    setNotice(null)
    setErrorMessage(null)
  }

  function startEdit(role: RoleRecord) {
    setCreating(false)
    setEditing(role)
    setName(role.name)
    setSelected(role.permissions)
    setNotice(null)
    setErrorMessage(null)
  }

  function togglePermission(permission: string) {
    setSelected((current) => (
      current.includes(permission)
        ? current.filter((item) => item !== permission)
        : [...current, permission]
    ))
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setErrorMessage(null)

    try {
      const payload = { name, permissions: selected }

      if (creating) {
        await api('/api/v1/admin/roles', { method: 'POST', body: JSON.stringify(payload) })
        setNotice('Custom role created.')
      } else if (editing !== null) {
        await api(`/api/v1/admin/roles/${editing.id}`, { method: 'PUT', body: JSON.stringify(payload) })
        setNotice('Custom role saved. Employees with this role must sign in again.')
      }

      setCreating(false)
      setEditing(null)
      await reloadRoles()
    } catch (error) {
      setErrorMessage(isApiError(error) ? error.message : 'The role could not be saved.')
    } finally {
      setSubmitting(false)
    }
  }

  if (creating || editing !== null) {
    return (
      <FormCard
        title={creating ? 'Create a custom role' : `Edit ${editing?.name ?? 'role'}`}
        description="Custom roles can use only the approved permission catalog. System roles, including Super Admin, stay fixed."
        maxWidth={720}
      >
        {errorMessage ? <Alert severity="error" sx={{ mb: 2 }}>{errorMessage}</Alert> : null}
        <Box component="form" onSubmit={(event) => void save(event)}>
          <TextField label="Role name" name="name" required fullWidth margin="normal" value={name} onChange={(event) => setName(event.target.value)} />
          <Typography variant="subtitle1" component="h3" sx={{ mt: 2 }}>Permissions</Typography>
          <FormGroup>
            {(catalog?.permissions ?? []).map((permission) => (
              <FormControlLabel
                key={permission.name}
                control={
                  <Checkbox
                    checked={selected.includes(permission.name)}
                    onChange={() => togglePermission(permission.name)}
                    slotProps={{ input: { 'aria-label': permission.label } }}
                  />
                }
                label={permission.label}
              />
            ))}
          </FormGroup>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 2 }}>
            <Button type="submit" variant="contained" disabled={submitting}>Save role</Button>
            <Button type="button" variant="text" onClick={() => { setCreating(false); setEditing(null) }}>Back</Button>
          </Stack>
        </Box>
      </FormCard>
    )
  }

  return (
    <FormCard title="Roles and permissions" description="System roles are protected. Custom roles use the catalog below." maxWidth={960}>
      {errorMessage ? <Alert severity="error" sx={{ mb: 2 }}>{errorMessage}</Alert> : null}
      {notice ? <Alert severity="success" sx={{ mb: 2 }}>{notice}</Alert> : null}
      {canManage ? <Button type="button" variant="contained" onClick={startCreate} sx={{ mb: 2 }}>Create custom role</Button> : null}
      {loading ? <Typography>Loading roles…</Typography> : null}
      {catalog !== null ? (
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small" aria-label="Role permission matrix">
            <TableHead>
              <TableRow>
                <TableCell>Role</TableCell>
                {catalog.permissions.map((permission) => (
                  <TableCell key={permission.name}>{permission.label}</TableCell>
                ))}
                <TableCell>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {catalog.roles.map((role) => (
                <TableRow key={role.id}>
                  <TableCell>
                    {role.name}
                    {role.system ? ' (system)' : ''}
                  </TableCell>
                  {catalog.permissions.map((permission) => (
                    <TableCell key={permission.name}>{role.permissions.includes(permission.name) ? 'Yes' : 'No'}</TableCell>
                  ))}
                  <TableCell>
                    {!role.system && canManage ? (
                      <Button type="button" onClick={() => startEdit(role)}>Edit</Button>
                    ) : (
                      'Protected'
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      ) : null}
    </FormCard>
  )
}
