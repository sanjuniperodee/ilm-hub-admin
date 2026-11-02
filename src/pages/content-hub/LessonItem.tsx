import { Box, Stack, Typography, IconButton, Button, Tooltip, CircularProgress, Link } from '@mui/material';
import { DeleteOutline, DragIndicator, ScheduleOutlined } from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion } from '../../theme';
import { StatusChip } from '../../components/ui';
import { HubLesson, LessonAccess } from './types';
import { AccessChip, Highlight } from './HubParts';

interface LessonItemProps {
  lesson: HubLesson;
  /** 1-based position inside its section. */
  position: number;
  courseId: string;
  moduleId?: string;
  access?: LessonAccess;
  onRequestDelete: () => void;
  isDeleting: boolean;
  isLast: boolean;
  /** Disable drag (e.g. while a search filter is active). */
  dragDisabled?: boolean;
  query?: string;
}

export function lessonPath(courseId: string, lessonId: string, moduleId?: string) {
  return moduleId
    ? `/content/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}`
    : `/content/courses/${courseId}/lessons/${lessonId}`;
}

export function LessonItem({
  lesson,
  position,
  courseId,
  moduleId,
  access,
  onRequestDelete,
  isDeleting,
  isLast,
  dragDisabled,
  query = '',
}: LessonItemProps) {
  const sortable = !!moduleId;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: lesson.id,
    data: { type: 'lesson', moduleId, courseId },
    disabled: !sortable || dragDisabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
    position: 'relative' as const,
  };

  const path = lessonPath(courseId, lesson.id, moduleId);

  return (
    <Stack
      ref={setNodeRef}
      style={style}
      component="li"
      direction="row"
      alignItems="center"
      spacing={1}
      sx={{
        minHeight: 48,
        py: 0.5,
        pl: sortable ? 0.5 : 1.5,
        pr: 1,
        borderBottom: isLast ? 'none' : '1px solid',
        borderColor: 'divider',
        bgcolor: isDragging ? 'background.paper' : 'transparent',
        boxShadow: isDragging ? 3 : 'none',
        borderRadius: isDragging ? 1 : 0,
        transition: `background-color ${motion.fast}`,
        '&:hover': { bgcolor: 'surface.sunken' },
      }}
    >
      {sortable && (
        <Tooltip title={dragDisabled ? 'Сбросьте поиск, чтобы менять порядок' : 'Перетащите, чтобы изменить порядок'}>
          <span>
            <IconButton
              {...attributes}
              {...listeners}
              size="small"
              disabled={dragDisabled}
              aria-label={`Изменить порядок урока «${lesson.titleRu}»`}
              sx={{ cursor: dragDisabled ? 'default' : 'grab', color: 'text.secondary', '&:active': { cursor: 'grabbing' } }}
            >
              <DragIndicator fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      )}

      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ width: 24, textAlign: 'right', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}
      >
        {position}
      </Typography>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Link
          component={RouterLink}
          to={path}
          underline="hover"
          color="text.primary"
          sx={{ fontWeight: 500, fontSize: '0.875rem', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
        >
          <Highlight text={lesson.titleRu || 'Без названия'} query={query} />
        </Link>
      </Box>

      <Stack direction="row" spacing={0.75} alignItems="center" sx={{ flexShrink: 0 }}>
        {lesson.isTest && <StatusChip size="small" label="Тест" tone="info" hideDot />}
        {typeof lesson.estimatedMinutes === 'number' && lesson.estimatedMinutes > 0 && (
          <Stack
            direction="row"
            spacing={0.25}
            alignItems="center"
            sx={{ color: 'text.secondary', display: { xs: 'none', md: 'flex' } }}
            aria-label={`${lesson.estimatedMinutes} мин`}
          >
            <ScheduleOutlined sx={{ fontSize: 15 }} />
            <Typography variant="caption" sx={{ fontVariantNumeric: 'tabular-nums' }}>{lesson.estimatedMinutes} мин</Typography>
          </Stack>
        )}
        {access && <AccessChip access={access} />}
      </Stack>

      <Stack
        direction="row"
        spacing={0.5}
        alignItems="center"
        className="lesson-actions"
        sx={{ flexShrink: 0 }}
      >
        <Button component={RouterLink} to={path} size="small" variant="text">
          Открыть
        </Button>
        <Tooltip title="Удалить урок">
          <span>
            <IconButton
              disabled={isDeleting}
              onClick={(e) => {
                e.stopPropagation();
                onRequestDelete();
              }}
              aria-label={`Удалить урок «${lesson.titleRu}»`}
              size="small"
              sx={{ color: 'text.secondary', '&:hover': { color: 'error.main' } }}
            >
              {isDeleting ? <CircularProgress size={16} color="inherit" /> : <DeleteOutline fontSize="small" />}
            </IconButton>
          </span>
        </Tooltip>
      </Stack>
    </Stack>
  );
}
