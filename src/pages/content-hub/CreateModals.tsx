import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  TextField,
  Button,
  MenuItem,
  Typography,
  CircularProgress,
  InputAdornment,
} from '@mui/material';
import { useNarrowDialogProps, dialogActionsSafeAreaSx } from '../../hooks/useNarrowDialogProps';
import { HubModule } from './types';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEffect, useMemo, type ReactNode } from 'react';

/* ----------------------------------------------------------------------------
 * Shared dialog frame
 * ------------------------------------------------------------------------- */

function CreateDialog({
  open,
  onClose,
  submitting,
  title,
  context,
  submitLabel,
  onSubmit,
  children,
}: {
  open: boolean;
  onClose: () => void;
  submitting?: boolean;
  title: string;
  context?: ReactNode;
  submitLabel: string;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  children: ReactNode;
}) {
  const narrowFormSm = useNarrowDialogProps('sm');
  return (
    <Dialog open={open} onClose={submitting ? undefined : onClose} {...narrowFormSm} aria-labelledby="create-dialog-title">
      <form onSubmit={onSubmit} noValidate>
        <DialogTitle id="create-dialog-title" sx={{ pb: context ? 0.5 : 2 }}>
          {title}
        </DialogTitle>
        {context && (
          <Typography variant="body2" color="text.secondary" sx={{ px: 3, pb: 1.5 }}>
            {context}
          </Typography>
        )}
        <DialogContent dividers>
          <Stack spacing={2.25} sx={{ py: 0.5 }}>
            {children}
          </Stack>
        </DialogContent>
        <DialogActions sx={dialogActionsSafeAreaSx}>
          <Button variant="outlined" onClick={onClose} disabled={submitting}>
            Отмена
          </Button>
          <Button
            variant="contained"
            type="submit"
            disabled={submitting}
            startIcon={submitting ? <CircularProgress size={14} color="inherit" /> : undefined}
          >
            {submitLabel}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

const intOnChange = (onChange: (v: number) => void) => (e: React.ChangeEvent<HTMLInputElement>) =>
  onChange(parseInt(e.target.value) || 0);

/* ----------------------------------------------------------------------------
 * Course
 * ------------------------------------------------------------------------- */

const courseSchema = z.object({
  code: z.string().trim().min(1, 'Введите код курса').max(10, 'Не длиннее 10 символов'),
  titleRu: z.string().trim().min(1, 'Введите название курса'),
  descriptionRu: z.string().optional(),
  orderIndex: z.number().int(),
});

type CourseFormValues = z.infer<typeof courseSchema>;

const KNOWN_CODES = ['mahraj', 'a1', 'a2', 'tajweed'];

export interface CreateCourseModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CourseFormValues) => void;
  submitting?: boolean;
  /** Codes of existing courses — duplicates are rejected. */
  existingCodes?: string[];
  /** Default «Порядок» (next after the last course). */
  suggestedOrderIndex?: number;
}

