export interface HajjSection {
  id: string
  code: string
  titleRu: string
  titleKz?: string | null
  emoji: string
  orderIndex: number
  isActive: boolean
  instructionsCount: number
  phrasesCount: number
  checklistsCount?: number
}
export interface HajjChecklistItem {
  titleRu: string
  titleKz?: string | null
  isCheckedByDefault?: boolean
}
export interface HajjInstruction {
  id: string
  sectionId: string
  stepNumber?: number | null
  titleRu: string
  titleKz?: string | null
  descriptionRu?: string | null
  descriptionKz?: string | null
  isHighlight: boolean
  orderIndex: number
  items?: HajjChecklistItem[]
  badgeRu?: string | null
  badgeKz?: string | null
  warningTitleRu?: string | null
  warningTitleKz?: string | null
  warningItemsRu?: string[]
  warningItemsKz?: string[]
  successTitleRu?: string | null
  successTitleKz?: string | null
  successItemsRu?: string[]
  successItemsKz?: string[]
}
export interface HajjPhrase {
  id: string
  sectionId: string
  titleRu?: string | null
  titleKz?: string | null
  textAr: string
  transliteration?: string | null
  translationRu: string
  translationKz?: string | null
  audioUrl?: string | null
  orderIndex: number
}
export interface HajjChecklist {
  id: string
  sectionId: string
  titleRu: string
  titleKz?: string | null
  emoji?: string | null
  items: HajjChecklistItem[]
  orderIndex: number
  isActive: boolean
}

export interface SectionDetails {
  instructions: HajjInstruction[]
  phrases: HajjPhrase[]
  checklists: HajjChecklist[]
}

export interface SectionForm {
  code: string
  titleRu: string
  titleKz: string
  emoji: string
  orderIndex: number
}

export interface InstructionForm {
  stepNumber: number
  titleRu: string
  titleKz: string
  descriptionRu: string
  descriptionKz: string
  isHighlight: boolean
  itemsRu: string
  itemsKz: string
  badgeRu: string
  badgeKz: string
  warningTitleRu: string
  warningTitleKz: string
  warningItemsRu: string
  warningItemsKz: string
  successTitleRu: string
  successTitleKz: string
  successItemsRu: string
  successItemsKz: string
  orderIndex: number
}

export interface PhraseForm {
  titleRu: string
  titleKz: string
  textAr: string
  transliteration: string
  translationRu: string
  translationKz: string
  orderIndex: number
}

export interface ChecklistForm {
  titleRu: string
  titleKz: string
  emoji: string
  itemsRu: string
  itemsKz: string
  orderIndex: number
  isActive: boolean
}

export const formatItems = (items: HajjChecklistItem[] = []) =>
  items.map((item) => `${item.isCheckedByDefault ? '[x] ' : ''}${item.titleRu || ''}`).join('\n')

export const formatItemTranslations = (items: HajjChecklistItem[] = []) => items.map((item) => item.titleKz || '').join('\n')

export const parseItems = (ruText: string, kzText = ''): HajjChecklistItem[] => {
  const kzLines = kzText.split('\n')
  return ruText
    .split('\n')
    .map((line, index) => {
      const trimmed = line.trim()
      if (!trimmed) return null
      const isCheckedByDefault = /^\[(x|х|v|✓)\]\s*/i.test(trimmed)
      return {
        titleRu: trimmed.replace(/^\[(x|х|v|✓)\]\s*/i, ''),
        titleKz: kzLines[index]?.trim() || null,
        isCheckedByDefault,
      }
    })
    .filter(Boolean) as HajjChecklistItem[]
}

export const formatLines = (items: string[] = []) => items.join('\n')
export const parseLines = (text: string) =>
  text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

export const emptyInstructionForm = (stepNumber: number, orderIndex: number): InstructionForm => ({
  stepNumber,
  titleRu: '',
  titleKz: '',
  descriptionRu: '',
  descriptionKz: '',
  isHighlight: false,
  itemsRu: '',
  itemsKz: '',
  badgeRu: '',
  badgeKz: '',
  warningTitleRu: '',
  warningTitleKz: '',
  warningItemsRu: '',
  warningItemsKz: '',
  successTitleRu: '',
  successTitleKz: '',
  successItemsRu: '',
  successItemsKz: '',
  orderIndex,
})

export const instructionFormFrom = (i: HajjInstruction): InstructionForm => ({
  stepNumber: i.stepNumber || 0,
  titleRu: i.titleRu,
  titleKz: i.titleKz || '',
  descriptionRu: i.descriptionRu || '',
  descriptionKz: i.descriptionKz || '',
  isHighlight: i.isHighlight,
  itemsRu: formatItems(i.items),
  itemsKz: formatItemTranslations(i.items),
  badgeRu: i.badgeRu || '',
  badgeKz: i.badgeKz || '',
  warningTitleRu: i.warningTitleRu || '',
  warningTitleKz: i.warningTitleKz || '',
  warningItemsRu: formatLines(i.warningItemsRu),
  warningItemsKz: formatLines(i.warningItemsKz),
  successTitleRu: i.successTitleRu || '',
  successTitleKz: i.successTitleKz || '',
  successItemsRu: formatLines(i.successItemsRu),
  successItemsKz: formatLines(i.successItemsKz),
  orderIndex: i.orderIndex,
})

export const instructionPayload = (f: InstructionForm) => ({
  stepNumber: f.stepNumber || null,
  titleRu: f.titleRu,
  titleKz: f.titleKz || null,
  descriptionRu: f.descriptionRu || null,
  descriptionKz: f.descriptionKz || null,
  isHighlight: f.isHighlight,
  items: parseItems(f.itemsRu, f.itemsKz),
  badgeRu: f.badgeRu || null,
  badgeKz: f.badgeKz || null,
  warningTitleRu: f.warningTitleRu || null,
  warningTitleKz: f.warningTitleKz || null,
  warningItemsRu: parseLines(f.warningItemsRu),
  warningItemsKz: parseLines(f.warningItemsKz),
  successTitleRu: f.successTitleRu || null,
  successTitleKz: f.successTitleKz || null,
  successItemsRu: parseLines(f.successItemsRu),
  successItemsKz: parseLines(f.successItemsKz),
  orderIndex: f.orderIndex,
})

const has = (v?: string | null) => !!v && v.trim().length > 0
const lines = (v: string) => parseLines(v).length

/** RU fields that are filled but whose KZ counterpart is empty. */
export function instructionKzGaps(f: InstructionForm) {
  const pairs: Array<[string, string]> = [
    [f.titleRu, f.titleKz],
    [f.descriptionRu, f.descriptionKz],
    [f.badgeRu, f.badgeKz],
    [f.warningTitleRu, f.warningTitleKz],
    [f.successTitleRu, f.successTitleKz],
  ]
  let total = 0
  let done = 0
  for (const [ru, kz] of pairs) {
    if (has(ru)) {
      total++
      if (has(kz)) done++
    }
  }
  const linePairs: Array<[string, string]> = [
    [f.itemsRu, f.itemsKz],
    [f.warningItemsRu, f.warningItemsKz],
    [f.successItemsRu, f.successItemsKz],
  ]
  for (const [ru, kz] of linePairs) {
    if (lines(ru)) {
      total++
      if (lines(kz) >= lines(ru)) done++
    }
  }
  return { total, done }
}

export function instructionKzDone(i: HajjInstruction) {
  const g = instructionKzGaps(instructionFormFrom(i))
  return g.total === 0 || g.done === g.total
}
