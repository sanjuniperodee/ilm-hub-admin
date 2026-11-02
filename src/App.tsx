import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { AuthProvider } from './contexts/AuthContext'
import { PrivateRoute } from './components/PrivateRoute'
import Layout from './components/Layout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { theme, color, fontFamily, radius } from './theme'
import { ConfirmProvider, LoadingState } from './components/ui'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})
const LoginPage = lazy(() => import('./pages/LoginPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const UsersPage = lazy(() => import('./pages/UsersPage'))
const UserDetailPage = lazy(() => import('./pages/UserDetailPage'))
const ContentHubPage = lazy(() => import('./pages/ContentHubPage'))
const LessonEditorPage = lazy(() => import('./pages/LessonEditorPage'))
const CourseEditorPage = lazy(() => import('./pages/CourseEditorPage'))
const ModuleEditorPage = lazy(() => import('./pages/ModuleEditorPage'))
const ModuleTestPage = lazy(() => import('./pages/ModuleTestPage'))
const LevelTestPage = lazy(() => import('./pages/LevelTestPage'))
const OnboardingPlacementTestPage = lazy(() => import('./pages/OnboardingPlacementTestPage'))
const WordsAlphabetPage = lazy(() => import('./pages/WordsAlphabetPage'))
const WordsDictionaryPage = lazy(() => import('./pages/WordsDictionaryPage'))
const WordsCardsPage = lazy(() => import('./pages/WordsCardsPage'))
const IslamAllahNamesPage = lazy(() => import('./pages/IslamAllahNamesPage'))
const IslamQuranPage = lazy(() => import('./pages/IslamQuranPage'))
const IslamHajjGuidePage = lazy(() => import('./pages/IslamHajjGuidePage'))
const AuditPage = lazy(() => import('./pages/AuditPage'))
const AdminManagementPage = lazy(() => import('./pages/AdminManagementPage'))
const CustomRolesPage = lazy(() => import('./pages/CustomRolesPage'))
const PushNotificationsPage = lazy(() => import('./pages/PushNotificationsPage'))
const AcceptInvitationPage = lazy(() => import('./pages/AcceptInvitationPage'))

function RouteFallback() {
  return <LoadingState variant="spinner" minHeight={320} label="Загружаем страницу…" />
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Toaster
          position="bottom-right"
          toastOptions={{
            duration: 4000,
            style: {
              borderRadius: `${radius.md}px`,
              background: color.ink[900],
              color: '#FFF8EE',
              fontFamily: fontFamily.sans,
              fontSize: '0.875rem',
              padding: '10px 14px',
              maxWidth: 420,
            },
            success: { iconTheme: { primary: color.success.light, secondary: color.ink[900] } },
            error: { iconTheme: { primary: color.error.light, secondary: '#FFF8EE' }, duration: 6000 },
          }}
        />
        <ConfirmProvider>
          <AuthProvider>
            <BrowserRouter>
              <Suspense fallback={<RouteFallback />}>
                <Routes>
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/accept-invitation" element={<AcceptInvitationPage />} />
                  <Route
                    path="/"
                    element={
                      <PrivateRoute>
                        <Layout />
                      </PrivateRoute>
                    }
                  >
                    <Route index element={<Navigate to="/dashboard" replace />} />
                    <Route path="dashboard" element={<DashboardPage />} />
                    <Route path="content" element={<ContentHubPage />} />
                    <Route path="content/courses/:courseId" element={<ContentHubPage />} />
                    <Route path="content/courses/:courseId/modules/:moduleId" element={<ContentHubPage />} />
                    <Route path="content/courses/:courseId/modules/:moduleId/lessons/:lessonId" element={<LessonEditorPage />} />
                    <Route path="content/courses/:courseId/lessons/:lessonId" element={<LessonEditorPage />} />
                    <Route path="content/courses/:courseId/edit" element={<CourseEditorPage />} />
                    <Route path="content/courses/:courseId/modules/:moduleId/edit" element={<ModuleEditorPage />} />
                    <Route path="content/courses/:courseId/modules/:moduleId/test" element={<ModuleTestPage />} />
                    <Route path="content/level-tests/:levelCode" element={<LevelTestPage />} />
                    <Route
                      path="content/onboarding-placement/:slot"
                      element={<OnboardingPlacementTestPage />}
                    />
                    <Route
                      path="users"
                      element={
                        <ProtectedRoute requiredRoles={['admin', 'support']}>
                          <UsersPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="users/:id"
                      element={
                        <ProtectedRoute requiredRoles={['admin', 'support']}>
                          <UserDetailPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="push-notifications"
                      element={
                        <ProtectedRoute requiredRoles={['admin']}>
                          <PushNotificationsPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="admin-management"
                      element={
                        <ProtectedRoute requiredRoles={['admin']}>
                          <AdminManagementPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="custom-roles"
                      element={
                        <ProtectedRoute requiredRoles={['admin']}>
                          <CustomRolesPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="audit"
                      element={
                        <ProtectedRoute requiredRoles={['admin']}>
                          <AuditPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route path="words-alphabet" element={<WordsAlphabetPage />} />
                    <Route path="words-dictionary" element={<WordsDictionaryPage />} />
                    <Route path="words-cards" element={<WordsCardsPage />} />
                    <Route path="islam-names" element={<IslamAllahNamesPage />} />
                    <Route path="islam-quran" element={<IslamQuranPage />} />
                    <Route path="islam-hajj" element={<IslamHajjGuidePage />} />
                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                  </Route>
                </Routes>
              </Suspense>
            </BrowserRouter>
          </AuthProvider>
        </ConfirmProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}

export default App
