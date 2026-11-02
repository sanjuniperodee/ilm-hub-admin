import { useCallback, useEffect, useMemo, useState } from 'react'
import { Box, Button, ButtonBase, IconButton, MenuItem, Stack, TextField, Tooltip, Typography } from '@mui/material'
import { Add, DeleteOutline, EditOutlined, Refresh, StyleOutlined } from '@mui/icons-material'
import toast from 'react-hot-toast'
import {
  getWordCardThemes,
  createWordCardTheme,
  updateWordCardTheme,
  deleteWordCardTheme,
  getWordCards,
  getWordCardQuizStats,
  createWordCard,
  updateWordCard,
  deleteWordCard,
  uploadWordCardAudio,
  uploadWordCardImage,
} from '../api/adminApi'
import {
  ArabicText,
  DataTable,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  SearchField,
  SectionCard,
  StatCard,
  StatGroup,
  StatusChip,
  Toolbar,
  getErrorMessage,
  useConfirm,
  visuallyHidden,
  type DataTableColumn,
} from '../components/ui'
import { AudioPlayButton, AudioUploadButton } from './words/shared'
import { ThemeDialog } from './words/cards/ThemeDialog'
import { CardDrawer } from './words/cards/CardDrawer'
import { CardThumb, ImageUploadIconButton } from './words/cards/media'
import { kzOrNull, type CardForm, type CardTheme, type QuizStats, type ThemeForm, type WordCard } from './words/cards/model'

const cardsWord = (n: number) => {
  const m10 = n % 10
  const m100 = n % 100
  if (m10 === 1 && m100 !== 11) return 'карточка'
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return 'карточки'
  return 'карточек'
}

