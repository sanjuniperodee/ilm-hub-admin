import { useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Paper,
  Radio,
  RadioGroup,
  Select,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { NotificationsActiveOutlined, SendOutlined } from "@mui/icons-material";
import {
  getPushLogs,
  getPushSegments,
  getUsers,
  sendManualPush,
  type PushNotificationLog,
  type PushSegment,
  type PushTarget,
} from "../api/adminApi";

type UserOption = {
  id: string;
  email: string;
  name?: string;
  isPremium?: boolean;
  pushEnabled?: boolean;
};

const segmentLabels: Record<PushSegment, string> = {
  all: "Все с push-токеном",
  free: "Free",
  paid_no_plan: "Premium без плана",
  paid_with_plan: "Premium с учебным планом",
};

const pushTypeLabels: Record<string, string> = {
  manual_admin_push: "Ручной push",
  first_interaction: "После первого взаимодействия",
  daily_reminder_free: "Ежедневное free",
  reactivation_d1: "Реактивация 1 день",
  reactivation_d3: "Реактивация 3 дня",
  reactivation_d7: "Реактивация 7 дней",
  content_push: "Контентный push",
  subscription_upsell: "Подписка",
  motivational_free: "Мотивация free",
  plan_creation_d0: "Создание плана, день 0",
  plan_creation_d1: "Создание плана, день 1",
  plan_creation_d2: "Создание плана, день 2",
  plan_creation_d3: "Создание плана, день 3",
  daily_reminder_paid: "Ежедневное premium",
  gentle_pressure: "Мягкое давление",
  motivational_paid: "Мотивация premium",
  schedule_reminder: "Напоминание по плану",
  schedule_followup: "Догоняющее",
  missed_day: "Срыв плана",
  motivational_plan: "Мотивация по плану",
};

const statusLabels: Record<string, string> = {
  sent: "Отправлено",
  failed: "Ошибка",
};

const formatPushDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const getStatusColor = (status: string): "success" | "error" | "default" => {
  if (status === "sent") return "success";
  if (status === "failed") return "error";
  return "default";
};

export default function PushNotificationsPage() {
  const [target, setTarget] = useState<PushTarget>("segment");
  const [segment, setSegment] = useState<PushSegment>("all");
  const [segments, setSegments] = useState<Record<
    PushSegment,
    { users: number; tokens: number }
  > | null>(null);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<UserOption[]>([]);
  const [title, setTitle] = useState("ILM HUB");
  const [body, setBody] = useState("");
  const [route, setRoute] = useState("/home");
  const [respectUserSettings, setRespectUserSettings] = useState(true);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [logs, setLogs] = useState<PushNotificationLog[]>([]);
  const [logsTotal, setLogsTotal] = useState(0);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState("");
  const [logPage, setLogPage] = useState(0);
  const [logRowsPerPage, setLogRowsPerPage] = useState(25);
  const [logSegment, setLogSegment] = useState("");
  const [logStatus, setLogStatus] = useState("");
  const [logType, setLogType] = useState("");
  const [logSearch, setLogSearch] = useState("");
  const deferredLogSearch = useDeferredValue(logSearch.trim());

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    loadPushLogs();
  }, [
    logPage,
    logRowsPerPage,
    logSegment,
    logStatus,
    logType,
    deferredLogSearch,
  ]);

  const loadInitialData = async () => {
    setLoading(true);
    setError("");
    try {
      const [segmentsRes, usersRes] = await Promise.all([
        getPushSegments(),
        getUsers({ page: 1, limit: 200 }),
      ]);
      setSegments(segmentsRes.data);
      const list = Array.isArray(usersRes.data?.data) ? usersRes.data.data : [];
      setUsers(
        list.map((u: any) => ({
          id: u.id,
          email: u.email,
          name: u.name,
          isPremium: u.isPremium,
          pushEnabled: u.pushEnabled,
        })),
      );
    } catch (e: any) {
      setError(
        e?.response?.data?.message ||
          e?.message ||
          "Не удалось загрузить данные для push",
      );
    } finally {
      setLoading(false);
    }
  };

  const loadPushLogs = async () => {
    setLogsLoading(true);
    setLogsError("");
    try {
      const response = await getPushLogs({
        page: logPage + 1,
        limit: logRowsPerPage,
        segment: logSegment || undefined,
        type: logType || undefined,
        deliveryStatus: logStatus || undefined,
        search: deferredLogSearch || undefined,
      });
      setLogs(response.data.data ?? []);
      setLogsTotal(response.data.total ?? 0);
    } catch (e: any) {
      setLogs([]);
      setLogsTotal(0);
      setLogsError(
        e?.response?.data?.message ||
          e?.message ||
          "Не удалось загрузить историю push",
      );
    } finally {
      setLogsLoading(false);
    }
  };

  const selectedSegmentStats = segments?.[segment];
  const recipientHint = useMemo(() => {
    if (target === "users") {
      return `${selectedUsers.length} выбранных пользователей`;
    }
    if (!selectedSegmentStats) return "Аудитория загружается";
    return `${selectedSegmentStats.users} пользователей, ${selectedSegmentStats.tokens} устройств`;
  }, [selectedSegmentStats, selectedUsers.length, target]);

  const canSend =
    title.trim().length > 0 &&
    body.trim().length > 0 &&
    (target === "segment" || selectedUsers.length > 0);

  const handleSend = async () => {
    if (!canSend) return;
    setSending(true);
    setError("");
    setSuccess("");
    try {
      const { data } = await sendManualPush({
        target,
        segment: target === "segment" ? segment : undefined,
        userIds:
          target === "users" ? selectedUsers.map((u) => u.id) : undefined,
        title: title.trim(),
        body: body.trim(),
        route: route.trim() || "/home",
        respectUserSettings,
      });
      setSuccess(
        `Отправлено: ${data.successCount ?? 0} устройств. Аудитория: ${data.targetedUsers ?? 0} пользователей, ${data.targetedTokens ?? 0} токенов.`,
      );
      await getPushSegments()
        .then((res) => setSegments(res.data))
        .catch(() => {});
      if (logPage === 0) {
        await loadPushLogs();
      } else {
        setLogPage(0);
      }
    } catch (e: any) {
      setError(
        e?.response?.data?.message || e?.message || "Не удалось отправить push",
      );
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="420px"
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box className="animate-fade-in">
      <Stack
        direction={{ xs: "column", md: "row" }}
        justifyContent="space-between"
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Box>
          <Typography
            variant="h3"
            sx={{ fontWeight: 800, letterSpacing: "-0.02em" }}
          >
            Push-уведомления
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            Ручная отправка конкретным пользователям или сегментам
          </Typography>
        </Box>
        <Button
          variant="outlined"
          onClick={loadInitialData}
          disabled={sending}
          sx={{ alignSelf: { xs: "stretch", md: "center" } }}
        >
          Обновить аудиторию
        </Button>
      </Stack>

      <Stack spacing={2}>
        {error && <Alert severity="error">{error}</Alert>}
        {success && <Alert severity="success">{success}</Alert>}

        <Stack
          direction={{ xs: "column", lg: "row" }}
          spacing={2}
          alignItems="stretch"
        >
          <Paper sx={{ p: 2.5, flex: 1 }}>
            <Stack spacing={2.25}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <NotificationsActiveOutlined color="primary" />
                <Typography variant="h6">Аудитория</Typography>
              </Stack>

              <RadioGroup
                row
                value={target}
                onChange={(e) => setTarget(e.target.value as PushTarget)}
              >
                <FormControlLabel
                  value="segment"
                  control={<Radio />}
                  label="Сегмент"
                />
                <FormControlLabel
                  value="users"
                  control={<Radio />}
                  label="Пользователи"
                />
              </RadioGroup>

              {target === "segment" ? (
                <FormControl fullWidth>
                  <InputLabel>Сегмент</InputLabel>
                  <Select
                    value={segment}
                    label="Сегмент"
                    onChange={(e) => setSegment(e.target.value as PushSegment)}
                  >
                    {(Object.keys(segmentLabels) as PushSegment[]).map(
                      (key) => (
                        <MenuItem key={key} value={key}>
                          {segmentLabels[key]} · {segments?.[key]?.users ?? 0}{" "}
                          users / {segments?.[key]?.tokens ?? 0} tokens
                        </MenuItem>
                      ),
                    )}
                  </Select>
                </FormControl>
              ) : (
                <Autocomplete
                  multiple
                  options={users}
                  value={selectedUsers}
                  onChange={(_, value) => setSelectedUsers(value)}
                  getOptionLabel={(option) =>
                    `${option.name || "Без имени"} · ${option.email}`
                  }
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip
                        label={option.email}
                        size="small"
                        {...getTagProps({ index })}
                      />
                    ))
                  }
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Пользователи"
                      placeholder="Email или имя"
                    />
                  )}
                />
              )}

              <FormControlLabel
                control={
                  <Switch
                    checked={respectUserSettings}
                    onChange={(e) => setRespectUserSettings(e.target.checked)}
                  />
                }
                label="Учитывать настройку Push в профиле пользователя"
              />

              <Alert severity="info" icon={false}>
                Получатели: {recipientHint}
              </Alert>
            </Stack>
          </Paper>

          <Paper sx={{ p: 2.5, flex: 1.2 }}>
            <Stack spacing={2}>
              <Typography variant="h6">Сообщение</Typography>
              <TextField
                label="Заголовок"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                fullWidth
              />
              <TextField
                label="Текст"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                fullWidth
                multiline
                minRows={4}
                inputProps={{ maxLength: 240 }}
                helperText={`${body.length}/240`}
              />
              <TextField
                label="Route при открытии"
                value={route}
                onChange={(e) => setRoute(e.target.value)}
                fullWidth
                placeholder="/home"
              />
              <Divider />
              <Button
                variant="contained"
                size="large"
                startIcon={
                  sending ? (
                    <CircularProgress color="inherit" size={18} />
                  ) : (
                    <SendOutlined />
                  )
                }
                onClick={handleSend}
                disabled={!canSend || sending}
                sx={{ alignSelf: { xs: "stretch", sm: "flex-end" } }}
              >
                Отправить push
              </Button>
            </Stack>
          </Paper>
        </Stack>

        {segments && (
          <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
            {(Object.keys(segmentLabels) as PushSegment[]).map((key) => (
              <Card key={key} sx={{ flex: 1 }}>
                <CardContent sx={{ py: 2, "&:last-child": { pb: 2 } }}>
                  <Typography variant="body2" color="text.secondary">
                    {segmentLabels[key]}
                  </Typography>
                  <Typography variant="h5" sx={{ mt: 0.5 }}>
                    {segments[key].users}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {segments[key].tokens} устройств
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </Stack>
        )}

        <Paper sx={{ p: 2.5 }}>
          <Stack spacing={2}>
            <Stack
              direction={{ xs: "column", md: "row" }}
              justifyContent="space-between"
              spacing={1.5}
            >
              <Box>
                <Typography variant="h6">История отправок</Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 0.25 }}
                >
                  Автоматические и ручные push из журнала notification_logs
                </Typography>
              </Box>
              <Button
                variant="outlined"
                onClick={loadPushLogs}
                disabled={logsLoading}
                sx={{ alignSelf: { xs: "stretch", md: "center" } }}
              >
                Обновить историю
              </Button>
            </Stack>

            <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
              <TextField
                label="Поиск"
                value={logSearch}
                onChange={(e) => {
                  setLogSearch(e.target.value);
                  setLogPage(0);
                }}
                size="small"
                fullWidth
                placeholder="Email, имя, текст или user ID"
              />
              <FormControl
                size="small"
                sx={{ minWidth: { xs: "100%", md: 190 } }}
              >
                <InputLabel>Сегмент</InputLabel>
                <Select
                  value={logSegment}
                  label="Сегмент"
                  onChange={(e) => {
                    setLogSegment(e.target.value);
                    setLogPage(0);
                  }}
                >
                  <MenuItem value="">Все сегменты</MenuItem>
                  <MenuItem value="free">Free</MenuItem>
                  <MenuItem value="paid_no_plan">Premium без плана</MenuItem>
                  <MenuItem value="paid_with_plan">Premium с планом</MenuItem>
                  <MenuItem value="all">Manual: all</MenuItem>
                  <MenuItem value="manual_users">Manual: users</MenuItem>
                </Select>
              </FormControl>
              <FormControl
                size="small"
                sx={{ minWidth: { xs: "100%", md: 210 } }}
              >
                <InputLabel>Тип</InputLabel>
                <Select
                  value={logType}
                  label="Тип"
                  onChange={(e) => {
                    setLogType(e.target.value);
                    setLogPage(0);
                  }}
                >
                  <MenuItem value="">Все типы</MenuItem>
                  {Object.entries(pushTypeLabels).map(([value, label]) => (
                    <MenuItem key={value} value={value}>
                      {label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl
                size="small"
                sx={{ minWidth: { xs: "100%", md: 160 } }}
              >
                <InputLabel>Статус</InputLabel>
                <Select
                  value={logStatus}
                  label="Статус"
                  onChange={(e) => {
                    setLogStatus(e.target.value);
                    setLogPage(0);
                  }}
                >
                  <MenuItem value="">Все статусы</MenuItem>
                  <MenuItem value="sent">Отправлено</MenuItem>
                  <MenuItem value="failed">Ошибка</MenuItem>
                </Select>
              </FormControl>
            </Stack>

            {logsError && <Alert severity="error">{logsError}</Alert>}

            <TableContainer
              sx={{
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 2,
              }}
            >
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Дата</TableCell>
                    <TableCell>Получатель</TableCell>
                    <TableCell>Тип</TableCell>
                    <TableCell>Сообщение</TableCell>
                    <TableCell align="right">Статус</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {logsLoading ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        sx={{ py: 5, textAlign: "center" }}
                      >
                        <CircularProgress size={24} />
                      </TableCell>
                    </TableRow>
                  ) : logs.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        sx={{ py: 5, textAlign: "center" }}
                      >
                        <Typography color="text.secondary">
                          Пока нет записей по выбранным фильтрам
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    logs.map((log) => (
                      <TableRow key={log.id} hover>
                        <TableCell sx={{ whiteSpace: "nowrap" }}>
                          <Typography variant="body2">
                            {formatPushDate(log.sentAt)}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ minWidth: 220 }}>
                          <Typography
                            variant="body2"
                            sx={{ fontWeight: 600, wordBreak: "break-word" }}
                          >
                            {log.user?.email || log.user?.name || "Без email"}
                          </Typography>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{
                              fontFamily: "monospace",
                              wordBreak: "break-all",
                            }}
                          >
                            {log.userId}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ minWidth: 190 }}>
                          <Chip
                            size="small"
                            label={pushTypeLabels[log.type] || log.type}
                          />
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            display="block"
                            sx={{ mt: 0.5 }}
                          >
                            {log.segment}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ minWidth: 260 }}>
                          <Typography
                            variant="body2"
                            sx={{ fontWeight: 600, wordBreak: "break-word" }}
                          >
                            {log.title || "Без заголовка"}
                          </Typography>
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ wordBreak: "break-word" }}
                          >
                            {log.body || "—"}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Chip
                            size="small"
                            color={getStatusColor(log.deliveryStatus)}
                            label={
                              statusLabels[log.deliveryStatus] ||
                              log.deliveryStatus
                            }
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            <TablePagination
              component="div"
              count={logsTotal}
              page={logPage}
              onPageChange={(_, page) => setLogPage(page)}
              rowsPerPage={logRowsPerPage}
              onRowsPerPageChange={(e) => {
                setLogRowsPerPage(parseInt(e.target.value, 10));
                setLogPage(0);
              }}
              rowsPerPageOptions={[25, 50, 100, 200]}
              labelRowsPerPage="Строк:"
              sx={{
                flexWrap: "wrap",
                "& .MuiTablePagination-toolbar": { flexWrap: "wrap", gap: 1 },
              }}
            />
          </Stack>
        </Paper>
      </Stack>
    </Box>
  );
}
