/**
 * Lesson editor: block outline (left), the open block's form (center) and a live mobile
 * preview (right). Lesson settings and the mini-test are separate tabs.
 *
 * Saving model: one explicit «Сохранить» (top bar, Ctrl/⌘+S) saves the open block and the
 * lesson settings if they changed. Unsaved block edits are autosaved to localStorage and
 * offered for restore; leaving the block or the page asks what to do with them.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Box, Button, CircularProgress, Stack, Tab, Tabs, Tooltip, Typography } from '@mui/material'
import { CheckCircleOutline, PhoneIphoneOutlined, ScheduleOutlined, ViewListOutlined } from '@mui/icons-material'
import toast from 'react-hot-toast'
import {
  createLessonBlock,
  deleteBlockMedia,
  deleteLessonBlock,
  deleteMediaFile,
  getBlockMedia,
  updateLesson,
  updateLessonBlock,
  uploadBlockMedia,
} from '../../api/adminApi'
import {
  EmptyState,
  ErrorState,
  KeyboardHint,
  LoadingState,
  PageHeader,
  StatusChip,
  TopBarActions,
  getErrorMessage,
  useConfirm,
  useShellBreadcrumbs,
} from '../../components/ui'
import MobilePreview, { type MobilePreviewBlock } from '../../components/MobilePreview'
import { color, radius } from '../../theme'
import { getBlockDisplayTitle, getBlockTypeLabel } from './blockTypes'
import {
  buildBlockPayload,
  changeDraftType,
  createEmptyDraft,
  draftFromBlock,
  filledGridRows,
  mediaTypeOfFile,
  refreshHtmlWithMedia,
} from './blockMapping'
import { getKzGaps, validateDraft } from './draftValidation'
import { useElementWidth, useSaveShortcut, useUnsavedChangesGuard, useViewportHeight } from './hooks'
import { useBlockDraft } from './useBlockDraft'
import { useLessonData } from './useLessonData'
import { AddBlockMenu } from './components/AddBlockMenu'
import { BlockEditorPanel } from './components/BlockEditorPanel'
import { BlockOutline } from './components/BlockOutline'
import { LessonMetaForm } from './components/LessonMetaForm'
import { LessonTestPanel } from './components/LessonTestPanel'
import { DockedPreview, DrawerPreview } from './components/PreviewPane'
import { useUnsavedPrompt } from './components/UnsavedChangesDialog'
import type { BlockType, EditorTab, Lang, MediaFile, StudioBlock, UploadedEditorMedia } from './types'

const PREVIEW_PREF_KEY = 'ilm-admin.lesson-editor.preview-docked'
/** Content width from which the preview gets its own column (1280 px screen with the sidebar collapsed fits). */
const DOCK_PREVIEW_MIN = 1080
/** Content width from which the outline sits next to the editor. */
const TWO_COLUMN_MIN = 760
const OUTLINE_W = 240
const PREVIEW_W = 312
const STICKY_TOP = 72

const META_FIELDS = ['courseId', 'moduleId', 'titleRu', 'titleKz', 'descriptionRu', 'descriptionKz', 'estimatedMinutes', 'isPremium', 'isTest', 'orderIndex'] as const

function metaSnapshot(l: Record<string, any> | null | undefined) {
  if (!l) return ''
  return JSON.stringify(META_FIELDS.map((k) => l[k] ?? null))
}