export function CreateCourseModal({
  open,
  onClose,
  onSubmit,
  submitting,
  existingCodes = [],
  suggestedOrderIndex = 0,
}: CreateCourseModalProps) {
  const taken = useMemo(() => new Set(existingCodes.map((c) => c.trim().toLowerCase())), [existingCodes]);

  const { control, handleSubmit, reset, watch, setError, formState: { errors } } = useForm<CourseFormValues>({
    resolver: zodResolver(courseSchema),
    defaultValues: { code: '', titleRu: '', descriptionRu: '', orderIndex: suggestedOrderIndex },
  });

  useEffect(() => {
    if (open) reset({ code: '', titleRu: '', descriptionRu: '', orderIndex: suggestedOrderIndex });
  }, [open, reset, suggestedOrderIndex]);

  const code = watch('code') || '';
  const hasUpper = code !== code.toLowerCase();
  const isKnown = KNOWN_CODES.includes(code.trim().toLowerCase());

  const submit = handleSubmit((data) => {
    if (taken.has(data.code.trim().toLowerCase())) {
      setError('code', { message: 'Курс с таким кодом уже есть' });
      return;
    }
    onSubmit(data);
  });

  const codeHelper = errors.code?.message
    ?? (hasUpper
      ? 'Правила доступа и тесты распознают коды в нижнем регистре: a1, a2, mahraj, tajweed.'
      : isKnown
        ? 'Для этого кода действуют правила бесплатных уроков и тесты уровня.'
        : 'Латиница, до 10 символов. Например a1, a2, mahraj, tajweed.');

  return (
    <CreateDialog
      open={open}
      onClose={onClose}
      submitting={submitting}
      title="Новый курс"
      submitLabel="Создать курс"
      onSubmit={submit}
    >
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <Controller name="code" control={control} render={({ field }) => (
          <TextField
            {...field}
            autoFocus
            required
            label="Код"
            error={!!errors.code}
            helperText={codeHelper}
            sx={{ flex: 1 }}
            inputProps={{ autoCapitalize: 'none', spellCheck: false }}
          />
        )} />
        <Controller name="orderIndex" control={control} render={({ field }) => (
          <TextField
            {...field}
            label="Порядок"
            type="number"
            onChange={intOnChange(field.onChange)}
            helperText="Позиция в списке курсов"
            sx={{ width: { xs: '100%', sm: 150 } }}
          />
        )} />
      </Stack>
      <Controller name="titleRu" control={control} render={({ field }) => (
        <TextField {...field} required label="Название (RU)" error={!!errors.titleRu} helperText={errors.titleRu?.message} />
      )} />
      <Controller name="descriptionRu" control={control} render={({ field }) => (
        <TextField {...field} label="Описание (RU)" multiline minRows={3} helperText="Казахскую версию можно добавить в настройках курса." />
      )} />
    </CreateDialog>
  );
}

/* ----------------------------------------------------------------------------
 * Module
 * ------------------------------------------------------------------------- */

const moduleSchema = z.object({
  titleRu: z.string().trim().min(1, 'Введите название модуля'),
  descriptionRu: z.string().optional(),
  orderIndex: z.number().int(),
});

type ModuleFormValues = z.infer<typeof moduleSchema>;

export interface CreateModuleModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: ModuleFormValues) => void;
  submitting?: boolean;
  courseTitle?: string;
  suggestedOrderIndex?: number;
}

export function CreateModuleModal({
  open,
  onClose,
  onSubmit,
  submitting,
  courseTitle,
  suggestedOrderIndex = 0,
}: CreateModuleModalProps) {
  const { control, handleSubmit, reset, formState: { errors } } = useForm<ModuleFormValues>({
    resolver: zodResolver(moduleSchema),
    defaultValues: { titleRu: '', descriptionRu: '', orderIndex: suggestedOrderIndex },
  });

  useEffect(() => {
    if (open) reset({ titleRu: '', descriptionRu: '', orderIndex: suggestedOrderIndex });
  }, [open, reset, suggestedOrderIndex]);

  return (
    <CreateDialog
      open={open}
      onClose={onClose}
      submitting={submitting}
      title="Новый модуль"
      context={courseTitle ? `Курс «${courseTitle}»` : undefined}
      submitLabel="Создать модуль"
      onSubmit={handleSubmit(onSubmit)}
    >
      <Controller name="titleRu" control={control} render={({ field }) => (
        <TextField {...field} autoFocus required label="Название (RU)" error={!!errors.titleRu} helperText={errors.titleRu?.message} />
      )} />
      <Controller name="descriptionRu" control={control} render={({ field }) => (
        <TextField {...field} label="Описание (RU)" multiline minRows={3} />
      )} />
      <Controller name="orderIndex" control={control} render={({ field }) => (
        <TextField
          {...field}
          label="Порядок"
          type="number"
          onChange={intOnChange(field.onChange)}
          helperText="Порядок можно поменять перетаскиванием в списке модулей."
          sx={{ maxWidth: { sm: 260 } }}
        />
      )} />
    </CreateDialog>
  );
}

