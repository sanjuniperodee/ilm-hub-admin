/**
 * Pure conversions between stored lesson blocks, the editor draft and the API payload.
 * The payload shapes here are the contract with the backend and the mobile app — change
 * them only together with both (see docs/RICH_TEXT_FORMAT.md for `contentRu/Kz.doc`).
 */
import { newGridItemRow, type GridItemRow } from '../../components/GridBlockEditor'
import { wrapRichTextTables } from '../../utils/wrapRichTextTables'
import { htmlToIlmDoc } from '../../richtext/ilmDoc'
import { EXERCISE_BLOCK_TYPES, stripHtml } from './blockTypes'
import type { BlockDraft, BlockType, GridColumnMode, MediaFile, StudioBlock } from './types'

export function snapshotDraft(draft: BlockDraft) {
  return JSON.stringify(draft)
}

export function createEmptyDraft(type: BlockType, orderIndex: number): BlockDraft {
  return {
    type,
    orderIndex,
    titleRu: '',
    textRuHtml: '',
    titleKz: '',
    textKz: '',
    arabicWord: '',
    transcription: '',
    translationRu: '',
    translationKz: '',
    // Same as picking an exercise type in the old type selector: an empty config object.
    exerciseConfig: EXERCISE_BLOCK_TYPES.includes(type) ? {} : undefined,
    messageRu: undefined,
    messageKz: undefined,
    summaryRu: undefined,
    summaryKz: undefined,
    nextActionRu: undefined,
    nextActionKz: undefined,
    nextActionButtonRu: undefined,
    nextActionButtonKz: undefined,
    gridItemRows: [newGridItemRow()],
    gridColumnMode: '3',
    gridShowCaption: false,
    gridInteractive: false,
  }
}

/** Switching the type of the open draft keeps shared fields (same rules as the old selector). */
export function changeDraftType(prev: BlockDraft, t: BlockType): BlockDraft {
  return {
    ...prev,
    type: t,
    exerciseConfig: EXERCISE_BLOCK_TYPES.includes(t) ? prev.exerciseConfig || {} : undefined,
    ...(t === 'grid'
      ? {
          gridItemRows: prev.gridItemRows?.length ? prev.gridItemRows : [newGridItemRow()],
          gridColumnMode: prev.gridColumnMode || '3',
          gridShowCaption: prev.gridShowCaption ?? false,
          gridInteractive: prev.gridInteractive ?? false,
        }
      : {}),
  }
}

export function parseGridBlockForDraft(block: StudioBlock): {
  gridItemRows: GridItemRow[]
  gridColumnMode: GridColumnMode
  gridShowCaption: boolean
  gridInteractive: boolean
} {
  const cr = (block.contentRu || {}) as Record<string, any>
  const kz = (block.contentKz || {}) as Record<string, any>
  const colRaw = cr.columns
  let gridColumnMode: GridColumnMode = '3'
  if (colRaw === 'auto' || colRaw === 'Auto') {
    gridColumnMode = 'auto'
  } else {
    const n = Math.min(4, Math.max(2, Number(colRaw) || 3))
    gridColumnMode = String(n) as GridColumnMode
  }
  const gridShowCaption = !!cr.showCaption
  const gridInteractive = !!cr.interactive
  const itemsRaw = cr.items
  if (Array.isArray(itemsRaw) && itemsRaw.length > 0) {
    if (typeof itemsRaw[0] === 'string') {
      const strs = (itemsRaw as string[]).map((s) => String(s))
      return {
        gridItemRows: strs.length
          ? strs.map((s) => {
              const g = newGridItemRow()
              g.mainRu = s
              g.mainKz = s
              return g
            })
          : [newGridItemRow()],
        gridColumnMode,
        gridShowCaption: false,
        gridInteractive: false,
      }
    }
    return {
      gridItemRows: (itemsRaw as any[]).map((r, i) => {
        const g = newGridItemRow()
        if (typeof r?.id === 'string' && r.id.trim()) g.id = r.id
        g.mainRu = (r?.mainText as string) || ''
        g.mainKz = (Array.isArray(kz.items) ? kz.items[i] : null)?.mainText || ''
        g.captionRu = (r?.caption as string) || ''
        g.captionKz = (Array.isArray(kz.items) ? kz.items[i] : null)?.caption || ''
        g.audioUrl = (r?.audioUrl as string) || ''
        return g
      }),
      gridColumnMode,
      gridShowCaption,
      gridInteractive,
    }
  }
  return {
    gridItemRows: [newGridItemRow()],
    gridColumnMode,
    gridShowCaption,
    gridInteractive,
  }
}

