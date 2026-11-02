import { getLessonBlocks, updateLessonBlock } from '../api/adminApi'
import { htmlToIlmDoc, ILM_DOC_VERSION } from './ilmDoc'

type Content = Record<string, any> | null | undefined

export interface RichTextMigrationProgress {
  total: number
  processed: number
  updated: number
  failed: number
}

function needsDoc(content: Content): boolean {
  if (!content || typeof content.html !== 'string' || !content.html.trim()) return false
  return !content.doc || Number(content.doc.version) < ILM_DOC_VERSION
}

function withDoc(content: Content): Content {
  if (!content || typeof content.html !== 'string') return content
  return { ...content, doc: htmlToIlmDoc(content.html) }
}

/**
 * One-off conversion of stored lesson HTML into IlmDoc (docs/RICH_TEXT_FORMAT.md).
 * Idempotent: blocks that already carry a current-version doc are skipped.
 */
export async function migrateRichTextBlocks(
  onProgress: (p: RichTextMigrationProgress) => void,
): Promise<RichTextMigrationProgress> {
  const { data } = await getLessonBlocks()
  const blocks: any[] = Array.isArray(data) ? data : data?.data ?? []
  const candidates = blocks.filter((b) => needsDoc(b.contentRu) || needsDoc(b.contentKz))
  const progress: RichTextMigrationProgress = { total: candidates.length, processed: 0, updated: 0, failed: 0 }
  onProgress({ ...progress })
  for (const block of candidates) {
    try {
      await updateLessonBlock(block.id, {
        contentRu: needsDoc(block.contentRu) ? withDoc(block.contentRu) : block.contentRu,
        contentKz: needsDoc(block.contentKz) ? withDoc(block.contentKz) : block.contentKz,
      })
      progress.updated += 1
    } catch (error) {
      console.error('Rich text migration failed for block', block.id, error)
      progress.failed += 1
    }
    progress.processed += 1
    onProgress({ ...progress })
  }
  return progress
}
