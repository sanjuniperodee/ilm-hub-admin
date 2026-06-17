import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
} from '@mui/material';
import { useNarrowDialogProps, dialogActionsSafeAreaSx } from '../../hooks/useNarrowDialogProps';
import { HubModule } from './types';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEffect } from 'react';

// Zod schemas
const courseSchema = z.object({
  code: z.string().min(1, 'Код обязателен').max(10, 'Слишком длинный код'),
  titleRu: z.string().min(1, 'Название обязательно'),
  descriptionRu: z.string().optional(),
  orderIndex: z.number().int(),
});

type CourseFormValues = z.infer<typeof courseSchema>;

export function CreateCourseModal({
  open,
  onClose,
  onSubmit,
}: any) {
  const narrowFormSm = useNarrowDialogProps('sm');

  const { control, handleSubmit, reset, formState: { errors } } = useForm<CourseFormValues>({
    resolver: zodResolver(courseSchema),
    defaultValues: { code: '', titleRu: '', descriptionRu: '', orderIndex: 0 }
  });

  useEffect(() => {
    if (open) reset({ code: '', titleRu: '', descriptionRu: '', orderIndex: 0 });
  }, [open, reset]);

  return (
    <Dialog open={open} onClose={onClose} {...narrowFormSm}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogTitle>Новый курс</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Controller name="code" control={control} render={({ field }) => (
              <TextField {...field} label="Код (например A1)" error={!!errors.code} helperText={errors.code?.message} />
            )} />
            <Controller name="titleRu" control={control} render={({ field }) => (
              <TextField {...field} label="Название (RU)" error={!!errors.titleRu} helperText={errors.titleRu?.message} />
            )} />
            <Controller name="descriptionRu" control={control} render={({ field }) => (
              <TextField {...field} label="Описание (RU)" multiline minRows={3} />
            )} />
            <Controller name="orderIndex" control={control} render={({ field }) => (
              <TextField {...field} label="Порядок сортировки" type="number" onChange={e => field.onChange(parseInt(e.target.value) || 0)} />
            )} />
          </Stack>
        </DialogContent>
        <DialogActions sx={dialogActionsSafeAreaSx}>
          <Button onClick={onClose} color="inherit">Отмена</Button>
          <Button variant="contained" type="submit">Создать</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

const moduleSchema = z.object({
  titleRu: z.string().min(1, 'Название обязательно'),
  descriptionRu: z.string().optional(),
  orderIndex: z.number().int(),
});

type ModuleFormValues = z.infer<typeof moduleSchema>;

export function CreateModuleModal({
  open,
  onClose,
  onSubmit,
}: any) {
  const narrowFormSm = useNarrowDialogProps('sm');

  const { control, handleSubmit, reset, formState: { errors } } = useForm<ModuleFormValues>({
    resolver: zodResolver(moduleSchema),
    defaultValues: { titleRu: '', descriptionRu: '', orderIndex: 0 }
  });

  useEffect(() => {
    if (open) reset({ titleRu: '', descriptionRu: '', orderIndex: 0 });
  }, [open, reset]);

  return (
    <Dialog open={open} onClose={onClose} {...narrowFormSm}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogTitle>Новый модуль</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Controller name="titleRu" control={control} render={({ field }) => (
              <TextField {...field} label="Название (RU)" error={!!errors.titleRu} helperText={errors.titleRu?.message} />
            )} />
            <Controller name="descriptionRu" control={control} render={({ field }) => (
              <TextField {...field} label="Описание (RU)" multiline minRows={3} />
            )} />
            <Controller name="orderIndex" control={control} render={({ field }) => (
              <TextField {...field} label="Порядок сортировки" type="number" onChange={e => field.onChange(parseInt(e.target.value) || 0)} />
            )} />
          </Stack>
        </DialogContent>
        <DialogActions sx={dialogActionsSafeAreaSx}>
          <Button onClick={onClose} color="inherit">Отмена</Button>
          <Button variant="contained" type="submit">Создать</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

const lessonSchema = z.object({
  moduleId: z.string().optional(),
  titleRu: z.string().min(1, 'Название обязательно'),
  descriptionRu: z.string().optional(),
  orderIndex: z.number().int(),
  estimatedMinutes: z.number().int().min(1, 'Минимум 1 минута'),
});

type LessonFormValues = z.infer<typeof lessonSchema>;

export function CreateLessonModal({
  open,
  onClose,
  contextModuleId,
  moduleListForContextCourse,
  onSubmit,
}: any) {
  const narrowFormSm = useNarrowDialogProps('sm');

  const { control, handleSubmit, reset, formState: { errors } } = useForm<LessonFormValues>({
    resolver: zodResolver(lessonSchema),
    defaultValues: { moduleId: '', titleRu: '', descriptionRu: '', orderIndex: 0, estimatedMinutes: 10 }
  });

  useEffect(() => {
    if (open) reset({ moduleId: contextModuleId || '', titleRu: '', descriptionRu: '', orderIndex: 0, estimatedMinutes: 10 });
  }, [open, contextModuleId, reset]);

  return (
    <Dialog open={open} onClose={onClose} {...narrowFormSm}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogTitle>Новый урок</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Controller name="moduleId" control={control} render={({ field }) => (
              <FormControl fullWidth error={!!errors.moduleId}>
                <InputLabel>Модуль (опционально)</InputLabel>
                <Select {...field} label="Модуль (опционально)">
                  <MenuItem value="">Без модуля</MenuItem>
                  {moduleListForContextCourse.map((m: HubModule) => (
                    <MenuItem key={m.id} value={m.id}>{m.titleRu}</MenuItem>
                  ))}
                </Select>
                {errors.moduleId && <FormHelperText>{errors.moduleId.message}</FormHelperText>}
              </FormControl>
            )} />
            <Controller name="titleRu" control={control} render={({ field }) => (
              <TextField {...field} label="Название (RU)" error={!!errors.titleRu} helperText={errors.titleRu?.message} />
            )} />
            <Controller name="descriptionRu" control={control} render={({ field }) => (
              <TextField {...field} label="Описание (RU)" multiline minRows={3} />
            )} />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Controller name="orderIndex" control={control} render={({ field }) => (
                <TextField fullWidth {...field} label="Порядок" type="number" onChange={e => field.onChange(parseInt(e.target.value) || 0)} />
              )} />
              <Controller name="estimatedMinutes" control={control} render={({ field }) => (
                <TextField fullWidth {...field} label="Длительность (мин)" type="number" error={!!errors.estimatedMinutes} helperText={errors.estimatedMinutes?.message} onChange={e => field.onChange(parseInt(e.target.value) || 0)} />
              )} />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions sx={dialogActionsSafeAreaSx}>
          <Button onClick={onClose} color="inherit">Отмена</Button>
          <Button variant="contained" type="submit">Создать</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
