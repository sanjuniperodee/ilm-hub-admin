import { Outlet, useNavigate, useLocation, Link as RouterLink } from 'react-router-dom'
import {
  Avatar,
  Box,
  Breadcrumbs,
  ButtonBase,
  Collapse,
  Divider,
  Drawer,
  IconButton,
  Link,
  List,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import {
  SpaceDashboardOutlined,
  PeopleAltOutlined,
  SchoolOutlined,
  LogoutOutlined,
  Menu as MenuIcon,
  MenuBookOutlined,
  StyleOutlined,
  KeyboardDoubleArrowLeft,
  KeyboardDoubleArrowRight,
  AutoAwesomeOutlined,
  ImportContactsOutlined,
  ExploreOutlined,
  HistoryOutlined,
  AdminPanelSettingsOutlined,
  TuneOutlined,
  NotificationsActiveOutlined,
  AbcOutlined,
  ExpandMore,
  Close,
} from '@mui/icons-material'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { BrandMark, KeyboardHint, ShellProvider, StatusChip, visuallyHidden } from './ui'
import type { BreadcrumbItem } from './ui'
import { useShellState } from './ui/AppShell'
import { GIRIH_PATTERN } from './ui/AuthLayout'
import { color, layout, motion, radius } from '../theme/tokens'

type NavItem = {
  text: string
  icon: ReactNode
  path: string
  permission?: string
}

type NavSection = {
  id: string
  /** Omit for the ungrouped top block. */
  label?: string
  items: NavItem[]
}

/** Sections visible to non-admin staff (backend enforces the same through @Roles/@Permissions). */
const ROLE_NAV_PATHS: Record<string, string[]> = {
  content_manager: ['/dashboard', '/content', '/words-', '/islam-'],
  support: ['/dashboard', '/users'],
}

/** Whether the navigation exposes `path` to `role` (same rule the sidebar uses). */
export function isPathAllowedForRole(path: string, role: string | null | undefined): boolean {
  if (role !== 'admin' && ['/admin-management', '/custom-roles', '/audit', '/push-notifications'].some((p) => path.startsWith(p))) {
    // Admin-only routes (also guarded by ProtectedRoute in App.tsx).
    return false
  }
  const allowed = ROLE_NAV_PATHS[role ?? ''] ?? null
  return allowed ? allowed.some((p) => path.startsWith(p)) : true
}

export const ROLE_LABELS: Record<string, string> = {
  admin: 'Администратор',
  content_manager: 'Контент-менеджер',
  support: 'Поддержка',
}

export const getNavSections = (userRole: string | null | undefined): NavSection[] => {
  const sections: NavSection[] = [
    {
      id: 'overview',
      items: [{ text: 'Обзор', icon: <SpaceDashboardOutlined />, path: '/dashboard', permission: 'dashboard.view' }],
    },
    {
      id: 'learning',
      label: 'Обучение',
      items: [{ text: 'Курсы и уроки', icon: <SchoolOutlined />, path: '/content', permission: 'content.view' }],
    },
    {
      id: 'words',
      label: 'Слова',
      items: [
        { text: 'Алфавит', icon: <AbcOutlined />, path: '/words-alphabet', permission: 'words.view' },
        { text: 'Словарь', icon: <MenuBookOutlined />, path: '/words-dictionary', permission: 'words.view' },
        { text: 'Карточки', icon: <StyleOutlined />, path: '/words-cards', permission: 'words.view' },
      ],
    },
    {
      id: 'islam',
      label: 'Ислам',
      items: [
        { text: '99 имён Аллаха', icon: <AutoAwesomeOutlined />, path: '/islam-names', permission: 'islam.view' },
        { text: 'Коран', icon: <ImportContactsOutlined />, path: '/islam-quran', permission: 'islam.view' },
        { text: 'Хадж и умра', icon: <ExploreOutlined />, path: '/islam-hajj', permission: 'islam.view' },
      ],
    },
    {
      id: 'audience',
      label: 'Пользователи',
      items: [
        { text: 'Пользователи', icon: <PeopleAltOutlined />, path: '/users', permission: 'users.view' },
        { text: 'Push-уведомления', icon: <NotificationsActiveOutlined />, path: '/push-notifications', permission: 'admin.view' },
      ],
    },
  ]

  const allowed = ROLE_NAV_PATHS[userRole ?? ''] ?? null
  if (allowed) {
    for (const section of sections) {
      section.items = section.items.filter((item) => allowed.some((p) => item.path.startsWith(p)))
    }
  }

  // Admin section - only for admin role
  if (userRole === 'admin') {
    sections.push({
      id: 'admin',
      label: 'Администрирование',
      items: [
        { text: 'Сотрудники', icon: <AdminPanelSettingsOutlined />, path: '/admin-management', permission: 'admin.view' },
        { text: 'Роли и права', icon: <TuneOutlined />, path: '/custom-roles', permission: 'admin.view' },
        { text: 'Журнал аудита', icon: <HistoryOutlined />, path: '/audit', permission: 'audit.view' },
      ],
    })
  }

  return sections.filter((section) => section.items.length > 0)
}

// Admin role always sees everything in UI; backend enforces permissions

const STORAGE_COLLAPSED = 'ilm-admin.sidebar.collapsed'
const STORAGE_GROUPS = 'ilm-admin.sidebar.closedGroups'

function readStored<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw == null ? fallback : (JSON.parse(raw) as T)
  } catch {
    return fallback
  }
}

