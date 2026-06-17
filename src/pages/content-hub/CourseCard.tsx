import { Stack, Typography, IconButton, Button, Tooltip, Box, Card, Collapse, CircularProgress, useTheme, alpha } from '@mui/material';
import { SchoolOutlined, KeyboardArrowUp, KeyboardArrowDown, FileDownloadOutlined, QuizOutlined, Add } from '@mui/icons-material';
import { HubCourse, HubModule, HubLesson } from './types';
import { ModuleItem } from './ModuleItem';
import { LessonItem } from './LessonItem';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

interface CourseCardProps {
  course: HubCourse;
  modules: HubModule[];
  totalLessons: number;
  looseLessons: HubLesson[];
  lessonsByModule: Record<string, HubLesson[]>;
  expanded: boolean;
  toggleCourse: (id: string) => void;
  openCourseEdit: (id: string) => void;
  openLevelTest: (level: string) => void;
  openOnboardingPlacement: (slot: string) => void;
  downloadCourseContent: (c: HubCourse) => void;
  exportingCourseId: string | null;
  onAddModule: (courseId: string) => void;
  onAddLesson: (courseId: string, moduleId: string) => void;
  expandedModules: Set<string>;
  toggleModule: (id: string) => void;
  openModuleEdit: (cid: string, mid: string) => void;
  openModuleTest: (cid: string, mid: string) => void;
  navigate: (path: string) => void;
  onRequestDeleteLesson: (lesson: HubLesson, courseId: string) => void;
  deletingLessonId: string | null;
}

function levelCodeFromCourseCode(code: string | undefined): string | null {
  if (!code) return null;
  const normalized = code.trim().toUpperCase();
  const match = normalized.match(/^[A-C][0-9]$/);
  return match ? match[0] : null;
}

