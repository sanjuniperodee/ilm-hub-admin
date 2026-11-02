import { Box, Stack, TextField } from '@mui/material'
import { FormSection, arabicInputProps } from '../../../components/ui'
import RichTextEditor from '../../../components/RichTextEditor'
import MediaUploader from '../../../components/MediaUploader'
import GridBlockEditor from '../../../components/GridBlockEditor'
import {
  AudioChoiceEditor,
  AudioMultipleChoiceEditor,
  FillBlankEditor,
  FindLetterInWordEditor,
  ImageWordMatchEditor,
  ListenAndChooseWordEditor,
  ListenRepeatEditor,
  ManualInputEditor,
  MatchPairsEditor,
  MultipleChoiceEditor,
} from '../../../components/ExerciseEditors'
import { FieldIssues } from '../../../components/lesson-editor/EditorPrimitives'
import { issuesFor, type ValidationIssue } from '../../../components/lesson-editor/exerciseValidation'
import type { DropzoneKind } from '../../../components/ui'
import { AUDIO_MEDIA_BLOCK_TYPES, EXERCISE_BLOCK_TYPES, PAIR_MEDIA_BLOCK_TYPES } from '../blockTypes'
import type { BlockDraft, Lang, MediaFile, UploadedEditorMedia } from '../types'

export interface BlockFieldsProps {
  draft: BlockDraft
  setDraft: (updater: (prev: BlockDraft) => BlockDraft) => void
  lang: Lang
  mediaFiles: MediaFile[]
  showIssues: boolean
  warnings: ValidationIssue[]
  onUploadEditorMedia: (file: File) => Promise<UploadedEditorMedia>
  onRemoveEditorMedia: (mediaId: string) => Promise<void>
  onMediaUpload: (file: File, type: 'image' | 'audio' | 'video', description?: string) => Promise<void>
  onMediaDelete: (mediaId: string) => Promise<void>
  onMediaRefresh: () => void
  onGridItemAudio: (rowId: string, file: File) => Promise<void>
}

const L = (lang: Lang) => (lang === 'ru' ? 'RU' : 'KZ')

function MediaSection({
  title,
  description,
  accept,
  props,
}: {
  title: string
  description: string
  accept: DropzoneKind[]
  props: BlockFieldsProps
}) {
  return (
    <FormSection
      title={title}
      description={
        <>
          {description}
          {!props.draft.id && ' Блок сохранится автоматически при первой загрузке.'}
        </>
      }
    >
      <MediaUploader
        blockId={props.draft.id}
        mediaFiles={props.mediaFiles}
        onUpload={props.onMediaUpload}
        onDelete={props.onMediaDelete}
        onRefresh={props.onMediaRefresh}
        accept={accept}
        hideDescription={!accept.includes('audio')}
      />
      <FieldIssues issues={props.showIssues ? issuesFor(props.warnings, 'media') : []} />
    </FormSection>
  )
}

/** Theory, audio and video blocks: title + rich text per language. */
function TheoryFields(props: BlockFieldsProps) {
  const { draft, setDraft, lang } = props
  const issues = props.showIssues ? issuesFor(props.warnings, 'content') : []
  const editors = (['ru', 'kz'] as const).map((l) => (
    // Both editors stay mounted so each keeps its own undo history; only one is visible.
    <Box key={l} sx={{ display: l === lang ? 'block' : 'none' }}>
      <RichTextEditor
        value={l === 'ru' ? draft.textRuHtml : draft.textKz}
        onChange={(v) => setDraft((p) => (l === 'ru' ? { ...p, textRuHtml: v } : { ...p, textKz: v }))}
        minHeight={l === 'ru' ? 280 : 240}
        placeholder={l === 'ru' ? 'Текст урока: объяснение, примеры на арабском, таблицы…' : 'Қазақша мәтінді енгізіңіз…'}
        onUploadFile={props.onUploadEditorMedia}
        onRemoveMedia={props.onRemoveEditorMedia}
        ariaLabel={`Текст блока (${L(l)})`}
      />
    </Box>
  ))
  return (
    <>
      <FormSection title="Заголовок" description="Крупно над текстом. Можно оставить пустым." divider={false} layout="stacked">
        <TextField
          fullWidth
          label={`Заголовок (${L(lang)})`}
          value={lang === 'ru' ? draft.titleRu : draft.titleKz}
          onChange={(e) => setDraft((p) => (lang === 'ru' ? { ...p, titleRu: e.target.value } : { ...p, titleKz: e.target.value }))}
          placeholder={lang === 'kz' && draft.titleRu ? `RU: ${draft.titleRu}` : 'Например: Буквы-близнецы'}
          InputLabelProps={lang === 'kz' && draft.titleRu ? { shrink: true } : undefined}
          inputProps={{ dir: 'auto' }}
        />
      </FormSection>
      <FormSection
        title="Текст"
        layout="stacked"
        description={
          draft.type === 'theory'
            ? 'Арабский вставляйте кнопкой «Арабский текст» — абзац встанет справа налево. Таблица «Текст + аудио» удобна для произношения.'
            : draft.type === 'audio'
              ? 'Вставьте аудио кнопкой на панели или перетащите файл в текст.'
              : 'Вставьте видео кнопкой на панели или перетащите файл в текст.'
        }
      >
        {editors}
        <FieldIssues issues={issues} />
      </FormSection>
    </>
  )
}