function isActivePath(pathname: string, itemPath: string) {
  return pathname === itemPath || pathname.startsWith(itemPath + '/')
}

/** Email from the access-token payload, if the backend put it there (display only). */
function readEmailFromToken(): string | null {
  try {
    const token = localStorage.getItem('admin_token')
    if (!token) return null
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return typeof payload.email === 'string' ? payload.email : null
  } catch {
    return null
  }
}

/** Fallback trail from the URL when the page didn't provide named breadcrumbs. */
function autoBreadcrumbs(pathname: string, sections: NavSection[]): BreadcrumbItem[] {
  for (const s of sections) {
    for (const item of s.items) {
      if (!isActivePath(pathname, item.path)) continue
      const trail: BreadcrumbItem[] = []
      if (s.label && s.label !== item.text && s.items.length > 1) trail.push({ label: s.label })
      trail.push({ label: item.text, to: item.path })
      if (item.path === '/content') {
        const parts = pathname.split('/').filter(Boolean)
        if (parts.includes('courses')) trail.push({ label: 'Курс' })
        if (parts.includes('modules')) trail.push({ label: 'Модуль' })
        if (parts.includes('lessons')) trail.push({ label: 'Урок' })
        const last = parts[parts.length - 1]
        if (last === 'edit') trail.push({ label: 'Настройки' })
        if (last === 'test') trail.push({ label: 'Тест модуля' })
        if (parts.includes('level-tests')) trail.push({ label: 'Тест уровня' })
        if (parts.includes('onboarding-placement')) trail.push({ label: 'Входной тест' })
      }
      if (item.path === '/users' && pathname !== '/users') trail.push({ label: 'Профиль' })
      return trail
    }
  }
  return []
}

const RAIL_TEXT = 'rgba(255, 248, 238, 0.74)'
const RAIL_MUTED = 'rgba(255, 248, 238, 0.5)'

interface SidebarProps {
  sections: NavSection[]
  collapsed: boolean
  isMobile: boolean
  pathname: string
  closedGroups: string[]
  onToggleGroup: (id: string) => void
  onNavigate: () => void
  onToggleCollapsed: () => void
  onCloseMobile: () => void
}

