import { Box, Button, Checkbox, FormControlLabel, Stack, Typography } from '@mui/material'
import type { PermissionGroup } from '../../types/admin-permissions'
import { radius } from '../../theme/tokens'

export interface PermissionMatrixProps {
  groups: PermissionGroup[]
  /** Selected permission IDs. */
  selected: Set<string>
  onChange: (next: Set<string>) => void
  disabled?: boolean
}

/**
 * Permission picker grouped by permission group. Each group has a tri-state checkbox
 * (all / some / none); each permission shows its Russian label and the system code.
 */
export function PermissionMatrix({ groups, selected, onChange, disabled }: PermissionMatrixProps) {
  const sorted = [...groups].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0))
  const allIds = sorted.flatMap((g) => g.permissions.map((p) => p.id))
  const selectedCount = allIds.filter((id) => selected.has(id)).length

  const toggle = (id: string) => {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    onChange(next)
  }

  const setGroup = (group: PermissionGroup, on: boolean) => {
    const next = new Set(selected)
    group.permissions.forEach((p) => (on ? next.add(p.id) : next.delete(p.id)))
    onChange(next)
  }

  return (
    <Stack gap={2}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1} flexWrap="wrap">
        <Typography variant="body2" color="text.secondary" aria-live="polite">
          Выбрано {selectedCount} из {allIds.length}
        </Typography>
        <Stack direction="row" gap={0.5}>
          <Button size="small" disabled={disabled || selectedCount === allIds.length} onClick={() => onChange(new Set(allIds))}>
            Выбрать все
          </Button>
          <Button size="small" disabled={disabled || selectedCount === 0} onClick={() => onChange(new Set())}>
            Снять все
          </Button>
        </Stack>
      </Stack>

      {sorted.map((group) => {
        const ids = group.permissions.map((p) => p.id)
        const count = ids.filter((id) => selected.has(id)).length
        const all = ids.length > 0 && count === ids.length
        const some = count > 0 && !all
        return (
          <Box
            key={group.id}
            component="fieldset"
            sx={{ m: 0, p: 0, border: 1, borderColor: 'divider', borderRadius: `${radius.md}px`, overflow: 'hidden', minWidth: 0 }}
          >
            <Stack
              component="legend"
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              sx={{ float: 'left', width: '100%', px: 1, py: 0.5, bgcolor: 'surface.sunken', borderBottom: 1, borderColor: 'divider' }}
            >
              <FormControlLabel
                sx={{ m: 0 }}
                control={
                  <Checkbox
                    checked={all}
                    indeterminate={some}
                    disabled={disabled || ids.length === 0}
                    onChange={(e) => setGroup(group, e.target.checked)}
                    inputProps={{ 'aria-label': `Все права группы «${group.labelRu}»` }}
                  />
                }
                label={<Typography variant="subtitle2">{group.labelRu}</Typography>}
              />
              <Typography variant="caption" color="text.secondary" sx={{ pr: 1, fontVariantNumeric: 'tabular-nums' }}>
                {count} из {ids.length}
              </Typography>
            </Stack>
            <Box
              sx={{
                clear: 'both',
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
                columnGap: 2,
                px: 1,
                py: 0.75,
              }}
            >
              {group.permissions.map((perm) => (
                <FormControlLabel
                  key={perm.id}
                  sx={{ m: 0, alignItems: 'flex-start', py: 0.5 }}
                  control={<Checkbox checked={selected.has(perm.id)} onChange={() => toggle(perm.id)} disabled={disabled} sx={{ mt: -0.5 }} />}
                  label={
                    <Box sx={{ pt: 0.25 }}>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {perm.labelRu}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" component="span" sx={{ display: 'block' }}>
                        {perm.descriptionRu ? `${perm.descriptionRu} ` : ''}
                        <Box component="code" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                          {perm.name}
                        </Box>
                      </Typography>
                    </Box>
                  }
                />
              ))}
            </Box>
          </Box>
        )
      })}
    </Stack>
  )
}
