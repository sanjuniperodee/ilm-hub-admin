export interface CardTheme {
  id: string
  emoji: string
  titleRu: string
  titleKz?: string | null
  orderIndex: number
  isActive: boolean
  quizEnabled?: boolean
  cardsCount: number
}

export interface QuizStats {
  totalAttempts: number
  avgScorePercent: number
  lastAttempt: { correctCount: number; incorrectCount: number; totalQuestions: number; createdAt: string } | null
}

export interface WordCard {
  id: string
  themeId: string
  arabic: string
  translit?: string | null
  translationRu: string
  translationKz?: string | null
  imageUrl?: string | null
  audioUrl?: string | null
  orderIndex: number
  isActive: boolean
}

export interface ThemeForm {
  emoji: string
  titleRu: string
  titleKz: string
  orderIndex: number
  quizEnabled: boolean
}

export interface CardForm {
  themeId: string
  arabic: string
  translit: string
  translationRu: string
  translationKz: string
  orderIndex: number
}

/** Empty / whitespace → null, so the backend clears the field. */
export const kzOrNull = (v: string) => (v.trim() ? v.trim() : null)

export function cardCompleteness(c: Pick<WordCard, 'translationRu' | 'translationKz' | 'translit' | 'imageUrl' | 'audioUrl'>) {
  return [
    { label: 'RU', done: !!c.translationRu?.trim() },
    { label: 'KZ', done: !!c.translationKz?.trim() },
    { label: 'Транслит', done: !!c.translit?.trim() },
    { label: 'Фото', done: !!c.imageUrl },
    { label: 'Аудио', done: !!c.audioUrl },
  ]
}