function Sidebar({
  sections,
  collapsed,
  isMobile,
  pathname,
  closedGroups,
  onToggleGroup,
  onNavigate,
  onToggleCollapsed,
  onCloseMobile,
}: SidebarProps) {
  const rail = collapsed && !isMobile
  const width = rail ? layout.sidebarCollapsedWidth : layout.sidebarWidth

  return (
    <Box
      sx={{
        width,
        height: '100dvh',
        bgcolor: color.ink[900],
        color: RAIL_TEXT,
        display: 'flex',
        flexDirection: 'column',
        transition: `width ${motion.slow} ${motion.easing}`,
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Brand */}
      <Stack
        direction="row"
        alignItems="center"
        gap={1.25}
        sx={{
          height: layout.topBarHeight,
          px: rail ? 0 : 2,
          justifyContent: rail ? 'center' : 'flex-start',
          flexShrink: 0,
          borderBottom: '1px solid rgba(255,248,238,0.06)',
          position: 'relative',
          '&::after': {
            content: '""',
            position: 'absolute',
            inset: 0,
            backgroundImage: GIRIH_PATTERN,
            backgroundSize: '28px 28px',
            opacity: 0.06,
            pointerEvents: 'none',
          },
        }}
      >
        <BrandMark size={30} />
        {!rail && (
          <Box sx={{ minWidth: 0, flex: 1, whiteSpace: 'nowrap' }}>
            <Typography sx={{ color: '#FFF8EE', fontWeight: 700, fontSize: '0.9375rem', letterSpacing: '0.02em', lineHeight: 1.2 }}>
              ILM HUB
            </Typography>
            <Typography sx={{ color: RAIL_MUTED, fontSize: '0.75rem', lineHeight: 1.3 }}>Админ-панель</Typography>
          </Box>
        )}
        {isMobile && (
          <IconButton onClick={onCloseMobile} aria-label="Закрыть меню" sx={{ color: RAIL_TEXT, '&:hover': { color: '#FFF8EE', bgcolor: color.ink[800] } }}>
            <Close />
          </IconButton>
        )}
      </Stack>

      {/* Navigation */}
      <Box
        component="nav"
        aria-label="Основная навигация"
        sx={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', px: rail ? 1 : 1.25, py: 1.5, scrollbarColor: 'rgba(255,248,238,0.2) transparent' }}
      >
        {sections.map((section, sIndex) => {
          const open = rail || !section.label || !closedGroups.includes(section.id)
          const listId = `nav-group-${section.id}`
          return (
            <Box key={section.id} sx={{ mb: 1 }}>
              {section.label && !rail && (
                <ButtonBase
                  onClick={() => onToggleGroup(section.id)}
                  aria-expanded={open}
                  aria-controls={listId}
                  sx={{
                    width: '100%',
                    justifyContent: 'space-between',
                    px: 1.25,
                    py: 0.75,
                    mt: sIndex === 0 ? 0 : 1,
                    borderRadius: `${radius.sm}px`,
                    color: RAIL_MUTED,
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    '&:hover': { color: RAIL_TEXT },
                    '&.Mui-focusVisible': { outline: `2px solid ${color.gold[400]}`, outlineOffset: -2 },
                  }}
                >
                  {section.label}
                  <ExpandMore
                    aria-hidden
                    sx={{
                      fontSize: 16,
                      transition: `transform ${motion.base} ${motion.easing}`,
                      transform: open ? 'none' : 'rotate(-90deg)',
                    }}
                  />
                </ButtonBase>
              )}
              {rail && sIndex > 0 && <Divider sx={{ borderColor: 'rgba(255,248,238,0.08)', my: 1, mx: 1 }} />}
              <Collapse in={open} timeout={180} unmountOnExit={false}>
                <List id={listId} disablePadding sx={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  {section.items.map((item) => {
                    const active = isActivePath(pathname, item.path)
                    const link = (
                      <ButtonBase
                        component={RouterLink}
                        to={item.path}
                        onClick={onNavigate}
                        aria-current={active ? 'page' : undefined}
                        aria-label={rail ? item.text : undefined}
                        sx={{
                          position: 'relative',
                          width: '100%',
                          minHeight: 38,
                          px: rail ? 0 : 1.25,
                          justifyContent: rail ? 'center' : 'flex-start',
                          gap: 1.25,
                          borderRadius: `${radius.sm}px`,
                          color: active ? '#FFF8EE' : RAIL_TEXT,
                          bgcolor: active ? color.ink[700] : 'transparent',
                          fontSize: '0.875rem',
                          fontWeight: active ? 600 : 500,
                          textAlign: 'left',
                          transition: `background-color ${motion.fast}, color ${motion.fast}`,
                          '&:hover': { bgcolor: active ? color.ink[700] : color.ink[800], color: '#FFF8EE' },
                          '&.Mui-focusVisible': { outline: `2px solid ${color.gold[400]}`, outlineOffset: -2 },
                          '&::before': active
                            ? {
                                content: '""',
                                position: 'absolute',
                                left: rail ? -8 : -10,
                                top: 8,
                                bottom: 8,
                                width: 3,
                                borderRadius: '0 3px 3px 0',
                                bgcolor: color.gold[400],
                              }
                            : undefined,
                        }}
                      >
                        <Box
                          aria-hidden
                          sx={{
                            display: 'flex',
                            color: active ? color.gold[400] : RAIL_MUTED,
                            '& .MuiSvgIcon-root': { fontSize: 20 },
                          }}
                        >
                          {item.icon}
                        </Box>
                        {!rail && (
                          <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.text}
                          </Box>
                        )}
                      </ButtonBase>
                    )
                    return (
                      <Box component="li" key={item.path} sx={{ listStyle: 'none' }}>
                        {rail ? (
                          <Tooltip title={item.text} placement="right">
                            {link}
                          </Tooltip>
                        ) : (
                          link
                        )}
                      </Box>
                    )
                  })}
                </List>
              </Collapse>
            </Box>
          )
        })}
      </Box>

      {/* Collapse toggle */}
      {!isMobile && (
        <Box sx={{ borderTop: '1px solid rgba(255,248,238,0.06)', p: 1, display: 'flex', justifyContent: rail ? 'center' : 'flex-end' }}>
          <Tooltip
            placement="right"
            title={
              <Stack direction="row" alignItems="center" gap={1}>
                {rail ? 'Развернуть меню' : 'Свернуть меню'}
                <KeyboardHint keys={['[']} tone="dark" />
              </Stack>
            }
          >
            <IconButton
              onClick={onToggleCollapsed}
              aria-label={rail ? 'Развернуть меню' : 'Свернуть меню'}
              aria-keyshortcuts="["
              size="small"
              sx={{ color: RAIL_MUTED, '&:hover': { color: '#FFF8EE', bgcolor: color.ink[800] } }}
            >
              {rail ? <KeyboardDoubleArrowRight fontSize="small" /> : <KeyboardDoubleArrowLeft fontSize="small" />}
            </IconButton>
          </Tooltip>
        </Box>
      )}
    </Box>
  )
}

function UserMenu({ role, onLogout }: { role: string | null; onLogout: () => void }) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  // Re-read after login / token refresh (role changes with the token).
  const email = useMemo(() => (role !== undefined ? readEmailFromToken() : null), [role])
  const roleLabel = role ? ROLE_LABELS[role] ?? role : 'Сотрудник'
  const initial = (email?.[0] ?? roleLabel[0] ?? 'A').toUpperCase()

  return (
    <>
      <ButtonBase
        onClick={(e) => setAnchor(e.currentTarget)}
        aria-haspopup="menu"
        aria-expanded={Boolean(anchor)}
        aria-label={`Профиль: ${roleLabel}`}
        sx={{
          gap: 1,
          pl: 0.5,
          pr: { xs: 0.5, sm: 1 },
          py: 0.5,
          borderRadius: `${radius.md}px`,
          '&:hover': { bgcolor: 'action.hover' },
        }}
      >
        <Avatar sx={{ width: 30, height: 30 }}>{initial}</Avatar>
        <Box sx={{ display: { xs: 'none', sm: 'block' }, textAlign: 'left', lineHeight: 1.2 }}>
          <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.25 }}>
            {roleLabel}
          </Typography>
        </Box>
        <ExpandMore sx={{ fontSize: 18, color: 'text.secondary', display: { xs: 'none', sm: 'block' } }} aria-hidden />
      </ButtonBase>
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { minWidth: 240 } } }}
      >
        <Box sx={{ px: 1.5, pt: 1, pb: 1.25 }}>
          {email && (
            <Typography variant="body2" sx={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {email}
            </Typography>
          )}
          <StatusChip label={roleLabel} tone={role === 'admin' ? 'gold' : 'brand'} hideDot sx={{ mt: email ? 0.75 : 0 }} />
        </Box>
        <Divider sx={{ my: 0.5 }} />
        <MenuItem
          onClick={() => {
            setAnchor(null)
            onLogout()
          }}
        >
          <ListItemIcon>
            <LogoutOutlined fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Выйти" primaryTypographyProps={{ fontSize: '0.875rem' }} />
        </MenuItem>
      </Menu>
    </>
  )
}

