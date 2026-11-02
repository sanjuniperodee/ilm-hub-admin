import { Box, Button, CircularProgress, FormControlLabel, IconButton, Stack, Switch, TextField, Tooltip, Typography } from '@mui/material'
import { Add, DeleteOutline, SaveOutlined } from '@mui/icons-material'
import { ArabicText, EmptyState, FormSection, LoadingState, arabicInputProps } from '../../../components/ui'
import {
  AudioField,
  AudioPlayButton,
  AudioUploadButton,
  Completeness,
  DragHandle,
  EditorDrawer,
  FieldPair,
  SortableList,
} from '../shared'
import { entryCompleteness, type DictionaryEntry, type DictionaryExample } from './model'

export interface EntryDrawerProps {
  open: boolean
  /** Entry being edited; `null` while it is loading. */
  entry: DictionaryEntry | null
  saving: boolean
  reorderingExamples: boolean
  addingExample: boolean
  onClose: () => void
  onChange: (field: keyof DictionaryEntry, value: unknown) => void
  onSave: () => void
  onUploadAudio: (file: File) => Promise<unknown>
  onDeleteAudio: () => void
  onAddExample: () => void
  onExampleChange: (id: string, field: keyof DictionaryExample, value: unknown) => void
  onSaveExample: (example: DictionaryExample) => void
  onDeleteExample: (example: DictionaryExample) => void
  onUploadExampleAudio: (id: string, file: File) => Promise<unknown>
  /** Persist a new order (after drag) or the current one (button). */
  onReorderExamples: (next?: DictionaryExample[]) => void
}

