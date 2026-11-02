import type { ReactElement } from 'react'
import {
  ArticleOutlined,
  AudiotrackOutlined,
  ChecklistOutlined,
  CompareArrowsOutlined,
  FlagOutlined,
  GridViewOutlined,
  HeadphonesOutlined,
  HearingOutlined,
  ImageOutlined,
  KeyboardOutlined,
  ManageSearchOutlined,
  PhotoLibraryOutlined,
  RadioButtonCheckedOutlined,
  RecordVoiceOverOutlined,
  RepeatOutlined,
  ShortTextOutlined,
  SmartDisplayOutlined,
} from '@mui/icons-material'
import { color } from '../../theme'
import type { BlockType, StudioBlock } from './types'

export type BlockCategory = 'content' | 'words' | 'exercise' | 'finish'

export interface BlockTypeInfo {
  value: BlockType
  label: string
  /** One line for the add-block menu: what the learner sees. */
  description: string
  category: BlockCategory
  icon: ReactElement
}

export const BLOCK_CATEGORIES: { id: BlockCategory; label: string }[] = [
  { id: 'content', label: 'Контент' },
  { id: 'words', label: 'Слова и медиа' },
  { id: 'exercise', label: 'Упражнения' },
  { id: 'finish', label: 'Завершение' },
]

/** Icon tile colours per category. Category is also written as text, so colour is never the only cue. */
export const CATEGORY_TONE: Record<BlockCategory, { bg: string; fg: string }> = {
  content: { bg: color.sand[200], fg: color.bronze[700] },
  words: { bg: color.info.soft, fg: color.info.dark },
  exercise: { bg: color.success.soft, fg: color.success.dark },
  finish: { bg: color.gold[100], fg: color.gold[800] },
}

export const BLOCK_TYPES: BlockTypeInfo[] = [
  { value: 'theory', label: 'Теория', description: 'Текст с арабским, таблицами, фото и аудио', category: 'content', icon: <ArticleOutlined /> },
  { value: 'grid', label: 'Сетка карточек', description: 'Буквы или слова в сетке, можно с аудио по нажатию', category: 'content', icon: <GridViewOutlined /> },
  { value: 'illustration', label: 'Слово с иллюстрацией', description: 'Арабское слово, транскрипция, перевод и картинка', category: 'words', icon: <ImageOutlined /> },
  { value: 'audio', label: 'Аудио', description: 'Заголовок и текст с аудиозаписью', category: 'words', icon: <AudiotrackOutlined /> },
  { value: 'video', label: 'Видео', description: 'Заголовок и текст с видео', category: 'words', icon: <SmartDisplayOutlined /> },
  { value: 'single_choice', label: 'Один правильный ответ', description: 'Вопрос и варианты, верный — один', category: 'exercise', icon: <RadioButtonCheckedOutlined /> },
  { value: 'multiple_choice', label: 'Несколько правильных', description: 'Вопрос и варианты, верных может быть несколько', category: 'exercise', icon: <ChecklistOutlined /> },
  { value: 'fill_blank', label: 'Заполните пропуск', description: 'Предложение с пропуском и варианты', category: 'exercise', icon: <ShortTextOutlined /> },
  { value: 'manual_input', label: 'Ввод ответа', description: 'Ученик печатает ответ сам', category: 'exercise', icon: <KeyboardOutlined /> },
  { value: 'match_pairs', label: 'Сопоставление пар', description: 'Текст, аудио или картинки в две колонки', category: 'exercise', icon: <CompareArrowsOutlined /> },
  { value: 'image_word_match', label: 'Картинка и слово', description: 'Соединить картинки с арабскими словами', category: 'exercise', icon: <PhotoLibraryOutlined /> },
  { value: 'audio_multiple_choice', label: 'Аудио и выбор ответа', description: 'Прослушать запись и выбрать ответ', category: 'exercise', icon: <HeadphonesOutlined /> },
  { value: 'audio_choice', label: 'Звук и буква', description: 'Махрадж: услышать звук и выбрать букву', category: 'exercise', icon: <RecordVoiceOverOutlined /> },
  { value: 'listen_repeat', label: 'Послушай и повтори', description: 'Запись для повторения вслух', category: 'exercise', icon: <RepeatOutlined /> },
  { value: 'listen_and_choose_word', label: 'Послушай и выбери слово', description: 'Прослушать и выбрать слово с огласовками', category: 'exercise', icon: <HearingOutlined /> },
  { value: 'find_letter_in_word', label: 'Найди букву в слове', description: 'Отметить букву внутри арабского слова', category: 'exercise', icon: <ManageSearchOutlined /> },
  { value: 'lesson_complete', label: 'Завершение урока', description: 'Итог урока и переход к мини-тесту', category: 'finish', icon: <FlagOutlined /> },
]