function TopBar({
  isMobile,
  onOpenMenu,
  crumbs,
  role,
  onLogout,
}: {
  isMobile: boolean
  onOpenMenu: () => void
  crumbs: BreadcrumbItem[]
  role: string | null
  onLogout: () => void
}) {
  const shell = useShellState()
  const setHost = shell?.setActionsHost
  const hostRef = useCallback((el: HTMLDivElement | null) => setHost?.(el), [setHost])

  return (
    <Box
      component="header"
      sx={{
        position: 'sticky',
        top: 0,
        zIndex: (t) => t.zIndex.appBar,
        height: layout.topBarHeight,
        minHeight: layout.topBarHeight,
        px: { xs: 1.5, sm: 2.5, md: 3 },
        pt: { xs: 'env(safe-area-inset-top, 0px)', md: 0 },
        boxSizing: 'content-box',
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        bgcolor: 'rgba(255,255,255,0.92)',
        backdropFilter: 'saturate(1.4) blur(8px)',
        borderBottom: 1,
        borderColor: 'divider',
      }}
    >
      {isMobile && (
        <IconButton onClick={onOpenMenu} aria-label="Открыть меню" edge="start">
          <MenuIcon />
        </IconButton>
      )}
      <Breadcrumbs
        aria-label="Навигационная цепочка"
        maxItems={isMobile ? 2 : 6}
        itemsBeforeCollapse={0}
        itemsAfterCollapse={isMobile ? 1 : 2}
        sx={{ minWidth: 0, flex: 1, '& .MuiBreadcrumbs-ol': { flexWrap: 'nowrap' }, '& .MuiBreadcrumbs-li': { minWidth: 0 } }}
      >
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1
          const sx = {
            display: 'block',
            maxWidth: { xs: 160, md: 280 },
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontSize: '0.875rem',
          } as const
          return c.to && !last ? (
            <Link key={`${c.label}-${i}`} component={RouterLink} to={c.to} color="text.secondary" sx={{ ...sx, fontWeight: 500 }}>
              {c.label}
            </Link>
          ) : (
            <Typography
              key={`${c.label}-${i}`}
              color={last ? 'text.primary' : 'text.secondary'}
              aria-current={last ? 'page' : undefined}
              sx={{ ...sx, fontWeight: last ? 600 : 500 }}
            >
              {c.label}
            </Typography>
          )
        })}
      </Breadcrumbs>
      <Box ref={hostRef} sx={{ display: 'flex', alignItems: 'center', gap: 1, '&:empty': { display: 'none' } }} />
      <UserMenu role={role} onLogout={onLogout} />
    </Box>
  )
}