export function EntryDrawer(p: EntryDrawerProps) {
  const { entry } = p
  const isEdit = !!entry?.id
  const examples = entry?.examples ?? []

  return (
    <EditorDrawer
      open={p.open}
      onClose={p.onClose}
      width={720}
      title={isEdit ? `Слово «${entry?.translationRu || entry?.arabic}»` : 'Новое слово'}
      subtitle={isEdit ? 'Перевод, аудио и примеры употребления' : 'Аудио и примеры можно добавить после сохранения'}
      preview={
        entry?.arabic ? (
          <ArabicText size="xl" weight={500} sx={{ display: 'block', textAlign: 'right' }}>
            {entry.arabic}
          </ArabicText>
        ) : undefined
      }
      meta={isEdit && entry ? <Completeness variant="summary" items={entryCompleteness(entry)} /> : undefined}
      footer={
        <>
          <Button variant="outlined" onClick={p.onClose}>
            Отмена
          </Button>
          <Button
            variant="contained"
            onClick={p.onSave}
            disabled={p.saving || !entry}
            startIcon={p.saving ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            Сохранить слово
          </Button>
        </>
      }
    >
      {!entry ? (
        <LoadingState variant="form" rows={6} label="Загружаем слово…" />
      ) : (
        <>
          <FormSection layout="stacked" title="Слово" divider={false}>
            <FieldPair>
              <TextField
                label="Слово на арабском"
                required
                value={entry.arabic}
                onChange={(e) => p.onChange('arabic', e.target.value)}
                inputProps={arabicInputProps}
              />
              <TextField
                label="Множественное число"
                value={entry.arabicPlural || ''}
                onChange={(e) => p.onChange('arabicPlural', e.target.value)}
                inputProps={arabicInputProps}
                helperText="Оставьте пустым, если множественного числа нет"
              />
            </FieldPair>
            <TextField
              label="Транскрипция"
              value={entry.translit || ''}
              onChange={(e) => p.onChange('translit', e.target.value)}
              helperText="Латиницей или кириллицей, как произносится слово"
            />
          </FormSection>

          <FormSection layout="stacked" title="Перевод">
            <FieldPair>
              <TextField
                label="Перевод (RU)"
                required
                value={entry.translationRu}
                onChange={(e) => p.onChange('translationRu', e.target.value)}
              />
              <TextField
                label="Перевод (KZ)"
                value={entry.translationKz || ''}
                onChange={(e) => p.onChange('translationKz', e.target.value)}
                helperText={entry.translationKz?.trim() ? undefined : 'Без перевода KZ слово показывается на русском'}
              />
            </FieldPair>
            <TextField
              label="Заметка"
              value={entry.noteRu || ''}
              onChange={(e) => p.onChange('noteRu', e.target.value)}
              helperText="Например, блок или тема урока"
            />
            <FormControlLabel
              control={<Switch checked={entry.isActive} onChange={(e) => p.onChange('isActive', e.target.checked)} />}
              label="Показывать в приложении"
            />
          </FormSection>

          <FormSection layout="stacked" title="Аудио произношения">
            <AudioField
              url={entry.audioUrl}
              label={entry.translationRu}
              disabledReason={isEdit ? undefined : 'Сначала сохраните слово — затем загрузите аудио.'}
              onUpload={p.onUploadAudio}
              onDelete={entry.audioUrl ? p.onDeleteAudio : undefined}
            />
          </FormSection>

          {isEdit && (
            <Box component="section" aria-labelledby="examples-title" sx={{ pb: 2 }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1} flexWrap="wrap" sx={{ mb: 1.5, pt: 3, borderTop: 1, borderColor: 'divider' }}>
                <Box>
                  <Typography id="examples-title" variant="subtitle1" component="h3">
                    Примеры ({examples.length})
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Порядок сохраняется сразу после перетаскивания.
                  </Typography>
                </Box>
                <Stack direction="row" gap={1}>
                  {examples.length > 1 && (
                    <Button size="small" onClick={() => p.onReorderExamples()} disabled={p.reorderingExamples}>
                      Сохранить порядок
                    </Button>
                  )}
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={p.addingExample ? <CircularProgress size={14} /> : <Add />}
                    onClick={p.onAddExample}
                    disabled={p.addingExample}
                  >
                    Добавить пример
                  </Button>
                </Stack>
              </Stack>

              {examples.length === 0 ? (
                <EmptyState
                  size="sm"
                  title="Примеров пока нет"
                  description="Пример с переводом помогает запомнить слово в контексте."
                />
              ) : (
                <SortableList
                  items={examples}
                  getId={(ex) => ex.id}
                  disabled={p.reorderingExamples}
                  gap={1.5}
                  onReorder={(next) => p.onReorderExamples(next)}
                  renderItem={(ex, { handle, index, isDragging }) => (
                    <Box
                      sx={{
                        display: 'flex',
                        gap: 1,
                        p: 1.5,
                        pl: 0.5,
                        borderRadius: 3,
                        border: 1,
                        borderColor: isDragging ? 'primary.light' : 'divider',
                        bgcolor: 'background.paper',
                        boxShadow: isDragging ? 4 : 'none',
                      }}
                    >
                      <Stack alignItems="center" gap={0.5} sx={{ pt: 0.5 }}>
                        <DragHandle handle={handle} label={`Перетащить пример ${index + 1}`} />
                        <Typography variant="caption" color="text.secondary" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                          {index + 1}
                        </Typography>
                      </Stack>
                      <Stack gap={1.5} sx={{ flex: 1, minWidth: 0 }}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Предложение на арабском"
                          value={ex.arabicSentence}
                          onChange={(e) => p.onExampleChange(ex.id, 'arabicSentence', e.target.value)}
                          inputProps={arabicInputProps}
                          multiline
                        />
                        <FieldPair>
                          <TextField
                            fullWidth
                            size="small"
                            label="Перевод (RU)"
                            value={ex.translationRu}
                            onChange={(e) => p.onExampleChange(ex.id, 'translationRu', e.target.value)}
                            multiline
                          />
                          <TextField
                            fullWidth
                            size="small"
                            label="Перевод (KZ)"
                            value={ex.translationKz || ''}
                            onChange={(e) => p.onExampleChange(ex.id, 'translationKz', e.target.value)}
                            multiline
                          />
                        </FieldPair>
                        <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
                          <AudioPlayButton src={ex.audioUrl} label={`пример ${index + 1}`} />
                          <AudioUploadButton
                            hasAudio={!!ex.audioUrl}
                            onUpload={(file) => p.onUploadExampleAudio(ex.id, file)}
                          />
                          <Box sx={{ flex: 1 }} />
                          <Button size="small" startIcon={<SaveOutlined />} onClick={() => p.onSaveExample(ex)}>
                            Сохранить пример
                          </Button>
                          <Tooltip title="Удалить пример">
                            <IconButton
                              size="small"
                              aria-label={`Удалить пример ${index + 1}`}
                              onClick={() => p.onDeleteExample(ex)}
                              sx={{ color: 'error.main' }}
                            >
                              <DeleteOutline fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </Stack>
                    </Box>
                  )}
                />
              )}
            </Box>
          )}
        </>
      )}
    </EditorDrawer>
  )
}
