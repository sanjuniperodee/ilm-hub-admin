import { Stack, Typography, IconButton, Tooltip, Collapse, Box, useTheme, alpha } from '@mui/material';
import { MenuBookOutlined, Edit as EditIcon, QuizOutlined, Add, KeyboardArrowUp, KeyboardArrowDown, DragIndicator } from '@mui/icons-material';
import { useSortable } from '@dnd-kit/sortable';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { HubModule, HubLesson } from './types';
import { LessonItem } from './LessonItem';

interface ModuleItemProps {
  module: HubModule;
  courseId: string;
  expanded: boolean;
  toggleModule: (id: string) => void;
  openModuleEdit: (cid: string, mid: string) => void;
  openModuleTest: (cid: string, mid: string) => void;
  onAddLesson: (cid: string, mid: string) => void;
  moduleLessons: HubLesson[];
  navigate: (path: string) => void;
  onRequestDeleteLesson: (lesson: HubLesson) => void;
  deletingLessonId: string | null;
  isLast: boolean;
}

export function ModuleItem({
  module,
  courseId,
  expanded,
  toggleModule,
  openModuleEdit,
  openModuleTest,
  onAddLesson,
  moduleLessons,
  navigate,
  onRequestDeleteLesson,
  deletingLessonId,
  isLast,
}: ModuleItemProps) {
  const theme = useTheme();

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: module.id,
    data: { type: 'module', courseId },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    borderBottom: isLast ? 'none' : `1px solid ${theme.palette.divider}`,
  };

  return (
    <Box ref={setNodeRef} style={style}>
      <Stack
        direction="row"
        alignItems="center"
        spacing={1}
        sx={{
          py: 1.5,
          px: 2,
          bgcolor: expanded ? alpha(theme.palette.primary.main, 0.02) : 'transparent',
          '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.04) },
          transition: 'background-color 0.2s',
        }}
      >
        <IconButton
          {...attributes}
          {...listeners}
          size="small"
          sx={{ cursor: 'grab', '&:active': { cursor: 'grabbing' } }}
        >
          <DragIndicator fontSize="small" />
        </IconButton>

        <IconButton size="small" onClick={() => toggleModule(module.id)}>
          {expanded ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
        </IconButton>

        <MenuBookOutlined sx={{ color: 'text.secondary', ml: 1, mr: 1 }} />

        <Stack
          sx={{ flex: 1, cursor: 'pointer' }}
          onClick={() => openModuleEdit(courseId, module.id)}
        >
          <Typography variant="subtitle1" fontWeight="600">
            {module.orderIndex}. {module.titleRu}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {moduleLessons.length} {moduleLessons.length === 1 ? 'урок' : 'уроков'}
          </Typography>
        </Stack>

        <Stack direction="row" spacing={0.5}>
          <Tooltip title="Редактировать модуль">
            <IconButton onClick={() => openModuleEdit(courseId, module.id)} color="primary">
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Тест модуля">
            <IconButton onClick={() => openModuleTest(courseId, module.id)} color="primary">
              <QuizOutlined fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Добавить урок">
            <IconButton onClick={() => onAddLesson(courseId, module.id)} color="primary">
              <Add fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <Box sx={{ pl: 6, pr: 2, pb: 2 }}>
          <Box sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 2, overflow: 'hidden' }}>
            <SortableContext items={moduleLessons.map(l => l.id)} strategy={verticalListSortingStrategy}>
              {moduleLessons.map((lesson, idx) => (
                <LessonItem
                  key={lesson.id}
                  lesson={lesson}
                  courseId={courseId}
                  moduleId={module.id}
                  navigate={navigate}
                  onRequestDelete={() => onRequestDeleteLesson(lesson)}
                  isDeleting={deletingLessonId === lesson.id}
                  isLast={idx === moduleLessons.length - 1}
                />
              ))}
              {moduleLessons.length === 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
                  В этом модуле пока нет уроков.
                </Typography>
              )}
            </SortableContext>
          </Box>
        </Box>
      </Collapse>
    </Box>
  );
}