export function isGridItemAudioDescription(description: string | undefined, rowId: string) {
  const desc = (description || '').trim()
  if (!desc) return false
  return desc === `grid-${rowId}` || desc === `grid-${rowId.slice(0, 12)}` || desc.startsWith(`grid-${rowId}`)
}

/**
 * Builds the editor config of an exercise block from its stored content.
 * Kazakh-only fields (`instructionKz`, `sentenceTemplateKz`, …) are written to both locales
 * by `mapExerciseConfigToContent`, so they are read back here; previously they were dropped
 * on load and lost on the next save.
 */
export function buildExerciseConfigFromBlock(block: StudioBlock): any {
  const ru = block.contentRu || {}
  const kz = block.contentKz || {}
  const type = block.type
  const kzField = (name: string) => (ru as any)[name] ?? (kz as any)[name]

  if (type === 'multiple_choice' || type === 'single_choice') {
    return {
      question: { ru: ru.question, kz: kz.question },
      options: (ru.options || []).map((opt: any, i: number) => ({
        text: {
          ru: opt.text,
          kz: kz.options?.[i]?.text,
        },
        isCorrect: opt.isCorrect,
      })),
    }
  }
  if (type === 'manual_input') {
    return {
      question: { ru: ru.question, kz: kz.question },
      correctAnswers: {
        ru: ru.correctAnswers || [],
        kz: kz.correctAnswers || [],
      },
    }
  }
  if (type === 'match_pairs') {
    const inferItemType = (item: any): 'text' | 'audio' | 'image' => {
      if (item.itemType === 'audio' || item.itemType === 'image' || item.itemType === 'text') {
        return item.itemType
      }
      if (item.audioUrl || item.audioMediaId) return 'audio'
      if (item.imageUrl || item.imageMediaId) return 'image'
      return 'text'
    }
    const mapMatchItem = (item: any, i: number, side: 'left' | 'right') => {
      const kzArr = side === 'left' ? kz.leftItems : kz.rightItems
      const textRu = item.text
      const text =
        typeof textRu === 'string'
          ? { ru: textRu, kz: kzArr?.[i]?.text ?? '' }
          : { ru: textRu?.ru ?? '', kz: textRu?.kz ?? kzArr?.[i]?.text ?? '' }
      return {
        id: item.id,
        text,
        imageUrl: item.imageUrl ?? '',
        imageMediaId: item.imageMediaId ?? '',
        itemType: inferItemType(item),
        audioUrl: item.audioUrl ?? '',
        audioMediaId: item.audioMediaId ?? '',
        audioLabel: item.audioLabel ?? '',
      }
    }
    // New format: leftItems/rightItems/correctPairs (supports distractors)
    if (Array.isArray(ru.leftItems)) {
      return {
        instructionRu: ru.instructionRu ?? '',
        instructionKz: kzField('instructionKz') ?? '',
        leftItems: ru.leftItems.map((item: any, i: number) => mapMatchItem(item, i, 'left')),
        rightItems: (ru.rightItems ?? []).map((item: any, i: number) => mapMatchItem(item, i, 'right')),
        correctPairs: ru.correctPairs ?? [],
      }
    }
    // Legacy pairs format (backward compat)
    return {
      pairs: (ru.pairs || []).map((p: any, i: number) => ({
        left: { ru: p.left, kz: kz.pairs?.[i]?.left },
        right: { ru: p.right, kz: kz.pairs?.[i]?.right },
        leftImageUrl: p.leftImageUrl,
        rightImageUrl: p.rightImageUrl,
      })),
    }
  }
  if (type === 'audio_multiple_choice') {
    return {
      question: { ru: ru.question, kz: kz.question },
      options: (ru.options || []).map((opt: any, i: number) => ({
        text: {
          ru: opt.text,
          kz: kz.options?.[i]?.text,
        },
        isCorrect: opt.isCorrect,
      })),
      audioUrl: ru.audioUrl,
    }
  }
  if (type === 'listen_repeat') {
    return {
      instructionRu: ru.instructionRu || 'Слушай и повторяй',
      instructionKz: kzField('instructionKz'),
      audioUrl: ru.audioUrl,
    }
  }
  if (type === 'fill_blank') {
    return {
      instructionRu: ru.instructionRu,
      instructionKz: kzField('instructionKz'),
      sentenceTemplateRu: ru.sentenceTemplateRu,
      sentenceTemplateKz: kzField('sentenceTemplateKz'),
      options: ru.options,
      correctAnswerId: ru.correctAnswerId,
      explanationRu: ru.explanationRu,
      explanationKz: kzField('explanationKz'),
    }
  }
  if (type === 'image_word_match') {
    return {
      instruction: ru.instruction ?? '',
      instructionRu: ru.instructionRu ?? ru.instruction ?? '',
      instructionKz: kzField('instructionKz') ?? '',
      pairs: ru.pairs ?? [],
    }
  }
  if (type === 'audio_choice') {
    return {
      instructionRu: ru.instructionRu ?? '',
      instructionKz: kzField('instructionKz') ?? '',
      audioUrl: ru.audioUrl ?? '',
      options: (ru.options || []).map((opt: any) => ({
        id: opt.id,
        text: opt.text ?? '',
        isCorrect: opt.isCorrect ?? false,
      })),
    }
  }
  if (type === 'find_letter_in_word') {
    return {
      instructionRu: ru.instructionRu ?? 'Найдите букву в слове',
      instructionKz: kzField('instructionKz') ?? '',
      word: ru.word ?? '',
      targetLetter: ru.targetLetter ?? '',
    }
  }
  if (type === 'listen_and_choose_word') {
    return {
      instructionRu: ru.instructionRu ?? '',
      instructionKz: kzField('instructionKz') ?? '',
      audioUrl: ru.audioUrl ?? '',
      options: (ru.options || []).map((opt: any) => ({
        id: opt.id,
        text: opt.text ?? '',
        isCorrect: opt.isCorrect ?? false,
      })),
    }
  }
  return {}
}

