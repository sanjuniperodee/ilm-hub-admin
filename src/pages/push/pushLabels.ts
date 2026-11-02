import type { PushSegment } from '../../api/adminApi'
import type { StatusTone } from '../../components/ui'

export const segmentLabels: Record<PushSegment, string> = {
  all: 'Все с push-токеном',
  free: 'Free',
  paid_no_plan: 'Premium без плана',
  paid_with_plan: 'Premium с учебным планом',
}

export const segmentDescriptions: Record<PushSegment, string> = {
  all: 'Все, кто разрешил уведомления на телефоне',
  free: 'Пользователи без Premium',
  paid_no_plan: 'Premium, но учебный план не составлен',
  paid_with_plan: 'Premium и есть учебный план',
}

export const pushTypeLabels: Record<string, string> = {
  manual_admin_push: 'Ручной push',
  first_interaction: 'После первого взаимодействия',
  daily_reminder_free: 'Ежедневное free',
  reactivation_d1: 'Реактивация 1 день',
  reactivation_d3: 'Реактивация 3 дня',
  reactivation_d7: 'Реактивация 7 дней',
  content_push: 'Контентный push',
  subscription_upsell: 'Подписка',
  motivational_free: 'Мотивация free',
  plan_creation_d0: 'Создание плана, день 0',
  plan_creation_d1: 'Создание плана, день 1',
  plan_creation_d2: 'Создание плана, день 2',
  plan_creation_d3: 'Создание плана, день 3',
  daily_reminder_paid: 'Ежедневное premium',
  gentle_pressure: 'Мягкое давление',
  motivational_paid: 'Мотивация premium',
  schedule_reminder: 'Напоминание по плану',
  schedule_followup: 'Догоняющее',
  missed_day: 'Срыв плана',
  motivational_plan: 'Мотивация по плану',
}

export const deliveryStatus: Record<string, { label: string; tone: StatusTone }> = {
  pending: { label: 'В процессе', tone: 'info' },
  sent: { label: 'Отправлено', tone: 'success' },
  disabled: { label: 'Firebase выключен', tone: 'warning' },
  failed: { label: 'Ошибка', tone: 'error' },
}

export const logSegmentOptions: Array<{ value: string; label: string }> = [
  { value: '', label: 'Все сегменты' },
  { value: 'free', label: 'Free' },
  { value: 'paid_no_plan', label: 'Premium без плана' },
  { value: 'paid_with_plan', label: 'Premium с планом' },
  { value: 'all', label: 'Ручной: все' },
  { value: 'manual_users', label: 'Ручной: выбранные' },
]

export const logSegmentLabel = (value?: string | null) =>
  logSegmentOptions.find((o) => o.value === value)?.label ?? value ?? '—'

export const formatPushDate = (value?: string | null) => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export const formatWindows = (windows: Array<{ start: string; end: string }>) =>
  windows.map((item) => `${item.start}-${item.end}`).join(', ')

export const parseWindows = (value: string) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const [start, end] = item.split('-').map((part) => part.trim())
      return { start, end }
    })
    .filter((item) => item.start && item.end)

const pluralRules = new Intl.PluralRules('ru-RU')
/** plural(5, ['пользователь', 'пользователя', 'пользователей']) → «5 пользователей». */
export function plural(n: number, [one, few, many]: [string, string, string]): string {
  const form = pluralRules.select(n)
  const word = form === 'one' ? one : form === 'few' ? few : many
  return `${n.toLocaleString('ru-RU')} ${word}`
}

export const usersWord: [string, string, string] = ['пользователь', 'пользователя', 'пользователей']
export const devicesWord: [string, string, string] = ['устройство', 'устройства', 'устройств']
