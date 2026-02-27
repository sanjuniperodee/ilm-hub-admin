import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { AuthProvider } from './contexts/AuthContext'
import { PrivateRoute } from './components/PrivateRoute'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import UsersPage from './pages/UsersPage'
import UserDetailPage from './pages/UserDetailPage'
import ContentHubPage from './pages/ContentHubPage'
import LessonEditorPage from './pages/LessonEditorPage'
import CourseEditorPage from './pages/CourseEditorPage'
import ModuleEditorPage from './pages/ModuleEditorPage'
import ModuleTestPage from './pages/ModuleTestPage'
import LevelTestPage from './pages/LevelTestPage'
import Layout from './components/Layout'
import WordsAlphabetPage from './pages/WordsAlphabetPage'
import WordsDictionaryPage from './pages/WordsDictionaryPage'
import WordsCardsPage from './pages/WordsCardsPage'

const theme = createTheme({
  palette: {
    primary: {
      main: '#6366F1',
      light: '#818CF8',
      dark: '#4F46E5',
      contrastText: '#fff',
    },
    secondary: {
      main: '#10B981',
      light: '#34D399',
      dark: '#059669',
    },
    error: {
      main: '#EF4444',
      light: '#FCA5A5',
      dark: '#DC2626',
    },
    warning: {
      main: '#F59E0B',
      light: '#FCD34D',
      dark: '#D97706',
    },
    info: {
      main: '#3B82F6',
      light: '#93C5FD',
      dark: '#2563EB',
    },
    success: {
      main: '#10B981',
      light: '#6EE7B7',
      dark: '#059669',
    },
    background: {
      default: '#F8FAFC',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#0F172A',
      secondary: '#64748B',
      disabled: '#94A3B8',
    },
    divider: 'rgba(0,0,0,0.06)',
  },
  shape: {
    borderRadius: 12,
  },
  typography: {
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    h1: {
      fontWeight: 800,
      letterSpacing: '-0.025em',
      fontSize: '2.25rem',
    },
    h2: {
      fontWeight: 700,
      letterSpacing: '-0.02em',
      fontSize: '1.875rem',
    },
    h3: {
      fontWeight: 700,
      letterSpacing: '-0.015em',
      fontSize: '1.5rem',
    },
    h4: {
      fontWeight: 700,
      letterSpacing: '-0.01em',
      fontSize: '1.25rem',
    },
    h5: {
      fontWeight: 600,
      fontSize: '1.125rem',
    },
    h6: {
      fontWeight: 600,
      fontSize: '1rem',
    },
    subtitle1: {
      fontWeight: 500,
      fontSize: '0.9375rem',
      color: '#64748B',
    },
    subtitle2: {
      fontWeight: 600,
      fontSize: '0.8125rem',
      letterSpacing: '0.02em',
      textTransform: 'uppercase' as const,
      color: '#94A3B8',
    },
    body1: {
      fontSize: '0.9375rem',
      lineHeight: 1.6,
    },
    body2: {
      fontSize: '0.8125rem',
      lineHeight: 1.6,
    },
    button: {
      fontWeight: 600,
      letterSpacing: '0.01em',
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#F8FAFC',
        },
      },
    },
    MuiCard: {
      defaultProps: {
        elevation: 0,
      },
      styleOverrides: {
        root: {
          borderRadius: 16,
          border: '1px solid rgba(0,0,0,0.06)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)',
          transition: 'box-shadow 0.2s ease, transform 0.2s ease',
          '&:hover': {
            boxShadow: '0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)',
          },
        },
      },
    },
    MuiPaper: {
      defaultProps: {
        elevation: 0,
      },
      styleOverrides: {
        root: {
          borderRadius: 16,
          border: '1px solid rgba(0,0,0,0.06)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)',
        },
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          borderRadius: 10,
          textTransform: 'none' as const,
          fontWeight: 600,
          fontSize: '0.875rem',
          padding: '8px 20px',
          transition: 'all 0.2s ease',
        },
        contained: {
          background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
          '&:hover': {
            background: 'linear-gradient(135deg, #818CF8 0%, #6366F1 100%)',
            transform: 'translateY(-1px)',
            boxShadow: '0 4px 12px rgba(99,102,241,0.4)',
          },
        },
        outlined: {
          borderWidth: '1.5px',
          '&:hover': {
            borderWidth: '1.5px',
            background: 'rgba(99,102,241,0.04)',
          },
        },
        text: {
          '&:hover': {
            background: 'rgba(99,102,241,0.06)',
          },
        },
        sizeSmall: {
          padding: '5px 14px',
          fontSize: '0.8125rem',
          borderRadius: 8,
        },
        sizeLarge: {
          padding: '12px 28px',
          fontSize: '0.9375rem',
          borderRadius: 12,
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          transition: 'all 0.2s ease',
          '&:hover': {
            background: 'rgba(99,102,241,0.08)',
          },
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        size: 'small',
        variant: 'outlined',
      },
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 10,
            fontSize: '0.9375rem',
            transition: 'all 0.2s ease',
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: '#6366F1',
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderWidth: '2px',
              borderColor: '#6366F1',
            },
          },
          '& .MuiInputLabel-root': {
            fontSize: '0.875rem',
          },
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        root: {
          borderRadius: 10,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 600,
          fontSize: '0.75rem',
          letterSpacing: '0.01em',
        },
        colorPrimary: {
          background: 'rgba(99,102,241,0.1)',
          color: '#4F46E5',
          border: 'none',
        },
        colorSuccess: {
          background: 'rgba(16,185,129,0.1)',
          color: '#059669',
          border: 'none',
        },
        colorError: {
          background: 'rgba(239,68,68,0.1)',
          color: '#DC2626',
          border: 'none',
        },
        colorWarning: {
          background: 'rgba(245,158,11,0.1)',
          color: '#D97706',
          border: 'none',
        },
      },
    },
    MuiTableContainer: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          border: '1px solid rgba(0,0,0,0.06)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)',
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-head': {
            backgroundColor: '#F8FAFC',
            fontWeight: 600,
            fontSize: '0.75rem',
            letterSpacing: '0.05em',
            textTransform: 'uppercase' as const,
            color: '#64748B',
            borderBottom: '1px solid rgba(0,0,0,0.06)',
            padding: '14px 16px',
          },
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          transition: 'background 0.15s ease',
          '&:hover': {
            backgroundColor: 'rgba(99,102,241,0.02)',
          },
          '&:last-child td': {
            borderBottom: 'none',
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: '1px solid rgba(0,0,0,0.04)',
          padding: '14px 16px',
          fontSize: '0.875rem',
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 20,
          boxShadow: '0 25px 50px rgba(0,0,0,0.12)',
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          fontWeight: 700,
          fontSize: '1.125rem',
          padding: '24px 24px 8px',
        },
      },
    },
    MuiDialogContent: {
      styleOverrides: {
        root: {
          padding: '16px 24px',
        },
      },
    },
    MuiDialogActions: {
      styleOverrides: {
        root: {
          padding: '12px 24px 20px',
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          fontWeight: 500,
          fontSize: '0.875rem',
        },
        standardSuccess: {
          backgroundColor: 'rgba(16,185,129,0.08)',
          color: '#059669',
        },
        standardError: {
          backgroundColor: 'rgba(239,68,68,0.08)',
          color: '#DC2626',
        },
        standardWarning: {
          backgroundColor: 'rgba(245,158,11,0.08)',
          color: '#D97706',
        },
        standardInfo: {
          backgroundColor: 'rgba(59,130,246,0.08)',
          color: '#2563EB',
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          height: 4,
          backgroundColor: 'rgba(99,102,241,0.1)',
        },
        bar: {
          borderRadius: 4,
          background: 'linear-gradient(90deg, #6366F1, #818CF8)',
        },
      },
    },
    MuiAccordion: {
      defaultProps: {
        elevation: 0,
      },
      styleOverrides: {
        root: {
          borderRadius: '12px !important',
          border: '1px solid rgba(0,0,0,0.06)',
          '&:before': {
            display: 'none',
          },
          '&.Mui-expanded': {
            margin: '0 !important',
          },
        },
      },
    },
    MuiAccordionSummary: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          minHeight: '48px !important',
          '&.Mui-expanded': {
            minHeight: '48px !important',
          },
        },
        content: {
          margin: '8px 0 !important',
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none' as const,
          fontWeight: 600,
          fontSize: '0.875rem',
          minHeight: 44,
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: {
          height: 3,
          borderRadius: '3px 3px 0 0',
        },
      },
    },
    MuiAvatar: {
      styleOverrides: {
        root: {
          fontSize: '0.875rem',
          fontWeight: 600,
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: 'rgba(0,0,0,0.06)',
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          borderRadius: 8,
          fontSize: '0.75rem',
          fontWeight: 500,
          backgroundColor: '#1E293B',
          padding: '6px 12px',
        },
      },
    },
    MuiSnackbar: {
      styleOverrides: {
        root: {
          '& .MuiAlert-root': {
            borderRadius: 12,
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          },
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
              <Route path="content" element={<ContentHubPage />} />
              <Route path="content/courses/:courseId" element={<ContentHubPage />} />
              <Route path="content/courses/:courseId/modules/:moduleId" element={<ContentHubPage />} />
              <Route path="content/courses/:courseId/modules/:moduleId/lessons/:lessonId" element={<LessonEditorPage />} />
              <Route path="content/courses/:courseId/lessons/:lessonId" element={<LessonEditorPage />} />
              <Route path="content/courses/:courseId/edit" element={<CourseEditorPage />} />
              <Route path="content/courses/:courseId/modules/:moduleId/edit" element={<ModuleEditorPage />} />
              <Route path="content/courses/:courseId/modules/:moduleId/test" element={<ModuleTestPage />} />
              <Route path="content/level-tests/:levelCode" element={<LevelTestPage />} />
              <Route path="users" element={<UsersPage />} />
              <Route path="users/:id" element={<UserDetailPage />} />
              <Route path="words-alphabet" element={<WordsAlphabetPage />} />
              <Route path="words-dictionary" element={<WordsDictionaryPage />} />
              <Route path="words-cards" element={<WordsCardsPage />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