export function mapExerciseConfigToContent(config: any, type: BlockType): { contentRu: any; contentKz: any } {
  if (!config) return { contentRu: {}, contentKz: {} }
  const mapContent = (lang: string) => {
    if (type === 'multiple_choice' || type === 'single_choice' || type === 'audio_multiple_choice' || type === 'manual_input') {
      return {
        question: config.question?.[lang],
        options: config.options?.map((o: any, i: number) => ({
          id: o.id || `opt_${i + 1}`,
          text: o.text?.[lang] ?? (typeof o.text === 'string' ? o.text : ''),
          isCorrect: o.isCorrect,
        })),
        correctAnswers: config.correctAnswers?.[lang],
      }
    }
    if (type === 'match_pairs') {
      // New format with distractors (media ids stored on each locale for parity; editor uses RU as source)
      if (Array.isArray(config.leftItems)) {
        return {
          instructionRu: config.instructionRu ?? '',
          instructionKz: config.instructionKz ?? '',
          leftItems: config.leftItems.map((item: any) => ({
            id: item.id,
            text: item.text?.[lang] ?? '',
            imageUrl: item.imageUrl ?? '',
            imageMediaId: item.imageMediaId ?? '',
            itemType: item.itemType ?? 'text',
            audioUrl: item.audioUrl ?? '',
            audioMediaId: item.audioMediaId ?? '',
            audioLabel: item.audioLabel ?? '',
          })),
          rightItems: (config.rightItems ?? []).map((item: any) => ({
            id: item.id,
            text: item.text?.[lang] ?? '',
            imageUrl: item.imageUrl ?? '',
            imageMediaId: item.imageMediaId ?? '',
            itemType: item.itemType ?? 'text',
            audioUrl: item.audioUrl ?? '',
            audioMediaId: item.audioMediaId ?? '',
            audioLabel: item.audioLabel ?? '',
          })),
          correctPairs: config.correctPairs ?? [],
        }
      }
      // Legacy pairs format
      return {
        pairs: config.pairs?.map((p: any) => ({
          left: p.left?.[lang],
          right: p.right?.[lang],
          leftImageUrl: p.leftImageUrl,
          rightImageUrl: p.rightImageUrl,
        })),
      }
    }
    if (type === 'listen_repeat') {
      return {
        instructionRu: config.instructionRu,
        instructionKz: config.instructionKz,
        audioUrl: config.audioUrl,
      }
    }
    if (type === 'fill_blank') {
      return {
        instructionRu: config.instructionRu,
        instructionKz: config.instructionKz,
        sentenceTemplateRu: config.sentenceTemplateRu,
        sentenceTemplateKz: config.sentenceTemplateKz,
        options: config.options,
        correctAnswerId: config.correctAnswerId,
        explanationRu: config.explanationRu,
        explanationKz: config.explanationKz,
      }
    }
    if (type === 'image_word_match') {
      return {
        instructionRu: config.instructionRu,
        instructionKz: config.instructionKz,
        pairs: config.pairs,
      }
    }
    if (type === 'audio_choice') {
      return {
        instructionRu: config.instructionRu,
        instructionKz: config.instructionKz,
        audioUrl: config.audioUrl ?? '',
        options: config.options?.map((o: any, i: number) => ({
          id: o.id || `opt_${i + 1}`,
          text: o.text ?? '',
          isCorrect: o.isCorrect ?? false,
        })),
      }
    }
    if (type === 'find_letter_in_word') {
      return {
        instructionRu: config.instructionRu,
        instructionKz: config.instructionKz,
        word: config.word ?? '',
        targetLetter: config.targetLetter ?? '',
      }
    }
    if (type === 'listen_and_choose_word') {
      return {
        instructionRu: config.instructionRu,
        instructionKz: config.instructionKz,
        audioUrl: config.audioUrl ?? '',
        options: config.options?.map((o: any, i: number) => ({
          id: o.id || `opt_${i + 1}`,
          text: o.text ?? '',
          isCorrect: o.isCorrect ?? false,
        })),
      }
    }
    return {}
  }
  return {
    contentRu: mapContent('ru'),
    contentKz: mapContent('kz'),
  }
}