function IllustrationFields(props: BlockFieldsProps) {
  const { draft, setDraft, lang } = props
  return (
    <>
      <FormSection title="Слово" description="Арабское слово и транскрипция общие для RU и KZ." divider={false}>
        <TextField
          fullWidth
          required
          label="Слово на арабском"
          value={draft.arabicWord}
          onChange={(e) => setDraft((p) => ({ ...p, arabicWord: e.target.value }))}
          placeholder="تُفَّاحَة"
          inputProps={{ ...arabicInputProps, style: { ...arabicInputProps.style, fontSize: 28 } }}
          error={props.showIssues && issuesFor(props.warnings, 'word').length > 0}
          helperText={props.showIssues && issuesFor(props.warnings, 'word')[0]?.message}
        />
        <TextField
          fullWidth
          label="Транскрипция"
          value={draft.transcription}
          onChange={(e) => setDraft((p) => ({ ...p, transcription: e.target.value }))}
          placeholder="туффаха"
        />
      </FormSection>
      <FormSection title="Перевод" description="Показывается под словом.">
        <TextField
          fullWidth
          label={`Перевод (${L(lang)})`}
          value={lang === 'ru' ? draft.translationRu : draft.translationKz}
          onChange={(e) => setDraft((p) => (lang === 'ru' ? { ...p, translationRu: e.target.value } : { ...p, translationKz: e.target.value }))}
          placeholder={lang === 'ru' ? 'Яблоко' : draft.translationRu ? `RU: ${draft.translationRu}` : 'Алма'}
          InputLabelProps={lang === 'kz' && draft.translationRu ? { shrink: true } : undefined}
        />
      </FormSection>
      <MediaSection title="Медиа блока" description="Картинка и произношение слова." accept={['image', 'audio', 'video']} props={props} />
    </>
  )
}

function LessonCompleteFields({ draft, setDraft, lang }: BlockFieldsProps) {
  const ru = lang === 'ru'
  const field = (key: 'message' | 'summary' | 'nextAction' | 'nextActionButton') => {
    const k = `${key}${ru ? 'Ru' : 'Kz'}` as keyof BlockDraft
    const ruText = (draft[`${key}Ru` as keyof BlockDraft] as string | undefined) || ''
    return {
      value: (draft[k] as string | undefined) || '',
      onChange: (e: { target: { value: string } }) => setDraft((p) => ({ ...p, [k]: e.target.value })),
      ...(!ru && ruText ? { InputLabelProps: { shrink: true } } : {}),
    }
  }
  const ruValue = (key: 'messageRu' | 'summaryRu' | 'nextActionRu' | 'nextActionButtonRu') => draft[key] || ''
  const ph = (ruText: string, kzDefault: string, ruDefault: string) => (ru ? ruDefault : ruText ? `RU: ${ruText}` : kzDefault)
  return (
    <>
      <FormSection title="Экран завершения" description="Появляется после последнего блока урока." divider={false}>
        <TextField
          fullWidth
          label={`Заголовок (${L(lang)})`}
          {...field('message')}
          placeholder={ph(ruValue('messageRu'), 'Сіз сабақты аяқтадыңыз!', 'Вы завершили урок!')}
          helperText={ru ? 'Если пусто — «Вы завершили урок!»' : undefined}
        />
        <TextField
          fullWidth
          multiline
          minRows={2}
          label={`Итог урока (${L(lang)})`}
          {...field('summary')}
          placeholder={ph(ruValue('summaryRu'), 'Бұл сабақта не үйрендіңіз', 'Что изучено в этом уроке')}
        />
      </FormSection>
      <FormSection title="Следующий шаг" description="Подводит к мини-тесту урока.">
        <TextField
          fullWidth
          multiline
          minRows={2}
          label={`Текст (${L(lang)})`}
          {...field('nextAction')}
          placeholder={ph(ruValue('nextActionRu'), 'Енді сіз қаншалықты меңгергеніңізді тексереміз', 'Теперь проверим, как вы усвоили материал')}
        />
        <TextField
          fullWidth
          label={`Текст кнопки (${L(lang)})`}
          {...field('nextActionButton')}
          placeholder={ph(ruValue('nextActionButtonRu'), 'Мини-тестке өту', 'Перейти к мини-тесту')}
          helperText={ru ? 'Если пусто — «Перейти к мини-тесту»' : undefined}
        />
      </FormSection>
    </>
  )
}

