
import { Stack, Typography, IconButton, Button, Tooltip, CircularProgress, alpha, useTheme } from '@mui/material';
import { ArticleOutlined, DeleteOutline, DragIndicator } from '@mui/icons-material';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { HubLesson } from './types';

interface LessonItemProps {
  lesson: HubLesson;
  courseId: string;
  moduleId?: string;
  navigate: (path: string) => void;
  onRequestDelete: () => void;
  isDeleting: boolean;
  isLast: boolean;
}

export function LessonItem({
  lesson,
  courseId,
  moduleId,
  navigate,
  onRequestDelete,
  isDeleting,
  isLast,
}: LessonItemProps) {
  const theme = useTheme();
  
  // Sortable setup (optional if no moduleId, but keeping for unified structure)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: lesson.id,
    data: { type: 'lesson', moduleId, courseId },
  });

  const style = { 
    transform: CSS.Transform.toString(transform), 
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 1,
  };
  
  const path = moduleId 
    ? `/content/courses/${courseId}/modules/${moduleId}/lessons/${lesson.id}`
    : `/content/courses/${courseId}/lessons/${lesson.id}`;

  return (
    <Stack
      ref={setNodeRef}
      style={style}
      direction="row"
      alignItems="center"
      spacing={1}
      sx={{
        py: 1,
        px: 2,
        borderBottom: isLast ? 'none' : `1px solid ${theme.palette.divider}`,
        transition: 'background-color 0.2s',
        '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.04) },
      }}
    >
      {moduleId && (
        <IconButton
          {...attributes}
          {...listeners}
          size="small"
          sx={{ cursor: 'grab', '&:active': { cursor: 'grabbing' } }}
        >
          <DragIndicator fontSize="small" />
        </IconButton>
      )}

      <ArticleOutlined sx={{ color: 'text.secondary', fontSize: 20 }} />

      <Typography
        sx={{ flex: 1, fontWeight: 500, cursor: 'pointer', ml: 1 }}
        onClick={() => navigate(path)}
      >
        {lesson.orderIndex}. {lesson.titleRu}
      </Typography>

      <Button
        variant="outlined"
        size="small"
        onClick={() => navigate(path)}
        sx={{ textTransform: 'none', borderRadius: 2 }}
      >
        Редактировать
      </Button>

      <Tooltip title="Удалить урок">
        <IconButton
          disabled={isDeleting}
          onClick={(e) => {
            e.stopPropagation();
            onRequestDelete();
          }}
          color="error"
          size="small"
        >
          {isDeleting ? <CircularProgress size={18} color="error" /> : <DeleteOutline fontSize="small" />}
        </IconButton>
      </Tooltip>
    </Stack>
  );
}
