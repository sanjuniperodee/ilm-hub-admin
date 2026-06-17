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
} from '@mui/material';
import { useNarrowDialogProps, dialogActionsSafeAreaSx } from '../../hooks/useNarrowDialogProps';
import { HubModule } from './types';

export function CreateCourseModal({
  open,
  onClose,
  newCourse,
  setNewCourse,
  onSubmit,
}: any) {
  const narrowFormSm = useNarrowDialogProps('sm');

  return (
    <Dialog open={open} onClose={onClose} {...narrowFormSm}>
      <DialogTitle>Новый курс</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField 
            label="Код (например A1)" 
            value={newCourse.code} 
            onChange={(e) => setNewCourse((p: any) => ({ ...p, code: e.target.value }))} 
          />
          <TextField 
            label="Название (RU)" 
            value={newCourse.titleRu} 
            onChange={(e) => setNewCourse((p: any) => ({ ...p, titleRu: e.target.value }))} 
          />
          <TextField 
            label="Описание (RU)" 
            multiline minRows={3} 
            value={newCourse.descriptionRu} 
            onChange={(e) => setNewCourse((p: any) => ({ ...p, descriptionRu: e.target.value }))} 
          />
          <TextField 
            label="Порядок сортировки" 
            type="number" 
            value={newCourse.orderIndex} 
            onChange={(e) => setNewCourse((p: any) => ({ ...p, orderIndex: Number(e.target.value) || 0 }))} 
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={dialogActionsSafeAreaSx}>
        <Button onClick={onClose} color="inherit">Отмена</Button>
        <Button variant="contained" onClick={onSubmit}>Создать</Button>
      </DialogActions>
    </Dialog>
  );
}

export function CreateModuleModal({
  open,
  onClose,
  newModule,
  setNewModule,
  onSubmit,
}: any) {
  const narrowFormSm = useNarrowDialogProps('sm');

  return (
    <Dialog open={open} onClose={onClose} {...narrowFormSm}>
      <DialogTitle>Новый модуль</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField 
            label="Название (RU)" 
            value={newModule.titleRu} 
            onChange={(e) => setNewModule((p: any) => ({ ...p, titleRu: e.target.value }))} 
          />
          <TextField 
            label="Описание (RU)" 
            multiline minRows={3} 
            value={newModule.descriptionRu} 
            onChange={(e) => setNewModule((p: any) => ({ ...p, descriptionRu: e.target.value }))} 
          />
          <TextField 
            label="Порядок сортировки" 
            type="number" 
            value={newModule.orderIndex} 
            onChange={(e) => setNewModule((p: any) => ({ ...p, orderIndex: Number(e.target.value) || 0 }))} 
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={dialogActionsSafeAreaSx}>
        <Button onClick={onClose} color="inherit">Отмена</Button>
        <Button variant="contained" onClick={onSubmit}>Создать</Button>
      </DialogActions>
    </Dialog>
  );
}

export function CreateLessonModal({
  open,
  onClose,
  newLesson,
  setNewLesson,
  contextModuleId,
  setContextModuleId,
  moduleListForContextCourse,
  onSubmit,
}: any) {
  const narrowFormSm = useNarrowDialogProps('sm');

  return (
    <Dialog open={open} onClose={onClose} {...narrowFormSm}>
      <DialogTitle>Новый урок</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <FormControl fullWidth>
            <InputLabel>Модуль (опционально)</InputLabel>
            <Select
              label="Модуль (опционально)"
              value={contextModuleId}
              onChange={(e) => setContextModuleId(String(e.target.value))}
            >
              <MenuItem value="">Без модуля</MenuItem>
              {moduleListForContextCourse.map((m: HubModule) => (
                <MenuItem key={m.id} value={m.id}>{m.titleRu}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField 
            label="Название (RU)" 
            value={newLesson.titleRu} 
            onChange={(e) => setNewLesson((p: any) => ({ ...p, titleRu: e.target.value }))} 
          />
          <TextField 
            label="Описание (RU)" 
            multiline minRows={3} 
            value={newLesson.descriptionRu} 
            onChange={(e) => setNewLesson((p: any) => ({ ...p, descriptionRu: e.target.value }))} 
          />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField 
              fullWidth 
              label="Порядок" 
              type="number" 
              value={newLesson.orderIndex} 
              onChange={(e) => setNewLesson((p: any) => ({ ...p, orderIndex: Number(e.target.value) || 0 }))} 
            />
            <TextField 
              fullWidth 
              label="Длительность (мин)" 
              type="number" 
              value={newLesson.estimatedMinutes} 
              onChange={(e) => setNewLesson((p: any) => ({ ...p, estimatedMinutes: Number(e.target.value) || 10 }))} 
            />
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions sx={dialogActionsSafeAreaSx}>
        <Button onClick={onClose} color="inherit">Отмена</Button>
        <Button variant="contained" onClick={onSubmit}>Создать</Button>
      </DialogActions>
    </Dialog>
  );
}