export function draftFromBlock(block: StudioBlock): BlockDraft {
  const isExercise = EXERCISE_BLOCK_TYPES.includes(block.type as BlockType)
  const isLessonComplete = block.type === 'lesson_complete'
  const isGridLike = block.type === 'grid' || block.type === 'element_grid'
  const gridDraft = isGridLike ? parseGridBlockForDraft(block) : null
  return {
    id: block.id,
    type: (isGridLike ? 'grid' : block.type) as BlockType,
    orderIndex: block.orderIndex,
    titleRu: (block.contentRu?.title as string) || '',
    textRuHtml: (block.contentRu?.html as string) || (block.contentRu?.text as string) || '',
    titleKz: (block.contentKz?.title as string) || '',
    textKz: (block.contentKz?.html as string) || (block.contentKz?.text as string) || '',
    arabicWord: (block.contentRu?.arabicWord as string) || '',
    transcription: (block.contentRu?.transcription as string) || '',
    translationRu: (block.contentRu?.translation as string) || (block.contentRu?.translationRu as string) || '',
    translationKz: (block.contentKz?.translation as string) || (block.contentKz?.translationKz as string) || '',
    exerciseConfig: isExercise ? buildExerciseConfigFromBlock(block) : undefined,
    messageRu: isLessonComplete ? (block.contentRu?.messageRu as string) || '' : undefined,
    messageKz: isLessonComplete ? (block.contentKz?.messageKz as string) || '' : undefined,
    summaryRu: isLessonComplete ? (block.contentRu?.summaryRu as string) || '' : undefined,
    summaryKz: isLessonComplete ? (block.contentKz?.summaryKz as string) || '' : undefined,
    nextActionRu: isLessonComplete ? (block.contentRu?.nextActionRu as string) || '' : undefined,
    nextActionKz: isLessonComplete ? (block.contentKz?.nextActionKz as string) || '' : undefined,
    nextActionButtonRu: isLessonComplete ? (block.contentRu?.nextActionButtonRu as string) || '' : undefined,
    nextActionButtonKz: isLessonComplete ? (block.contentKz?.nextActionButtonKz as string) || '' : undefined,
    gridItemRows: gridDraft?.gridItemRows || [newGridItemRow()],
    gridColumnMode: gridDraft?.gridColumnMode || '3',
    gridShowCaption: gridDraft?.gridShowCaption ?? false,
    gridInteractive: gridDraft?.gridInteractive ?? false,
  }
}

