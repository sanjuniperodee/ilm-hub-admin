import type { GridItemRow } from '../../components/GridBlockEditor'

export type BlockType =
  | 'theory'
  | 'illustration'
  | 'audio'
  | 'video'
  | 'lesson_complete'
  | 'multiple_choice'
  | 'audio_multiple_choice'
  | 'single_choice'
  | 'match_pairs'
  | 'fill_blank'
  | 'manual_input'
  | 'listen_repeat'
  | 'image_word_match'
  | 'audio_choice'
  | 'find_letter_in_word'
  | 'listen_and_choose_word'
  | 'grid'

/** Content language being edited. Preview follows it. */
export type Lang = 'ru' | 'kz'

/** Editor tabs; mirrored in `?tab=` so a reload returns to the same place. */
export type EditorTab = 'blocks' | 'meta' | 'test'

export interface StudioBlock {
  id: string
  lessonId: string
  type: string
  orderIndex: number
  contentRu?: Record<string, any>
  contentKz?: Record<string, any>
}

export interface MediaFile {
  id: string
  type: 'image' | 'audio' | 'video'
  url: string
  filename: string
  mimeType: string
  size: number
  /** Shown in Match Pairs audio chips when set (stored on media_files). */
  description?: string
}

export type GridColumnMode = '2' | '3' | '4' | 'auto'

export type BlockDraft = {
  id?: string
  type: BlockType
  orderIndex: number
  titleRu: string
  textRuHtml: string
  titleKz: string
  textKz: string
  arabicWord: string
  transcription: string
  translationRu: string
  translationKz: string
  exerciseConfig?: any
  messageRu?: string
  messageKz?: string
  summaryRu?: string
  summaryKz?: string
  nextActionRu?: string
  nextActionKz?: string
  nextActionButtonRu?: string
  nextActionButtonKz?: string
  gridItemRows: GridItemRow[]
  gridColumnMode: GridColumnMode
  gridShowCaption: boolean
  gridInteractive: boolean
}

export type UploadedEditorMedia = {
  id: string
  url: string
  type: 'image' | 'audio' | 'video'
  mimeType?: string
}
