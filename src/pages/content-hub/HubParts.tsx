import { Box, Stack, Tooltip, Typography } from '@mui/material';
import { InfoOutlined } from '@mui/icons-material';
import type { ReactNode } from 'react';
import { color } from '../../theme';
import { StatusChip } from '../../components/ui';
import type { CourseAccessRule } from './accessRules';
import type { LessonAccess } from './types';

/** Wraps the first case-insensitive match of `query` in a <mark>. */
export function Highlight({ text, query }: { text: string; query: string }) {
  const q = query.trim().toLowerCase();
  if (!q) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(q);
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <Box
        component="mark"
        sx={{ bgcolor: 'brand.sand', color: 'inherit', borderRadius: '3px', px: '1px' }}
      >
        {text.slice(idx, idx + q.length)}
      </Box>
      {text.slice(idx + q.length)}
    </>
  );
}

/** Small informational badge: «Бесплатно» / «Premium». */
export function AccessChip({ access }: { access: LessonAccess }) {
  return <StatusChip size="small" status={access === 'premium' ? 'premium' : 'free'} />;
}

/**
 * Proportion bar of free vs premium lessons with a one-line label.
 * Explains the course rule in a tooltip; the backend enforces access.
 */
export function AccessSummary({
  rule,
  free,
  total,
}: {
  rule: CourseAccessRule;
  free: number;
  total: number;
}) {
  const pct = total > 0 ? Math.round((free / total) * 100) : 0;
  return (
    <Tooltip
      title={
        <Box sx={{ py: 0.5 }}>
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>{rule.summary}</Typography>
          <Typography variant="caption" component="p">{rule.details}</Typography>
          <Typography variant="caption" component="p" sx={{ mt: 0.75, opacity: 0.8 }}>
            Подсказка в админке. Доступ проверяет сервер.
          </Typography>
        </Box>
      }
    >
      <Stack spacing={0.5} sx={{ minWidth: 150, cursor: 'help' }} tabIndex={0} aria-label={`${rule.summary}. Бесплатно ${free} из ${total}`}>
        <Stack direction="row" alignItems="center" spacing={0.5}>
          <Typography variant="caption" color="text.secondary" sx={{ fontVariantNumeric: 'tabular-nums' }}>
            Бесплатно {free} из {total}
          </Typography>
          <InfoOutlined sx={{ fontSize: 14, color: 'text.secondary' }} />
        </Stack>
        <Box
          aria-hidden
          sx={{
            height: 6,
            borderRadius: 3,
            overflow: 'hidden',
            display: 'flex',
            bgcolor: total > 0 ? color.gold[300] : color.neutral[100],
          }}
        >
          <Box sx={{ width: `${pct}%`, bgcolor: color.success.light }} />
        </Box>
      </Stack>
    </Tooltip>
  );
}

/** Compact monogram tile with the course code (A1, A2, MAHRAJ…). */
export function CourseMonogram({ code }: { code: string }) {
  const label = (code || '—').toUpperCase().slice(0, 3);
  const short = label.length <= 2;
  return (
    <Box
      aria-hidden
      sx={{
        width: 44,
        height: 44,
        flexShrink: 0,
        borderRadius: 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'brand.sand',
        color: color.bronze[800],
        border: `1px solid ${color.bronze[200]}`,
        fontWeight: 700,
        fontSize: short ? '1rem' : '0.8125rem',
        letterSpacing: 0,
        overflow: 'hidden',
        px: 0.25,
        textAlign: 'center',
        lineHeight: 1,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </Box>
  );
}

/** Muted dot-free meta text joined by commas. */
export function Meta({ children }: { children: ReactNode }) {
  return (
    <Typography variant="body2" color="text.secondary" component="span">
      {children}
    </Typography>
  );
}
