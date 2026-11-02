import { format, formatDistanceToNowStrict, isValid } from 'date-fns'
import { ru } from 'date-fns/locale'
import type { StatusTone } from '../../components/ui'

/** Roles of the `users.role` column. Staff roles open the admin panel. */
export type AppRole = 'user' | 'content_manager' | 'support' | 'admin'

export const ROLE_ORDER: AppRole[] = ['user', 'support', 'content_manager', 'admin']

export const ROLE_INFO: Record<AppRole, { label: string; tone: StatusTone; description: string }> = {
  user: {
    label: 'Ученик',
    tone: 'neutral',
    description: 'Учится в приложении. Доступа к админ-панели нет.',
  },
  support: {
    label: 'Поддержка',
    tone: 'info',
    description: 'Видит дашборд и пользователей, может просматривать контент.',
  },
  content_manager: {
    label: 'Контент-менеджер',
    tone: 'warning',
    description: 'Редактирует курсы, уроки, слова и раздел «Ислам».',
  },
  admin: {
    label: 'Администратор',
    tone: 'brand',
    description: 'Полный доступ: пользователи, сотрудники, push и журнал действий.',
  },
}

export function roleInfo(role?: string | null) {
  return ROLE_INFO[(role as AppRole) ?? 'user'] ?? { label: role || '—', tone: 'neutral' as StatusTone, description: '' }
}

export const isStaffRole = (role?: string | null) => role === 'admin' || role === 'content_manager' || role === 'support'

/** Values of `subscriptions.status` plus the `users.subscriptionStatus` value `free`. */
export const SUBSCRIPTION_STATUS: Record<string, { label: string; tone: StatusTone }> = {
  active: { label: 'Активна', tone: 'success' },
  grace_period: { label: 'Льготный период', tone: 'warning' },
  billing_retry: { label: 'Повтор оплаты', tone: 'warning' },
  account_hold: { label: 'Оплата приостановлена', tone: 'warning' },
  cancelled: { label: 'Отменена', tone: 'neutral' },
  expired: { label: 'Истекла', tone: 'neutral' },
  refunded: { label: 'Возврат', tone: 'error' },
  revoked: { label: 'Отозвана', tone: 'error' },
  free: { label: 'Нет подписки', tone: 'neutral' },
}

export function subscriptionStatusInfo(status?: string | null) {
  if (!status) return SUBSCRIPTION_STATUS.free
  return SUBSCRIPTION_STATUS[status] ?? { label: status, tone: 'neutral' as StatusTone }
}

export const PLATFORM_LABELS: Record<string, string> = {
  apple: 'App Store',
  google: 'Google Play',
}

export const PROVIDER_LABELS: Record<string, string> = {
  google: 'Google',
  apple: 'Apple',
  facebook: 'Facebook',
}

export const TEST_TYPE_LABELS: Record<string, string> = {
  lesson: 'Урок',
  module: 'Модуль',
  level: 'Уровень',
}

function toDate(value?: string | number | Date | null): Date | null {
  if (value == null || value === '') return null
  const d = value instanceof Date ? value : new Date(value)
  return isValid(d) ? d : null
}

/** «12 мар 2026». Returns «—» for empty / invalid values. */
export function formatDate(value?: string | number | Date | null, pattern = 'd MMM yyyy'): string {
  const d = toDate(value)
  return d ? format(d, pattern, { locale: ru }) : '—'
}

/** «12 мар 2026, 14:05». */
export function formatDateTime(value?: string | number | Date | null): string {
  return formatDate(value, 'd MMM yyyy, HH:mm')
}

/** «3 дня назад» / «через 5 дней». */
export function formatRelative(value?: string | number | Date | null): string {
  const d = toDate(value)
  if (!d) return ''
  return formatDistanceToNowStrict(d, { locale: ru, addSuffix: true })
}

export function initials(name?: string | null, email?: string | null): string {
  const source = (name || email || '?').trim()
  const parts = source.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return source.slice(0, 1).toUpperCase()
}

/** Removes the DataTable's own border when the table sits flush inside a SectionCard (`padding="none"`). */
export const flushTableSx = { '& > div': { border: 'none', borderRadius: 0 } } as const
