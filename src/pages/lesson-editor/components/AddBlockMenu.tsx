import { useState, type ReactElement } from 'react'
import { Box, Button, ListSubheader, Menu, MenuItem, Typography, type ButtonProps } from '@mui/material'
import { Add } from '@mui/icons-material'
import { cloneElement } from 'react'
import { BLOCK_CATEGORIES, BLOCK_TYPES, CATEGORY_TONE, getBlockTypeInfo } from '../blockTypes'
import type { BlockType } from '../types'

/** Square icon tile for a block type; the tint encodes the category (also named in text nearby). */
export function BlockTypeIcon({ type, size = 28 }: { type: string; size?: number }) {
  const info = getBlockTypeInfo(type)
  const tone = CATEGORY_TONE[info?.category ?? 'content']
  return (
    <Box
      aria-hidden
      sx={{
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: '6px',
        bgcolor: tone.bg,
        color: tone.fg,
        display: 'grid',
        placeItems: 'center',
      }}
    >
      {info ? cloneElement(info.icon as ReactElement, { sx: { fontSize: size * 0.62 } }) : null}
    </Box>
  )
}

/** «Добавить блок» with block types grouped by category. */
export function AddBlockMenu({
  onPick,
  buttonProps,
  label = 'Добавить блок',
}: {
  onPick: (type: BlockType) => void
  buttonProps?: ButtonProps
  label?: string
}) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  return (
    <>
      <Button
        startIcon={<Add />}
        aria-haspopup="menu"
        aria-expanded={!!anchor}
        onClick={(e) => setAnchor(e.currentTarget)}
        {...buttonProps}
      >
        {label}
      </Button>
      <Menu
        anchorEl={anchor}
        open={!!anchor}
        onClose={() => setAnchor(null)}
        MenuListProps={{ 'aria-label': 'Тип нового блока', dense: true }}
        PaperProps={{ sx: { width: 340, maxHeight: 'min(640px, 80vh)' } }}
      >
        {BLOCK_CATEGORIES.flatMap((cat) => [
          <ListSubheader key={`h-${cat.id}`} sx={{ lineHeight: '32px', fontWeight: 600, color: 'text.secondary', bgcolor: 'background.paper' }}>
            {cat.label}
          </ListSubheader>,
          ...BLOCK_TYPES.filter((t) => t.category === cat.id).map((t) => (
            <MenuItem
              key={t.value}
              onClick={() => {
                setAnchor(null)
                onPick(t.value)
              }}
              sx={{ gap: 1.5, alignItems: 'flex-start', py: 0.75, whiteSpace: 'normal' }}
            >
              <BlockTypeIcon type={t.value} />
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {t.label}
                </Typography>
                <Typography variant="caption" color="text.secondary" component="p" sx={{ lineHeight: 1.35 }}>
                  {t.description}
                </Typography>
              </Box>
            </MenuItem>
          )),
        ])}
      </Menu>
    </>
  )
}
