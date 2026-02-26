import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Grid,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
} from '@mui/material'
import { ArrowBack, Save } from '@mui/icons-material'
import {
  getLessonBlockById,
  createLessonBlock,
  updateLessonBlock,
  getLessons,
  uploadBlockMedia,
  getBlockMedia,
  deleteBlockMedia,
} from '../api/adminApi'
import MediaUploader from '../components/MediaUploader'
import {
  MultipleChoiceEditor,
  MatchPairsEditor,
  FillBlankEditor,
  ManualInputEditor,
} from '../components/ExerciseEditors'
import {
  FillBlankConfigEditor,
} from '../components/QuestionConfigEditors'

const BLOCK_TYPES = [
  { value: 'theory', label: 'Теория', description: 'Текстовый контент с заголовком' },
  { value: 'illustration', label: 'Иллюстрация', description: 'Изображение с подписью' },
  { value: 'audio', label: 'Аудио', description: 'Аудио файл с транскрипцией' },
  { value: 'video', label: 'Видео', description: 'Видео контент' },
  { value: 'lesson_complete', label: 'Завершение урока', description: 'Экран завершения' },
  { value: 'multiple_choice', label: 'Multiple Choice', description: 'Выбор из вариантов' },
  { value: 'single_choice', label: 'Single Choice', description: 'Выбор одного варианта' },
  { value: 'match_pairs', label: 'Match Pairs', description: 'Сопоставление пар' },
  { value: 'fill_blank', label: 'Fill Blank', description: 'Заполнение пропуска' },
  { value: 'manual_input', label: 'Manual Input', description: 'Ввод ответа вручную' },
  { value: 'drag_drop', label: 'Drag & Drop', description: 'Заполни пропуск (перетаскивание)' },
]

interface MediaFile {
  id: string
  type: 'image' | 'audio' | 'video'
  url: string
  filename: string
  mimeType: string
  size: number
  description?: string
}

interface LessonBlockFormData {
  lessonId: string
  type: string
  orderIndex: number
  // Content fields for different locales
  titleRu: string
  titleKz: string
  titleAr: string
  textRu: string
  textKz: string
  textAr: string
  // JSON fields for complex content
  contentRu?: any
  contentKz?: any
  contentAr?: any
  exerciseConfig?: any
  // Illustration-specific fields
  arabicWord?: string
  transcription?: string
  translationRu?: string
}