export function CourseCard({
  course,
  modules,
  totalLessons,
  looseLessons,
  lessonsByModule,
  expanded,
  toggleCourse,
  openCourseEdit,
  openLevelTest,
  openOnboardingPlacement,
  downloadCourseContent,
  exportingCourseId,
  onAddModule,
  onAddLesson,
  expandedModules,
  toggleModule,
  openModuleEdit,
  openModuleTest,
  navigate,
  onRequestDeleteLesson,
  deletingLessonId,
}: CourseCardProps) {
  const theme = useTheme();
  const levelCode = levelCodeFromCourseCode(course.code);
  const showOnboarding = ['mahraj', 'a1', 'a2'].includes(String(course.code || '').toLowerCase());

  return (
    <Card
      elevation={expanded ? 4 : 1}
      sx={{
        borderRadius: 3,
        transition: 'all 0.3s ease',
        overflow: 'hidden',
        border: `1px solid ${theme.palette.divider}`,
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        spacing={2}
        sx={{
          p: 2,
          cursor: 'pointer',
          bgcolor: expanded ? alpha(theme.palette.primary.main, 0.03) : 'background.paper',
          '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.05) },
        }}
        onClick={() => toggleCourse(course.id)}
      >
        <IconButton size="small" onClick={(e) => { e.stopPropagation(); toggleCourse(course.id); }}>
          {expanded ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
        </IconButton>
        
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: 2,
            bgcolor: alpha(theme.palette.primary.main, 0.1),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: theme.palette.primary.main,
          }}
        >
          <SchoolOutlined fontSize="medium" />
        </Box>

        <Stack flex={1}>
          <Typography variant="h6" fontWeight="600" sx={{ mb: 0.5 }}>
            {course.orderIndex}. {course.titleRu}
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="caption" fontWeight="bold" color="primary">{course.code}</Typography>
            <Typography variant="caption" color="text.secondary">•</Typography>
            <Typography variant="caption" color="text.secondary">{modules.length} модулей</Typography>
            <Typography variant="caption" color="text.secondary">•</Typography>
            <Typography variant="caption" color="text.secondary">{totalLessons} уроков</Typography>
          </Stack>
        </Stack>

        <Stack direction="row" spacing={1} onClick={(e) => e.stopPropagation()}>
          <Button variant="outlined" onClick={() => openCourseEdit(course.id)} sx={{ borderRadius: 2 }}>
            Изменить
          </Button>
          <Tooltip title="Выгрузить контент">
            <IconButton onClick={() => downloadCourseContent(course)} disabled={exportingCourseId === course.id} color="primary">
              {exportingCourseId === course.id ? <CircularProgress size={20} /> : <FileDownloadOutlined />}
            </IconButton>
          </Tooltip>
          {expanded && (
            <Button variant="contained" onClick={() => onAddModule(course.id)} sx={{ borderRadius: 2 }}>
              Новый модуль
            </Button>
          )}
        </Stack>
      </Stack>

      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <Box sx={{ p: 3, bgcolor: alpha(theme.palette.background.default, 0.5), borderTop: `1px solid ${theme.palette.divider}` }}>
          <Stack spacing={3}>
            
            {(levelCode || showOnboarding) && (
              <Stack direction="row" spacing={2}>
                {levelCode && (
                  <Button
                    variant="outlined"
                    startIcon={<QuizOutlined />}
                    onClick={() => openLevelTest(levelCode)}
                    sx={{ borderRadius: 2, bgcolor: 'background.paper' }}
                  >
                    Тест уровня {levelCode}
                  </Button>
                )}
                {showOnboarding && (
                  <Button
                    variant="outlined"
                    startIcon={<QuizOutlined />}
                    onClick={() => openOnboardingPlacement(String(course.code).toLowerCase())}
                    sx={{ borderRadius: 2, bgcolor: 'background.paper' }}
                  >
                    Онбординг ({course.code})
                  </Button>
                )}
              </Stack>
            )}

            <Box>
              <Typography variant="subtitle2" color="text.secondary" sx={{ textTransform: 'uppercase', mb: 1, letterSpacing: 1 }}>
                Модули
              </Typography>
              <Box sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 2, bgcolor: 'background.paper', overflow: 'hidden' }}>
                <SortableContext items={modules.map(m => m.id)} strategy={verticalListSortingStrategy}>
                  {modules.map((m, idx) => (
                    <ModuleItem
                      key={m.id}
                      module={m}
                      courseId={course.id}
                      expanded={expandedModules.has(m.id)}
                      toggleModule={toggleModule}
                      openModuleEdit={openModuleEdit}
                      openModuleTest={openModuleTest}
                      onAddLesson={onAddLesson}
                      moduleLessons={lessonsByModule[m.id] || []}
                      navigate={navigate}
                      onRequestDeleteLesson={(lesson) => onRequestDeleteLesson(lesson, course.id)}
                      deletingLessonId={deletingLessonId}
                      isLast={idx === modules.length - 1}
                    />
                  ))}
                  {modules.length === 0 && (
                    <Typography variant="body2" color="text.secondary" sx={{ p: 3, textAlign: 'center' }}>
                      В этом курсе пока нет модулей.
                    </Typography>
                  )}
                </SortableContext>
              </Box>
            </Box>

            {looseLessons.length > 0 && (
              <Box>
                <Typography variant="subtitle2" color="text.secondary" sx={{ textTransform: 'uppercase', mb: 1, letterSpacing: 1 }}>
                  Уроки вне модулей
                </Typography>
                <Box sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 2, bgcolor: 'background.paper', overflow: 'hidden' }}>
                  {looseLessons.map((lesson, idx) => (
                    <LessonItem
                      key={lesson.id}
                      lesson={lesson}
                      courseId={course.id}
                      navigate={navigate}
                      onRequestDelete={() => onRequestDeleteLesson(lesson, course.id)}
                      isDeleting={deletingLessonId === lesson.id}
                      isLast={idx === looseLessons.length - 1}
                    />
                  ))}
                </Box>
              </Box>
            )}

            <Box>
              <Button
                variant="text"
                startIcon={<Add />}
                onClick={() => onAddLesson(course.id, '')}
                sx={{ borderRadius: 2 }}
              >
                Урок вне модуля
              </Button>
            </Box>

          </Stack>
        </Box>
      </Collapse>
    </Card>
  );
}
