import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  FormControl,
  FormControlLabel,
  Grid,
  InputLabel,
  LinearProgress,
  MenuItem,
  Select,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material'
import {
  DeleteOutline,
  EditOutlined,
  SaveOutlined,
} from '@mui/icons-material'
import {
  createLessonBlock,
  deleteBlockMedia,
  deleteMediaFile,
  deleteLessonBlock,
  getCourseById,
  getLessonBlocks,
  getLessonById,
  getModuleById,
  uploadBlockMedia,
  updateLesson,
  updateLessonBlock,
} from '../api/adminApi'
import RichTextEditor from '../components/RichTextEditor'

type BlockType = 'theory' | 'illustration' | 'audio' | 'video' | 'lesson_complete'
type DetailTab = 'meta' | 'blocks'

interface StudioBlock {
  id: string
  lessonId: string
  type: BlockType
  orderIndex: number
  contentRu?: Record<string, any>
  contentKz?: Record<string, any>
  contentAr?: Record<string, any>
}

function stripHtml(html: string): string {
  const div = document.createElement('div')
  div.innerHTML = html
  return div.textContent || div.innerText || ''
}

export default function LessonDetailPage() {
  const { lessonId } = useParams<{ lessonId: string }>()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<DetailTab>('meta')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [lesson, setLesson] = useState<any>(null)
  const [course, setCourse] = useState<any>(null)
  const [module, setModule] = useState<any>(null)
  const [blocks, setBlocks] = useState<StudioBlock[]>([])
  const [lessonDraft, setLessonDraft] = useState<Partial<any>>({})

  const [blockDraft, setBlockDraft] = useState<{
    id?: string
    type: BlockType
    orderIndex: number
    titleRu: string
    textRuHtml: string
    titleKz: string
    textKz: string
    titleAr: string
    textAr: string
    arabicWord: string
    transcription: string
    translationRu: string
  }>({
    type: 'theory',
    orderIndex: 1,
    titleRu: '',
    textRuHtml: '',
    titleKz: '',
    textKz: '',
    titleAr: '',
    textAr: '',
    arabicWord: '',
    transcription: '',
    translationRu: '',
  })

  const breadcrumb = useMemo(() => {
    const parts: string[] = []
    if (course?.titleRu) parts.push(course.titleRu)
    if (module?.titleRu) parts.push(module.titleRu)
    if (lesson?.titleRu) parts.push(lesson.titleRu)
    return parts.join(' / ')
  }, [course, module, lesson])

  const notifyError = (e: any, fallback: string) => {
    const msg = e?.response?.data?.message?.[0] || e?.message || fallback
    setError(msg)
  }

  const notifySuccess = (msg: string) => {
    setSuccess(msg)
    setError('')
  }

  const loadLessonAndContext = async () => {
    if (!lessonId) return
    setLoading(true)
    setError('')
    try {
      const { data: lessonData } = await getLessonById(lessonId)
      setLesson(lessonData)
      setLessonDraft({ ...lessonData })

      if (lessonData?.courseId) {
        const { data: courseData } = await getCourseById(lessonData.courseId)
        setCourse(courseData)
      } else setCourse(null)

      if (lessonData?.moduleId) {
        const { data: moduleData } = await getModuleById(lessonData.moduleId)
        setModule(moduleData)
      } else setModule(null)

      const { data: blocksData } = await getLessonBlocks(lessonId)
      const mapped = (Array.isArray(blocksData) ? blocksData : []).map((b: any) => ({
        id: b.id,
        lessonId: b.lessonId,
        type: b.type as BlockType,
        orderIndex: b.orderIndex ?? 0,
        contentRu: b.contentRu,
        contentKz: b.contentKz,
        contentAr: b.contentAr,
      }))
      setBlocks(mapped.sort((a: StudioBlock, b: StudioBlock) => a.orderIndex - b.orderIndex))
    } catch (e) {
      notifyError(e, 'Не удалось загрузить урок')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLessonAndContext()
  }, [lessonId])

  const saveLessonMeta = async () => {
    if (!lessonDraft?.id) return
    try {
      await updateLesson(lessonDraft.id, {
        titleRu: lessonDraft.titleRu,
        descriptionRu: lessonDraft.descriptionRu,
        estimatedMinutes: Number(lessonDraft.estimatedMinutes) || 10,
        isPremium: !!lessonDraft.isPremium,
        isTest: !!lessonDraft.isTest,
        orderIndex: Number(lessonDraft.orderIndex) || 0,
      })
      setLesson((prev: any) => ({ ...prev, ...lessonDraft }))
      notifySuccess('Урок обновлен')
    } catch (e) {
      notifyError(e, 'Не удалось обновить урок')
    }
  }

  const resetBlockDraft = () => {
    const nextOrder = (blocks[blocks.length - 1]?.orderIndex || 0) + 1
    setBlockDraft({
      type: 'theory',
      orderIndex: nextOrder,
      titleRu: '',
      textRuHtml: '',
      titleKz: '',
      textKz: '',
      titleAr: '',
      textAr: '',
      arabicWord: '',
      transcription: '',
      translationRu: '',
    })
  }

  const editBlock = (block: StudioBlock) => {
    setBlockDraft({
      id: block.id,
      type: block.type,
      orderIndex: block.orderIndex,
      titleRu: (block.contentRu?.title as string) || '',
      textRuHtml: (block.contentRu?.html as string) || (block.contentRu?.text as string) || '',
      titleKz: (block.contentKz?.title as string) || '',
      textKz: (block.contentKz?.text as string) || '',
      titleAr: (block.contentAr?.title as string) || '',
      textAr: (block.contentAr?.text as string) || '',
      arabicWord: (block.contentRu?.arabicWord as string) || '',
      transcription: (block.contentRu?.transcription as string) || '',
      translationRu: (block.contentRu?.translation as string) || (block.contentRu?.translationRu as string) || '',
    })
  }

  const saveBlock = async () => {
    if (!lessonId) return
    if (!blockDraft.type) {
      setError('Укажите тип блока')
      return
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
          html: blockDraft.textRuHtml,
        }

    const payload = {
      type: blockDraft.type,
      orderIndex: Number(blockDraft.orderIndex) || 0,
      contentRu,
      contentKz: { title: blockDraft.titleKz, text: blockDraft.textKz },
      contentAr: { title: blockDraft.titleAr, text: blockDraft.textAr },
    }

    try {
      if (blockDraft.id) {
        await updateLessonBlock(blockDraft.id, payload)
      } else {
        await createLessonBlock({ lessonId, ...payload })
      }
      await loadLessonAndContext()
      notifySuccess(blockDraft.id ? 'Блок обновлен' : 'Блок создан')
      resetBlockDraft()
    } catch (e) {
      notifyError(e, 'Не удалось сохранить блок')
    }
  }

  const uploadEditorMedia = async (file: File): Promise<{ id: string; url: string; type: 'image' | 'audio' | 'video'; mimeType?: string }> => {
    let blockId = blockDraft.id
    if (!blockId && lessonId) {
      const payload = {
        lessonId,
        type: blockDraft.type,
        orderIndex: Number(blockDraft.orderIndex) || 0,
        contentRu: {
          title: blockDraft.titleRu,
          text: stripHtml(blockDraft.textRuHtml),
          html: blockDraft.textRuHtml,
        },
        contentKz: { title: blockDraft.titleKz, text: blockDraft.textKz },
        contentAr: { title: blockDraft.titleAr, text: blockDraft.textAr },
      }
      const createRes = await createLessonBlock(payload)
      blockId = createRes.data?.id
      if (blockId) {
        setBlockDraft((prev) => ({ ...prev, id: blockId }))
        await loadLessonAndContext()
        notifySuccess('Блок создан. Можно вставлять медиа.')
      }
    }
    if (!blockId) throw new Error('Не удалось определить блок для загрузки')

    const mime = file.type || ''
    const type: 'image' | 'audio' | 'video' =
      mime.startsWith('audio/') ? 'audio' : mime.startsWith('video/') ? 'video' : 'image'
    const response = await uploadBlockMedia(blockId, file, type)
    const data = response.data || {}
    return {
      id: data.id,
      url: data.url,
      type: (data.type as 'image' | 'audio' | 'video') || type,
      mimeType: data.mimeType,
    }
  }

  const removeEditorMedia = async (mediaId: string) => {
    if (!blockDraft.id) return
    await deleteBlockMedia(blockDraft.id, mediaId)
    try {
      await deleteMediaFile(mediaId)
    } catch {
      // file may still be used elsewhere
    }
  }

  const removeBlock = async (id: string) => {
    try {
      await deleteLessonBlock(id)
      await loadLessonAndContext()
      notifySuccess('Блок удален')
      if (blockDraft.id === id) resetBlockDraft()
    } catch (e) {
      notifyError(e, 'Не удалось удалить блок')
    }
  }

  const openTest = () => {
    navigate(`/content-studio/lessons/${lessonId}/test`)
  }

  if (!lessonId) {
    return (
      <Box>
        <Alert severity="error">Не указан урок.</Alert>
      </Box>
    )
  }

  if (loading && !lesson) {
    return <LinearProgress sx={{ width: '100%' }} />
  }

  if (!lesson) {
    return (
      <Box>
        <Alert severity="error">Урок не найден.</Alert>
      </Box>
    )
  }

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        {breadcrumb}
      </Typography>

      {!!error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {!!success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          {lesson.titleRu}
        </Typography>
        <Button variant="outlined" onClick={openTest}>
          Редактировать тест
        </Button>
      </Stack>

      <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 3 }}>
        <Tab value="meta" label="Метаданные урока" />
        <Tab value="blocks" label="Блоки" />
      </Tabs>

      {activeTab === 'meta' && (
        <Card sx={{ borderRadius: 3 }}>
          <CardContent>
            <Grid container spacing={2}>
              <Grid item xs={12} md={8}>
                <TextField
                  fullWidth
                  label="Название урока (RU)"
                  value={lessonDraft.titleRu || ''}
                  onChange={(e) => setLessonDraft((p) => ({ ...p, titleRu: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  type="number"
                  label="Порядок"
                  value={lessonDraft.orderIndex ?? 0}
                  onChange={(e) => setLessonDraft((p) => ({ ...p, orderIndex: Number(e.target.value) || 0 }))}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  minRows={3}
                  label="Описание урока (RU)"
                  value={lessonDraft.descriptionRu || ''}
                  onChange={(e) => setLessonDraft((p) => ({ ...p, descriptionRu: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  type="number"
                  label="Длительность (мин)"
                  value={lessonDraft.estimatedMinutes ?? 10}
                  onChange={(e) => setLessonDraft((p) => ({ ...p, estimatedMinutes: Number(e.target.value) || 10 }))}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={!!lessonDraft.isPremium}
                      onChange={(e) => setLessonDraft((p) => ({ ...p, isPremium: e.target.checked }))}
                    />
                  }
                  label="Premium урок"
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={!!lessonDraft.isTest}
                      onChange={(e) => setLessonDraft((p) => ({ ...p, isTest: e.target.checked }))}
                    />
                  }
                  label="Тестовый урок"
                />
              </Grid>
              <Grid item xs={12}>
                <Button variant="contained" startIcon={<SaveOutlined />} onClick={saveLessonMeta}>
                  Сохранить урок
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {activeTab === 'blocks' && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Card variant="outlined" sx={{ borderRadius: 3 }}>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    Блоки урока
                  </Typography>
                  <Button size="small" onClick={resetBlockDraft}>
                    Новый
                  </Button>
                </Stack>
                <Stack spacing={1}>
                  {blocks.map((b) => (
                    <Card key={b.id} variant="outlined" sx={{ borderRadius: 2 }}>
                      <CardContent sx={{ py: 1.2 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              #{b.orderIndex} • {b.type}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {b.type === 'illustration'
                                ? ((b.contentRu?.arabicWord as string) || (b.contentRu?.translation as string) || 'Без заголовка')
                                : ((b.contentRu?.title as string) || 'Без заголовка')}
                            </Typography>
                          </Box>
                          <Stack direction="row" spacing={0.5}>
                            <Button size="small" onClick={() => editBlock(b)} startIcon={<EditOutlined />}>
                              Edit
                            </Button>
                            <Button size="small" color="error" onClick={() => removeBlock(b.id)} startIcon={<DeleteOutline />}>
                              Del
                            </Button>
                          </Stack>
                        </Stack>
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={8}>
            <Card variant="outlined" sx={{ borderRadius: 3 }}>
              <CardContent>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
                  {blockDraft.id ? 'Редактировать блок' : 'Создать блок'}
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Тип блока</InputLabel>
                      <Select
                        label="Тип блока"
                        value={blockDraft.type}
                        onChange={(e) => setBlockDraft((p) => ({ ...p, type: e.target.value as BlockType }))}
                      >
                        <MenuItem value="theory">theory</MenuItem>
                        <MenuItem value="illustration">illustration</MenuItem>
                        <MenuItem value="audio">audio</MenuItem>
                        <MenuItem value="video">video</MenuItem>
                        <MenuItem value="lesson_complete">lesson_complete</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Порядок"
                      type="number"
                      value={blockDraft.orderIndex}
                      onChange={(e) => setBlockDraft((p) => ({ ...p, orderIndex: Number(e.target.value) || 1 }))}
                    />
                  </Grid>
                  {blockDraft.type === 'illustration' ? (
                    <>
                      <Grid item xs={12}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          Заполните поля для карточки-иллюстрации. Изображение и аудио загружаются через раздел «Медиа файлы» на странице редактирования блока.
                        </Typography>
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Арабское слово"
                          value={blockDraft.arabicWord}
                          onChange={(e) => setBlockDraft((p) => ({ ...p, arabicWord: e.target.value }))}
                          placeholder="تفاحة"
                          inputProps={{ dir: 'rtl', style: { fontSize: 24 } }}
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Транскрипция"
                          value={blockDraft.transcription}
                          onChange={(e) => setBlockDraft((p) => ({ ...p, transcription: e.target.value }))}
                          placeholder="туфаха"
                          helperText="Как произносится (латиницей/кириллицей)"
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Перевод (RU)"
                          value={blockDraft.translationRu}
                          onChange={(e) => setBlockDraft((p) => ({ ...p, translationRu: e.target.value }))}
                          placeholder="Яблоко"
                        />
                      </Grid>
                    </>
                  ) : (
                    <>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Заголовок (RU)"
                          value={blockDraft.titleRu}
                          onChange={(e) => setBlockDraft((p) => ({ ...p, titleRu: e.target.value }))}
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <Stack direction="row" spacing={1} sx={{ mb: 1, flexWrap: 'wrap' }}>
                          <Chip size="small" color="primary" variant="outlined" label="Rich text" />
                          <Chip size="small" variant="outlined" label="Вставка: фото / аудио / видео" />
                        </Stack>
                        <RichTextEditor
                          value={blockDraft.textRuHtml}
                          onChange={(v) => setBlockDraft((p) => ({ ...p, textRuHtml: v }))}
                          minHeight={360}
                          onUploadFile={uploadEditorMedia}
                          onRemoveMedia={removeEditorMedia}
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <Box
                          sx={{
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: 2,
                            p: 2,
                            minHeight: 100,
                            backgroundColor: '#FBFBFD',
                            '& img, & video': { maxWidth: '100%', borderRadius: 1.5 },
                            '& audio': { width: '100%' },
                          }}
                          dangerouslySetInnerHTML={{
                            __html:
                              blockDraft.textRuHtml ||
                              '<p style="color:#8E8E93">Пока пусто.</p>',
                          }}
                        />
                      </Grid>
                    </>
                  )}
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Заголовок (KZ)"
                      value={blockDraft.titleKz}
                      onChange={(e) => setBlockDraft((p) => ({ ...p, titleKz: e.target.value }))}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Заголовок (AR)"
                      value={blockDraft.titleAr}
                      onChange={(e) => setBlockDraft((p) => ({ ...p, titleAr: e.target.value }))}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      multiline
                      minRows={2}
                      size="small"
                      label="Текст (KZ)"
                      value={blockDraft.textKz}
                      onChange={(e) => setBlockDraft((p) => ({ ...p, textKz: e.target.value }))}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      multiline
                      minRows={2}
                      size="small"
                      label="Текст (AR)"
                      value={blockDraft.textAr}
                      onChange={(e) => setBlockDraft((p) => ({ ...p, textAr: e.target.value }))}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Stack direction="row" spacing={1}>
                      <Button variant="contained" startIcon={<SaveOutlined />} onClick={saveBlock}>
                        Сохранить блок
                      </Button>
                      <Button variant="outlined" onClick={resetBlockDraft}>
                        Очистить форму
                      </Button>
                    </Stack>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  )
}
