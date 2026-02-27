import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
  Box,
  List,
  Typography,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Avatar,
  Tooltip,
  Divider,
  Drawer,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import {
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  School as SchoolIcon,
  Article as ArticleIcon,
  Logout as LogoutIcon,
  Menu as MenuIcon,
  MenuBook as MenuBookIcon,
  Style as StyleIcon,
  KeyboardDoubleArrowLeft,
  KeyboardDoubleArrowRight,
  AutoAwesome as AutoAwesomeIcon,
  ImportContacts as ImportContactsIcon,
  Explore as ExploreIcon,
} from '@mui/icons-material'
import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

const SIDEBAR_WIDTH = 270
const SIDEBAR_COLLAPSED = 72

const navSections = [
  {
    label: 'ОБЗОР',
    items: [
      { text: 'Панель', icon: <DashboardIcon />, path: '/dashboard' },
      { text: 'Контент', icon: <SchoolIcon />, path: '/content' },
    ],
  },
  {
    label: 'УПРАВЛЕНИЕ',
    items: [
      { text: 'Пользователи', icon: <PeopleIcon />, path: '/users' },
    ],
  },
  {
    label: 'СЛОВАРЬ',
    items: [
      { text: 'Алфавит', icon: <ArticleIcon />, path: '/words-alphabet' },
      { text: 'Словарь', icon: <MenuBookIcon />, path: '/words-dictionary' },
      { text: 'Карточки', icon: <StyleIcon />, path: '/words-cards' },
    ],
  },
  {
    label: 'ИСЛАМ',
    items: [
      { text: '99 имён', icon: <AutoAwesomeIcon />, path: '/islam-names' },
      { text: 'Коран', icon: <ImportContactsIcon />, path: '/islam-quran' },
      { text: 'Хадж и Умра', icon: <ExploreIcon />, path: '/islam-hajj' },
    ],
  },
]

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { logout } = useAuth()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const currentWidth = collapsed && !isMobile ? SIDEBAR_COLLAPSED : SIDEBAR_WIDTH

  const sidebarContent = (
    <Box
      sx={{
        width: currentWidth,
        height: '100vh',
        background: 'linear-gradient(180deg, #0F172A 0%, #1E293B 100%)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.25s cubic-bezier(0.4,0,0.2,1)',
        overflow: 'hidden',
      }}
    >
      {/* Logo Area */}
      <Box
        sx={{
          p: collapsed && !isMobile ? '20px 12px' : '20px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          minHeight: 72,
        }}
      >
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #6366F1 0%, #818CF8 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: '1rem' }}>
            IH
          </Typography>
        </Box>
        {(!collapsed || isMobile) && (
          <Box sx={{ overflow: 'hidden', whiteSpace: 'nowrap' }}>
            <Typography
              sx={{
                color: '#fff',
                fontWeight: 700,
                fontSize: '1.1rem',
                letterSpacing: '-0.02em',
                lineHeight: 1.2,
              }}
            >
              ILM HUB
            </Typography>
            <Typography
              sx={{
                color: 'rgba(255,255,255,0.4)',
                fontSize: '0.7rem',
                fontWeight: 500,
                letterSpacing: '0.05em',
              }}
            >
              ADMIN PANEL
            </Typography>
          </Box>
        )}
      </Box>

      {/* Navigation */}
      <Box sx={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', px: collapsed && !isMobile ? 1 : 1.5, pb: 2 }}>
        {navSections.map((section, sIndex) => (
          <Box key={section.label} sx={{ mb: 1 }}>
            {(!collapsed || isMobile) && (
              <Typography
                sx={{
                  px: 1.5,
                  pt: sIndex === 0 ? 0 : 1.5,
                  pb: 0.75,
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  color: 'rgba(255,255,255,0.25)',
                }}
              >
                {section.label}
              </Typography>
            )}
            {collapsed && !isMobile && sIndex > 0 && (
              <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)', my: 1 }} />
            )}
            <List disablePadding>
              {section.items.map((item) => {
                const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/')
                return (
                  <ListItem key={item.text} disablePadding sx={{ mb: 0.3 }}>
                    <Tooltip title={collapsed && !isMobile ? item.text : ''} placement="right" arrow>
                      <ListItemButton
                        onClick={() => {
                          navigate(item.path)
                          if (isMobile) setMobileOpen(false)
                        }}
                        sx={{
                          borderRadius: '10px',
                          px: collapsed && !isMobile ? 1.5 : 2,
                          py: 1,
                          minHeight: 44,
                          justifyContent: collapsed && !isMobile ? 'center' : 'flex-start',
                          background: isActive
                            ? 'rgba(99,102,241,0.18)'
                            : 'transparent',
                          '&:hover': {
                            background: isActive
                              ? 'rgba(99,102,241,0.22)'
                              : 'rgba(255,255,255,0.06)',
                          },
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <ListItemIcon
                          sx={{
                            minWidth: collapsed && !isMobile ? 0 : 38,
                            color: isActive ? '#818CF8' : 'rgba(255,255,255,0.45)',
                            transition: 'color 0.15s ease',
                            '& .MuiSvgIcon-root': {
                              fontSize: '1.25rem',
                            },
                          }}
                        >
                          {item.icon}
                        </ListItemIcon>
                        {(!collapsed || isMobile) && (
                          <ListItemText
                            primary={item.text}
                            primaryTypographyProps={{
                              fontSize: '0.85rem',
                              fontWeight: isActive ? 600 : 400,
                              color: isActive ? '#fff' : 'rgba(255,255,255,0.65)',
                              letterSpacing: '-0.01em',
                            }}
                          />
                        )}
                        {isActive && (
                          <Box
                            sx={{
                              position: 'absolute',
                              left: 0,
                              top: '50%',
                              transform: 'translateY(-50%)',
                              width: 3,
                              height: 20,
                              borderRadius: '0 3px 3px 0',
                              background: '#818CF8',
                            }}
                          />
                        )}
                      </ListItemButton>
                    </Tooltip>
                  </ListItem>
                )
              })}
            </List>
          </Box>
        ))}
      </Box>

      {/* Bottom area */}
      <Box
        sx={{
          borderTop: '1px solid rgba(255,255,255,0.06)',
          p: collapsed && !isMobile ? '12px' : '12px 20px',
        }}
      >
        {!isMobile && (
          <Box sx={{ display: 'flex', justifyContent: collapsed ? 'center' : 'flex-end', mb: 1 }}>
            <IconButton
              onClick={() => setCollapsed(!collapsed)}
              size="small"
              sx={{
                color: 'rgba(255,255,255,0.35)',
                '&:hover': {
                  color: 'rgba(255,255,255,0.65)',
                  background: 'rgba(255,255,255,0.06)',
                },
              }}
            >
              {collapsed ? <KeyboardDoubleArrowRight fontSize="small" /> : <KeyboardDoubleArrowLeft fontSize="small" />}
            </IconButton>
          </Box>
        )}
        <Tooltip title={collapsed && !isMobile ? 'Выйти' : ''} placement="right" arrow>
          <ListItemButton
            onClick={handleLogout}
            sx={{
              borderRadius: '10px',
              px: collapsed && !isMobile ? 1.5 : 2,
              py: 1,
              justifyContent: collapsed && !isMobile ? 'center' : 'flex-start',
              '&:hover': {
                background: 'rgba(239,68,68,0.12)',
              },
            }}
          >
            <ListItemIcon
              sx={{
                minWidth: collapsed && !isMobile ? 0 : 38,
                color: 'rgba(255,255,255,0.45)',
                '& .MuiSvgIcon-root': { fontSize: '1.25rem' },
              }}
            >
              <LogoutIcon />
            </ListItemIcon>
            {(!collapsed || isMobile) && (
                            <ListItemText
                              primary="Выйти"
                primaryTypographyProps={{
                  fontSize: '0.85rem',
                  fontWeight: 400,
                  color: 'rgba(255,255,255,0.65)',
                }}
              />
            )}
          </ListItemButton>
        </Tooltip>
      </Box>
    </Box>
  )

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', background: '#F8FAFC' }}>
      {/* Mobile hamburger */}
      {isMobile && (
        <IconButton
          onClick={() => setMobileOpen(true)}
          sx={{
            position: 'fixed',
            top: 16,
            left: 16,
            zIndex: 1300,
            background: '#0F172A',
            color: '#fff',
            width: 44,
            height: 44,
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            '&:hover': { background: '#1E293B' },
          }}
        >
          <MenuIcon />
        </IconButton>
      )}

      {/* Mobile drawer */}
      {isMobile && (
        <Drawer
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          PaperProps={{
            sx: {
              width: SIDEBAR_WIDTH,
              background: 'transparent',
              border: 'none',
              boxShadow: '0 24px 48px rgba(0,0,0,0.2)',
            },
          }}
        >
          {sidebarContent}
        </Drawer>
      )}

      {/* Desktop permanent sidebar - sticky so it stays visible when scrolling */}
      {!isMobile && (
        <Box
          component="nav"
          sx={{
            width: currentWidth,
            flexShrink: 0,
            transition: 'width 0.25s cubic-bezier(0.4,0,0.2,1)',
            position: 'sticky',
            top: 0,
            alignSelf: 'flex-start',
            maxHeight: '100vh',
          }}
        >
          {sidebarContent}
        </Box>
      )}

      {/* Main content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Top bar */}
        <Box
          sx={{
            px: { xs: 3, md: 4 },
            py: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 2,
            borderBottom: '1px solid rgba(0,0,0,0.04)',
            background: 'rgba(255,255,255,0.8)',
            backdropFilter: 'blur(12px)',
            position: 'sticky',
            top: 0,
            zIndex: 100,
          }}
        >
          {isMobile && <Box sx={{ flex: 1 }} />}
          <Avatar
            sx={{
              width: 34,
              height: 34,
              background: 'linear-gradient(135deg, #6366F1, #818CF8)',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            A
          </Avatar>
        </Box>

        {/* Page content */}
        <Box
          sx={{
            flex: 1,
            px: { xs: 2, sm: 3, md: 4 },
            py: 3,
          }}
          className="page-enter"
        >
          <Outlet />
        </Box>
      </Box>
    </Box>
  )
}