/** Fills empty grid audio URLs from uploaded block media (by `grid-<rowId>` description, then by order). */
export function getGridRowsWithMediaAudio(rows: GridItemRow[], mediaFiles: MediaFile[]) {
  const audioFiles = mediaFiles.filter((f) => f.type === 'audio' && f.url)
  const canFallbackByOrder = audioFiles.length >= rows.length
  return rows.map((row, index) => {
    if ((row.audioUrl || '').trim()) return row
    const byDescription = audioFiles.find((file) => isGridItemAudioDescription(file.description, row.id))
    const byOrder = canFallbackByOrder ? audioFiles[index] : undefined
    const audioUrl = byDescription?.url || byOrder?.url || ''
    return audioUrl ? { ...row, audioUrl } : row
  })
}

export function filledGridRows(draft: BlockDraft, mediaFiles: MediaFile[]) {
  return getGridRowsWithMediaAudio(
    (draft.gridItemRows || []).filter((r) => (r.mainRu || '').trim().length > 0),
    mediaFiles,
  )
}

export function buildBlockPayload(
  blockDraft: BlockDraft,
  mediaFiles: MediaFile[],
  lessonId: string | undefined,
  includeLessonId: boolean,
  options?: { allowDraftGridWithoutAudio?: boolean },
) {
  if (blockDraft.type === 'lesson_complete') {
    const base = {
      type: 'lesson_complete',
      orderIndex: Number(blockDraft.orderIndex) || 0,
      contentRu: {
        messageRu: blockDraft.messageRu || 'Вы завершили урок!',
        summaryRu: blockDraft.summaryRu || '',
        nextActionRu: blockDraft.nextActionRu || '',
        nextActionButtonRu: blockDraft.nextActionButtonRu || 'Перейти к мини-тесту',
      },
      contentKz: {
        messageKz: blockDraft.messageKz || '',
        summaryKz: blockDraft.summaryKz || '',
        nextActionKz: blockDraft.nextActionKz || '',
        nextActionButtonKz: blockDraft.nextActionButtonKz || '',
      },
    }
    return includeLessonId && lessonId ? { lessonId, ...base } : base
  }

  if (blockDraft.type === 'grid') {
    const rows = filledGridRows(blockDraft, mediaFiles)
    const col = blockDraft.gridColumnMode === 'auto' ? 'auto' : Number(blockDraft.gridColumnMode)
    const showCaption = blockDraft.gridShowCaption
    const interactive = blockDraft.gridInteractive
    const buildItems = (locale: 'ru' | 'kz') =>
      rows.map((r) => {
        const main = locale === 'ru' ? r.mainRu.trim() : (r.mainKz || r.mainRu).trim()
        const cap = locale === 'ru' ? (r.captionRu || '').trim() : (r.captionKz || '').trim()
        const audio = (r.audioUrl || '').trim()
        return {
          id: r.id,
          mainText: main,
          ...(showCaption ? { caption: cap } : {}),
          ...(interactive && audio ? { audioUrl: audio } : {}),
          ...(options?.allowDraftGridWithoutAudio && audio ? { audioUrl: audio } : {}),
        }
      })
    const base = {
      type: 'grid' as const,
      orderIndex: Number(blockDraft.orderIndex) || 0,
      contentRu: {
        title: blockDraft.titleRu || '',
        columns: col,
        showCaption,
        interactive: options?.allowDraftGridWithoutAudio ? false : interactive,
        items: buildItems('ru'),
      },
      contentKz: {
        title: blockDraft.titleKz || '',
        columns: col,
        showCaption,
        interactive: options?.allowDraftGridWithoutAudio ? false : interactive,
        items: buildItems('kz'),
      },
    }
    return includeLessonId && lessonId ? { lessonId, ...base } : base
  }

  const isExercise = EXERCISE_BLOCK_TYPES.includes(blockDraft.type)
  if (isExercise && blockDraft.exerciseConfig) {
    const { contentRu, contentKz } = mapExerciseConfigToContent(blockDraft.exerciseConfig, blockDraft.type)
    const base = {
      type: blockDraft.type,
      orderIndex: Number(blockDraft.orderIndex) || 0,
      contentRu: contentRu || {},
      contentKz: contentKz || {},
    }
    return includeLessonId && lessonId ? { lessonId, ...base } : base
  }

  const isIllustration = blockDraft.type === 'illustration'
  const contentRu = isIllustration
    ? {
        arabicWord: blockDraft.arabicWord || '',
        transcription: blockDraft.transcription || '',
        translation: blockDraft.translationRu || '',
      }
    : {
        title: blockDraft.titleRu,
        text: stripHtml(blockDraft.textRuHtml),
        // Legacy HTML for app versions that predate IlmDoc.
        html: wrapRichTextTables(blockDraft.textRuHtml),
        // Canonical structured document rendered natively by the app (docs/RICH_TEXT_FORMAT.md).
        doc: htmlToIlmDoc(blockDraft.textRuHtml),
      }
  const contentKz = isIllustration
    ? {
        translation: blockDraft.translationKz || '',
      }
    : {
        title: blockDraft.titleKz,
        text: stripHtml(blockDraft.textKz),
        html: wrapRichTextTables(blockDraft.textKz),
        doc: htmlToIlmDoc(blockDraft.textKz),
      }

  const basePayload = {
    type: blockDraft.type,
    orderIndex: Number(blockDraft.orderIndex) || 0,
    contentRu,
    contentKz,
  }
  return includeLessonId && lessonId ? { lessonId, ...basePayload } : basePayload
}

/** Re-points media `src` in saved HTML to fresh (re-signed) URLs from the block media list. */
export function refreshHtmlWithMedia(html: string | undefined, media: MediaFile[]) {
  if (!html || media.length === 0) return html || ''
  const template = document.createElement('template')
  template.innerHTML = html
  media.forEach((m) => {
    const els = template.content.querySelectorAll(`[data-media-id="${m.id}"]`)
    els.forEach((el) => {
      if (['IMG', 'AUDIO', 'VIDEO', 'SOURCE'].includes(el.tagName)) el.setAttribute('src', m.url)
    })
    if (m.url) {
      const baseUrl = m.url.split('?')[0]
      if (baseUrl) {
        const allEls = template.content.querySelectorAll('img, audio, video, source')
        allEls.forEach((el) => {
          const src = el.getAttribute('src')
          if (src && src.startsWith(baseUrl)) {
            el.setAttribute('src', m.url)
            el.setAttribute('data-media-id', m.id)
          }
        })
      }
    }
  })
  return template.innerHTML
}

export function mediaTypeOfFile(file: File): 'image' | 'audio' | 'video' {
  const mime = file.type || ''
  return mime.startsWith('audio/') ? 'audio' : mime.startsWith('video/') ? 'video' : 'image'
}