export default function LessonEditorPage() {
  const { lessonId, courseId: urlCourseId, moduleId: urlModuleId } = useParams<{ lessonId: string; courseId: string; moduleId?: string }>()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const confirm = useConfirm()
  const { ask, dialog: unsavedDialog } = useUnsavedPrompt()

  const data = useLessonData(lessonId)
  const { blocks, lesson } = data

  const initialTab = searchParams.get('tab')
  const [tab, setTab] = useState<EditorTab>(initialTab === 'meta' || initialTab === 'test' ? initialTab : 'blocks')
  const [lang, setLang] = useState<Lang>('ru')
  const [lessonDraft, setLessonDraft] = useState<Record<string, any>>({})
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([])
  const [attemptedSave, setAttemptedSave] = useState(false)
  const [saveErrors, setSaveErrors] = useState<string[]>([])
  const [savingBlock, setSavingBlock] = useState(false)
  const [savingMeta, setSavingMeta] = useState(false)
  const [reordering, setReordering] = useState(false)
  const [previewBlock, setPreviewBlock] = useState<MobilePreviewBlock | null>(null)
  const [previewDocked, setPreviewDocked] = useState(() => {
    try {
      return window.localStorage.getItem(PREVIEW_PREF_KEY) !== '0'
    } catch {
      return true
    }
  })
  const [drawerOpen, setDrawerOpen] = useState(false)

  const blockDraft = useBlockDraft(lessonId, null)
  const { draft, setDraft, loadDraft, markSaved, patchClean, dirty: blockDirty, settle, dirtyRef, clearStored } = blockDraft
  const draftRef = useRef(draft)
  draftRef.current = draft
  const mediaRef = useRef(mediaFiles)
  mediaRef.current = mediaFiles
  /** Block whose media list is current (guards against late responses after switching blocks). */
  const activeBlockIdRef = useRef<string | null>(null)

  const [rootRef, rootWidth] = useElementWidth<HTMLDivElement>()
  const viewportH = useViewportHeight()
  const twoColumn = rootWidth >= TWO_COLUMN_MIN
  const wide = rootWidth >= DOCK_PREVIEW_MIN
  const docked = wide && previewDocked

  // ── Lesson settings draft ────────────────────────────────────────────────
  const metaDirty = !!lesson && !!lessonDraft.id && metaSnapshot(lessonDraft) !== metaSnapshot(lesson)
  const metaDirtyRef = useRef(metaDirty)
  metaDirtyRef.current = metaDirty
  useEffect(() => {
    // Sync the settings form with the server unless the user is editing it.
    if (lesson && !metaDirtyRef.current) setLessonDraft({ ...lesson })
  }, [lesson])

  // ── Breadcrumbs ──────────────────────────────────────────────────────────
  const course = data.course
  const module = data.module
  useShellBreadcrumbs(
    !!lesson && [
      { label: 'Курсы и уроки', to: '/content' },
      ...(course ? [{ label: course.titleRu || 'Курс', to: `/content/courses/${course.id}` }] : []),
      ...(module && course ? [{ label: module.titleRu || 'Модуль', to: `/content/courses/${course.id}/modules/${module.id}` }] : []),
      { label: lesson.titleRu || 'Урок' },
    ],
  )
  const backTo = urlModuleId ? `/content/courses/${urlCourseId}/modules/${urlModuleId}` : `/content/courses/${urlCourseId}`

  // ── Block media ──────────────────────────────────────────────────────────
  const loadBlockMedia = useCallback(
    async (blockId: string) => {
      try {
        const { data: res } = await getBlockMedia(blockId)
        if (activeBlockIdRef.current !== blockId) return
        const media: MediaFile[] = Array.isArray(res) ? res : []
        setMediaFiles(media)
        if (media.length > 0) {
          // Fresh signed URLs replace expired ones in the text; not a user edit.
          if (!dirtyRef.current) settle()
          setDraft((prev) =>
            prev.id !== blockId
              ? prev
              : { ...prev, textRuHtml: refreshHtmlWithMedia(prev.textRuHtml, media), textKz: refreshHtmlWithMedia(prev.textKz, media) },
          )
        }
      } catch (e) {
        console.error('Failed to load block media', e)
      }
    },
    [dirtyRef, settle, setDraft],
  )

  const openBlock = useCallback(
    (block: StudioBlock | null) => {
      setAttemptedSave(false)
      setSaveErrors([])
      setMediaFiles([])
      activeBlockIdRef.current = block?.id ?? null
      loadDraft(block ? draftFromBlock(block) : null)
      if (block) void loadBlockMedia(block.id)
    },
    [loadDraft, loadBlockMedia],
  )

  // Open the block from the URL (or the first one) once blocks arrive.
  const initialized = useRef(false)
  useEffect(() => {
    if (initialized.current || data.loading || !lesson) return
    initialized.current = true
    const wanted = searchParams.get('block')
    const block = blocks.find((b) => b.id === wanted) ?? blocks[0] ?? null
    openBlock(block)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, after the first load
  }, [data.loading, lesson, blocks, openBlock])

  // Mirror tab and open block in the URL (replace: no history spam).
  const selectedKey = draft ? draft.id ?? 'new' : null
  useEffect(() => {
    if (!initialized.current) return
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (tab === 'blocks') next.delete('tab')
        else next.set('tab', tab)
        if (selectedKey && selectedKey !== 'new') next.set('block', selectedKey)
        else next.delete('block')
        return next
      },
      { replace: true },
    )
  }, [tab, selectedKey, setSearchParams])

  // ── Saving ───────────────────────────────────────────────────────────────
  const saveBlock = useCallback(async (): Promise<boolean> => {
    const current = draftRef.current
    if (!lessonId || !current) return false
    const media = mediaRef.current
    const { errors, warnings } = validateDraft(current, media)
    setAttemptedSave(true)
    if (errors.length) {
      setSaveErrors(errors)
      setTab('blocks')
      toast.error(errors[0])
      return false
    }
    setSaveErrors([])
    if (warnings.length) {
      const ok = await confirm({
        title: 'Сохранить блок с замечаниями?',
        description: `${warnings.map((w) => w.message).join('. ')}. В приложении упражнение может работать неправильно.`,
        confirmLabel: 'Сохранить всё равно',
        cancelLabel: 'Исправить',
      })
      if (!ok) {
        setTab('blocks')
        return false
      }
    }
    let toSave = current
    if (current.type === 'grid') {
      const rows = filledGridRows(current, media)
      if (rows.some((row) => row.audioUrl && row.audioUrl !== current.gridItemRows.find((d) => d.id === row.id)?.audioUrl)) {
        const resolvedById = new Map(rows.map((row) => [row.id, row.audioUrl]))
        toSave = {
          ...current,
          gridItemRows: current.gridItemRows.map((row) => {
            const audioUrl = resolvedById.get(row.id)
            return audioUrl && audioUrl !== row.audioUrl ? { ...row, audioUrl } : row
          }),
        }
      }
    }
    const payload = buildBlockPayload(toSave, media, lessonId, false)
    setSavingBlock(true)
    try {
      let id = toSave.id
      if (id) {
        await updateLessonBlock(id, payload)
      } else {
        const res = await createLessonBlock({ lessonId, ...payload })
        id = res.data?.id
      }
      clearStored(blockDraft.storageKey)
      const saved = id ? { ...toSave, id } : toSave
      if (id) activeBlockIdRef.current = id
      markSaved(saved)
      await data.reload()
      toast.success(toSave.id ? 'Блок сохранён' : 'Блок создан')
      return true
    } catch (e) {
      toast.error(getErrorMessage(e, 'Не удалось сохранить блок'))
      return false
    } finally {
      setSavingBlock(false)
    }
  }, [lessonId, confirm, clearStored, blockDraft.storageKey, markSaved, data])

  const saveMeta = useCallback(async (): Promise<boolean> => {
    if (!lessonDraft?.id) return false
    if (!String(lessonDraft.titleRu || '').trim()) {
      setTab('meta')
      toast.error('Введите название урока')
      return false
    }
    setSavingMeta(true)
    try {
      await updateLesson(lessonDraft.id, {
        courseId: lessonDraft.courseId,
        moduleId: lessonDraft.moduleId || undefined,
        titleRu: lessonDraft.titleRu,
        titleKz: lessonDraft.titleKz,
        descriptionRu: lessonDraft.descriptionRu,
        descriptionKz: lessonDraft.descriptionKz,
        estimatedMinutes: Number(lessonDraft.estimatedMinutes) || 10,
        isPremium: !!lessonDraft.isPremium,
        isTest: !!lessonDraft.isTest,
        orderIndex: Number(lessonDraft.orderIndex) || 0,
      })
      data.setLesson((prev: any) => ({ ...prev, ...lessonDraft }))
      toast.success('Урок сохранён')
      return true
    } catch (e) {
      toast.error(getErrorMessage(e, 'Не удалось сохранить урок'))
      return false
    } finally {
      setSavingMeta(false)
    }
  }, [lessonDraft, data])

  const isNewBlock = !!draft && !draft.id
  const canSaveBlock = blockDirty || isNewBlock
  const anyDirty = blockDirty || metaDirty
  const saving = savingBlock || savingMeta

  const saveAll = useCallback(async (): Promise<boolean> => {
    let ok = true
    if (metaDirtyRef.current) ok = (await saveMeta()) && ok
    const d = draftRef.current
    if (d && (dirtyRef.current || !d.id)) ok = (await saveBlock()) && ok
    return ok
  }, [saveMeta, saveBlock, dirtyRef])

  useSaveShortcut(() => {
    if (!saving && (anyDirty || isNewBlock)) void saveAll()
  })

  /** Runs `action` after resolving unsaved block edits (save / discard / stay). */
  const guarded = useCallback(
    async (title: string, action: () => void) => {
      if (!dirtyRef.current) {
        action()
        return
      }
      const choice = await ask({
        title,
        description: 'В открытом блоке есть несохранённые изменения. Черновик хранится только в этом браузере.',
        onSave: saveBlock,
      })
      if (choice === 'cancel') return
      if (choice === 'discard') clearStored()
      action()
    },
    [ask, saveBlock, clearStored, dirtyRef],
  )

  useUnsavedChangesGuard(anyDirty, async () => {
    const choice = await ask({
      title: 'Уйти со страницы урока?',
      description: `Есть несохранённые изменения ${[blockDirty && 'в открытом блоке', metaDirty && 'в параметрах урока'].filter(Boolean).join(' и ')}.`,
      onSave: saveAll,
    })
    if (choice === 'discard') clearStored()
    return choice !== 'cancel'
  })

  // ── Block actions ────────────────────────────────────────────────────────
  const requestSelect = (id: string) => {
    if (draft?.id === id) return
    const block = blocks.find((b) => b.id === id)
    if (!block) return
    void guarded(`Перейти к блоку ${blocks.indexOf(block) + 1}?`, () => openBlock(block))
  }

  const requestAdd = (type: BlockType) => {
    void guarded('Создать новый блок?', () => {
      setTab('blocks')
      setLang('ru')
      setAttemptedSave(false)
      setSaveErrors([])
      setMediaFiles([])
      activeBlockIdRef.current = null
      loadDraft(createEmptyDraft(type, (blocks[blocks.length - 1]?.orderIndex || 0) + 1))
    })
  }

  /** Persists a new order; only blocks whose position changed are written (two passes, as before). */
  const persistOrder = async (next: StudioBlock[], previous: StudioBlock[]) => {
    const reindexed = next.map((b, i) => ({ ...b, orderIndex: i + 1 }))
    const before = new Map(previous.map((b) => [b.id, b.orderIndex]))
    const changed = reindexed.map((b, i) => ({ b, i })).filter(({ b }) => before.get(b.id) !== b.orderIndex)
    data.setBlocks(reindexed)
    if (!changed.length) return true
    setReordering(true)
    try {
      const tempOffset = 1000
      for (const { b, i } of changed) await updateLessonBlock(b.id, { orderIndex: tempOffset + i + 1 })
      for (const { b } of [...changed].reverse()) await updateLessonBlock(b.id, { orderIndex: b.orderIndex })
      const d = draftRef.current
      if (d?.id) {
        const nb = reindexed.find((b) => b.id === d.id)
        if (nb) patchClean({ orderIndex: nb.orderIndex })
      } else if (d) {
        patchClean({ orderIndex: reindexed.length + 1 })
      }
      return true
    } catch (e) {
      toast.error(getErrorMessage(e, 'Не удалось сохранить порядок'))
      await data.reload()
      return false
    } finally {
      setReordering(false)
    }
  }

  const reorder = async (next: StudioBlock[]) => {
    if (await persistOrder(next, blocks)) toast.success('Порядок блоков сохранён')
  }

  const duplicateBlock = async (block: StudioBlock) => {
    if (!lessonId) return
    let media: unknown[] = []
    try {
      const { data: res } = await getBlockMedia(block.id)
      media = Array.isArray(res) ? res : []
    } catch {
      media = []
    }
    if (media.length) {
      const ok = await confirm({
        title: 'Дублировать блок?',
        description:
          'Текст и настройки скопируются, а загруженные файлы — нет: картинки и аудио в копии будут ссылаться на файлы исходного блока. Не удаляйте их из копии, иначе они пропадут и в оригинале.',
        confirmLabel: 'Дублировать',
      })
      if (!ok) return
    }
    try {
      const res = await createLessonBlock({
        lessonId,
        type: block.type,
        orderIndex: 1000 + blocks.length + 1,
        contentRu: block.contentRu ?? {},
        contentKz: block.contentKz ?? {},
      })
      const copyId: string | undefined = res.data?.id
      if (!copyId) throw new Error('Сервер не вернул id копии')
      const copy: StudioBlock = { ...block, id: copyId, orderIndex: 1000 + blocks.length + 1 }
      const idx = blocks.findIndex((b) => b.id === block.id)
      const next = [...blocks.slice(0, idx + 1), copy, ...blocks.slice(idx + 1)]
      await persistOrder(next, [...blocks, copy])
      const fresh = await data.reload()
      toast.success('Копия блока создана')
      const freshCopy = fresh?.find((b) => b.id === copyId)
      if (freshCopy && !dirtyRef.current) openBlock(freshCopy)
    } catch (e) {
      toast.error(getErrorMessage(e, 'Не удалось дублировать блок'))
      await data.reload()
    }
  }

  const deleteBlock = async (block: StudioBlock) => {
    const pos = blocks.findIndex((b) => b.id === block.id)
    const title = getBlockDisplayTitle(block)
    const ok = await confirm({
      title: 'Удалить блок?',
      description: `Блок ${pos + 1} «${getBlockTypeLabel(block.type)}${title ? `: ${title.slice(0, 60)}` : ''}» будет удалён из урока. Действие нельзя отменить.`,
      confirmLabel: 'Удалить блок',
      destructive: true,
    })
    if (!ok) return
    try {
      await deleteLessonBlock(block.id)
      if (lessonId) clearStored(`ilmhub:lesson-block-draft:${lessonId}:${block.id}`)
      const fresh = (await data.reload()) ?? blocks.filter((b) => b.id !== block.id)
      toast.success('Блок удалён')
      if (draftRef.current?.id === block.id) openBlock(fresh[Math.min(pos, fresh.length - 1)] ?? null)
    } catch (e) {
      toast.error(getErrorMessage(e, 'Не удалось удалить блок'))
    }
  }

  const discardNewBlock = () => {
    clearStored()
    openBlock(blocks[blocks.length - 1] ?? null)
  }

  // ── Media handlers (same API calls as before) ────────────────────────────
  const ensureBlockIdForMedia = async (): Promise<string> => {
    const current = draftRef.current
    let blockId = current?.id
    if (!blockId && lessonId && current) {
      const payload = buildBlockPayload(current, mediaRef.current, lessonId, true, { allowDraftGridWithoutAudio: current.type === 'grid' })
      const createRes = await createLessonBlock(payload)
      blockId = createRes.data?.id
      if (blockId) {
        const newId = blockId
        activeBlockIdRef.current = newId
        clearStored(`ilmhub:lesson-block-draft:${lessonId}:new`)
        setDraft((prev) => ({ ...prev, id: newId }))
        await data.reload()
        toast.success('Блок создан — можно загружать файлы')
      }
    }
    if (!blockId) throw new Error('Не удалось определить блок для загрузки')
    return blockId
  }

  const uploadEditorMedia = async (file: File): Promise<UploadedEditorMedia> => {
    const blockId = await ensureBlockIdForMedia()
    const type = mediaTypeOfFile(file)
    const response = await uploadBlockMedia(blockId, file, type)
    const res = response.data || {}
    return { id: res.id, url: res.url, type: (res.type as UploadedEditorMedia['type']) || type, mimeType: res.mimeType }
  }

  const removeEditorMedia = async (mediaId: string) => {
    const id = draftRef.current?.id
    if (!id) return
    await deleteBlockMedia(id, mediaId)
    try {
      await deleteMediaFile(mediaId)
    } catch {
      /* ignore */
    }
  }

  const handleMediaUpload = async (file: File, type: 'image' | 'audio' | 'video', description?: string) => {
    const blockId = await ensureBlockIdForMedia()
    await uploadBlockMedia(blockId, file, type, description)
    await loadBlockMedia(blockId)
  }

  const handleMediaDelete = async (mediaId: string) => {
    const id = draftRef.current?.id
    if (!id) return
    await deleteBlockMedia(id, mediaId)
    try {
      await deleteMediaFile(mediaId)
    } catch {
      /* ignore */
    }
    await loadBlockMedia(id)
  }

  const handleGridItemAudio = async (rowId: string, file: File) => {
    const blockId = await ensureBlockIdForMedia()
    const { data: res } = await uploadBlockMedia(blockId, file, 'audio', `grid-${rowId}`)
    await loadBlockMedia(blockId)
    const url = (res as { url?: string })?.url
    if (!url) throw new Error('Нет ссылки на файл в ответе сервера')
    setDraft((prev) => ({ ...prev, gridItemRows: prev.gridItemRows.map((row) => (row.id === rowId ? { ...row, audioUrl: url } : row)) }))
  }

  // ── Derived view data ────────────────────────────────────────────────────
  const draftPreview = useMemo<MobilePreviewBlock | null>(() => {
    if (!draft) return null
    const payload = buildBlockPayload(draft, mediaFiles, lessonId, false, { allowDraftGridWithoutAudio: true }) as {
      type?: string
      contentRu?: Record<string, any>
      contentKz?: Record<string, any>
    }
    return { type: payload.type || draft.type, contentRu: payload.contentRu || {}, contentKz: payload.contentKz || {} }
  }, [draft, mediaFiles, lessonId])

  const liveTitle = draftPreview ? getBlockDisplayTitle({ type: draftPreview.type, contentRu: draftPreview.contentRu }) : undefined
  const validation = useMemo(() => (draft ? validateDraft(draft, mediaFiles) : { errors: [], warnings: [] }), [draft, mediaFiles])
  const kzGaps = useMemo(() => (draft ? getKzGaps(draft) : []), [draft])
  const showIssues = attemptedSave || !!draft?.id
  const savedIndex = draft?.id ? blocks.findIndex((b) => b.id === draft.id) : -1
  const position = savedIndex >= 0 ? savedIndex + 1 : draft?.id ? draft.orderIndex : blocks.length + 1

  const setDocked = (v: boolean) => {
    setPreviewDocked(v)
    try {
      window.localStorage.setItem(PREVIEW_PREF_KEY, v ? '1' : '0')
    } catch {
      /* ignore */
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────
  if (!lessonId) {
    return <ErrorState title="Урок не указан" error="Откройте урок из списка курса." action={<Button onClick={() => navigate('/content')}>К курсам</Button>} />
  }
  if (data.loading && !lesson) {
    return <LoadingState variant="page" label="Загружаем урок…" />
  }
  if (!lesson) {
    return (
      <>
        <PageHeader title="Урок" backTo={backTo} backLabel="К списку уроков" />
        <ErrorState title="Не удалось загрузить урок" error={data.error} onRetry={() => void data.reload()} retrying={data.loading || data.refreshing} />
      </>
    )
  }

  const questionsCount = (data.lessonTest?.questions || []).length
  const statusText = saving ? 'Сохраняем…' : anyDirty ? 'Есть несохранённые изменения' : isNewBlock ? 'Новый блок не сохранён' : 'Все изменения сохранены'

  const previewToggle = docked ? null : (
    <Tooltip title={wide ? 'Показать предпросмотр справа' : drawerOpen ? 'Скрыть предпросмотр' : 'Предпросмотр в приложении'}>
      <Button
        size="small"
        variant={drawerOpen ? 'contained' : 'outlined'}
        color={drawerOpen ? 'secondary' : 'primary'}
        startIcon={<PhoneIphoneOutlined fontSize="small" />}
        onClick={() => (wide ? setDocked(true) : setDrawerOpen((o) => !o))}
        aria-pressed={wide ? undefined : drawerOpen}
      >
        Предпросмотр
      </Button>
    </Tooltip>
  )

  const outline = (
    <BlockOutline
      blocks={blocks}
      selectedId={draft?.id ?? null}
      newDraftType={isNewBlock ? draft?.type : null}
      liveTitle={liveTitle}
      dirty={blockDirty}
      reordering={reordering}
      onSelect={requestSelect}
      onAdd={requestAdd}
      onReorder={(next) => void reorder(next)}
      onDuplicate={(b) => void duplicateBlock(b)}
      onDelete={(b) => void deleteBlock(b)}
      onPreview={(b) => setPreviewBlock(b)}
    />
  )

  const center = draft ? (
    <BlockEditorPanel
      draft={draft}
      setDraft={setDraft}
      lang={lang}
      setLang={setLang}
      kzGaps={kzGaps}
      dirty={blockDirty}
      position={position}
      total={blocks.length}
      availableDraft={blockDraft.availableDraft}
      onRestoreDraft={() => {
        blockDraft.restoreStored()
        toast.success('Черновик восстановлен. Сохраните блок, чтобы он попал в урок.')
      }}
      onDismissDraft={() => blockDraft.clearStored(blockDraft.availableDraft?.key)}
      saveErrors={saveErrors}
      showIssues={showIssues}
      warnings={validation.warnings}
      mediaFiles={mediaFiles}
      onChangeType={(t) => setDraft((p) => changeDraftType(p, t))}
      onDuplicate={draft.id ? () => {
        const b = blocks.find((x) => x.id === draft.id)
        if (b) void duplicateBlock(b)
      } : undefined}
      onDelete={() => {
        if (!draft.id) return discardNewBlock()
        const b = blocks.find((x) => x.id === draft.id)
        if (b) void deleteBlock(b)
      }}
      onRevert={blockDraft.revert}
      previewToggle={previewToggle}
      session={blockDraft.session}
      onUploadEditorMedia={uploadEditorMedia}
      onRemoveEditorMedia={removeEditorMedia}
      onMediaUpload={handleMediaUpload}
      onMediaDelete={handleMediaDelete}
      onMediaRefresh={() => {
        if (draft.id) void loadBlockMedia(draft.id)
      }}
      onGridItemAudio={handleGridItemAudio}
    />
  ) : (
    <Box sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: `${radius.lg}px` }}>
      <EmptyState
        icon={<ViewListOutlined />}
        title={blocks.length ? 'Выберите блок слева' : 'В уроке пока нет блоков'}
        description={blocks.length ? 'Или добавьте новый.' : 'Урок собирается из блоков: теория, слова, упражнения и экран завершения. Начните с теории.'}
        action={<AddBlockMenu onPick={requestAdd} label={blocks.length ? 'Добавить блок' : 'Добавить первый блок'} buttonProps={{ variant: 'contained' }} />}
      />
    </Box>
  )

  const stickyPane = {
    position: 'sticky' as const,
    top: STICKY_TOP,
    height: `calc(100dvh - ${STICKY_TOP + 24}px)`,
    minHeight: 420,
  }

  return (
    <Box>
      <PageHeader
        title={lesson.titleRu || 'Без названия'}
        backTo={backTo}
        backLabel={urlModuleId ? 'К модулю' : 'К курсу'}
        status={
          <Stack direction="row" gap={0.75} alignItems="center" flexWrap="wrap">
            <StatusChip status={lesson.isPremium ? 'premium' : 'free'} />
            {lesson.isTest && <StatusChip label="Тестовый урок" tone="info" hideDot />}
          </Stack>
        }
        subtitle={
          <Stack component="span" direction="row" gap={2} alignItems="center" flexWrap="wrap">
            <span>{module?.titleRu ? `Модуль «${module.titleRu}»` : course?.titleRu ? `Курс «${course.titleRu}»` : 'Урок'}</span>
            <Stack component="span" direction="row" gap={0.5} alignItems="center">
              <ScheduleOutlined sx={{ fontSize: 16 }} aria-hidden />
              {Number(lesson.estimatedMinutes) || 10} мин
            </Stack>
            {lesson.titleKz ? null : (
              <Box component="span" sx={{ color: color.warning.dark }}>
                Нет названия на казахском
              </Box>
            )}
          </Stack>
        }
        disableGutterBottom
      >
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          aria-label="Разделы урока"
          sx={{ borderBottom: '1px solid', borderColor: 'divider', minHeight: 44, '& .MuiTab-root': { minHeight: 44, textTransform: 'none', fontWeight: 600, px: 2 } }}
        >
          <Tab value="blocks" label={`Блоки (${blocks.length})`} />
          <Tab
            value="meta"
            label={
              <Stack direction="row" gap={0.75} alignItems="center" component="span">
                Параметры урока
                {metaDirty && <Box component="span" aria-label="есть изменения" sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: color.warning.main }} />}
              </Stack>
            }
          />
          <Tab value="test" label={data.lessonTest ? `Мини-тест (${questionsCount})` : 'Мини-тест'} />
        </Tabs>
      </PageHeader>

      <TopBarActions>
        <Stack direction="row" gap={1.25} alignItems="center">
          <Stack direction="row" gap={0.75} alignItems="center" role="status" aria-live="polite" sx={{ display: { xs: 'none', md: 'flex' } }}>
            {saving ? (
              <CircularProgress size={12} />
            ) : anyDirty || isNewBlock ? (
              <Box component="span" sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: color.warning.main }} />
            ) : (
              <CheckCircleOutline sx={{ fontSize: 16, color: color.success.main }} />
            )}
            <Typography variant="body2" color="text.secondary" noWrap>
              {statusText}
            </Typography>
          </Stack>
          <Tooltip
            title={
              <Stack direction="row" gap={1} alignItems="center">
                <span>{metaDirty && canSaveBlock ? 'Сохранить блок и параметры урока' : metaDirty ? 'Сохранить параметры урока' : 'Сохранить блок'}</span>
                <KeyboardHint keys={['Mod', 'S']} tone="dark" />
              </Stack>
            }
          >
            <span>
              <Button
                size="small"
                variant="contained"
                onClick={() => void saveAll()}
                disabled={saving || !(anyDirty || isNewBlock)}
                startIcon={saving ? <CircularProgress size={14} color="inherit" /> : undefined}
              >
                Сохранить
              </Button>
            </span>
          </Tooltip>
        </Stack>
      </TopBarActions>

      <Box sx={{ mt: 2.5 }} ref={rootRef}>
        {tab === 'blocks' && (
          <Box
            sx={{
              display: 'grid',
              gap: 2,
              alignItems: 'start',
              gridTemplateColumns: !twoColumn ? 'minmax(0, 1fr)' : docked ? `${OUTLINE_W}px minmax(0, 1fr) ${PREVIEW_W}px` : `${OUTLINE_W}px minmax(0, 1fr)`,
            }}
          >
            <Box
              sx={{
                bgcolor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: `${radius.lg}px`,
                overflow: 'hidden',
                ...(twoColumn ? stickyPane : { maxHeight: 380, display: 'flex', flexDirection: 'column' }),
              }}
            >
              {outline}
            </Box>
            <Box sx={{ minWidth: 0 }}>{center}</Box>
            {docked && (
              <Box sx={stickyPane}>
                <DockedPreview
                  block={draftPreview}
                  lang={lang}
                  onLangChange={setLang}
                  maxFrameH={Math.max(380, viewportH - 250)}
                  maxFrameW={PREVIEW_W - 24}
                  onHide={() => setDocked(false)}
                />
              </Box>
            )}
          </Box>
        )}

        {tab === 'meta' && (
          <LessonMetaForm
            draft={lessonDraft}
            onChange={(patch) => setLessonDraft((p) => ({ ...p, ...patch }))}
            courses={data.courses}
            modules={data.modules}
            dirty={metaDirty}
          />
        )}

        {tab === 'test' && (
          <LessonTestPanel
            lessonId={lessonId}
            lessonTest={data.lessonTest}
            setLessonTest={(u) => data.setLessonTest(u)}
            testMediaFiles={data.testMediaFiles}
            loadTestMedia={data.loadTestMedia}
            reload={data.reload}
          />
        )}
      </Box>

      {!docked && tab === 'blocks' && (
        <DrawerPreview
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          block={draftPreview}
          lang={lang}
          onLangChange={setLang}
          maxFrameH={Math.max(380, viewportH - 200)}
          maxFrameW={380 - 32}
        />
      )}

      <MobilePreview open={!!previewBlock} onClose={() => setPreviewBlock(null)} block={previewBlock} />
      {unsavedDialog}
    </Box>
  )
}
