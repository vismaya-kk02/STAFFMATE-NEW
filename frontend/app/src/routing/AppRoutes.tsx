import { Navigate, Route, Routes } from 'react-router-dom'
import AdminWorkspace, { OverviewContent } from '../pages/AdminWorkspace'
import AddWorkerPage from '../pages/AddWorkerPage'
import ProjectsPage from '../pages/ProjectsPage'
import WorkersPage from '../pages/WorkersPage'
import AccommodationPage from '../pages/AccommodationPage'
import TasksPage from '../pages/TasksPage'
import DocumentsPage from '../pages/DocumentsPage'
import ContactsPage from '../pages/ContactsPage'
import SalesPage from '../pages/SalesPage'
import SettingsPage from "../pages/SettingsPage";
import { GuestRoute, RequireAdmin, RequirePermission } from './guards'
import {
  AcceptInvitationRoute,
  AdminEmployeesRoute,
  AdminRolesRoute,
  ChallengeRequiredRoute,
  ExpiredRoute,
  ForbiddenRoute,
  ForgotPasswordRoute,
  LoginPage,
  MfaChallengeRoute,
  MfaCodesRoute,
  MfaEnrollRoute,
  NotFoundRoute,
  ResetPasswordRoute,
  UnavailableRoute,
  UnverifiedRoute,
} from './routePages'
import { ShellLayout } from './ShellLayout'

export function AppRoutes() {
  return (
    <Routes>
      {/* After login: the Overview page (no old shell, no green bar) */}
      <Route path="admin" element={<RequireAdmin />}>
        <Route element={<AdminWorkspace />}>
          <Route index element={<OverviewContent />} />

          {/* Projects page */}
          <Route path="projects" element={<ProjectsPage />} />
          <Route path="workers" element={<WorkersPage />} />
          <Route path="accommodation" element={<AccommodationPage />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route path="documents" element={<DocumentsPage />} />
          <Route path="contacts" element={<ContactsPage />} />
          <Route path="sales" element={<SalesPage />} />
          <Route path="settings" element={<SettingsPage />} />

          <Route element={<RequirePermission permission="identity.users.view" />}>
            <Route path="employees" element={<AdminEmployeesRoute />} />
          </Route>

          <Route element={<RequirePermission permission="identity.users.invite" />}>
            <Route path="add-worker" element={<AddWorkerPage />} />
          </Route>

          <Route element={<RequirePermission permission="identity.roles.view" />}>
            <Route path="roles" element={<AdminRolesRoute />} />
          </Route>
        </Route>
      </Route>

      {/* Login and auth pages keep the existing shell */}
      <Route element={<ShellLayout />}>
        <Route index element={<Navigate to="/admin" replace />} />

        <Route element={<GuestRoute />}>
          <Route path="login" element={<LoginPage />} />
          <Route path="forgot-password" element={<ForgotPasswordRoute />} />
        </Route>

        <Route path="reset-password/:token" element={<ResetPasswordRoute />} />
        <Route path="accept-invitation/:token" element={<AcceptInvitationRoute />} />

        <Route path="mfa">
          <Route path="challenge" element={<MfaChallengeRoute mode="code" />} />
          <Route path="recovery" element={<MfaChallengeRoute mode="recovery" />} />
          <Route path="enroll" element={<MfaEnrollRoute />} />
          <Route path="recovery-codes" element={<MfaCodesRoute />} />
          <Route path="verify-email" element={<UnverifiedRoute />} />
          <Route path="challenge-required" element={<ChallengeRequiredRoute />} />
        </Route>

        <Route path="forbidden" element={<ForbiddenRoute />} />
        <Route path="expired" element={<ExpiredRoute />} />
        <Route path="unavailable" element={<UnavailableRoute />} />
        <Route path="*" element={<NotFoundRoute />} />
      </Route>
    </Routes>
  )
}