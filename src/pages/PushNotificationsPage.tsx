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
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import { NotificationsActiveOutlined, SendOutlined } from "@mui/icons-material";
import {
  createDraftPushRules,
  createDraftPushTemplate,
  deleteDraftPushTemplate,
  getDraftPushRules,
  getPushLogs,
  getPushRuleVersions,
  getPushSegments,
  getUsers,
  publishDraftPushRules,
  rollbackPushRules,
  sendManualPush,
  updateDraftPushScenario,
  updateDraftPushSegmentPolicy,
  updateDraftPushTemplate,
  validateDraftPushRules,
  type PushNotificationLog,
  type PushRuleSet,
  type PushRuleVersion,
  type PushScenario,
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
  pending: "В процессе",
  sent: "Отправлено",
  disabled: "Firebase выключен",
  failed: "Ошибка",
};

const formatPushDate = (value?: string | null) => {
  if (!value) return "—";
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

const getStatusColor = (status: string): "success" | "error" | "default" | "warning" => {
  if (status === "sent") return "success";
  if (status === "failed") return "error";
  if (status === "disabled" || status === "pending") return "warning";
  return "default";
};

const formatWindows = (windows: Array<{ start: string; end: string }>) =>
  windows.map((item) => `${item.start}-${item.end}`).join(", ");

const parseWindows = (value: string) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const [start, end] = item.split("-").map((part) => part.trim());
      return { start, end };
    })
    .filter((item) => item.start && item.end);

