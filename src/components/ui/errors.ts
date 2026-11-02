/**
 * Turns anything thrown by axios / fetch / code into a user-facing Russian message.
 * Understands the backend error format `{ statusCode, message: string | string[], errorCode }`.
 *
 * @example
 * catch (e) { setError(getErrorMessage(e, 'Не удалось сохранить урок')) }
 */
export function getErrorMessage(error: unknown, fallback = 'Что-то пошло не так. Попробуйте ещё раз.'): string {
  if (error == null) return fallback
  if (typeof error === 'string') return error || fallback
  const e = error as {
    message?: string
    code?: string
    response?: { status?: number; data?: { message?: string | string[]; error?: string } }
  }
  const apiMessage = e.response?.data?.message
  if (Array.isArray(apiMessage) && apiMessage.length) return apiMessage.join('. ')
  if (typeof apiMessage === 'string' && apiMessage) return apiMessage
  const status = e.response?.status
  if (status === 401) return 'Сессия истекла. Войдите снова.'
  if (status === 403) return 'Недостаточно прав для этого действия.'
  if (status === 404) return 'Запись не найдена или была удалена.'
  if (status === 413) return 'Файл слишком большой.'
  if (status && status >= 500) return 'Сервер временно недоступен. Попробуйте позже.'
  if (e.code === 'ERR_NETWORK' || e.message === 'Network Error') {
    return 'Нет связи с сервером. Проверьте интернет или попробуйте позже.'
  }
  return e.message || fallback
}
