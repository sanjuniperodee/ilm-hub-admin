import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { AuthProvider } from './contexts/AuthContext'
import { PrivateRoute } from './components/PrivateRoute'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import UsersPage from './pages/UsersPage'
import UserDetailPage from './pages/UserDetailPage'
import CoursesPage from './pages/CoursesPage'
import CourseEditPage from './pages/CourseEditPage'
import ModulesPage from './pages/ModulesPage'
import ModuleEditPage from './pages/ModuleEditPage'
import LessonsPage from './pages/LessonsPage'
import LessonEditPage from './pages/LessonEditPage'
import LessonBlocksPage from './pages/LessonBlocksPage'
import LessonBlockEditPage from './pages/LessonBlockEditPage'
import TestsPage from './pages/TestsPage'
import ContentStudioPage from './pages/ContentStudioPage'
import LessonDetailPage from './pages/LessonDetailPage'
import TestDetailPage from './pages/TestDetailPage'
import Layout from './components/Layout'
import DetailLayout from './components/DetailLayout'
import WordsAlphabetPage from './pages/WordsAlphabetPage'
import WordsDictionaryPage from './pages/WordsDictionaryPage'
import WordsCardsPage from './pages/WordsCardsPage'

const theme = createTheme({
  palette: {
    primary: {
      main: '#007AFF',
    },
    secondary: {
      main: '#34C759',
    },
    background: {
      default: '#F5F5F7',
    },
  },
  shape: {
    borderRadius: 14,
  },
  typography: {
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    h4: {
      fontWeight: 700,
      letterSpacing: -0.3,
    },
    h6: {
      fontWeight: 650,
    },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 20,
          border: '1px solid #E5E5EA',
          boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          textTransform: 'none',
          fontWeight: 600,
        },
      },
    },
  },
})

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
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
              <Route path="content-studio" element={<ContentStudioPage />} />
              <Route path="users" element={<UsersPage />} />
              <Route path="users/:id" element={<UserDetailPage />} />
              <Route path="courses" element={<CoursesPage />} />
              <Route path="courses/new" element={<CourseEditPage />} />
              <Route path="courses/:id" element={<CourseEditPage />} />
              <Route path="modules" element={<ModulesPage />} />
              <Route path="modules/new" element={<ModuleEditPage />} />
              <Route path="modules/:id" element={<ModuleEditPage />} />
              <Route path="lessons" element={<LessonsPage />} />
              <Route path="lessons/new" element={<LessonEditPage />} />
              <Route path="lessons/:id" element={<LessonEditPage />} />
              <Route path="lesson-blocks" element={<LessonBlocksPage />} />
              <Route path="lesson-blocks/new" element={<LessonBlockEditPage />} />
              <Route path="lesson-blocks/:id" element={<LessonBlockEditPage />} />
              <Route path="tests" element={<TestsPage />} />
              <Route path="words-alphabet" element={<WordsAlphabetPage />} />
              <Route path="words-dictionary" element={<WordsDictionaryPage />} />
              <Route path="words-cards" element={<WordsCardsPage />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Route>
            <Route
              path="content-studio/lessons/:lessonId"
              element={
                <PrivateRoute>
                  <DetailLayout />
                </PrivateRoute>
              }
            >
              <Route index element={<LessonDetailPage />} />
              <Route path="test" element={<TestDetailPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
