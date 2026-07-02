import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/lib/auth';
import { ProtectedRoute } from '@/components/protected-route';
import { PublicRoute } from '@/components/public-route';
import { LoginPage } from '@/components/login-page';

import { UsersListPage } from '@/components/users-list-page';
import { CreateUserPage } from '@/components/create-user-page';
import { CreateTicketPage } from '@/components/create-ticket-page';
import { TicketsListPage } from '@/components/tickets-list-page';
import { TicketDetailPage } from '@/components/ticket-detail-page';
import { AppShell } from '@/components/app-shell';
import { DashboardPage } from './components/dashboard';

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppShell>
                  <DashboardPage />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/users"
            element={
              <ProtectedRoute>
                <AppShell>
                  <UsersListPage />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/tickets"
            element={
              <ProtectedRoute>
                <AppShell>
                  <TicketsListPage />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/tickets/:id"
            element={
              <ProtectedRoute>
                <AppShell>
                  <TicketDetailPage />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/tickets/create"
            element={
              <ProtectedRoute>
                <AppShell>
                  <CreateTicketPage />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/users/create"
            element={
              <ProtectedRoute>
                <AppShell>
                  <CreateUserPage />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/login"
            element={
              <PublicRoute>
                <LoginPage />
              </PublicRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