function ExerciseFields(props: BlockFieldsProps) {
  const { draft, setDraft, lang, mediaFiles, showIssues } = props
  const set = (v: any) => setDraft((p) => ({ ...p, exerciseConfig: v }))
  const common = { value: draft.exerciseConfig, onChange: set, lang, showIssues }
  const needsAudio = AUDIO_MEDIA_BLOCK_TYPES.includes(draft.type)
  const pairMedia = PAIR_MEDIA_BLOCK_TYPES.includes(draft.type)

  let editor: JSX.Element | null = null
  switch (draft.type) {
    case 'multiple_choice':
      editor = <MultipleChoiceEditor {...common} />
      break
    case 'single_choice':
      editor = <MultipleChoiceEditor {...common} single />
      break
    case 'audio_multiple_choice':
      editor = <AudioMultipleChoiceEditor {...common} />
      break
    case 'match_pairs':
      editor = <MatchPairsEditor {...common} blockId={draft.id} mediaFiles={mediaFiles} />
      break
    case 'fill_blank':
      editor = <FillBlankEditor {...common} />
      break
    case 'manual_input':
      editor = <ManualInputEditor {...common} />
      break
    case 'listen_repeat':
      editor = <ListenRepeatEditor {...common} />
      break
    case 'image_word_match':
      editor = <ImageWordMatchEditor {...common} mediaFiles={mediaFiles} />
      break
    case 'audio_choice':
      editor = <AudioChoiceEditor {...common} />
      break
    case 'find_letter_in_word':
      editor = <FindLetterInWordEditor {...common} />
      break
    case 'listen_and_choose_word':
      editor = <ListenAndChooseWordEditor {...common} />
      break
    default:
      editor = null
  }

  const media = needsAudio ? (
    <MediaSection title="Медиа блока" description="Запись, которую слушает ученик." accept={['audio']} props={props} />
  ) : pairMedia ? (
    <MediaSection
      title="Медиа блока"
      description={draft.type === 'image_word_match' ? 'Загрузите картинки, затем выберите их в парах.' : 'Загрузите аудио и картинки, затем выберите их в парах.'}
      accept={draft.type === 'image_word_match' ? ['image'] : ['image', 'audio']}
      props={props}
    />
  ) : null

  return (
    <>
      <FormSection title="Упражнение" layout="stacked" divider={false}>
        {editor}
      </FormSection>
      {media}
    </>
  )
}

/** Fields of the open block, by type. */
export function BlockFields(props: BlockFieldsProps) {
  const { draft, setDraft, lang } = props
  switch (draft.type) {
    case 'illustration':
      return <IllustrationFields {...props} />
    case 'lesson_complete':
      return <LessonCompleteFields {...props} />
    case 'grid':
      return (
        <Stack>
          <GridBlockEditor
            lang={lang}
            showIssues={props.showIssues}
            titleRu={draft.titleRu}
            titleKz={draft.titleKz}
            onTitleChange={(field, v) => setDraft((p) => ({ ...p, [field]: v }))}
            columnMode={draft.gridColumnMode}
            onColumnMode={(m) => setDraft((p) => ({ ...p, gridColumnMode: m }))}
            showCaption={draft.gridShowCaption}
            onShowCaption={(v) => setDraft((p) => ({ ...p, gridShowCaption: v }))}
            interactive={draft.gridInteractive}
            onInteractive={(v) => setDraft((p) => ({ ...p, gridInteractive: v }))}
            items={draft.gridItemRows}
            onItemsChange={(rows) => setDraft((p) => ({ ...p, gridItemRows: rows }))}
            onUploadItemAudio={props.onGridItemAudio}
          />
        </Stack>
      )
    default:
      // Same rule as before: exercise types get their editor, everything else is title + rich text.
      return EXERCISE_BLOCK_TYPES.includes(draft.type) ? <ExerciseFields {...props} /> : <TheoryFields {...props} />
  }
}
