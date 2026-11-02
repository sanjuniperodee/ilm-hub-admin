import type { StatusTone } from '../../components/ui'
import { roleInfo } from '../users/userLabels'

export interface AuditLog {
  id: string
  userId: string
  userEmail?: string
  action: string
  resource: string
  resourceId?: string
  metadata?: Record<string, unknown> | null
  ipAddress?: string
  userAgent?: string
  createdAt: string
}

/** Resource name → label and genitive form for «Изменение курса». */
export const RESOURCES: Record<string, { label: string; gen: string }> = {
  courses: { label: 'Курсы', gen: 'курса' },
  modules: { label: 'Модули', gen: 'модуля' },
  lessons: { label: 'Уроки', gen: 'урока' },
  'lesson-blocks': { label: 'Блоки уроков', gen: 'блока урока' },
  'mini-tests': { label: 'Тесты', gen: 'теста' },
  questions: { label: 'Вопросы тестов', gen: 'вопроса теста' },
  answers: { label: 'Ответы тестов', gen: 'варианта ответа' },
  media: { label: 'Медиафайлы', gen: 'медиафайла' },
  words: { label: 'Слова', gen: 'в разделе «Слова»' },
  islam: { label: 'Ислам', gen: 'в разделе «Ислам»' },
  push: { label: 'Push', gen: 'настроек push' },
  users: { label: 'Пользователи', gen: 'пользователя' },
  user: { label: 'Пользователь (роль, доступ)', gen: 'пользователя' },
  admins: { label: 'Сотрудники', gen: 'сотрудника' },
  admin_invitation: { label: 'Приглашения', gen: 'приглашения' },
  admin_permission: { label: 'Права сотрудников', gen: 'права сотрудника' },
  roles: { label: 'Роли (API)', gen: 'роли' },
  custom_role: { label: 'Свои роли', gen: 'роли' },
  user_custom_role: { label: 'Роли сотрудников', gen: 'роли сотрудника' },
}

export const resourceLabel = (r?: string) => (r ? RESOURCES[r]?.label ?? r : '—')

const ACTION_TONE: Record<string, StatusTone> = {
  create: 'success',
  admin_create: 'success',
  admin_invite: 'info',
  update: 'info',
  admin_update: 'info',
  role_assign: 'warning',
  permission_grant: 'warning',
  permission_revoke: 'warning',
  delete: 'error',
  admin_delete: 'error',
  login: 'neutral',
  logout: 'neutral',
}

export const ACTION_SHORT: Record<string, string> = {
  create: 'Создание',
  update: 'Изменение',
  delete: 'Удаление',
  login: 'Вход',
  logout: 'Выход',
  role_assign: 'Роль',
  admin_create: 'Создание',
  admin_update: 'Изменение',
  admin_delete: 'Удаление',
  permission_grant: 'Право выдано',
  permission_revoke: 'Право отозвано',
  admin_invite: 'Приглашение',
}

export const actionTone = (action: string): StatusTone => ACTION_TONE[action] ?? 'neutral'

const str = (v: unknown) => (typeof v === 'string' && v ? v : '')

/** Human-readable sentence for an audit entry. */
export function describeAudit(log: AuditLog): string {
  const m = log.metadata ?? {}
  const gen = RESOURCES[log.resource]?.gen ?? log.resource
  const role = (v: unknown) => `«${roleInfo(str(v)).label}»`
  switch (log.action) {
    case 'create':
      return `Создание ${gen}`
    case 'update':
      return `Изменение ${gen}`
    case 'delete':
      return `Удаление ${gen}`
    case 'login':
      return 'Вход в админ-панель'
    case 'logout':
      return 'Выход из админ-панели'
    case 'role_assign':
      return `Смена роли пользователя на ${role(m.newRole)}${m.permissionsReset ? ', права сброшены к набору роли' : ''}`
    case 'admin_invite':
      return `Приглашение ${str(m.email) || 'сотрудника'}${m.role ? ` с ролью ${role(m.role)}` : ''}`
    case 'admin_create':
      if (log.resource === 'custom_role') return `Создание роли «${str(m.labelRu) || str(m.name)}»`
      if (log.resource === 'admin_invitation') return `Приглашение принято${m.role ? `, роль ${role(m.role)}` : ''}`
      return `Создание ${gen}`
    case 'admin_update':
      if (m.newRole) return `Смена роли сотрудника на ${role(m.newRole)}`
      if (log.resource === 'custom_role') return `Изменение роли «${str(m.labelRu) || str(m.name)}»`
      return `Изменение ${gen}`
    case 'admin_delete':
      if (m.action === 'cancel') return `Отмена приглашения ${str(m.email)}`.trim()
      if (m.action === 'deactivate') return 'Отключение доступа сотрудника'
      if (log.resource === 'custom_role') return `Удаление роли «${str(m.name)}»`
      return `Удаление ${gen}`
    case 'permission_grant':
      if (log.resource === 'user_custom_role') return `Назначение роли «${str(m.roleName)}» сотруднику`
      return 'Выдача права сотруднику'
    case 'permission_revoke':
      if (log.resource === 'user_custom_role') return `Снятие роли «${str(m.roleName)}» с сотрудника`
      return 'Отзыв права у сотрудника'
    default:
      return `${log.action} ${gen}`
  }
}

/** `{ method, path }` written by the global audit interceptor. */
export function requestLine(log: AuditLog): string {
  const m = log.metadata ?? {}
  const method = str(m.method)
  const path = str(m.path)
  return method || path ? `${method} ${path}`.trim() : ''
}

export interface DiffRow {
  key: string
  before?: unknown
  after?: unknown
  changed: boolean
}

/** If metadata carries before/after (or old/new) snapshots, return a per-field diff. */
export function metadataDiff(meta?: Record<string, unknown> | null): DiffRow[] | null {
  if (!meta) return null
  const before = (meta.before ?? meta.old ?? meta.previous) as Record<string, unknown> | undefined
  const after = (meta.after ?? meta.new ?? meta.next ?? meta.changes) as Record<string, unknown> | undefined
  if (!before || !after || typeof before !== 'object' || typeof after !== 'object') return null
  const keys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)]))
  return keys.map((key) => ({
    key,
    before: before[key],
    after: after[key],
    changed: JSON.stringify(before[key]) !== JSON.stringify(after[key]),
  }))
}

export const formatValue = (v: unknown): string => {
  if (v === undefined) return '—'
  if (v === null) return 'null'
  if (typeof v === 'string') return v
  return JSON.stringify(v, null, 2)
}