export default function LessonBlockEditPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isNew = !id
  const [loading, setLoading] = useState(!isNew)
  const [lessons, setLessons] = useState<any[]>([])
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([])
  const [activeTab, setActiveTab] = useState(0)
  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<LessonBlockFormData>({
    defaultValues: {
      orderIndex: 0,
      type: 'theory',
      titleRu: '',
      titleKz: '',
      titleAr: '',
      textRu: '',
      textKz: '',
      textAr: '',
    },
  })

  const blockType = watch('type')

  useEffect(() => {
    fetchLessons()
    if (!isNew) {
      fetchBlock()
      fetchMedia()
    }
  }, [id])

  const fetchLessons = async () => {
    try {
      const response = await getLessons()
      setLessons(response.data)
    } catch (error) {
      console.error('Error fetching lessons:', error)
    }
  }

  const fetchMedia = async () => {
    if (!id) return
    try {
      const response = await getBlockMedia(id)
      setMediaFiles(response.data || [])
    } catch (error) {
      console.error('Error fetching media:', error)
    }
  }

  const fetchBlock = async () => {
    try {
      const response = await getLessonBlockById(id!)
      const block = response.data

      // Set basic fields
      setValue('lessonId', block.lessonId)
      setValue('type', block.type)
      setValue('orderIndex', block.orderIndex)

      // Parse content fields
      if (block.contentRu || block.contentKz || block.contentAr) {
        // Reconstruct the unified content object for the visual editors
        // This is the reverse of the mapping in onSubmit
        const unifiedContent: any = {}

        if (block.type === 'multiple_choice' || block.type === 'manual_input') {
          unifiedContent.question = {
            ru: block.contentRu?.question || '',
            kz: block.contentKz?.question || '',
            ar: block.contentAr?.question || '',
          }
          if (block.contentRu?.options) {
            unifiedContent.options = block.contentRu.options.map((opt: any, index: number) => ({
              isCorrect: opt.isCorrect,
              text: {
                ru: opt.text || '',
                kz: block.contentKz?.options?.[index]?.text || '',
                ar: block.contentAr?.options?.[index]?.text || '',
              }
            }))
          }
          if (block.contentRu?.correctAnswers) {
            unifiedContent.correctAnswers = {
              ru: block.contentRu.correctAnswers,
              kz: block.contentKz?.correctAnswers,
              ar: block.contentAr?.correctAnswers,
            }
          }
        } else if (block.type === 'match_pairs') {
          if (block.contentRu?.pairs) {
            unifiedContent.pairs = block.contentRu.pairs.map((p: any, index: number) => ({
              left: {
                ru: p.left,
                kz: block.contentKz?.pairs?.[index]?.left,
                ar: block.contentAr?.pairs?.[index]?.left,
              },
              right: {
                ru: p.right,
                kz: block.contentKz?.pairs?.[index]?.right,
                ar: block.contentAr?.pairs?.[index]?.right,
              }
            }))
          }
        } else if (block.type === 'fill_blank') {
          unifiedContent.text = {
            ru: block.contentRu?.text || '',
            kz: block.contentKz?.text || '',
            ar: block.contentAr?.text || '',
          }
        } else if (block.type === 'drag_drop') {
          Object.assign(unifiedContent, block.contentRu || {})
          if (!unifiedContent.sentenceTemplateRu && block.contentRu?.sentenceTemplateRu) {
            unifiedContent.sentenceTemplateRu = block.contentRu.sentenceTemplateRu
          }
        }

        // Set the reconstructed object to exerciseConfig field for the editor to use
        setValue('exerciseConfig', unifiedContent)
      } else if (block.exerciseConfig) {
        // Fallback to existing config if present
        setValue('exerciseConfig', block.exerciseConfig)
      }

      // Handle illustration-specific fields
      if (block.type === 'illustration' && block.contentRu) {
        setValue('arabicWord', block.contentRu.arabicWord || '')
        setValue('transcription', block.contentRu.transcription || '')
        setValue('translationRu', block.contentRu.translation || block.contentRu.translationRu || '')
      }

      // Handle simple content fields
      if (block.contentRu && typeof block.contentRu === 'object') {
        setValue('titleRu', block.contentRu.title || '')
        setValue('textRu', block.contentRu.text || '')
      }
    } catch (error) {
      console.error('Error fetching lesson block:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleMediaUpload = useCallback(async (file: File, type: 'image' | 'audio' | 'video') => {
    if (!id) throw new Error('Block must be saved before uploading media')
    await uploadBlockMedia(id, file, type)
  }, [id])

  const handleMediaDelete = useCallback(async (mediaFileId: string) => {
    if (!id) return
    await deleteBlockMedia(id, mediaFileId)
  }, [id])

  const onSubmit = async (data: LessonBlockFormData) => {
    try {
      // Build content objects based on block type
      const buildContent = (title: string, text: string) => {
        if (!title && !text) return null
        return { title, text }
      }

      const submitData: any = {
        lessonId: data.lessonId,
        type: data.type,
        orderIndex: data.orderIndex,
      }

      // For simple block types, use structured fields
      if (['theory', 'audio', 'video', 'lesson_complete'].includes(data.type)) {
        submitData.contentRu = buildContent(data.titleRu, data.textRu)
        submitData.contentKz = buildContent(data.titleKz, data.textKz)
        submitData.contentAr = buildContent(data.titleAr, data.textAr)
      } else if (data.type === 'illustration') {
        submitData.contentRu = {
          arabicWord: data.arabicWord || '',
          transcription: data.transcription || '',
          translation: data.translationRu || '',
        }
      }
      if (['theory', 'illustration', 'audio', 'video', 'lesson_complete'].includes(data.type)) {
        // For exercise types, parse JSON if provided or use structured data
        if (data.exerciseConfig) {
          try {
            // If coming from visual editor, it might already be an object
            submitData.exerciseConfig = typeof data.exerciseConfig === 'string'
              ? JSON.parse(data.exerciseConfig)
              : data.exerciseConfig
          } catch {
            submitData.exerciseConfig = data.exerciseConfig
          }
        }

      }

      const exerciseTypes = ['multiple_choice', 'single_choice', 'match_pairs', 'fill_blank', 'manual_input', 'drag_drop']
      if (exerciseTypes.includes(data.type)) {
        // Map the editor content back to the correct fields
        // Note: The editors update 'exerciseConfig' field in the form with the full content object
        // But backend expects specific fields. We need to adapt here.

        // Actually, let's keep it simple: visual editors write to 'exerciseConfig' form field
        // And we send that as 'exerciseConfig' to backend. 
        // BUT wait, backend entity has contentRu/Kz/Ar JSONBs.
        // Let's standarize: Visual editors output an object that contains structure for ALL languages.
        // We'll save that entire object into `exerciseConfig` for now (as the current code does), 
        // OR we map it to contentRu/Kz/Ar if the backend supports it.

        // Looking at entity: contentRu/Kz/Ar are JSONB. 
        // Looking at editors: they produce { question: {ru, kz...}, options: ... }
        // This structure merges languages. 
        // We should probably split it into contentRu/Kz/Ar before sending.

        const config = typeof data.exerciseConfig === 'string'
          ? JSON.parse(data.exerciseConfig)
          : data.exerciseConfig

        if (config) {
          // Helper to extract lang-specific content
          const extractLang = (obj: any, lang: string): any => {
            if (!obj) return null
            if (Array.isArray(obj)) return obj.map(item => extractLang(item, lang))
            if (typeof obj === 'object') {
              const result: any = {}
              let hasContent = false
              for (const key in obj) {
                if (key === lang) {
                  return obj[key] // Found leaf value for this lang
                }
                if (['ru', 'kz', 'ar'].includes(key) && key !== lang) {
                  continue // Skip other langs
                }
                const val = extractLang(obj[key], lang)
                if (val !== undefined && val !== null) {
                  result[key] = val
                  hasContent = true
                }
              }
              return hasContent ? result : (Object.keys(result).length > 0 ? result : null)
            }
            return obj
          }

          // This extraction logic is complex and might be brittle.
          // For now, let's save the RAW editor output into `exerciseConfig` 
          // AND also try to populate contentRu/Kz/Ar if compatible.
          // But wait, the entity has `contentRu`, `contentKz`, `contentAr`.
          // If we use visual editors, we want to populate THESE fields.

          // Let's do a simpler mapping specific to each editor type

          if (data.type === 'multiple_choice' || data.type === 'single_choice' || data.type === 'manual_input') {
            // content: { question: {ru...}, options: [...] }
            const mapContent = (lang: string) => ({
              question: config.question?.[lang],
              options: config.options?.map((o: any) => ({
                text: o.text?.[lang],
                isCorrect: o.isCorrect
              })),
              correctAnswers: config.correctAnswers?.[lang], // For manual input
            })
            submitData.contentRu = mapContent('ru')
            submitData.contentKz = mapContent('kz')
            submitData.contentAr = mapContent('ar')
          }
          else if (data.type === 'match_pairs') {
            // content: { pairs: [{left: {ru...}, right: {ru...}}] }
            const mapContent = (lang: string) => ({
              pairs: config.pairs?.map((p: any) => ({
                left: p.left?.[lang],
                right: p.right?.[lang]
              }))
            })
            submitData.contentRu = mapContent('ru')
            submitData.contentKz = mapContent('kz')
            submitData.contentAr = mapContent('ar')
          }
          else if (data.type === 'fill_blank') {
            // content: { text: {ru...} }
            const mapContent = (lang: string) => ({
              text: config.text?.[lang]
            })
            submitData.contentRu = mapContent('ru')
            submitData.contentKz = mapContent('kz')
            submitData.contentAr = mapContent('ar')
          }
          else if (data.type === 'drag_drop') {
            submitData.contentRu = {
              instructionRu: config.instructionRu,
              sentenceTemplateRu: config.sentenceTemplateRu,
              options: config.options,
              correctAnswerId: config.correctAnswerId,
              explanationRu: config.explanationRu,
            }
          }
        }
      }


      if (isNew) {
        const response = await createLessonBlock(submitData)
        // Navigate to edit page to allow media upload
        navigate(`/lesson-blocks/${response.data.id}`)
      } else {
        await updateLessonBlock(id!, submitData)
        navigate('/lesson-blocks')
      }
    } catch (error: any) {
      console.error('Error saving lesson block:', error)
      alert(error.response?.data?.message || 'Failed to save lesson block')
    }
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box>
      <Button
        startIcon={<ArrowBack />}
        onClick={() => navigate('/lesson-blocks')}
        sx={{ mb: 2 }}
      >
        Назад к блокам
      </Button>

      <Typography variant="h4" gutterBottom>
        {isNew ? 'Создать блок урока' : 'Редактировать блок урока'}
      </Typography>

      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Basic settings */}
        <Paper sx={{ p: 3, mt: 2, mb: 3 }}>
          <Typography variant="h6" gutterBottom>Основные настройки</Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                select
                label="Урок"
                {...register('lessonId', { required: 'Выберите урок' })}
                error={!!errors.lessonId}
                helperText={errors.lessonId?.message}
                SelectProps={{ native: true }}
              >
                <option value="">Выберите урок</option>
                {lessons.map((lesson) => (
                  <option key={lesson.id} value={lesson.id}>
                    {lesson.titleRu}
                  </option>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Тип блока</InputLabel>
                <Select
                  value={blockType}
                  label="Тип блока"
                  {...register('type', { required: 'Выберите тип' })}
                >
                  {BLOCK_TYPES.map((type) => (
                    <MenuItem key={type.value} value={type.value}>
                      <Box>
                        <Typography variant="body1">{type.label}</Typography>
                        <Typography variant="caption" color="textSecondary">
                          {type.description}
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Порядковый номер"
                type="number"
                {...register('orderIndex', { required: 'Укажите порядок', valueAsNumber: true })}
                error={!!errors.orderIndex}
                helperText={errors.orderIndex?.message}
              />
            </Grid>
          </Grid>
        </Paper>

        {/* Content section */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>Контент</Typography>

          {['multiple_choice', 'single_choice', 'match_pairs', 'fill_blank', 'manual_input', 'drag_drop'].includes(blockType) ? (
            <Box>
              {(blockType === 'multiple_choice' || blockType === 'single_choice') && (
                <MultipleChoiceEditor
                  value={watch('exerciseConfig')}
                  onChange={(val: any) => setValue('exerciseConfig', val)}
                />
              )}
              {blockType === 'match_pairs' && (
                <MatchPairsEditor
                  value={watch('exerciseConfig')}
                  onChange={(val: any) => setValue('exerciseConfig', val)}
                />
              )}
              {blockType === 'fill_blank' && (
                <FillBlankEditor
                  value={watch('exerciseConfig')}
                  onChange={(val: any) => setValue('exerciseConfig', val)}
                />
              )}
              {blockType === 'manual_input' && (
                <ManualInputEditor
                  value={watch('exerciseConfig')}
                  onChange={(val: any) => setValue('exerciseConfig', val)}
                />
              )}
              {blockType === 'drag_drop' && (
                <FillBlankConfigEditor
                  value={watch('exerciseConfig') || {}}
                  onChange={(val: any) => setValue('exerciseConfig', val)}
                />
              )}
            </Box>
          ) : blockType === 'illustration' ? (
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Заполните поля для карточки-иллюстрации. Фото / GIF / видео и аудио для этой карточки загружаются через раздел «Медиа файлы» ниже.
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Арабское слово"
                    {...register('arabicWord')}
                    placeholder="تفاحة"
                    inputProps={{ dir: 'rtl', style: { fontSize: 24 } }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Транскрипция"
                    {...register('transcription')}
                    placeholder="туфаха"
                    helperText="Как произносится (латиницей/кириллицей)"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Перевод (RU)"
                    {...register('translationRu')}
                    placeholder="Яблоко"
                  />
                </Grid>
              </Grid>
            </Box>
          ) : (
          <Box>
            <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 2 }}>
              <Tab label="Русский" />
              <Tab label="Казахский" />
              <Tab label="Арабский" />
            </Tabs>

            {activeTab === 0 && (
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Заголовок (RU)"
                    {...register('titleRu')}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={6}
                    label="Текст (RU)"
                    {...register('textRu')}
                    placeholder="Введите текст контента..."
                  />
                </Grid>
              </Grid>
            )}

            {activeTab === 1 && (
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Заголовок (KZ)"
                    {...register('titleKz')}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={6}
                    label="Текст (KZ)"
                    {...register('textKz')}
                  />
                </Grid>
              </Grid>
            )}

            {activeTab === 2 && (
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Заголовок (AR)"
                    {...register('titleAr')}
                    inputProps={{ dir: 'rtl' }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={6}
                    label="Текст (AR)"
                    {...register('textAr')}
                    inputProps={{ dir: 'rtl' }}
                  />
                </Grid>
              </Grid>
            )}
          </Box>
          )}
        </Paper>

        {/* Media section (only for saved blocks) */}
        {!isNew && (
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>Медиа файлы</Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
              Загрузите изображения, аудио или видео для этого блока
            </Typography>
            <MediaUploader
              blockId={id!}
              mediaFiles={mediaFiles}
              onUpload={handleMediaUpload}
              onDelete={handleMediaDelete}
              onRefresh={fetchMedia}
            />
          </Paper>
        )}

        {isNew && (
          <Paper sx={{ p: 3, mb: 3, bgcolor: 'info.light' }}>
            <Typography variant="body2">
              💡 Сначала сохраните блок, чтобы загрузить медиа файлы
            </Typography>
          </Paper>
        )}

        {/* Save button */}
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            type="submit"
            variant="contained"
            size="large"
            startIcon={<Save />}
          >
            Сохранить
          </Button>
          <Button
            variant="outlined"
            size="large"
            onClick={() => navigate('/lesson-blocks')}
          >
            Отмена
          </Button>
        </Box>
      </form>
    </Box>
  )
}
