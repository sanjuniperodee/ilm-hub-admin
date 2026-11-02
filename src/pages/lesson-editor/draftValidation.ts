import { validateExerciseConfig, type ValidationIssue } from '../../components/lesson-editor/exerciseValidation'
import { AUDIO_MEDIA_BLOCK_TYPES, EXERCISE_BLOCK_TYPES, stripHtml } from './blockTypes'
import { filledGridRows } from './blockMapping'
import type { BlockDraft, MediaFile } from './types'

export interface DraftValidation {
  /** Block saving is refused (same rules the editor always enforced for grids). */
  errors: string[]
  /** Saving is allowed after confirmation; shown inline in the editors. */
  warnings: ValidationIssue[]
}

const has = (v: unknown) => typeof v === 'string' && stripHtml(v).trim().length > 0

export function validateDraft(draft: BlockDraft, mediaFiles: MediaFile[]): DraftValidation {
  const errors: string[] = []
  const warnings: ValidationIssue[] = []

  if (draft.type === 'grid') {
    const rows = filledGridRows(draft, mediaFiles)
    if (rows.length === 0) errors.push('Сетка: добавьте хотя бы одну карточку с текстом (RU)')
    else if (draft.gridInteractive && rows.some((r) => !(r.audioUrl || '').trim())) {
      errors.push('Сетка: загрузите аудио для каждой карточки или выключите «Аудио по нажатию»')
    }
  }

  if (EXERCISE_BLOCK_TYPES.includes(draft.type)) {
    warnings.push(...validateExerciseConfig(draft.type, draft.exerciseConfig))
    if (AUDIO_MEDIA_BLOCK_TYPES.includes(draft.type) && !mediaFiles.some((f) => f.type === 'audio')) {
      warnings.push({ field: 'media', message: 'Загрузите аудиофайл в разделе «Медиа блока»' })
    }
  } else if (draft.type === 'illustration') {
    if (!draft.arabicWord.trim()) warnings.push({ field: 'word', message: 'Введите арабское слово' })
  } else if (draft.type === 'theory' || draft.type === 'audio' || draft.type === 'video') {
    if (!draft.titleRu.trim() && !has(draft.textRuHtml)) warnings.push({ field: 'content', message: 'Добавьте заголовок или текст (RU)' })
  }
  return { errors, warnings }
}

/** Kazakh fields that are empty while the Russian ones are filled. */
export function getKzGaps(draft: BlockDraft): string[] {
  const gaps: string[] = []
  const check = (ru: unknown, kz: unknown, label: string) => {
    if (has(ru) && !has(kz)) gaps.push(label)
  }
  const c = draft.exerciseConfig || {}
  switch (draft.type) {
    case 'theory':
    case 'audio':
    case 'video':
      check(draft.titleRu, draft.titleKz, 'Заголовок')
      check(draft.textRuHtml, draft.textKz, 'Текст')
      break
    case 'illustration':
      check(draft.translationRu, draft.translationKz, 'Перевод')
      break
    case 'lesson_complete':
      check(draft.messageRu, draft.messageKz, 'Заголовок')
      check(draft.summaryRu, draft.summaryKz, 'Итог урока')
      check(draft.nextActionRu, draft.nextActionKz, 'Следующий шаг')
      check(draft.nextActionButtonRu, draft.nextActionButtonKz, 'Текст кнопки')
      break
    case 'grid':
      check(draft.titleRu, draft.titleKz, 'Заголовок')
      if (draft.gridShowCaption && draft.gridItemRows.some((r) => has(r.captionRu) && !has(r.captionKz))) gaps.push('Подписи')
      break
    case 'multiple_choice':
    case 'single_choice':
    case 'audio_multiple_choice':
      check(c.question?.ru, c.question?.kz, 'Вопрос')
      if ((c.options || []).some((o: any) => has(o?.text?.ru) && !has(o?.text?.kz))) gaps.push('Варианты')
      break
    case 'manual_input':
      check(c.question?.ru, c.question?.kz, 'Вопрос')
      if ((c.correctAnswers?.ru || []).length && !(c.correctAnswers?.kz || []).length) gaps.push('Ответы')
      break
    case 'match_pairs':
      check(c.instructionRu, c.instructionKz, 'Инструкция')
      if ([...(c.leftItems || []), ...(c.rightItems || [])].some((i: any) => (i?.itemType ?? 'text') === 'text' && has(i?.text?.ru) && !has(i?.text?.kz))) {
        gaps.push('Тексты пар')
      }
      break
    case 'fill_blank':
      check(c.instructionRu, c.instructionKz, 'Инструкция')
      check(c.sentenceTemplateRu, c.sentenceTemplateKz, 'Предложение')
      check(c.explanationRu, c.explanationKz, 'Пояснение')
      break
    case 'listen_repeat':
    case 'image_word_match':
    case 'audio_choice':
    case 'find_letter_in_word':
    case 'listen_and_choose_word':
      check(c.instructionRu, c.instructionKz, 'Инструкция')
      break
    default:
      break
  }
  return gaps
}
