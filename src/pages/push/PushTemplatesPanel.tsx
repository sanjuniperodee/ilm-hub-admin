import { useState } from 'react'
import {
  Box,
  Button,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  ListSubheader,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { AddOutlined, DeleteOutline } from '@mui/icons-material'
import type { PushSegment } from '../../api/adminApi'
import { EmptyState, SectionCard, StatusChip, useConfirm } from '../../components/ui'
import { color, radius } from '../../theme/tokens'
import { CommitTextField } from './CommitTextField'
import { pushTypeLabels, segmentLabels } from './pushLabels'
import type { PushRulesState } from './usePushRules'

export function PushTemplatesPanel({ rules }: { rules: PushRulesState }) {
  const { ruleSet, selectedScenarioKey, setSelectedScenarioKey, selectedScenario, updateTemplate, createTemplate, deleteTemplate, savingRules } = rules
  const confirm = useConfirm()
  const [newTemplateTitle, setNewTemplateTitle] = useState('ILM HUB')
  const [newTemplateBody, setNewTemplateBody] = useState('')

  if (!ruleSet) return null

  const groups = (['free', 'paid_no_plan', 'paid_with_plan'] as Exclude<PushSegment, 'all'>[])
    .map((segment) => ({ segment, scenarios: ruleSet.scenarios.filter((s) => s.segment === segment) }))
    .filter((g) => g.scenarios.length > 0)
  const known = new Set(groups.flatMap((g) => g.scenarios.map((s) => s.key)))
  const other = ruleSet.scenarios.filter((s) => !known.has(s.key))

  const handleCreate = async () => {
    const ok = await createTemplate(newTemplateTitle, newTemplateBody)
    if (ok) {
      setNewTemplateBody('')
      setNewTemplateTitle('ILM HUB')
    }
  }

  const handleDelete = async (templateId: string, title: string) => {
    const ok = await confirm({
      title: 'Удалить текст?',
      description: `Текст «${title || 'без заголовка'}» исчезнет из черновика. В рассылках он перестанет использоваться после публикации.`,
      confirmLabel: 'Удалить текст',
      destructive: true,
    })
    if (ok) await deleteTemplate(templateId)
  }

  const scenarioLabel = selectedScenario ? pushTypeLabels[selectedScenario.key] || selectedScenario.key : ''

  return (
    <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', md: '280px minmax(0, 1fr)' }, alignItems: 'start' }}>
      <SectionCard padding="none" sx={{ position: { md: 'sticky' }, top: { md: 80 } }}>
        <List dense aria-label="Сценарии" sx={{ py: 0, maxHeight: { md: 'calc(100vh - 140px)' }, overflowY: 'auto' }}>
          {[...groups, ...(other.length ? [{ segment: null, scenarios: other }] : [])].map((g) => (
            <li key={g.segment ?? 'other'}>
              <ul style={{ padding: 0 }}>
                <ListSubheader sx={{ bgcolor: 'surface.sunken', lineHeight: '32px', fontWeight: 600, color: 'text.secondary', borderBottom: 1, borderColor: 'divider' }}>
                  {g.segment ? segmentLabels[g.segment] : 'Другие'}
                </ListSubheader>
                {g.scenarios.map((s) => {
                  const active = s.templates.filter((t) => t.isActive).length
                  return (
                    <ListItemButton
                      key={s.key}
                      selected={s.key === selectedScenarioKey}
                      onClick={() => setSelectedScenarioKey(s.key)}
                      sx={{ py: 0.75 }}
                    >
                      <ListItemText
                        primary={pushTypeLabels[s.key] || s.key}
                        secondary={`Активных текстов: ${active} из ${s.templates.length}${s.enabled ? '' : '. Сценарий выключен'}`}
                        primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                        secondaryTypographyProps={{ variant: 'caption', color: active === 0 && s.enabled ? 'error.main' : 'text.secondary' }}
                      />
                    </ListItemButton>
                  )
                })}
              </ul>
            </li>
          ))}
        </List>
      </SectionCard>

      {selectedScenario ? (
        <SectionCard
          title={`Тексты: ${scenarioLabel}`}
          description="Приложение выбирает один из активных текстов случайно. Изменения сохраняются при выходе из поля."
          actions={<StatusChip status={selectedScenario.enabled ? 'active' : 'inactive'} label={selectedScenario.enabled ? 'Сценарий включён' : 'Сценарий выключен'} />}
        >
          <Stack gap={1.5}>
            {selectedScenario.templates.length === 0 && (
              <EmptyState size="sm" title="Текстов пока нет" description="Добавьте хотя бы один текст, иначе сценарий не сможет отправлять push." />
            )}
            {selectedScenario.templates.map((template) => (
              <Stack
                key={template.id}
                direction={{ xs: 'column', md: 'row' }}
                gap={1.5}
                alignItems={{ md: 'flex-start' }}
                sx={{
                  p: 1.5,
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: `${radius.md}px`,
                  bgcolor: template.isActive ? 'background.paper' : 'surface.sunken',
                }}
              >
                <Tooltip title={template.isActive ? 'Текст используется' : 'Текст выключен'}>
                  <Switch
                    checked={template.isActive}
                    onChange={(e) => updateTemplate(template.id, { isActive: e.target.checked })}
                    inputProps={{ 'aria-label': template.isActive ? 'Выключить текст' : 'Включить текст' }}
                  />
                </Tooltip>
                <CommitTextField
                  size="small"
                  label="Заголовок"
                  value={template.title}
                  onCommit={(v) => updateTemplate(template.id, { title: v })}
                  sx={{ minWidth: 180 }}
                />
                <CommitTextField
                  size="small"
                  label="Текст"
                  value={template.body}
                  multiline
                  fullWidth
                  onCommit={(v) => updateTemplate(template.id, { body: v })}
                />
                <Tooltip title="Удалить текст">
                  <span>
                    <IconButton
                      aria-label="Удалить текст"
                      onClick={() => handleDelete(template.id, template.title)}
                      disabled={savingRules}
                      sx={{ color: 'error.main' }}
                    >
                      <DeleteOutline />
                    </IconButton>
                  </span>
                </Tooltip>
              </Stack>
            ))}

            <Box sx={{ mt: 1.5, p: 2, borderRadius: `${radius.md}px`, bgcolor: color.bronze[50], border: 1, borderColor: color.bronze[100] }}>
              <Typography variant="subtitle2" component="h3" sx={{ mb: 1.5 }}>
                Новый текст
              </Typography>
              <Stack direction={{ xs: 'column', md: 'row' }} gap={1.5} alignItems={{ md: 'flex-start' }}>
                <TextField size="small" label="Заголовок" value={newTemplateTitle} onChange={(e) => setNewTemplateTitle(e.target.value)} sx={{ minWidth: 180, bgcolor: 'background.paper' }} />
                <TextField
                  size="small"
                  label="Текст"
                  value={newTemplateBody}
                  onChange={(e) => setNewTemplateBody(e.target.value)}
                  fullWidth
                  multiline
                  minRows={2}
                  sx={{ bgcolor: 'background.paper' }}
                />
                <Button variant="contained" startIcon={<AddOutlined />} onClick={handleCreate} disabled={!newTemplateBody.trim() || savingRules} sx={{ flexShrink: 0 }}>
                  Добавить текст
                </Button>
              </Stack>
            </Box>
          </Stack>
        </SectionCard>
      ) : (
        <SectionCard>
          <EmptyState size="sm" title="Выберите сценарий" description="Слева список сценариев по сегментам." />
        </SectionCard>
      )}
    </Box>
  )
}
