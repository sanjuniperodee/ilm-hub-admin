/**
 * Validation rules for lesson exercise configs (the `exerciseConfig` the editors emit).
 * Shared by the editors (inline messages next to the field) and the lesson editor
 * (summary before saving). Messages are written for content managers, in Russian.
 */

export type IssueField =
  | 'question'
  | 'instruction'
  | 'options'
  | 'correct'
  | 'answers'
  | 'pairs'
  | 'word'
  | 'target'
  | 'sentence'
  | 'media'
  | 'content'
  | 'items'

export interface ValidationIssue {
  field: IssueField
  message: string
}

const filled = (v: unknown) => typeof v === 'string' && v.trim().length > 0

function optionText(o: any, lang: 'ru' | 'kz' = 'ru'): string {
  if (typeof o === 'string') return o
  if (typeof o?.text === 'string') return o.text
  return o?.text?.[lang] ?? ''
}

function choiceIssues(options: any[], single: boolean, out: ValidationIssue[]) {
  if (options.length < 2) out.push({ field: 'options', message: 'Нужно минимум 2 варианта ответа' })
  else if (options.some((o) => !filled(optionText(o)))) out.push({ field: 'options', message: 'Заполните текст всех вариантов' })
  const correct = options.filter((o) => !!o?.isCorrect).length
  if (options.length > 0 && correct === 0) out.push({ field: 'correct', message: 'Отметьте правильный вариант' })
  if (single && correct > 1) out.push({ field: 'correct', message: 'Правильный вариант должен быть один' })
}

export function validateExerciseConfig(type: string, config: any): ValidationIssue[] {
  const c = config || {}
  const out: ValidationIssue[] = []
  switch (type) {
    case 'multiple_choice':
    case 'single_choice':
    case 'audio_multiple_choice': {
      if (!filled(c.question?.ru)) out.push({ field: 'question', message: 'Введите вопрос' })
      choiceIssues(Array.isArray(c.options) ? c.options : [], type === 'single_choice', out)
      break
    }
    case 'manual_input': {
      if (!filled(c.question?.ru)) out.push({ field: 'question', message: 'Введите вопрос' })
      const answers = Array.isArray(c.correctAnswers?.ru) ? c.correctAnswers.ru.filter(filled) : []
      if (answers.length === 0) out.push({ field: 'answers', message: 'Добавьте хотя бы один правильный ответ' })
      break
    }
    case 'audio_choice':
    case 'listen_and_choose_word': {
      choiceIssues(Array.isArray(c.options) ? c.options : [], true, out)
      break
    }
    case 'find_letter_in_word': {
      if (!filled(c.word)) out.push({ field: 'word', message: 'Введите арабское слово' })
      if (!filled(c.targetLetter)) out.push({ field: 'target', message: 'Укажите букву, которую нужно найти' })
      break
    }
    case 'image_word_match': {
      const pairs: any[] = Array.isArray(c.pairs) ? c.pairs : []
      if (pairs.length < 2) out.push({ field: 'pairs', message: 'Нужно минимум 2 пары' })
      if (pairs.some((p) => !filled(p?.word))) out.push({ field: 'pairs', message: 'Введите слово в каждой паре' })
      if (pairs.some((p) => !p?.imageMediaId && !p?.imageUrl)) out.push({ field: 'media', message: 'Выберите картинку для каждой пары' })
      break
    }
    case 'match_pairs': {
      const left: any[] = Array.isArray(c.leftItems) ? c.leftItems : []
      if (!Array.isArray(c.leftItems)) {
        // Legacy `pairs` format — editor migrates it on first change.
        const legacy: any[] = Array.isArray(c.pairs) ? c.pairs : []
        if (legacy.length < 2) out.push({ field: 'pairs', message: 'Нужно минимум 2 пары' })
        break
      }
      const right: any[] = Array.isArray(c.rightItems) ? c.rightItems : []
      const pairs: any[] = Array.isArray(c.correctPairs) ? c.correctPairs : []
      if (left.length < 2) out.push({ field: 'pairs', message: 'Нужно минимум 2 пары' })
      const unpaired = left.filter((l) => !pairs.some((p) => p.leftId === l.id && right.some((r) => r.id === p.rightId)))
      if (unpaired.length) out.push({ field: 'correct', message: 'Выберите правильный ответ для каждого элемента слева' })
      const emptyItem = [...left, ...right].some((it) => {
        const t = it?.itemType ?? 'text'
        if (t === 'audio') return !it.audioMediaId && !it.audioUrl
        if (t === 'image') return !it.imageMediaId && !it.imageUrl
        return !filled(typeof it?.text === 'string' ? it.text : it?.text?.ru)
      })
      if (emptyItem) out.push({ field: 'items', message: 'Заполните все элементы: текст, аудио или картинку' })
      break
    }
    case 'fill_blank': {
      if (!filled(c.sentenceTemplateRu)) out.push({ field: 'sentence', message: 'Введите предложение с пропуском' })
      else if (!String(c.sentenceTemplateRu).includes('___')) out.push({ field: 'sentence', message: 'Отметьте пропуск подчёркиваниями: ___' })
      const options: any[] = Array.isArray(c.options) ? c.options : []
      if (options.length < 2) out.push({ field: 'options', message: 'Нужно минимум 2 варианта ответа' })
      else if (options.some((o) => !filled(optionText(o)))) out.push({ field: 'options', message: 'Заполните текст всех вариантов' })
      if (options.length > 0 && !options.some((o) => (typeof o === 'object' ? o?.id : undefined) === c.correctAnswerId)) {
        out.push({ field: 'correct', message: 'Отметьте правильный вариант' })
      }
      break
    }
    default:
      break
  }
  return out
}

export function issuesFor(issues: ValidationIssue[], field: IssueField) {
  return issues.filter((i) => i.field === field)
}