export default function WordsCardsPage() {
  const confirm = useConfirm()
  const [themes, setThemes] = useState<CardTheme[]>([])
  const [themesLoading, setThemesLoading] = useState(true)
  const [themesError, setThemesError] = useState<unknown>(null)
  const [selectedThemeId, setSelectedThemeId] = useState<string | null>(null)
  const [themeCards, setThemeCards] = useState<Record<string, WordCard[]>>({})
  const [cardsError, setCardsError] = useState<Record<string, unknown>>({})
  const [quizStats, setQuizStats] = useState<Record<string, QuizStats>>({})
  const [cardQuery, setCardQuery] = useState('')
  const [kzFilter, setKzFilter] = useState<'all' | 'missing'>('all')

  const [themeDialogOpen, setThemeDialogOpen] = useState(false)
  const [editingTheme, setEditingTheme] = useState<CardTheme | null>(null)
  const [themeForm, setThemeForm] = useState<ThemeForm>({ emoji: '', titleRu: '', titleKz: '', orderIndex: 0, quizEnabled: true })
  const [savingTheme, setSavingTheme] = useState(false)

  const [cardDrawerOpen, setCardDrawerOpen] = useState(false)
  const [editingCardId, setEditingCardId] = useState<string | null>(null)
  const [cardForm, setCardForm] = useState<CardForm>({ themeId: '', arabic: '', translit: '', translationRu: '', translationKz: '', orderIndex: 0 })
  const [savingCard, setSavingCard] = useState(false)

  const loadThemes = useCallback(async () => {
    setThemesLoading(true)
    setThemesError(null)
    try {
      const { data } = await getWordCardThemes()
      const list: CardTheme[] = data.themes || []
      setThemes(list)
      setSelectedThemeId((prev) => (prev && list.some((t) => t.id === prev) ? prev : list[0]?.id ?? null))
    } catch (e) {
      setThemesError(e)
    } finally {
      setThemesLoading(false)
    }
  }, [])

  const loadCards = useCallback(async (themeId: string) => {
    setCardsError((prev) => ({ ...prev, [themeId]: null }))
    try {
      const { data } = await getWordCards(themeId)
      setThemeCards((prev) => ({ ...prev, [themeId]: data.cards || [] }))
    } catch (e) {
      setCardsError((prev) => ({ ...prev, [themeId]: e }))
    }
  }, [])

  useEffect(() => {
    loadThemes()
  }, [loadThemes])

  // Load cards once per theme; quiz stats are refreshed each time a theme is opened.
  useEffect(() => {
    if (!selectedThemeId) return
    setCardQuery('')
    setKzFilter('all')
    if (!themeCards[selectedThemeId]) loadCards(selectedThemeId)
    const themeId = selectedThemeId
    getWordCardQuizStats(themeId)
      .then(({ data }) => setQuizStats((prev) => ({ ...prev, [themeId]: data })))
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedThemeId])

  const selectedTheme = themes.find((t) => t.id === selectedThemeId) ?? null
  const cards = selectedThemeId ? themeCards[selectedThemeId] : undefined
  const editingCard = editingCardId && cards ? cards.find((c) => c.id === editingCardId) ?? null : null

  const visibleCards = useMemo(() => {
    const list = [...(cards ?? [])].sort((a, b) => a.orderIndex - b.orderIndex)
    const needle = cardQuery.toLowerCase()
    return list.filter((c) => {
      if (kzFilter === 'missing' && c.translationKz?.trim()) return false
      if (!needle) return true
      return [c.arabic, c.translit, c.translationRu, c.translationKz].some((v) => v && v.toLowerCase().includes(needle))
    })
  }, [cards, cardQuery, kzFilter])
  const cardFiltersActive = !!cardQuery || kzFilter !== 'all'
  const resetCardFilters = () => {
    setCardQuery('')
    setKzFilter('all')
  }

  /* ---------------- themes ---------------- */

  const openCreateTheme = () => {
    setEditingTheme(null)
    setThemeForm({ emoji: '', titleRu: '', titleKz: '', orderIndex: themes.length, quizEnabled: true })
    setThemeDialogOpen(true)
  }

  const openEditTheme = (theme: CardTheme) => {
    setEditingTheme(theme)
    setThemeForm({
      emoji: theme.emoji,
      titleRu: theme.titleRu,
      titleKz: theme.titleKz || '',
      orderIndex: theme.orderIndex,
      quizEnabled: theme.quizEnabled !== false,
    })
    setThemeDialogOpen(true)
  }

  const handleSaveTheme = async () => {
    setSavingTheme(true)
    try {
      const themePayload = { ...themeForm, titleKz: kzOrNull(themeForm.titleKz) }
      if (editingTheme) {
        await updateWordCardTheme(editingTheme.id, themePayload)
        toast.success('Тема сохранена')
      } else {
        await createWordCardTheme(themePayload)
        toast.success('Тема создана')
      }
      setThemeDialogOpen(false)
      loadThemes()
    } catch (e) {
      toast.error(getErrorMessage(e, 'Не удалось сохранить тему'))
    } finally {
      setSavingTheme(false)
    }
  }

  const handleDeleteTheme = async (theme: CardTheme) => {
    const ok = await confirm({
      title: 'Удалить тему?',
      description: `Тема «${theme.titleRu}» и ${theme.cardsCount} ${cardsWord(theme.cardsCount)} в ней будут удалены.`,
      confirmLabel: 'Удалить тему',
      destructive: true,
    })
    if (!ok) return
    try {
      await deleteWordCardTheme(theme.id)
      toast.success('Тема удалена')
      loadThemes()
    } catch (e) {
      toast.error(getErrorMessage(e, 'Не удалось удалить тему'))
    }
  }

  /* ---------------- cards ---------------- */

  const openCreateCard = (themeId: string) => {
    setEditingCardId(null)
    const existing = themeCards[themeId] || []
    setCardForm({ themeId, arabic: '', translit: '', translationRu: '', translationKz: '', orderIndex: existing.length })
    setCardDrawerOpen(true)
  }

  const openEditCard = (card: WordCard) => {
    setEditingCardId(card.id)
    setCardForm({
      themeId: card.themeId,
      arabic: card.arabic,
      translit: card.translit || '',
      translationRu: card.translationRu,
      translationKz: card.translationKz || '',
      orderIndex: card.orderIndex,
    })
    setCardDrawerOpen(true)
  }

  const handleSaveCard = async () => {
    setSavingCard(true)
    try {
      if (editingCardId) {
        await updateWordCard(editingCardId, {
          arabic: cardForm.arabic,
          translit: cardForm.translit || null,
          translationRu: cardForm.translationRu,
          translationKz: kzOrNull(cardForm.translationKz),
          orderIndex: cardForm.orderIndex,
        })
        toast.success('Карточка сохранена')
      } else {
        await createWordCard({ ...cardForm, translationKz: kzOrNull(cardForm.translationKz) })
        toast.success('Карточка создана')
      }
      setCardDrawerOpen(false)
      loadCards(cardForm.themeId)
      loadThemes()
    } catch (e) {
      toast.error(getErrorMessage(e, 'Не удалось сохранить карточку'))
    } finally {
      setSavingCard(false)
    }
  }

  const handleDeleteCard = async (card: WordCard) => {
    const ok = await confirm({
      title: 'Удалить карточку?',
      description: `Карточка «${card.translationRu}» с изображением и аудио будет удалена.`,
      confirmLabel: 'Удалить карточку',
      destructive: true,
    })
    if (!ok) return
    try {
      await deleteWordCard(card.id)
      toast.success('Карточка удалена')
      if (editingCardId === card.id) setCardDrawerOpen(false)
      loadCards(card.themeId)
      loadThemes()
    } catch (e) {
      toast.error(getErrorMessage(e, 'Не удалось удалить карточку'))
    }
  }

  const handleUploadAudio = async (card: WordCard, file: File) => {
    await uploadWordCardAudio(card.id, file)
    toast.success('Аудио загружено')
    await loadCards(card.themeId)
  }

  const handleUploadImage = async (card: WordCard, file: File) => {
    await uploadWordCardImage(card.id, file)
    toast.success('Изображение загружено')
    await loadCards(card.themeId)
  }

  const columns: DataTableColumn<WordCard>[] = [
    {
      id: 'arabic',
      header: 'Слово',
      sortable: true,
      minWidth: 96,
      render: (c) => (
        <ArabicText size="md" weight={500}>
          {c.arabic}
        </ArabicText>
      ),
    },
    {
      id: 'image',
      header: 'Фото',
      width: 64,
      hideBelow: 'sm',
      render: (c) => <CardThumb url={c.imageUrl} alt={c.translationRu} />,
    },
    {
      id: 'translationRu',
      header: 'Перевод',
      sortable: true,
      render: (c) => (
        <Box>
          <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
            <Typography variant="body1" sx={{ fontWeight: 600 }}>
              {c.translationRu}
            </Typography>
            {!c.isActive && <StatusChip status="inactive" />}
          </Stack>
          {c.translationKz?.trim() ? (
            <Typography variant="body2" color="text.secondary">
              {c.translationKz}
            </Typography>
          ) : (
            <Typography variant="caption" sx={{ color: 'warning.dark', display: 'block' }}>
              Нет перевода KZ
            </Typography>
          )}
          <Typography variant="caption" color="text.secondary">
            {c.translit || 'Без транслитерации'}
          </Typography>
        </Box>
      ),
    },
    {
      id: 'media',
      header: 'Медиа',
      nowrap: true,
      render: (c) => (
        <Stack direction="row" alignItems="center" gap={0.5} onClick={(e) => e.stopPropagation()}>
          <AudioPlayButton src={c.audioUrl} label={c.translationRu} reserveSpace />
          <AudioUploadButton variant="icon" hasAudio={!!c.audioUrl} onUpload={(f) => handleUploadAudio(c, f)} itemLabel={c.translationRu} />
          <ImageUploadIconButton hasImage={!!c.imageUrl} onUpload={(f) => handleUploadImage(c, f)} itemLabel={c.translationRu} />
        </Stack>
      ),
    },
    {
      id: 'actions',
      header: <Box component="span" sx={visuallyHidden}>Действия</Box>,
      align: 'right',
      width: 96,
      render: (c) => (
        <Stack direction="row" justifyContent="flex-end" onClick={(e) => e.stopPropagation()}>
          <Tooltip title="Изменить">
            <IconButton size="small" aria-label={`Изменить карточку ${c.translationRu}`} onClick={() => openEditCard(c)}>
              <EditOutlined fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Удалить">
            <IconButton size="small" aria-label={`Удалить карточку ${c.translationRu}`} onClick={() => handleDeleteCard(c)} sx={{ color: 'error.main' }}>
              <DeleteOutline fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      ),
    },
  ]

  const renderThemes = () => {
    if (themesLoading && themes.length === 0) return <LoadingState variant="list" rows={6} label="Загружаем темы…" />
    if (themesError && themes.length === 0) {
      return <ErrorState title="Не удалось загрузить темы" error={themesError} onRetry={loadThemes} />
    }
    return (
      <Box component="ul" aria-label="Темы карточек" sx={{ listStyle: 'none', m: 0, p: 0.75, display: 'flex', flexDirection: 'column', gap: 0.25 }}>
        {themes.map((t) => {
          const selected = t.id === selectedThemeId
          return (
            <li key={t.id}>
              <ButtonBase
                onClick={() => setSelectedThemeId(t.id)}
                aria-current={selected ? 'true' : undefined}
                sx={{
                  width: '100%',
                  textAlign: 'left',
                  justifyContent: 'flex-start',
                  gap: 1.5,
                  px: 1.25,
                  py: 1,
                  borderRadius: 2,
                  bgcolor: selected ? 'brand.sand' : 'transparent',
                  '&:hover': { bgcolor: selected ? 'brand.sand' : 'brand.bronzeSoft' },
                  '&.Mui-focusVisible': { outline: '2px solid', outlineColor: 'primary.light', outlineOffset: -2 },
                }}
              >
                <Box
                  aria-hidden
                  sx={{
                    width: 36,
                    height: 36,
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.25rem',
                    borderRadius: 2,
                    bgcolor: selected ? 'background.paper' : 'surface.sunken',
                  }}
                >
                  {t.emoji || <StyleOutlined fontSize="small" />}
                </Box>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography variant="body1" sx={{ fontWeight: 600 }} noWrap>
                    {t.titleRu}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" component="p">
                    {t.cardsCount} {cardsWord(t.cardsCount)}
                    {t.quizEnabled === false ? ', без квиза' : ''}
                    {t.titleKz?.trim() ? '' : ', нет названия KZ'}
                  </Typography>
                </Box>
                {!t.isActive && <StatusChip status="inactive" label="Скрыта" />}
              </ButtonBase>
            </li>
          )
        })}
      </Box>
    )
  }

  const renderDetail = () => {
    if (!selectedTheme) return null
    const stats = quizStats[selectedTheme.id]
    const err = cardsError[selectedTheme.id]
    return (
      <SectionCard
        padding="none"
        title={
          <Stack direction="row" alignItems="center" gap={1} component="span">
            {selectedTheme.emoji && (
              <Box component="span" aria-hidden>
                {selectedTheme.emoji}
              </Box>
            )}
            {selectedTheme.titleRu}
          </Stack>
        }
        description={`${selectedTheme.titleKz?.trim() ? `KZ: ${selectedTheme.titleKz}, ` : 'Нет названия KZ, '}${selectedTheme.cardsCount} ${cardsWord(selectedTheme.cardsCount)}, порядок ${selectedTheme.orderIndex}`}
        actions={
          <>
            <Tooltip title="Изменить тему">
              <IconButton size="small" aria-label="Изменить тему" onClick={() => openEditTheme(selectedTheme)}>
                <EditOutlined fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Удалить тему">
              <IconButton size="small" aria-label="Удалить тему" onClick={() => handleDeleteTheme(selectedTheme)} sx={{ color: 'error.main' }}>
                <DeleteOutline fontSize="small" />
              </IconButton>
            </Tooltip>
          </>
        }
      >
        <Box sx={{ px: 2.5, pb: 2.5 }}>
          <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mb: 2 }}>
            <StatusChip status={selectedTheme.isActive ? 'active' : 'inactive'} label={selectedTheme.isActive ? 'Активна' : 'Скрыта'} />
            <StatusChip
              tone={selectedTheme.quizEnabled !== false ? 'brand' : 'neutral'}
              label={selectedTheme.quizEnabled !== false ? 'Квиз включён' : 'Квиз выключен'}
            />
          </Stack>
          {stats && (
            <StatGroup title="Квиз по теме" columns={{ xs: 1, sm: 3 }} sx={{ mb: 2.5 }}>
              <StatCard variant="plain" label="Попыток" value={stats.totalAttempts.toLocaleString('ru-RU')} />
              <StatCard variant="plain" label="Средний результат" value={`${stats.avgScorePercent}%`} />
              <StatCard
                variant="plain"
                label="Последняя попытка"
                value={stats.lastAttempt ? `${stats.lastAttempt.correctCount}/${stats.lastAttempt.totalQuestions}` : '—'}
                hint={stats.lastAttempt ? new Date(stats.lastAttempt.createdAt).toLocaleDateString('ru-RU') : 'Ещё не проходили'}
              />
            </StatGroup>
          )}

          <Toolbar
            hasActiveFilters={cardFiltersActive}
            onReset={resetCardFilters}
            summary={
              cards && cards.length > 0
                ? cardFiltersActive
                  ? `Найдено ${visibleCards.length} из ${cards.length}`
                  : `Без KZ ${cards.filter((c) => !c.translationKz?.trim()).length}`
                : undefined
            }
            actions={
              <Button variant="outlined" startIcon={<Add />} onClick={() => openCreateCard(selectedTheme.id)}>
                Добавить карточку
              </Button>
            }
          >
            <SearchField value={cardQuery} onChange={setCardQuery} placeholder="Слово, транслит или перевод" label="Поиск карточек" sx={{ minWidth: { sm: 300 } }} />
            <TextField
              select
              size="small"
              label="Казахский"
              value={kzFilter}
              onChange={(e) => setKzFilter(e.target.value as 'all' | 'missing')}
              sx={{ minWidth: 170 }}
            >
              <MenuItem value="all">Все</MenuItem>
              <MenuItem value="missing">Не заполнен KZ</MenuItem>
            </TextField>
          </Toolbar>

          <DataTable
            aria-label={`Карточки темы ${selectedTheme.titleRu}`}
            columns={columns}
            rows={cards ? visibleCards : undefined}
            getRowId={(c) => c.id}
            loading={!cards && !err}
            error={err}
            onRetry={() => loadCards(selectedTheme.id)}
            onRowClick={openEditCard}
            selectedRowId={cardDrawerOpen ? editingCardId : null}
            pagination
            initialRowsPerPage={50}
            emptyState={
              cardFiltersActive ? (
                <EmptyState
                  size="sm"
                  title="Ничего не найдено"
                  description="Измените запрос или сбросьте фильтры."
                  action={<Button onClick={resetCardFilters}>Сбросить фильтры</Button>}
                />
              ) : (
                <EmptyState
                  size="sm"
                  title="В теме пока нет карточек"
                  description="Карточка — это слово с картинкой и аудио для изучения и квиза."
                  action={
                    <Button variant="contained" startIcon={<Add />} onClick={() => openCreateCard(selectedTheme.id)}>
                      Добавить карточку
                    </Button>
                  }
                />
              )
            }
          />
        </Box>
      </SectionCard>
    )
  }

  const noThemes = !themesLoading && !themesError && themes.length === 0

  return (
    <>
      <PageHeader
        title="Карточки слов"
        subtitle="Темы со словами-карточками: картинка, аудио и квиз в приложении."
        actions={
          <>
            <Button variant="outlined" startIcon={<Refresh />} onClick={loadThemes} disabled={themesLoading}>
              Обновить
            </Button>
            <Button variant="contained" startIcon={<Add />} onClick={openCreateTheme}>
              Добавить тему
            </Button>
          </>
        }
      />

      {noThemes ? (
        <SectionCard>
          <EmptyState
            title="Тем пока нет"
            description="Создайте первую тему, например «Семья» или «Еда», и добавьте в неё карточки."
            action={
              <Button variant="contained" startIcon={<Add />} onClick={openCreateTheme}>
                Добавить тему
              </Button>
            }
          />
        </SectionCard>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gap: 2.5,
            gridTemplateColumns: { xs: '1fr', md: '280px minmax(0, 1fr)', xl: '320px minmax(0, 1fr)' },
            alignItems: 'start',
          }}
        >
          <SectionCard
            title="Темы"
            description={themes.length ? `${themes.length} в приложении` : undefined}
            padding="none"
            sx={{ position: { md: 'sticky' }, top: { md: 80 } }}
          >
            {renderThemes()}
          </SectionCard>
          <Box sx={{ minWidth: 0 }}>{renderDetail()}</Box>
        </Box>
      )}

      <ThemeDialog
        open={themeDialogOpen}
        isEdit={!!editingTheme}
        form={themeForm}
        saving={savingTheme}
        onChange={setThemeForm}
        onClose={() => setThemeDialogOpen(false)}
        onSave={handleSaveTheme}
      />

      <CardDrawer
        open={cardDrawerOpen}
        card={editingCard}
        themeTitle={themes.find((t) => t.id === cardForm.themeId)?.titleRu ?? ''}
        form={cardForm}
        saving={savingCard}
        onChange={setCardForm}
        onClose={() => setCardDrawerOpen(false)}
        onSave={handleSaveCard}
        onUploadAudio={handleUploadAudio}
        onUploadImage={handleUploadImage}
      />
    </>
  )
}
