import { Stack, Typography, IconButton, Tooltip, Collapse, Box, Button, Link } from '@mui/material';
import { EditOutlined, QuizOutlined, Add, KeyboardArrowRight, DragIndicator } from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';
import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion } from '../../theme';
import { HubModule, HubLesson, LessonAccess } from './types';
import { LessonItem } from './LessonItem';
import { Highlight } from './HubParts';
import { LESSON_FORMS, plural } from './accessRules';

interface ModuleItemProps {
  module: HubModule;
  /** 1-based position in the course. */
  position: number;
  courseId: string;
  expanded: boolean;
  toggleModule: (id: string) => void;
  onAddLesson: (cid: string, mid: string) => void;
  /** All lessons of the module in order. */
  moduleLessons: HubLesson[];
  /** When set (search active), only these lessons are shown. */
  visibleLessonIds?: Set<string> | null;
  lessonAccess: Map<string, LessonAccess>;
  onRequestDeleteLesson: (lesson: HubLesson) => void;
  deletingLessonId: string | null;
  isLast: boolean;
  dragDisabled?: boolean;
  query?: string;
}

export function ModuleItem({
  module,
  position,
  courseId,
  expanded,
  toggleModule,
  onAddLesson,
  moduleLessons,
  visibleLessonIds,
  lessonAccess,
  onRequestDeleteLesson,
  deletingLessonId,
  isLast,
  dragDisabled,
  query = '',
}: ModuleItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: module.id,
    data: { type: 'module', courseId },
    disabled: dragDisabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 20 : undefined,
    position: 'relative' as const,
  };

  const totalLessons = moduleLessons.length;
  const freeCount = moduleLessons.filter((l) => lessonAccess.get(l.id) === 'free').length;
  const shown = moduleLessons
    .map((lesson, idx) => ({ lesson, position: idx + 1 }))
    .filter(({ lesson }) => !visibleLessonIds || visibleLessonIds.has(lesson.id));
  const editPath = `/content/courses/${courseId}/modules/${module.id}/edit`;
  const testPath = `/content/courses/${courseId}/modules/${module.id}/test`;
  const listId = `module-lessons-${module.id}`;

  return (
    <Box
      ref={setNodeRef}
      style={style}
      component="li"
      sx={{
        listStyle: 'none',
        borderBottom: isLast ? 'none' : '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        boxShadow: isDragging ? 4 : 'none',
        borderRadius: isDragging ? 1.5 : 0,
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        spacing={0.5}
        sx={{
          minHeight: 56,
          py: 0.75,
          pl: 0.5,
          pr: 1,
          transition: `background-color ${motion.fast}`,
          '&:hover': { bgcolor: 'surface.sunken' },
        }}
      >
        <Tooltip title={dragDisabled ? 'Сбросьте поиск, чтобы менять порядок' : 'Перетащите, чтобы изменить порядок'}>
          <span>
            <IconButton
              {...attributes}
              {...listeners}
              size="small"
              disabled={dragDisabled}
              aria-label={`Изменить порядок модуля «${module.titleRu}»`}
              sx={{ cursor: dragDisabled ? 'default' : 'grab', color: 'text.secondary', '&:active': { cursor: 'grabbing' } }}
            >
              <DragIndicator fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>

        <IconButton
          size="small"
          onClick={() => toggleModule(module.id)}
          aria-expanded={expanded}
          aria-controls={listId}
          aria-label={expanded ? `Свернуть модуль «${module.titleRu}»` : `Развернуть модуль «${module.titleRu}»`}
        >
          <KeyboardArrowRight
            sx={{ transition: `transform ${motion.base}`, transform: expanded ? 'rotate(90deg)' : 'none' }}
          />
        </IconButton>

        <Box
          sx={{
            width: 28,
            height: 28,
            flexShrink: 0,
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.75rem',
            fontWeight: 600,
            color: 'text.secondary',
            fontVariantNumeric: 'tabular-nums',
            mr: 0.5,
          }}
          aria-hidden
        >
          {position}
        </Box>

        <Box
          sx={{ flex: 1, minWidth: 0, cursor: 'pointer', py: 0.25 }}
          onClick={() => toggleModule(module.id)}
        >
          <Typography variant="subtitle2" sx={{ fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            <Highlight text={module.titleRu || 'Без названия'} query={query} />
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontVariantNumeric: 'tabular-nums' }}>
            {totalLessons} {plural(totalLessons, LESSON_FORMS)}
            {totalLessons > 0 && `, бесплатно ${freeCount}`}
          </Typography>
        </Box>

        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ flexShrink: 0 }}>
          <Button
            component={RouterLink}
            to={testPath}
            size="small"
            variant="text"
            startIcon={<QuizOutlined fontSize="small" />}
            sx={{ display: { xs: 'none', sm: 'inline-flex' } }}
          >
            Тест модуля
          </Button>
          <Tooltip title="Тест модуля">
            <IconButton
              component={RouterLink}
              to={testPath}
              size="small"
              aria-label={`Тест модуля «${module.titleRu}»`}
              sx={{ display: { xs: 'inline-flex', sm: 'none' } }}
            >
              <QuizOutlined fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Настройки модуля">
            <IconButton component={RouterLink} to={editPath} size="small" aria-label={`Настройки модуля «${module.titleRu}»`}>
              <EditOutlined fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Добавить урок в модуль">
            <IconButton
              onClick={() => onAddLesson(courseId, module.id)}
              size="small"
              aria-label={`Добавить урок в модуль «${module.titleRu}»`}
            >
              <Add fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <Box id={listId} sx={{ pl: { xs: 2, sm: 7 }, pr: 1, pb: 1.5 }}>
          <Box
            sx={{
              borderLeft: '2px solid',
              borderColor: 'brand.sand',
              pl: 1,
            }}
          >
            {shown.length === 0 ? (
              <Stack direction="row" alignItems="center" spacing={1} sx={{ py: 1.25, pl: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  {query ? 'Нет уроков, подходящих под поиск.' : 'В модуле пока нет уроков.'}
                </Typography>
                {!query && (
                  <Link component="button" type="button" variant="body2" onClick={() => onAddLesson(courseId, module.id)}>
                    Добавить первый урок
                  </Link>
                )}
              </Stack>
            ) : (
              <Box component="ul" sx={{ m: 0, p: 0, listStyle: 'none' }} aria-label={`Уроки модуля «${module.titleRu}»`}>
                <SortableContext items={shown.map(({ lesson }) => lesson.id)} strategy={verticalListSortingStrategy}>
                  {shown.map(({ lesson, position: lessonPosition }, idx) => (
                    <LessonItem
                      key={lesson.id}
                      lesson={lesson}
                      position={lessonPosition}
                      courseId={courseId}
                      moduleId={module.id}
                      access={lessonAccess.get(lesson.id)}
                      onRequestDelete={() => onRequestDeleteLesson(lesson)}
                      isDeleting={deletingLessonId === lesson.id}
                      isLast={idx === shown.length - 1}
                      dragDisabled={dragDisabled}
                      query={query}
                    />
                  ))}
                </SortableContext>
              </Box>
            )}
          </Box>
        </Box>
      </Collapse>
    </Box>
  );
}
