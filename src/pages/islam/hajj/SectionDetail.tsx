import { useState, type ReactNode } from 'react'
import { Box, Button, IconButton, Stack, Tab, Tabs, Tooltip, Typography } from '@mui/material'
import { Add, ChecklistRtlOutlined, DeleteOutline, EditOutlined } from '@mui/icons-material'
import { ArabicText, EmptyState, ErrorState, LoadingState, SectionCard, StatusChip } from '../../../components/ui'
import { AudioPlayButton, AudioUploadButton, Completeness, DragHandle, SortableList } from '../../words/shared'
import { instructionKzDone, type HajjChecklist, type HajjInstruction, type HajjPhrase, type HajjSection, type SectionDetails } from './model'

export type DetailTab = 'instructions' | 'phrases' | 'checklists'

export interface SectionDetailProps {
  section: HajjSection
  details: SectionDetails | undefined
  error: unknown
  reordering: boolean
  onRetry: () => void
  onEditSection: () => void
  onDeleteSection: () => void
  onCreate: (tab: DetailTab) => void
  onEditInstruction: (i: HajjInstruction) => void
  onDeleteInstruction: (i: HajjInstruction) => void
  onEditPhrase: (p: HajjPhrase) => void
  onDeletePhrase: (p: HajjPhrase) => void
  onUploadPhraseAudio: (p: HajjPhrase, file: File) => Promise<unknown>
  onEditChecklist: (c: HajjChecklist) => void
  onDeleteChecklist: (c: HajjChecklist) => void
  onReorder: (tab: DetailTab, next: Array<HajjInstruction | HajjPhrase | HajjChecklist>) => void
}

const ADD_LABEL: Record<DetailTab, string> = {
  instructions: 'Добавить инструкцию',
  phrases: 'Добавить фразу',
  checklists: 'Добавить чек-лист',
}

function ItemShell({
  handle,
  children,
  actions,
  dragging,
  onOpen,
}: {
  handle: ReactNode
  children: ReactNode
  actions: ReactNode
  dragging: boolean
  onOpen: () => void
}) {
  return (
    <Box
      onClick={onOpen}
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 1.25,
        p: 1.25,
        pl: 0.5,
        borderRadius: 3,
        border: 1,
        borderColor: dragging ? 'primary.light' : 'divider',
        bgcolor: 'background.paper',
        boxShadow: dragging ? 4 : 'none',
        cursor: 'pointer',
        transition: 'background-color 120ms',
        '&:hover': { bgcolor: 'brand.bronzeSoft' },
      }}
    >
      <Box sx={{ pt: 0.25 }}>{handle}</Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>{children}</Box>
      <Stack direction="row" alignItems="center" gap={0.5} sx={{ flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
        {actions}
      </Stack>
    </Box>
  )
}

function RowActions({ label, onEdit, onDelete }: { label: string; onEdit: () => void; onDelete: () => void }) {
  return (
    <>
      <Tooltip title="Изменить">
        <IconButton size="small" aria-label={`Изменить: ${label}`} onClick={onEdit}>
          <EditOutlined fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Удалить">
        <IconButton size="small" aria-label={`Удалить: ${label}`} onClick={onDelete} sx={{ color: 'error.main' }}>
          <DeleteOutline fontSize="small" />
        </IconButton>
      </Tooltip>
    </>
  )
}

