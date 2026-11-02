/**
 * Non-blocking checks for test questions. They describe what the learner would
 * see as broken (no correct answer, missing audio…) — saving is still allowed so
 * editors can keep drafts; the issues are shown next to the question.
 */

export interface ValidatableAnswer {
  answerRu?: string
  isCorrect?: boolean
}

export interface ValidatableQuestion {
  type?: string
  questionRu?: { text?: string; hint?: string }
  config?: Record<string, any>
  answers?: ValidatableAnswer[]
}

const blank = (v: unknown) => typeof v !== 'string' || v.trim().length === 0
const stripHarakat = (s: string) => s.replace(/[\u064B-\u065F\u0670\u0640]/g, '')

function checkOptionList(
  options: Array<{ text?: string; isCorrect?: boolean }> | undefined,
  issues: string[],
  { min = 2, single = true }: { min?: number; single?: boolean } = {},
) {
  const list = Array.isArray(options) ? options : []
  if (list.length < min) issues.push(`Нужно минимум ${min} варианта ответа`)
  if (list.some((o) => blank(o?.text))) issues.push('Есть пустые варианты ответа')
  const correct = list.filter((o) => o?.isCorrect).length
  if (correct === 0) issues.push('Отметьте правильный вариант')
  else if (single && correct > 1) issues.push('Правильным должен быть только один вариант')
}

export function validateQuestion(q: ValidatableQuestion): string[] {
  const issues: string[] = []
  const type = q.type || 'multiple_choice'
  const c = q.config || {}

  if (blank(q.questionRu?.text) || q.questionRu?.text === 'Новый вопрос') {
    issues.push(blank(q.questionRu?.text) ? 'Введите текст вопроса' : 'Замените текст-заглушку «Новый вопрос»')
  }

  switch (type) {
    case 'single_choice':
    case 'multiple_choice': {
      const answers = q.answers || []
      if (answers.length < 2) issues.push('Добавьте минимум 2 варианта ответа')
      if (answers.some((a) => blank(a.answerRu))) issues.push('Есть пустые варианты ответа')
      const correct = answers.filter((a) => a.isCorrect).length
      if (correct === 0) issues.push('Отметьте правильный ответ')
      if (type === 'single_choice' && correct > 1) issues.push('В вопросе с одним ответом отмечено несколько правильных')
      break
    }
    case 'fill_blank': {
      const opts = Array.isArray(c.options) ? c.options : []
      if (blank(c.sentenceTemplateRu)) issues.push('Введите предложение с пропуском')
      else if (!/_{3,}/.test(c.sentenceTemplateRu)) issues.push('В предложении нет пропуска «________»')
      if (opts.length < 2) issues.push('Нужно минимум 2 варианта')
      if (opts.some((o: any) => blank(typeof o === 'string' ? o : o?.text))) issues.push('Есть пустые варианты')
      if (!c.correctAnswerId || !opts.some((o: any) => typeof o === 'object' && o?.id === c.correctAnswerId)) {
        if (opts.length && typeof opts[0] === 'object') issues.push('Выберите правильный вариант')
      }
      break
    }
    case 'manual_input':
      if (blank(c.correctAnswer)) issues.push('Укажите правильный ответ')
      break
    case 'match_pairs': {
      const left = (c.leftItems ?? c.leftColumn ?? []) as any[]
      const right = (c.rightItems ?? c.rightColumn ?? []) as any[]
      const pairs = (c.correctPairs ?? []) as Array<{ leftId: string; rightId: string }>
      const itemEmpty = (it: any) =>
        typeof it === 'string' ? blank(it) : (it?.itemType ?? 'text') === 'audio' ? blank(it?.audioUrl) : blank(it?.text) && blank(it?.imageUrl)
      if (left.length === 0) issues.push('Добавьте хотя бы одну пару')
      if (left.some(itemEmpty) || right.some(itemEmpty)) issues.push('Есть пустые элементы пар')
      const unpaired = left.filter((l: any) => !pairs.some((p) => p.leftId === l?.id)).length
      if (unpaired > 0) issues.push(`Не выбрана пара для ${unpaired} элемент(ов) слева`)
      break
    }
    case 'audio_multiple_choice':
      if (blank(c.audioUrl)) issues.push('Выберите аудиофайл')
      checkOptionList(c.options, issues)
      break
    case 'audio_choice':
    case 'listen_and_choose_word':
      if (blank(c.audioUrl)) issues.push('Выберите аудиофайл')
      checkOptionList(c.options, issues)
      break
    case 'image_word_match': {
      const pairs = Array.isArray(c.pairs) ? c.pairs : []
      if (pairs.length < 2) issues.push('Нужно минимум 2 пары')
      if (pairs.some((p: any) => blank(p?.word))) issues.push('У некоторых пар нет слова')
      if (pairs.some((p: any) => blank(p?.imageUrl))) issues.push('У некоторых пар нет изображения')
      break
    }
    case 'find_letter_in_word': {
      if (blank(c.word)) issues.push('Введите арабское слово')
      if (blank(c.targetLetter)) issues.push('Укажите букву, которую нужно найти')
      if (!blank(c.word) && !blank(c.targetLetter) && !stripHarakat(c.word).includes(stripHarakat(c.targetLetter))) {
        issues.push('Буквы нет в слове')
      }
      break
    }
    default:
      break
  }
  return issues
}
