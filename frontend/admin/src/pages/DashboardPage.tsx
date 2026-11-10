import type { AdminHome } from '../auth/types'

export function DashboardPage({ home }: { home: AdminHome }) {
  return <h1 style={{ color: 'red' }}>TEST {home.name}</h1>
}