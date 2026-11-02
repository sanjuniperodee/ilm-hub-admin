export interface DictionaryExample {
  id: string
  arabicSentence: string
  translationRu: string
  translationKz?: string | null
  orderIndex: number
  audioUrl?: string | null
}

export interface DictionaryEntry {
  id: string
  arabic: string
  arabicPlural?: string | null
  translit?: string | null
  translationRu: string
  translationKz?: string | null
  noteRu?: string | null
  isActive: boolean
  audioUrl?: string | null
  examples?: DictionaryExample[]
}

export const newEntry = (): DictionaryEntry => ({
  id: '',
  arabic: '',
  arabicPlural: '',
  translit: '',
  translationRu: '',
  translationKz: '',
  noteRu: '',
  isActive: true,
  audioUrl: null,
  examples: [],
})

const has = (v?: string | null) => !!v && v.trim().length > 0

export function entryCompleteness(e: DictionaryEntry) {
  const examples = e.examples ?? []
  return [
    { label: 'KZ', done: has(e.translationKz) },
    { label: 'Аудио', done: has(e.audioUrl) },
    { label: 'Примеры', done: examples.length > 0 },
  ]
}