function ShellFrame() {
  const navigate = useNavigate()
  const location = useLocation()
  const { logout, userRole } = useAuth()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const shell = useShellState()
  const mainRef = useRef<HTMLElement>(null)

  const [collapsed, setCollapsed] = useState<boolean>(() =>
    readStored(STORAGE_COLLAPSED, typeof window !== 'undefined' && window.innerWidth < 1200),
  )
  const [closedGroups, setClosedGroups] = useState<string[]>(() => readStored(STORAGE_GROUPS, []))
  const [mobileOpen, setMobileOpen] = useState(false)

  const navSections = useMemo(() => getNavSections(userRole), [userRole])

  const toggleCollapsed = useCallback(() => {
    setCollapsed((c) => {
      localStorage.setItem(STORAGE_COLLAPSED, JSON.stringify(!c))
      return !c
    })
  }, [])

  const toggleGroup = useCallback((id: string) => {
    setClosedGroups((prev) => {
      const next = prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]
      localStorage.setItem(STORAGE_GROUPS, JSON.stringify(next))
      return next
    })
  }, [])

  // Keep the group of the current page open.
  useEffect(() => {
    const activeGroup = navSections.find((s) => s.items.some((i) => isActivePath(location.pathname, i.path)))
    if (activeGroup && closedGroups.includes(activeGroup.id)) toggleGroup(activeGroup.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname])

  // Close drawer on route change (mobile)
  useEffect(() => {
    if (isMobile) setMobileOpen(false)
  }, [location.pathname, isMobile])

  // «[» toggles the sidebar when focus is not in a text field / editor.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '[' || e.metaKey || e.ctrlKey || e.altKey) return
      const t = e.target as HTMLElement | null
      if (t && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName))) return
      if (isMobile) return
      toggleCollapsed()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isMobile, toggleCollapsed])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const crumbs = shell?.breadcrumbs ?? autoBreadcrumbs(location.pathname, navSections)
  const rail = collapsed && !isMobile
  const width = rail ? layout.sidebarCollapsedWidth : layout.sidebarWidth

  const sidebar = (
    <Sidebar
      sections={navSections}
      collapsed={collapsed}
      isMobile={isMobile}
      pathname={location.pathname}
      closedGroups={closedGroups}
      onToggleGroup={toggleGroup}
      onNavigate={() => isMobile && setMobileOpen(false)}
      onToggleCollapsed={toggleCollapsed}
      onCloseMobile={() => setMobileOpen(false)}
    />
  )

  return (
    <Box
      sx={{
        display: 'flex',
        minHeight: '100dvh',
        bgcolor: 'background.default',
        pl: { xs: 'env(safe-area-inset-left, 0px)', md: 0 },
        pr: { xs: 'env(safe-area-inset-right, 0px)', md: 0 },
      }}
    >
      <Box
        component="a"
        href="#main-content"
        onClick={(e) => {
          e.preventDefault()
          mainRef.current?.focus()
        }}
        sx={{
          ...visuallyHidden,
          '&:focus': {
            clip: 'auto',
            width: 'auto',
            height: 'auto',
            margin: 0,
            zIndex: 2000,
            top: 8,
            left: 8,
            px: 2,
            py: 1,
            bgcolor: 'background.paper',
            color: 'text.primary',
            borderRadius: 1,
            boxShadow: 3,
            fontWeight: 600,
          },
        }}
      >
        Перейти к содержимому
      </Box>

      {isMobile ? (
        <Drawer
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          PaperProps={{
            sx: {
              width: layout.sidebarWidth,
              maxWidth: '85vw',
              bgcolor: color.ink[900],
              pt: 'env(safe-area-inset-top, 0px)',
              pb: 'env(safe-area-inset-bottom, 0px)',
            },
          }}
        >
          {sidebar}
        </Drawer>
      ) : (
        <Box
          sx={{
            width,
            flexShrink: 0,
            transition: `width ${motion.slow} ${motion.easing}`,
            position: 'sticky',
            top: 0,
            alignSelf: 'flex-start',
            height: '100dvh',
            zIndex: (t) => t.zIndex.appBar + 1,
          }}
        >
          {sidebar}
        </Box>
      )}

      <Box sx={{ flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <TopBar
          isMobile={isMobile}
          onOpenMenu={() => setMobileOpen(true)}
          crumbs={crumbs}
          role={userRole}
          onLogout={handleLogout}
        />
        <Box
          component="main"
          id="main-content"
          ref={mainRef}
          tabIndex={-1}
          sx={{
            flex: 1,
            minWidth: 0,
            width: '100%',
            px: { xs: 1.5, sm: 3, md: 4 },
            py: { xs: 2, md: 3 },
            pb: { xs: 'max(16px, env(safe-area-inset-bottom, 0px))', md: 4 },
            outline: 'none',
          }}
        >
          <Outlet />
        </Box>
      </Box>
    </Box>
  )
}

export default function Layout() {
  return (
    <ShellProvider>
      <ShellFrame />
    </ShellProvider>
  )
}
