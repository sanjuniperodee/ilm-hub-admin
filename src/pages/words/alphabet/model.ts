export interface LetterForms {
  isolated: string
  initial: string
  middle: string
  final: string
}

export interface WordLetter {
  id: string
  code: string
  orderIndex: number
  arabic: string
  nameRu: string
  nameKk?: string | null
  translit?: string | null
  translitKk?: string | null
  important?: string | null
  importantKk?: string | null
  audioUrl?: string | null
  forms?: LetterForms | null
}

/** Editable copy of a letter: every field is a plain string for controlled inputs. */
export interface LetterDraft {
  code: string
  orderIndex: number
  arabic: string
  nameRu: string
  nameKk: string
  translit: string
  translitKk: string
  important: string
  importantKk: string
  forms: LetterForms
}

/** Ответ API может отдавать KK-поля в snake_case — без этого в state не попадает importantKk. */
export function normalizeWordLetter(raw: Record<string, unknown>): WordLetter {
  const r = raw as Record<string, unknown>
  const str = (v: unknown) => (typeof v === 'string' ? v : v == null ? null : String(v))
  const num = (v: unknown, fallback: number) =>
    typeof v === 'number' && !Number.isNaN(v) ? v : Number(v) || fallback
  return {
    id: str(r.id) ?? '',
    code: str(r.code) ?? '',
    orderIndex: num(r.orderIndex ?? r.order_index, 0),
    arabic: str(r.arabic) ?? '',
    nameRu: str(r.nameRu ?? r.name_ru) ?? '',
    nameKk: str(r.nameKk ?? r.name_kk),
    translit: str(r.translit),
    translitKk: str(r.translitKk ?? r.translit_kk),
    important: str(r.important),
    importantKk: str(r.importantKk ?? r.important_kk),
    audioUrl: str(r.audioUrl ?? r.audio_url),
    forms: (r.forms as LetterForms) || null,
  }
}

export const defaultForms = (arabic: string): LetterForms => ({
  isolated: arabic,
  initial: arabic,
  middle: arabic,
  final: arabic,
})

export const emptyDraft = (orderIndex = 0): LetterDraft => ({
  code: '',
  orderIndex,
  arabic: '',
  nameRu: '',
  nameKk: '',
  translit: '',
  translitKk: '',
  important: '',
  importantKk: '',
  forms: { isolated: '', initial: '', middle: '', final: '' },
})

export function draftFromLetter(letter: WordLetter): LetterDraft {
  const forms = letter.forms || defaultForms(letter.arabic)
  return {
    code: letter.code,
    orderIndex: letter.orderIndex,
    arabic: letter.arabic,
    nameRu: letter.nameRu,
    nameKk: letter.nameKk || '',
    translit: letter.translit || '',
    translitKk: letter.translitKk || '',
    important: letter.important || '',
    importantKk: letter.importantKk || '',
    forms: {
      isolated: forms.isolated ?? '',
      initial: forms.initial ?? '',
      middle: forms.middle ?? '',
      final: forms.final ?? '',
    },
  }
}

/** Пустая строка → null; всегда передаём KK-поля в PATCH (не undefined), иначе JSON их выбросит. */
export function trimOrNull(v: string | null | undefined): string | null {
  if (v == null) return null
  const t = String(v).trim()
  return t.length > 0 ? t : null
}

export function buildWordLetterPatchBody(letter: WordLetter) {
  const forms = letter.forms
    ? {
        isolated: letter.forms.isolated || letter.arabic,
        initial: letter.forms.initial || letter.arabic,
        middle: letter.forms.middle || letter.arabic,
        final: letter.forms.final || letter.arabic,
      }
    : undefined
  return {
    nameRu: letter.nameRu,
    nameKk: trimOrNull(letter.nameKk),
    translit: trimOrNull(letter.translit),
    translitKk: trimOrNull(letter.translitKk),
    important: trimOrNull(letter.important),
    importantKk: trimOrNull(letter.importantKk),
    orderIndex: letter.orderIndex,
    ...(forms ? { forms } : {}),
  }
}

export function buildCreateLetterBody(d: LetterDraft) {
  return {
    code: d.code.trim(),
    orderIndex: Number(d.orderIndex) || 0,
    arabic: d.arabic.trim(),
    nameRu: d.nameRu.trim(),
    nameKk: trimOrNull(d.nameKk),
    translit: trimOrNull(d.translit),
    translitKk: trimOrNull(d.translitKk),
    important: trimOrNull(d.important),
    importantKk: trimOrNull(d.importantKk),
    forms: {
      isolated: d.forms.isolated.trim() || d.arabic.trim(),
      initial: d.forms.initial.trim() || d.arabic.trim(),
      middle: d.forms.middle.trim() || d.arabic.trim(),
      final: d.forms.final.trim() || d.arabic.trim(),
    },
  }
}

const has = (v?: string | null) => !!v && v.trim().length > 0

export function letterCompleteness(l: Pick<WordLetter, 'nameRu' | 'nameKk' | 'translit' | 'translitKk' | 'important' | 'importantKk' | 'audioUrl'>) {
  return [
    { label: 'RU', done: has(l.nameRu) && has(l.translit) && has(l.important) },
    { label: 'KZ', done: has(l.nameKk) && has(l.translitKk) && has(l.importantKk) },
    { label: 'Аудио', done: has(l.audioUrl) },
  ]
}

export const FORM_LABELS: Array<{ key: keyof LetterForms; label: string; short: string }> = [
  { key: 'isolated', label: 'Отдельно', short: 'отд.' },
  { key: 'initial', label: 'В начале', short: 'нач.' },
  { key: 'middle', label: 'В середине', short: 'сер.' },
  { key: 'final', label: 'В конце', short: 'кон.' },
]