export default function PushNotificationsPage() {
  const [tab, setTab] = useState(0);
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
  const [savingRules, setSavingRules] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [ruleSet, setRuleSet] = useState<PushRuleSet | null>(null);
  const [versions, setVersions] = useState<PushRuleVersion[]>([]);
  const [validation, setValidation] = useState<{ ok: boolean; errors: string[] } | null>(null);
  const [selectedScenarioKey, setSelectedScenarioKey] = useState("");
  const [newTemplateBody, setNewTemplateBody] = useState("");
  const [newTemplateTitle, setNewTemplateTitle] = useState("ILM HUB");
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
      const [segmentsRes, usersRes, draftRes, versionsRes] = await Promise.all([
        getPushSegments(),
        getUsers({ page: 1, limit: 200 }),
        getDraftPushRules(),
        getPushRuleVersions(),
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
      setRuleSet(draftRes.data);
      setSelectedScenarioKey(draftRes.data.scenarios[0]?.key ?? "");
      setVersions(versionsRes.data);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || "Не удалось загрузить данные для push");
    } finally {
      setLoading(false);
    }
  };

  const reloadRules = async () => {
    const [draftRes, versionsRes] = await Promise.all([
      getDraftPushRules(),
      getPushRuleVersions(),
    ]);
    setRuleSet(draftRes.data);
    setVersions(versionsRes.data);
    if (!selectedScenarioKey) setSelectedScenarioKey(draftRes.data.scenarios[0]?.key ?? "");
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
      setLogsError(e?.response?.data?.message || e?.message || "Не удалось загрузить историю push");
    } finally {
      setLogsLoading(false);
    }
  };

  const selectedSegmentStats = segments?.[segment];
  const recipientHint = useMemo(() => {
    if (target === "users") return `${selectedUsers.length} выбранных пользователей`;
    if (!selectedSegmentStats) return "Аудитория загружается";
    return `${selectedSegmentStats.users} пользователей, ${selectedSegmentStats.tokens} устройств`;
  }, [selectedSegmentStats, selectedUsers.length, target]);

  const selectedScenario = useMemo(
    () => ruleSet?.scenarios.find((item) => item.key === selectedScenarioKey) ?? null,
    [ruleSet, selectedScenarioKey],
  );

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
        userIds: target === "users" ? selectedUsers.map((u) => u.id) : undefined,
        title: title.trim(),
        body: body.trim(),
        route: route.trim() || "/home",
        respectUserSettings,
      });
      setSuccess(`Отправлено: ${data.successCount ?? 0} устройств. Аудитория: ${data.targetedUsers ?? 0} пользователей, ${data.targetedTokens ?? 0} токенов.`);
      await getPushSegments().then((res) => setSegments(res.data)).catch(() => {});
      await loadPushLogs();
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || "Не удалось отправить push");
    } finally {
      setSending(false);
    }
  };

  const savePolicy = async (policy: PushRuleSet["policies"][number]) => {
    setSavingRules(true);
    try {
      const { data } = await updateDraftPushSegmentPolicy(policy.segment, policy);
      setRuleSet(data);
      setSuccess("Политика сегмента сохранена в draft");
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || "Не удалось сохранить политику");
    } finally {
      setSavingRules(false);
    }
  };

  const updateScenario = async (scenario: PushScenario, patch: Partial<PushScenario>) => {
    setSavingRules(true);
    try {
      const { data } = await updateDraftPushScenario(scenario.key, patch);
      setRuleSet(data);
      setSuccess("Сценарий сохранен в draft");
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || "Не удалось сохранить сценарий");
    } finally {
      setSavingRules(false);
    }
  };

  const updateTemplate = async (templateId: string, patch: any) => {
    setSavingRules(true);
    try {
      const { data } = await updateDraftPushTemplate(templateId, patch);
      setRuleSet(data);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || "Не удалось сохранить текст");
    } finally {
      setSavingRules(false);
    }
  };

  const createTemplate = async () => {
    if (!selectedScenario || !newTemplateBody.trim()) return;
    setSavingRules(true);
    try {
      const { data } = await createDraftPushTemplate(selectedScenario.key, {
        language: "ru",
        title: newTemplateTitle.trim() || "ILM HUB",
        body: newTemplateBody.trim(),
        isActive: true,
      });
      setRuleSet(data);
      setNewTemplateBody("");
      setNewTemplateTitle("ILM HUB");
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || "Не удалось добавить текст");
    } finally {
      setSavingRules(false);
    }
  };

  const handleValidate = async () => {
    const { data } = await validateDraftPushRules();
    setValidation(data);
  };

  const handlePublish = async () => {
    setSavingRules(true);
    try {
      const { data } = await publishDraftPushRules();
      setRuleSet(data);
      setValidation({ ok: true, errors: [] });
      setSuccess(`Опубликована версия ${data.version}`);
      await reloadRules();
    } catch (e: any) {
      const errors = e?.response?.data?.errors;
      setValidation({ ok: false, errors: Array.isArray(errors) ? errors : [e?.response?.data?.message || e?.message] });
    } finally {
      setSavingRules(false);
    }
  };

  const handleRollback = async () => {
    setSavingRules(true);
    try {
      const { data } = await rollbackPushRules();
      setSuccess(`Откат выполнен к версии ${data.version}`);
      await reloadRules();
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || "Не удалось выполнить rollback");
    } finally {
      setSavingRules(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="420px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box className="animate-fade-in">
      <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2} sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h3" sx={{ fontWeight: 800 }}>
            Push-уведомления
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            Ручная отправка, журнал, правила, тексты и версии
          </Typography>
        </Box>
        <Button variant="outlined" onClick={loadInitialData} disabled={sending || savingRules}>
          Обновить
        </Button>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess("")}>{success}</Alert>}

      <Paper sx={{ mb: 2 }}>
        <Tabs value={tab} onChange={(_, value) => setTab(value)} variant="scrollable" scrollButtons="auto">
          <Tab label="Ручная отправка" />
          <Tab label="Журнал" />
          <Tab label="Правила" />
          <Tab label="Тексты" />
          <Tab label="Версии" />
        </Tabs>
      </Paper>

      {tab === 0 && (
        <Stack spacing={2}>
          <Stack direction={{ xs: "column", lg: "row" }} spacing={2} alignItems="stretch">
            <Paper sx={{ p: 2.5, flex: 1 }}>
              <Stack spacing={2.25}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <NotificationsActiveOutlined color="primary" />
                  <Typography variant="h6">Аудитория</Typography>
                </Stack>
                <RadioGroup row value={target} onChange={(e) => setTarget(e.target.value as PushTarget)}>
                  <FormControlLabel value="segment" control={<Radio />} label="Сегмент" />
                  <FormControlLabel value="users" control={<Radio />} label="Пользователи" />
                </RadioGroup>
                {target === "segment" ? (
                  <FormControl fullWidth>
                    <InputLabel>Сегмент</InputLabel>
                    <Select value={segment} label="Сегмент" onChange={(e) => setSegment(e.target.value as PushSegment)}>
                      {(Object.keys(segmentLabels) as PushSegment[]).map((key) => (
                        <MenuItem key={key} value={key}>
                          {segmentLabels[key]} · {segments?.[key]?.users ?? 0} users / {segments?.[key]?.tokens ?? 0} tokens
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                ) : (
                  <Autocomplete
                    multiple
                    options={users}
                    value={selectedUsers}
                    onChange={(_, value) => setSelectedUsers(value)}
                    getOptionLabel={(option) => `${option.name || "Без имени"} · ${option.email}`}
                    renderTags={(value, getTagProps) =>
                      value.map((option, index) => (
                        <Chip label={option.email} size="small" {...getTagProps({ index })} />
                      ))
                    }
                    renderInput={(params) => <TextField {...params} label="Пользователи" placeholder="Email или имя" />}
                  />
                )}
                <FormControlLabel
                  control={<Switch checked={respectUserSettings} onChange={(e) => setRespectUserSettings(e.target.checked)} />}
                  label="Учитывать настройку Push в профиле пользователя"
                />
                <Alert severity="info" icon={false}>Получатели: {recipientHint}</Alert>
              </Stack>
            </Paper>

            <Paper sx={{ p: 2.5, flex: 1.2 }}>
              <Stack spacing={2}>
                <Typography variant="h6">Сообщение</Typography>
                <TextField label="Заголовок" value={title} onChange={(e) => setTitle(e.target.value)} fullWidth />
                <TextField label="Текст" value={body} onChange={(e) => setBody(e.target.value)} fullWidth multiline minRows={4} inputProps={{ maxLength: 240 }} helperText={`${body.length}/240`} />
                <TextField label="Route при открытии" value={route} onChange={(e) => setRoute(e.target.value)} fullWidth placeholder="/home" />
                <Divider />
                <Button variant="contained" size="large" startIcon={sending ? <CircularProgress color="inherit" size={18} /> : <SendOutlined />} onClick={handleSend} disabled={!canSend || sending} sx={{ alignSelf: { xs: "stretch", sm: "flex-end" } }}>
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
                    <Typography variant="body2" color="text.secondary">{segmentLabels[key]}</Typography>
                    <Typography variant="h5" sx={{ mt: 0.5 }}>{segments[key].users}</Typography>
                    <Typography variant="caption" color="text.secondary">{segments[key].tokens} устройств</Typography>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          )}
        </Stack>
      )}

      {tab === 1 && (
        <Paper sx={{ p: 2.5 }}>
          <Stack spacing={2}>
            <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1.5}>
              <Box>
                <Typography variant="h6">История отправок</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                  Автоматические и ручные push из журнала notification_logs
                </Typography>
              </Box>
              <Button variant="outlined" onClick={loadPushLogs} disabled={logsLoading}>Обновить историю</Button>
            </Stack>
            <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
              <TextField label="Поиск" value={logSearch} onChange={(e) => { setLogSearch(e.target.value); setLogPage(0); }} size="small" fullWidth placeholder="Email, имя, текст или user ID" />
              <FormControl size="small" sx={{ minWidth: { xs: "100%", md: 190 } }}>
                <InputLabel>Сегмент</InputLabel>
                <Select value={logSegment} label="Сегмент" onChange={(e) => { setLogSegment(e.target.value); setLogPage(0); }}>
                  <MenuItem value="">Все сегменты</MenuItem>
                  <MenuItem value="free">Free</MenuItem>
                  <MenuItem value="paid_no_plan">Premium без плана</MenuItem>
                  <MenuItem value="paid_with_plan">Premium с планом</MenuItem>
                  <MenuItem value="all">Manual: all</MenuItem>
                  <MenuItem value="manual_users">Manual: users</MenuItem>
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: { xs: "100%", md: 210 } }}>
                <InputLabel>Тип</InputLabel>
                <Select value={logType} label="Тип" onChange={(e) => { setLogType(e.target.value); setLogPage(0); }}>
                  <MenuItem value="">Все типы</MenuItem>
                  {Object.entries(pushTypeLabels).map(([value, label]) => (
                    <MenuItem key={value} value={value}>{label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: { xs: "100%", md: 160 } }}>
                <InputLabel>Статус</InputLabel>
                <Select value={logStatus} label="Статус" onChange={(e) => { setLogStatus(e.target.value); setLogPage(0); }}>
                  <MenuItem value="">Все статусы</MenuItem>
                  <MenuItem value="sent">Отправлено</MenuItem>
                  <MenuItem value="failed">Ошибка</MenuItem>
                  <MenuItem value="disabled">Firebase выключен</MenuItem>
                </Select>
              </FormControl>
            </Stack>
            {logsError && <Alert severity="error">{logsError}</Alert>}
            <TableContainer sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Дата</TableCell>
                    <TableCell>Получатель</TableCell>
                    <TableCell>Тип</TableCell>
                    <TableCell>Сообщение</TableCell>
                    <TableCell>Открыт</TableCell>
                    <TableCell align="right">Статус</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {logsLoading ? (
                    <TableRow><TableCell colSpan={6} sx={{ py: 5, textAlign: "center" }}><CircularProgress size={24} /></TableCell></TableRow>
                  ) : logs.length === 0 ? (
                    <TableRow><TableCell colSpan={6} sx={{ py: 5, textAlign: "center" }}><Typography color="text.secondary">Пока нет записей по выбранным фильтрам</Typography></TableCell></TableRow>
                  ) : (
                    logs.map((log) => (
                      <TableRow key={log.id} hover>
                        <TableCell sx={{ whiteSpace: "nowrap" }}><Typography variant="body2">{formatPushDate(log.sentAt)}</Typography></TableCell>
                        <TableCell sx={{ minWidth: 220 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, wordBreak: "break-word" }}>{log.user?.email || log.user?.name || "Без email"}</Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "monospace", wordBreak: "break-all" }}>{log.userId}</Typography>
                        </TableCell>
                        <TableCell sx={{ minWidth: 190 }}>
                          <Chip size="small" label={pushTypeLabels[log.type] || log.type} />
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>{log.segment}</Typography>
                          {log.route && <Typography variant="caption" color="text.secondary" display="block">{log.route}</Typography>}
                        </TableCell>
                        <TableCell sx={{ minWidth: 260 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, wordBreak: "break-word" }}>{log.title || "Без заголовка"}</Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ wordBreak: "break-word" }}>{log.body || "—"}</Typography>
                        </TableCell>
                        <TableCell>{formatPushDate(log.openedAt)}</TableCell>
                        <TableCell align="right"><Chip size="small" color={getStatusColor(log.deliveryStatus)} label={statusLabels[log.deliveryStatus] || log.deliveryStatus} /></TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination component="div" count={logsTotal} page={logPage} onPageChange={(_, page) => setLogPage(page)} rowsPerPage={logRowsPerPage} onRowsPerPageChange={(e) => { setLogRowsPerPage(parseInt(e.target.value, 10)); setLogPage(0); }} rowsPerPageOptions={[25, 50, 100, 200]} labelRowsPerPage="Строк:" />
          </Stack>
        </Paper>
      )}

      {tab === 2 && ruleSet && (
        <Stack spacing={2}>
          <Alert severity="info">Редактируется draft v{ruleSet.version}. Реальные отправки используют только опубликованную версию после Publish.</Alert>
          <Paper sx={{ p: 2.5 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Политики сегментов</Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Сегмент</TableCell>
                    <TableCell>Лимит/день</TableCell>
                    <TableCell>Интервал, мин</TableCell>
                    <TableCell>Тихий час</TableCell>
                    <TableCell>Активность</TableCell>
                    <TableCell align="right">Действие</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {ruleSet.policies.map((policy) => (
                    <TableRow key={policy.id}>
                      <TableCell>{segmentLabels[policy.segment]}</TableCell>
                      <TableCell><TextField type="number" size="small" value={policy.dailyLimit} onChange={(e) => setRuleSet({ ...ruleSet, policies: ruleSet.policies.map((p) => p.id === policy.id ? { ...p, dailyLimit: Number(e.target.value) } : p) })} /></TableCell>
                      <TableCell><TextField type="number" size="small" value={policy.minIntervalMinutes} onChange={(e) => setRuleSet({ ...ruleSet, policies: ruleSet.policies.map((p) => p.id === policy.id ? { ...p, minIntervalMinutes: Number(e.target.value) } : p) })} /></TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1}>
                          <TextField size="small" value={policy.quietStart} onChange={(e) => setRuleSet({ ...ruleSet, policies: ruleSet.policies.map((p) => p.id === policy.id ? { ...p, quietStart: e.target.value } : p) })} />
                          <TextField size="small" value={policy.quietEnd} onChange={(e) => setRuleSet({ ...ruleSet, policies: ruleSet.policies.map((p) => p.id === policy.id ? { ...p, quietEnd: e.target.value } : p) })} />
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <FormControlLabel control={<Switch checked={policy.suppressOnSameDayActivity} onChange={(e) => setRuleSet({ ...ruleSet, policies: ruleSet.policies.map((p) => p.id === policy.id ? { ...p, suppressOnSameDayActivity: e.target.checked } : p) })} />} label="Не слать активным" />
                      </TableCell>
                      <TableCell align="right"><Button onClick={() => savePolicy(policy)} disabled={savingRules}>Сохранить</Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

          <Paper sx={{ p: 2.5 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Сценарии</Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Вкл.</TableCell>
                    <TableCell>Приоритет</TableCell>
                    <TableCell>Сценарий</TableCell>
                    <TableCell>Сегмент</TableCell>
                    <TableCell>Route</TableCell>
                    <TableCell>Окна</TableCell>
                    <TableCell>Reminders</TableCell>
                    <TableCell>Нед./день</TableCell>
                    <TableCell align="right">Действие</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {ruleSet.scenarios.map((scenario) => (
                    <TableRow key={scenario.id}>
                      <TableCell><Switch checked={scenario.enabled} onChange={(e) => updateScenario(scenario, { enabled: e.target.checked })} /></TableCell>
                      <TableCell><TextField type="number" size="small" value={scenario.priority} onChange={(e) => updateScenario(scenario, { priority: Number(e.target.value) })} sx={{ width: 95 }} /></TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>{pushTypeLabels[scenario.key] || scenario.key}</Typography>
                        <Typography variant="caption" color="text.secondary">{scenario.triggerType}</Typography>
                      </TableCell>
                      <TableCell>{segmentLabels[scenario.segment]}</TableCell>
                      <TableCell><TextField size="small" value={scenario.route} onChange={(e) => setRuleSet({ ...ruleSet, scenarios: ruleSet.scenarios.map((s) => s.id === scenario.id ? { ...s, route: e.target.value } : s) })} onBlur={(e) => updateScenario(scenario, { route: e.target.value })} /></TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          placeholder="19:00-21:00"
                          value={formatWindows(scenario.allowedWindows)}
                          onChange={(e) => setRuleSet({ ...ruleSet, scenarios: ruleSet.scenarios.map((s) => s.id === scenario.id ? { ...s, allowedWindows: parseWindows(e.target.value) } : s) })}
                          onBlur={(e) => updateScenario(scenario, { allowedWindows: parseWindows(e.target.value) })}
                          sx={{ minWidth: 190 }}
                        />
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={scenario.requiresStudyReminders}
                          onChange={(e) => updateScenario(scenario, { requiresStudyReminders: e.target.checked })}
                        />
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1}>
                          <TextField label="week" type="number" size="small" value={scenario.maxPerWeek ?? ""} onChange={(e) => updateScenario(scenario, { maxPerWeek: e.target.value ? Number(e.target.value) : null })} sx={{ width: 90 }} />
                          <TextField label="day" type="number" size="small" value={scenario.maxPerDay ?? ""} onChange={(e) => updateScenario(scenario, { maxPerDay: e.target.value ? Number(e.target.value) : null })} sx={{ width: 90 }} />
                        </Stack>
                      </TableCell>
                      <TableCell align="right"><Button onClick={() => setSelectedScenarioKey(scenario.key)}>Тексты</Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Stack>
      )}

      {tab === 3 && ruleSet && (
        <Stack spacing={2}>
          <Paper sx={{ p: 2.5 }}>
            <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }}>
              <FormControl sx={{ minWidth: 280 }}>
                <InputLabel>Сценарий</InputLabel>
                <Select value={selectedScenarioKey} label="Сценарий" onChange={(e) => setSelectedScenarioKey(e.target.value)}>
                  {ruleSet.scenarios.map((scenario) => (
                    <MenuItem key={scenario.key} value={scenario.key}>{pushTypeLabels[scenario.key] || scenario.key}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              {selectedScenario && (
                <Chip label={`${selectedScenario.templates.filter((t) => t.isActive).length} active / ${selectedScenario.templates.length} total`} />
              )}
            </Stack>
          </Paper>

          {selectedScenario && (
            <Paper sx={{ p: 2.5 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>Тексты: {pushTypeLabels[selectedScenario.key] || selectedScenario.key}</Typography>
              <Stack spacing={1.5}>
                {selectedScenario.templates.map((template) => (
                  <Stack key={template.id} direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ md: "flex-start" }}>
                    <FormControlLabel control={<Switch checked={template.isActive} onChange={(e) => updateTemplate(template.id, { isActive: e.target.checked })} />} label="active" />
                    <TextField size="small" label="Title" value={template.title} onChange={(e) => setRuleSet({ ...ruleSet, scenarios: ruleSet.scenarios.map((s) => s.id === selectedScenario.id ? { ...s, templates: s.templates.map((t) => t.id === template.id ? { ...t, title: e.target.value } : t) } : s) })} onBlur={(e) => updateTemplate(template.id, { title: e.target.value })} sx={{ minWidth: 180 }} />
                    <TextField size="small" label="Body" value={template.body} multiline fullWidth onChange={(e) => setRuleSet({ ...ruleSet, scenarios: ruleSet.scenarios.map((s) => s.id === selectedScenario.id ? { ...s, templates: s.templates.map((t) => t.id === template.id ? { ...t, body: e.target.value } : t) } : s) })} onBlur={(e) => updateTemplate(template.id, { body: e.target.value })} />
                    <Button color="error" onClick={async () => { const { data } = await deleteDraftPushTemplate(template.id); setRuleSet(data); }}>Удалить</Button>
                  </Stack>
                ))}
                <Divider />
                <Typography variant="subtitle1">Добавить текст</Typography>
                <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
                  <TextField label="Title" value={newTemplateTitle} onChange={(e) => setNewTemplateTitle(e.target.value)} sx={{ minWidth: 180 }} />
                  <TextField label="Body" value={newTemplateBody} onChange={(e) => setNewTemplateBody(e.target.value)} fullWidth multiline minRows={2} />
                  <Button variant="contained" onClick={createTemplate} disabled={!newTemplateBody.trim() || savingRules}>Добавить</Button>
                </Stack>
              </Stack>
            </Paper>
          )}
        </Stack>
      )}

      {tab === 4 && (
        <Stack spacing={2}>
          <Paper sx={{ p: 2.5 }}>
            <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ md: "center" }}>
              <Button variant="outlined" onClick={async () => { await createDraftPushRules(); await reloadRules(); }}>Создать/обновить draft</Button>
              <Button variant="outlined" onClick={handleValidate}>Проверить draft</Button>
              <Button variant="contained" onClick={handlePublish} disabled={savingRules}>Publish</Button>
              <Button color="warning" onClick={handleRollback} disabled={savingRules}>Rollback</Button>
            </Stack>
            {validation && (
              <Alert severity={validation.ok ? "success" : "error"} sx={{ mt: 2 }}>
                {validation.ok ? "Draft валиден" : validation.errors.join("; ")}
              </Alert>
            )}
          </Paper>
          <Paper sx={{ p: 2.5 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Версии</Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Версия</TableCell>
                    <TableCell>Статус</TableCell>
                    <TableCell>Название</TableCell>
                    <TableCell>Published</TableCell>
                    <TableCell>Updated</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {versions.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>v{item.version}</TableCell>
                      <TableCell><Chip size="small" label={item.status} /></TableCell>
                      <TableCell>{item.name}</TableCell>
                      <TableCell>{formatPushDate(item.publishedAt)}</TableCell>
                      <TableCell>{formatPushDate(item.updatedAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Stack>
      )}
    </Box>
  );
}