/* ----------------------------------------------------------------------------
 * Lesson
 * ------------------------------------------------------------------------- */

const lessonSchema = z.object({
  moduleId: z.string().optional(),
  titleRu: z.string().trim().min(1, 'Введите название урока'),
  descriptionRu: z.string().optional(),
  orderIndex: z.number().int(),
  estimatedMinutes: z.number().int().min(1, 'Минимум 1 минута'),
});

type LessonFormValues = z.infer<typeof lessonSchema>;

export interface CreateLessonModalProps {
  open: boolean;
  onClose: () => void;
  contextModuleId?: string;
  moduleListForContextCourse: HubModule[];
  onSubmit: (data: LessonFormValues) => void;
  submitting?: boolean;
  courseTitle?: string;
  /** Next free «Порядок» for the given module ('' = lessons outside modules). */
  suggestOrderIndex?: (moduleId: string) => number;
}

export function CreateLessonModal({
  open,
  onClose,
  contextModuleId,
  moduleListForContextCourse,
  onSubmit,
  submitting,
  courseTitle,
  suggestOrderIndex,
}: CreateLessonModalProps) {
  const { control, handleSubmit, reset, setValue, getFieldState, formState: { errors } } = useForm<LessonFormValues>({
    resolver: zodResolver(lessonSchema),
    defaultValues: { moduleId: '', titleRu: '', descriptionRu: '', orderIndex: 0, estimatedMinutes: 10 },
  });

  useEffect(() => {
    if (open) {
      const mid = contextModuleId || '';
      reset({
        moduleId: mid,
        titleRu: '',
        descriptionRu: '',
        orderIndex: suggestOrderIndex ? suggestOrderIndex(mid) : 0,
        estimatedMinutes: 10,
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only when the dialog opens for a new context
  }, [open, contextModuleId, reset]);

  return (
    <CreateDialog
      open={open}
      onClose={onClose}
      submitting={submitting}
      title="Новый урок"
      context={courseTitle ? `Курс «${courseTitle}»` : undefined}
      submitLabel="Создать урок"
      onSubmit={handleSubmit(onSubmit)}
    >
      <Controller name="moduleId" control={control} render={({ field }) => (
        <TextField
          select
          label="Модуль"
          value={field.value ?? ''}
          onChange={(e) => {
            field.onChange(e.target.value);
            if (suggestOrderIndex && !getFieldState('orderIndex').isDirty) {
              setValue('orderIndex', suggestOrderIndex(e.target.value));
            }
          }}
          onBlur={field.onBlur}
          inputRef={field.ref}
          error={!!errors.moduleId}
          helperText={errors.moduleId?.message ?? 'Урок вне модуля показывается в начале курса.'}
        >
          <MenuItem value="">Без модуля</MenuItem>
          {moduleListForContextCourse.map((m: HubModule, i: number) => (
            <MenuItem key={m.id} value={m.id}>{i + 1}. {m.titleRu}</MenuItem>
          ))}
        </TextField>
      )} />
      <Controller name="titleRu" control={control} render={({ field }) => (
        <TextField {...field} autoFocus required label="Название (RU)" error={!!errors.titleRu} helperText={errors.titleRu?.message} />
      )} />
      <Controller name="descriptionRu" control={control} render={({ field }) => (
        <TextField {...field} label="Описание (RU)" multiline minRows={3} />
      )} />
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <Controller name="orderIndex" control={control} render={({ field }) => (
          <TextField fullWidth {...field} label="Порядок" type="number" onChange={intOnChange(field.onChange)} />
        )} />
        <Controller name="estimatedMinutes" control={control} render={({ field }) => (
          <TextField
            fullWidth
            {...field}
            label="Длительность"
            type="number"
            error={!!errors.estimatedMinutes}
            helperText={errors.estimatedMinutes?.message}
            onChange={intOnChange(field.onChange)}
            InputProps={{ endAdornment: <InputAdornment position="end">мин</InputAdornment> }}
          />
        )} />
      </Stack>
    </CreateDialog>
  );
}