export function SectionDetail(p: SectionDetailProps) {
  const [tab, setTab] = useState<DetailTab>('instructions')
  const { section, details } = p

  const counts = {
    instructions: details?.instructions.length ?? section.instructionsCount,
    phrases: details?.phrases.length ?? section.phrasesCount,
    checklists: details?.checklists.length ?? section.checklistsCount ?? 0,
  }

  const renderBody = () => {
    if (!details && p.error) return <ErrorState title="Не удалось загрузить раздел" error={p.error} onRetry={p.onRetry} />
    if (!details) return <LoadingState variant="list" rows={4} label="Загружаем раздел…" />

    if (tab === 'instructions') {
      if (!details.instructions.length) {
        return <EmptyState size="sm" title="Инструкций пока нет" description="Инструкция — шаг обряда с описанием, пунктами и предупреждениями." action={<Button variant="contained" startIcon={<Add />} onClick={() => p.onCreate('instructions')}>{ADD_LABEL.instructions}</Button>} />
      }
      return (
        <SortableList
          items={details.instructions}
          getId={(i) => i.id}
          disabled={p.reordering}
          onReorder={(next) => p.onReorder('instructions', next)}
          renderItem={(i, { handle, isDragging }) => {
            const extra = [
              i.items?.length ? `${i.items.length} пунктов` : null,
              i.warningItemsRu?.length ? `предупреждений ${i.warningItemsRu.length}` : null,
              i.successItemsRu?.length ? `разрешено ${i.successItemsRu.length}` : null,
            ].filter(Boolean)
            return (
              <ItemShell
                dragging={isDragging}
                handle={<DragHandle handle={handle} label={`Перетащить инструкцию ${i.titleRu}`} />}
                onOpen={() => p.onEditInstruction(i)}
                actions={<RowActions label={i.titleRu} onEdit={() => p.onEditInstruction(i)} onDelete={() => p.onDeleteInstruction(i)} />}
              >
                <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
                  {i.isHighlight ? (
                    <StatusChip label="Заметка" tone="gold" hideDot />
                  ) : (
                    <StatusChip label={i.stepNumber ? `Шаг ${i.stepNumber}` : 'Без номера'} tone="brand" hideDot />
                  )}
                  {i.badgeRu && <StatusChip label={i.badgeRu} tone="info" hideDot />}
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {i.titleRu}
                  </Typography>
                </Stack>
                {i.descriptionRu && (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 0.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                  >
                    {i.descriptionRu}
                  </Typography>
                )}
                <Stack direction="row" alignItems="center" gap={1.5} flexWrap="wrap" sx={{ mt: 0.75 }}>
                  <Completeness items={[{ label: 'KZ', done: instructionKzDone(i) && !!i.titleKz?.trim() }]} />
                  {extra.length > 0 && (
                    <Typography variant="caption" color="text.secondary">
                      {extra.join(', ')}
                    </Typography>
                  )}
                </Stack>
              </ItemShell>
            )
          }}
        />
      )
    }

    if (tab === 'phrases') {
      if (!details.phrases.length) {
        return <EmptyState size="sm" title="Фраз пока нет" description="Фраза — дуа или зикр на арабском с переводом и аудио." action={<Button variant="contained" startIcon={<Add />} onClick={() => p.onCreate('phrases')}>{ADD_LABEL.phrases}</Button>} />
      }
      return (
        <SortableList
          items={details.phrases}
          getId={(ph) => ph.id}
          disabled={p.reordering}
          onReorder={(next) => p.onReorder('phrases', next)}
          renderItem={(ph, { handle, isDragging }) => {
            const label = ph.titleRu || ph.translationRu
            return (
              <ItemShell
                dragging={isDragging}
                handle={<DragHandle handle={handle} label={`Перетащить фразу ${label}`} />}
                onOpen={() => p.onEditPhrase(ph)}
                actions={
                  <>
                    <AudioPlayButton src={ph.audioUrl} label={label} reserveSpace />
                    <AudioUploadButton variant="icon" hasAudio={!!ph.audioUrl} onUpload={(f) => p.onUploadPhraseAudio(ph, f)} itemLabel={label} />
                    <RowActions label={label} onEdit={() => p.onEditPhrase(ph)} onDelete={() => p.onDeletePhrase(ph)} />
                  </>
                }
              >
                <Box sx={{ display: 'grid', gap: { xs: 1, md: 2.5 }, gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) minmax(0, 1fr)' } }}>
                  <ArabicText size="lg" component="p" sx={{ m: 0, order: { md: 2 } }}>
                    {ph.textAr}
                  </ArabicText>
                  <Box sx={{ order: { md: 1 } }}>
                    {ph.titleRu && (
                      <Typography variant="body1" sx={{ fontWeight: 600 }}>
                        {ph.titleRu}
                      </Typography>
                    )}
                    {ph.transliteration && (
                      <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                        {ph.transliteration}
                      </Typography>
                    )}
                    <Typography variant="body2" sx={{ mt: 0.5 }}>
                      {ph.translationRu}
                    </Typography>
                    <Box sx={{ mt: 0.75 }}>
                      <Completeness
                        items={[
                          { label: 'KZ', done: !!ph.translationKz?.trim() },
                          { label: 'Аудио', done: !!ph.audioUrl },
                        ]}
                      />
                    </Box>
                  </Box>
                </Box>
              </ItemShell>
            )
          }}
        />
      )
    }

    if (!details.checklists.length) {
      return <EmptyState size="sm" title="Чек-листов пока нет" description="Чек-лист — список вещей или дел, которые паломник отмечает в приложении." action={<Button variant="contained" startIcon={<Add />} onClick={() => p.onCreate('checklists')}>{ADD_LABEL.checklists}</Button>} />
    }
    return (
      <SortableList
        items={details.checklists}
        getId={(c) => c.id}
        disabled={p.reordering}
        onReorder={(next) => p.onReorder('checklists', next)}
        renderItem={(c, { handle, isDragging }) => (
          <ItemShell
            dragging={isDragging}
            handle={<DragHandle handle={handle} label={`Перетащить чек-лист ${c.titleRu}`} />}
            onOpen={() => p.onEditChecklist(c)}
            actions={<RowActions label={c.titleRu} onEdit={() => p.onEditChecklist(c)} onDelete={() => p.onDeleteChecklist(c)} />}
          >
            <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
              <Box component="span" aria-hidden sx={{ fontSize: '1.125rem', display: 'flex' }}>
                {c.emoji || <ChecklistRtlOutlined fontSize="small" color="action" />}
              </Box>
              <Typography variant="body1" sx={{ fontWeight: 600 }}>
                {c.titleRu}
              </Typography>
              {!c.isActive && <StatusChip status="inactive" label="Скрыт" />}
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {c.items?.length || 0} пунктов
              {c.items?.length ? `: ${c.items.slice(0, 3).map((it) => it.titleRu).join(', ')}${c.items.length > 3 ? '…' : ''}` : ''}
            </Typography>
            <Box sx={{ mt: 0.75 }}>
              <Completeness
                items={[{ label: 'KZ', done: !!c.titleKz?.trim() && (c.items ?? []).every((it) => !!it.titleKz?.trim()) }]}
              />
            </Box>
          </ItemShell>
        )}
      />
    )
  }

  return (
    <SectionCard
      padding="none"
      title={
        <Stack direction="row" alignItems="center" gap={1} component="span">
          {section.emoji && (
            <Box component="span" aria-hidden>
              {section.emoji}
            </Box>
          )}
          {section.titleRu}
        </Stack>
      }
      description={`Код ${section.code}${section.titleKz ? `, KZ: ${section.titleKz}` : ', нет названия KZ'}${section.isActive ? '' : ', скрыт в приложении'}`}
      actions={
        <>
          <Tooltip title="Изменить раздел">
            <IconButton size="small" aria-label="Изменить раздел" onClick={p.onEditSection}>
              <EditOutlined fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Деактивировать раздел">
            <IconButton size="small" aria-label="Деактивировать раздел" onClick={p.onDeleteSection} sx={{ color: 'error.main' }}>
              <DeleteOutline fontSize="small" />
            </IconButton>
          </Tooltip>
        </>
      }
    >
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        gap={1}
        flexWrap="wrap"
        sx={{ px: 2.5, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tabs value={tab} onChange={(_, v) => setTab(v)} aria-label="Содержимое раздела" variant="scrollable" allowScrollButtonsMobile>
          <Tab value="instructions" label={`Инструкции (${counts.instructions})`} />
          <Tab value="phrases" label={`Фразы (${counts.phrases})`} />
          <Tab value="checklists" label={`Чек-листы (${counts.checklists})`} />
        </Tabs>
        <Button size="small" variant="outlined" startIcon={<Add />} onClick={() => p.onCreate(tab)} sx={{ my: 1 }}>
          {ADD_LABEL[tab]}
        </Button>
      </Stack>
      <Box sx={{ p: 2.5 }}>
        {details && (details[tab] as unknown[]).length > 1 && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Порядок в списке — порядок в приложении. Перетащите за ручку слева, изменения сохраняются сразу.
          </Typography>
        )}
        {renderBody()}
      </Box>
    </SectionCard>
  )
}
