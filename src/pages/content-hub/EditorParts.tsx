import { useEffect, useRef, useState } from 'react';
import { Box, Stack, TextField, Typography } from '@mui/material';
import { BrokenImageOutlined, ImageOutlined } from '@mui/icons-material';
import { StatusChip } from '../../components/ui';

export interface LangField {
  label: string;
  value: string;
}

/** «RU 2/2», «KZ 1/2» — how complete each language is. */
export function LanguageCompleteness({ langs }: { langs: { code: string; fields: string[] }[] }) {
  return (
    <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
      {langs.map(({ code, fields }) => {
        const filled = fields.filter((f) => f.trim().length > 0).length;
        const complete = filled === fields.length;
        return (
          <StatusChip
            key={code}
            size="small"
            tone={complete ? 'success' : filled === 0 ? 'neutral' : 'warning'}
            label={`${code} ${filled}/${fields.length}`}
          />
        );
      })}
    </Stack>
  );
}

/** Column heading for side-by-side language fields. */
export function LangColumnTitle({ code, name, filled, total }: { code: string; name: string; filled: number; total: number }) {
  return (
    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
      <Typography variant="subtitle2">
        {name} <Typography component="span" variant="caption" color="text.secondary">({code})</Typography>
      </Typography>
      <Typography variant="caption" color={filled === total ? 'success.dark' : 'text.secondary'} sx={{ fontVariantNumeric: 'tabular-nums' }}>
        Заполнено {filled} из {total}
      </Typography>
    </Stack>
  );
}

/** URL text field with a live image preview. */
export function ImageUrlField({
  label,
  value,
  onChange,
  helperText,
  aspect = '1 / 1',
  previewWidth = 72,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  helperText?: string;
  aspect?: string;
  previewWidth?: number;
}) {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [value]);
  const url = value.trim();

  return (
    <Stack direction="row" spacing={1.5} alignItems="flex-start">
      <Box
        sx={{
          width: previewWidth,
          aspectRatio: aspect,
          flexShrink: 0,
          borderRadius: 1.5,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'surface.sunken',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'text.secondary',
        }}
      >
        {url && !broken ? (
          <Box
            component="img"
            src={url}
            alt=""
            onError={() => setBroken(true)}
            sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : url && broken ? (
          <BrokenImageOutlined fontSize="small" aria-label="Изображение не загрузилось" />
        ) : (
          <ImageOutlined fontSize="small" aria-hidden />
        )}
      </Box>
      <TextField
        fullWidth
        label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        error={!!url && broken}
        helperText={url && broken ? 'Изображение по этой ссылке не загрузилось. Проверьте адрес.' : helperText}
        inputProps={{ spellCheck: false }}
      />
    </Stack>
  );
}

/** Calls `onSave` on ⌘S / Ctrl+S while `enabled`. */
export function useSaveShortcut(onSave: () => void, enabled: boolean) {
  const ref = useRef(onSave);
  ref.current = onSave;
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        ref.current();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enabled]);
}