export const EXERCISE_BLOCK_TYPES: BlockType[] = [
  'multiple_choice',
  'audio_multiple_choice',
  'single_choice',
  'match_pairs',
  'fill_blank',
  'manual_input',
  'listen_repeat',
  'image_word_match',
  'audio_choice',
  'find_letter_in_word',
  'listen_and_choose_word',
]

/** Block types whose media (audio file) is managed with the block media uploader. */
export const AUDIO_MEDIA_BLOCK_TYPES: BlockType[] = [
  'audio_multiple_choice',
  'listen_repeat',
  'audio_choice',
  'listen_and_choose_word',
]

/** Exercise types that pick images/audio from block media inside the editor. */
export const PAIR_MEDIA_BLOCK_TYPES: BlockType[] = ['image_word_match', 'match_pairs']

export function normalizeBlockType(type: string): BlockType {
  return (type === 'element_grid' ? 'grid' : type) as BlockType
}

export function getBlockTypeInfo(type: string): BlockTypeInfo | undefined {
  const normalized = normalizeBlockType(type)
  return BLOCK_TYPES.find((bt) => bt.value === normalized)
}

export function getBlockTypeLabel(type: string) {
  return getBlockTypeInfo(type)?.label || type
}

export function stripHtml(html: string): string {
  // DOMParser documents are inert: <img onerror> etc. never execute.
  const doc = new DOMParser().parseFromString(html || '', 'text/html')
  return doc.body.textContent || ''
}

/** Short human title for the outline: the first meaningful text of the block. */
export function getBlockDisplayTitle(block: Pick<StudioBlock, 'type' | 'contentRu'>) {
  const cr = (block.contentRu || {}) as Record<string, any>
  if (block.type === 'illustration') {
    return (cr.arabicWord as string) || (cr.translation as string) || ''
  }
  if (block.type === 'element_grid' || block.type === 'grid') {
    const firstItem = Array.isArray(cr.items) && cr.items[0]
    return (cr.title as string) || (typeof firstItem === 'string' ? firstItem : firstItem?.mainText) || ''
  }
  if (block.type === 'lesson_complete') {
    return (cr.messageRu as string) || ''
  }
  return (
    (cr.title as string) ||
    (cr.question as string) ||
    (cr.instructionRu as string) ||
    (cr.instruction as string) ||
    (cr.word as string) ||
    stripHtml((cr.html as string) || (cr.text as string) || '').slice(0, 80) ||
    ''
  )
}

const ARABIC_RE = /[\u0600-\u06FF]/

export function hasArabic(text: string) {
  return ARABIC_RE.test(text)
}

/**
 * True when the saved block has Russian content but its Kazakh version is empty.
 * Used for the «KZ» marker in the outline; mirrors `getKzGaps` for drafts.
 */
export function isSavedBlockMissingKz(block: StudioBlock): boolean {
  const ru = (block.contentRu || {}) as Record<string, any>
  const kz = (block.contentKz || {}) as Record<string, any>
  const filled = (v: unknown) => typeof v === 'string' && stripHtml(v).trim().length > 0
  switch (normalizeBlockType(block.type)) {
    case 'theory':
    case 'audio':
    case 'video':
      return (filled(ru.html) || filled(ru.text)) && !(filled(kz.html) || filled(kz.text))
    case 'illustration':
      return filled(ru.translation) && !filled(kz.translation)
    case 'lesson_complete':
      return filled(ru.summaryRu) && !filled(kz.summaryKz)
    case 'multiple_choice':
    case 'single_choice':
    case 'audio_multiple_choice':
    case 'manual_input':
      return filled(ru.question) && !filled(kz.question)
    case 'listen_repeat':
    case 'audio_choice':
    case 'listen_and_choose_word':
    case 'find_letter_in_word':
    case 'image_word_match':
    case 'fill_blank':
    case 'match_pairs':
      return filled(ru.instructionRu) && !filled(kz.instructionKz) && !filled(ru.instructionKz)
    default:
      return false
  }
}
