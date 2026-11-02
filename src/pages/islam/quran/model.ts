export interface SurahItem {
  id: string
  number: number
  nameAr: string
  nameRu: string
  nameKz?: string | null
  transliteration: string
  revelationType: 'meccan' | 'medinan'
  ayahCount: number
  juzNumber: number
  pageNumber?: number | null
  isActive: boolean
}

export interface AyahItem {
  id: string
  surahId: string
  number: number
  textAr: string
  translationRu?: string | null
  translationKz?: string | null
}

export interface ReciterItem {
  id: string
  slug: string
  displayName: string
  source?: string | null
  bitrate?: string | null
  isActive: boolean
  sortOrder: number
}

export interface EveryAyahReciterItem {
  slug: string
  displayName: string
  source?: string | null
  bitrate?: string | null
  exists: boolean
  reciterId: string | null
}

export interface CoverageItem {
  surahId: string
  surahNumber: number
  surahNameRu: string
  ayahCount: number
  audioCount: number
  percent: number
}

export interface SurahForm {
  number: number
  nameAr: string
  nameRu: string
  nameKz: string
  transliteration: string
  revelationType: 'meccan' | 'medinan'
  ayahCount: number
  juzNumber: number
  pageNumber: number
}

export interface AyahForm {
  number: number
  textAr: string
  translationRu: string
  translationKz: string
}

export interface ReciterForm {
  slug: string
  displayName: string
  source: string
  bitrate: string
  sortOrder: number
}

export const REVELATION_LABEL: Record<SurahItem['revelationType'], string> = {
  meccan: 'Мекканская',
  medinan: 'Мединская',
}

const ARABIC_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩']

/** 255 → «٢٥٥» for the ayah-end marker. */
export const toArabicDigits = (n: number) =>
  String(n)
    .split('')
    .map((d) => ARABIC_DIGITS[Number(d)] ?? d)
    .join('')

/** Russian «аят / аята / аятов». */
export function ayahWord(n: number) {
  const m10 = n % 10
  const m100 = n % 100
  if (m10 === 1 && m100 !== 11) return 'аят'
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return 'аята'
  return 'аятов'
}
