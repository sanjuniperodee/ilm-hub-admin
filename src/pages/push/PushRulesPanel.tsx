import { useEffect, useState } from 'react'
import {
  Box,
  Button,
  FormControlLabel,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import type { PushRuleSet, PushScenario, PushSegment } from '../../api/adminApi'
import { EmptyState, SectionCard } from '../../components/ui'
import { CommitTextField } from './CommitTextField'
import { formatWindows, parseWindows, pushTypeLabels, segmentDescriptions, segmentLabels } from './pushLabels'
import type { PushRulesState } from './usePushRules'

type Policy = PushRuleSet['policies'][number]

function PolicyEditor({ policy, saving, onSave }: { policy: Policy; saving: boolean; onSave: (p: Policy) => Promise<boolean> }) {
  const [draft, setDraft] = useState<Policy>(policy)
  const serverKey = JSON.stringify(policy)
  useEffect(() => setDraft(JSON.parse(serverKey) as Policy), [serverKey])
  const dirty = JSON.stringify(draft) !== serverKey
  const set = <K extends keyof Policy>(key: K, value: Policy[K]) => setDraft((d) => ({ ...d, [key]: value }))

  return (
    <Box sx={{ px: 2.5, pt: 0.5, pb: 2.5, borderBottom: 1, borderColor: 'divider' }}>
      <Typography variant="subtitle2" component="h3" sx={{ mb: 1.5 }}>
        Ограничения сегмента
      </Typography>
      <Stack direction="row" gap={1.5} flexWrap="wrap" alignItems="flex-start">
        <TextField
          type="number"
          size="small"
          label="Не больше в день"
          value={draft.dailyLimit}
          onChange={(e) => set('dailyLimit', Number(e.target.value))}
          sx={{ width: 150 }}
          inputProps={{ min: 0 }}
        />
        <TextField
          type="number"
          size="small"
          label="Интервал, мин"
          value={draft.minIntervalMinutes}
          onChange={(e) => set('minIntervalMinutes', Number(e.target.value))}
          sx={{ width: 140 }}
          inputProps={{ min: 0 }}
        />
        <TextField
          size="small"
          label="Тишина с"
          value={draft.quietStart}
          onChange={(e) => set('quietStart', e.target.value)}
          placeholder="22:00"
          sx={{ width: 110 }}
        />
        <TextField
          size="small"
          label="Тишина до"
          value={draft.quietEnd}
          onChange={(e) => set('quietEnd', e.target.value)}
          placeholder="08:00"
          sx={{ width: 110 }}
        />
        <FormControlLabel
          control={<Switch checked={draft.suppressOnSameDayActivity} onChange={(e) => set('suppressOnSameDayActivity', e.target.checked)} />}
          label="Не слать тем, кто сегодня занимался"
          sx={{ mr: 0, minHeight: 40 }}
        />
        <Box sx={{ flex: 1 }} />
        <Stack direction="row" gap={1} sx={{ minHeight: 40 }} alignItems="center">
          {dirty && (
            <Button size="small" onClick={() => setDraft(JSON.parse(serverKey) as Policy)} disabled={saving}>
              Отменить
            </Button>
          )}
          <Button variant="outlined" size="small" onClick={() => onSave(draft)} disabled={saving || !dirty}>
            Сохранить ограничения
          </Button>
        </Stack>
      </Stack>
    </Box>
  )
}

function ScenarioTable({
  scenarios,
  rules,
  onOpenTexts,
}: {
  scenarios: PushScenario[]
  rules: PushRulesState
  onOpenTexts: (key: string) => void
}) {
  const { updateScenario } = rules
  if (scenarios.length === 0) {
    return <EmptyState size="sm" title="Сценариев для сегмента нет" />
  }
  const numberOrNull = (v: string) => (v ? Number(v) : null)
  return (
    <TableContainer sx={{ border: 'none', borderRadius: 0 }}>
      <Table size="small" aria-label="Сценарии сегмента">
        <TableHead>
          <TableRow>
            <TableCell sx={{ width: 64 }}>Вкл.</TableCell>
            <TableCell sx={{ minWidth: 190 }}>Сценарий</TableCell>
            <TableCell sx={{ width: 90 }}>Приоритет</TableCell>
            <TableCell sx={{ minWidth: 150 }}>Окна отправки</TableCell>
            <TableCell sx={{ minWidth: 150 }}>Лимит в неделю / день</TableCell>
            <TableCell sx={{ width: 120 }}>Только с напоминаниями</TableCell>
            <TableCell sx={{ minWidth: 120 }}>Экран</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {scenarios.map((scenario) => {
            const activeTexts = scenario.templates.filter((t) => t.isActive).length
            const label = pushTypeLabels[scenario.key] || scenario.key
            return (
              <TableRow key={scenario.id} sx={{ opacity: scenario.enabled ? 1 : 0.72 }}>
                <TableCell>
                  <Switch
                    checked={scenario.enabled}
                    onChange={(e) => updateScenario(scenario, { enabled: e.target.checked })}
                    inputProps={{ 'aria-label': `Включить сценарий «${label}»` }}
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {label}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" component="div">
                    Триггер: {scenario.triggerType}
                  </Typography>
                  <Button
                    size="small"
                    onClick={() => onOpenTexts(scenario.key)}
                    sx={{ ml: -1, mt: 0.25, minHeight: 0, py: 0.25, color: activeTexts === 0 && scenario.enabled ? 'error.main' : 'primary.main' }}
                  >
                    Тексты: {activeTexts} из {scenario.templates.length}
                  </Button>
                </TableCell>
                <TableCell>
                  <CommitTextField
                    type="number"
                    size="small"
                    value={String(scenario.priority)}
                    onCommit={(v) => updateScenario(scenario, { priority: Number(v) })}
                    inputProps={{ 'aria-label': `Приоритет сценария «${label}»` }}
                    sx={{ width: 72 }}
                  />
                </TableCell>
                <TableCell>
                  <CommitTextField
                    size="small"
                    placeholder="19:00-21:00"
                    value={formatWindows(scenario.allowedWindows)}
                    onCommit={(v) => updateScenario(scenario, { allowedWindows: parseWindows(v) })}
                    inputProps={{ 'aria-label': `Окна отправки сценария «${label}»` }}
                    sx={{ minWidth: 140 }}
                  />
                </TableCell>
                <TableCell>
                  <Stack direction="row" gap={1}>
                    <CommitTextField
                      type="number"
                      size="small"
                      placeholder="—"
                      value={scenario.maxPerWeek == null ? '' : String(scenario.maxPerWeek)}
                      onCommit={(v) => updateScenario(scenario, { maxPerWeek: numberOrNull(v) })}
                      inputProps={{ 'aria-label': `Не больше в неделю, «${label}»` }}
                      sx={{ width: 64 }}
                    />
                    <CommitTextField
                      type="number"
                      size="small"
                      placeholder="—"
                      value={scenario.maxPerDay == null ? '' : String(scenario.maxPerDay)}
                      onCommit={(v) => updateScenario(scenario, { maxPerDay: numberOrNull(v) })}
                      inputProps={{ 'aria-label': `Не больше в день, «${label}»` }}
                      sx={{ width: 64 }}
                    />
                  </Stack>
                </TableCell>
                <TableCell>
                  <Switch
                    checked={scenario.requiresStudyReminders}
                    onChange={(e) => updateScenario(scenario, { requiresStudyReminders: e.target.checked })}
                    inputProps={{ 'aria-label': `Только пользователям с включёнными напоминаниями, «${label}»` }}
                  />
                </TableCell>
                <TableCell>
                  <CommitTextField
                    size="small"
                    value={scenario.route}
                    onCommit={(v) => updateScenario(scenario, { route: v })}
                    inputProps={{ 'aria-label': `Экран сценария «${label}»` }}
                    sx={{ minWidth: 110 }}
                  />
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </TableContainer>
  )
}

export function PushRulesPanel({ rules, onOpenTexts }: { rules: PushRulesState; onOpenTexts: (key: string) => void }) {
  const { ruleSet, savePolicy, savingRules } = rules
  if (!ruleSet) return null
  const segmentsInUse: Exclude<PushSegment, 'all'>[] = ['free', 'paid_no_plan', 'paid_with_plan']

  return (
    <Stack gap={3}>
      {segmentsInUse.map((segment) => {
        const policy = ruleSet.policies.find((p) => p.segment === segment)
        const scenarios = ruleSet.scenarios.filter((s) => s.segment === segment)
        if (!policy && scenarios.length === 0) return null
        const enabled = scenarios.filter((s) => s.enabled).length
        return (
          <SectionCard
            key={segment}
            title={segmentLabels[segment]}
            description={`${segmentDescriptions[segment]}. Включено сценариев: ${enabled} из ${scenarios.length}.`}
            padding="none"
          >
            {policy && <PolicyEditor policy={policy} saving={savingRules} onSave={savePolicy} />}
            <ScenarioTable scenarios={scenarios} rules={rules} onOpenTexts={onOpenTexts} />
          </SectionCard>
        )
      })}
      {/* Policies or scenarios for segments outside the known list (future-proofing) */}
      {ruleSet.policies
        .filter((p) => !segmentsInUse.includes(p.segment))
        .map((policy) => (
          <SectionCard key={policy.id} title={policy.segment} padding="none">
            <PolicyEditor policy={policy} saving={savingRules} onSave={savePolicy} />
          </SectionCard>
        ))}
    </Stack>
  )
}
