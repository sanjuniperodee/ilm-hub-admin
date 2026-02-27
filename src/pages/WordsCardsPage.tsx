import { useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import {
  Add,
  Audiotrack,
  Delete,
  Edit,
  ExpandLess,
  ExpandMore,
  Image as ImageIcon,
  Refresh,
} from '@mui/icons-material'
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
import FormControlLabel from '@mui/material/FormControlLabel'
import Switch from '@mui/material/Switch'

interface CardTheme {
  id: string
  emoji: string
  titleRu: string
  orderIndex: number
  isActive: boolean
  quizEnabled?: boolean
  cardsCount: number
}

interface QuizStats {
  totalAttempts: number
  avgScorePercent: number
  lastAttempt: { correctCount: number; incorrectCount: number; totalQuestions: number; createdAt: string } | null
}

interface WordCard {
  id: string
  themeId: string
  arabic: string
  translit?: string | null
  translationRu: string
  imageUrl?: string | null
  audioUrl?: string | null
  orderIndex: number
  isActive: boolean
}

export default function WordsCardsPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [themes, setThemes] = useState<CardTheme[]>([])
  const [expandedThemeId, setExpandedThemeId] = useState<string | null>(null)
  const [themeCards, setThemeCards] = useState<Record<string, WordCard[]>>({})
  const [quizStats, setQuizStats] = useState<Record<string, QuizStats>>({})

  const [themeDialogOpen, setThemeDialogOpen] = useState(false)
  const [editingTheme, setEditingTheme] = useState<CardTheme | null>(null)
  const [themeForm, setThemeForm] = useState({ emoji: '', titleRu: '', orderIndex: 0, quizEnabled: true })

  const [cardDialogOpen, setCardDialogOpen] = useState(false)
  const [editingCard, setEditingCard] = useState<WordCard | null>(null)
  const [cardForm, setCardForm] = useState({ themeId: '', arabic: '', translit: '', translationRu: '', orderIndex: 0 })

  const loadThemes = async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await getWordCardThemes()
      setThemes(data.themes || [])
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Error loading themes')
    } finally {
      setLoading(false)
    }
  }

  const loadCards = async (themeId: string) => {
    try {
      const { data } = await getWordCards(themeId)
      setThemeCards((prev) => ({ ...prev, [themeId]: data.cards || [] }))
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Error loading cards')
    }
  }

  useEffect(() => {
    loadThemes()
  }, [])

  const toggleExpand = (themeId: string) => {
    if (expandedThemeId === themeId) {
      setExpandedThemeId(null)
    } else {
      setExpandedThemeId(themeId)
      if (!themeCards[themeId]) loadCards(themeId)
      getWordCardQuizStats(themeId)
        .then(({ data }) => setQuizStats((prev) => ({ ...prev, [themeId]: data })))
        .catch(() => {})
    }
  }

  const openCreateTheme = () => {
    setEditingTheme(null)
    setThemeForm({ emoji: '', titleRu: '', orderIndex: themes.length, quizEnabled: true })
    setThemeDialogOpen(true)
  }

  const openEditTheme = (theme: CardTheme) => {
    setEditingTheme(theme)
    setThemeForm({
      emoji: theme.emoji,
      titleRu: theme.titleRu,
      orderIndex: theme.orderIndex,
      quizEnabled: theme.quizEnabled !== false,
    })
    setThemeDialogOpen(true)
  }

  const handleSaveTheme = async () => {
    try {
      if (editingTheme) {
        await updateWordCardTheme(editingTheme.id, themeForm)
        setSuccess('Theme updated')
      } else {
        await createWordCardTheme(themeForm)
        setSuccess('Theme created')
      }
      setThemeDialogOpen(false)
      loadThemes()
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Error saving theme')
    }
  }

  const handleDeleteTheme = async (id: string) => {
    if (!window.confirm('Delete this theme and all its cards?')) return
    try {
      await deleteWordCardTheme(id)
      setSuccess('Theme deleted')
      loadThemes()
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Error deleting theme')
    }
  }

  const openCreateCard = (themeId: string) => {
    setEditingCard(null)
    const existing = themeCards[themeId] || []
    setCardForm({ themeId, arabic: '', translit: '', translationRu: '', orderIndex: existing.length })
    setCardDialogOpen(true)
  }

  const openEditCard = (card: WordCard) => {
    setEditingCard(card)
    setCardForm({
      themeId: card.themeId,
      arabic: card.arabic,
      translit: card.translit || '',
      translationRu: card.translationRu,
      orderIndex: card.orderIndex,
    })
    setCardDialogOpen(true)
  }

  const handleSaveCard = async () => {
    try {
      if (editingCard) {
        await updateWordCard(editingCard.id, {
          arabic: cardForm.arabic,
          translit: cardForm.translit || null,
          translationRu: cardForm.translationRu,
          orderIndex: cardForm.orderIndex,
        })
        setSuccess('Card updated')
      } else {
        await createWordCard(cardForm)
        setSuccess('Card created')
      }
      setCardDialogOpen(false)
      loadCards(cardForm.themeId)
      loadThemes()
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Error saving card')
    }
  }

  const handleDeleteCard = async (card: WordCard) => {
    if (!window.confirm('Delete this card?')) return
    try {
      await deleteWordCard(card.id)
      setSuccess('Card deleted')
      loadCards(card.themeId)
      loadThemes()
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Error deleting card')
    }
  }

  const handleUploadAudio = async (card: WordCard) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'audio/*'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      try {
        await uploadWordCardAudio(card.id, file)
        setSuccess('Audio uploaded')
        loadCards(card.themeId)
      } catch (e: any) {
        setError(e?.response?.data?.message || e?.message || 'Error uploading audio')
      }
    }
    input.click()
  }

  const handleUploadImage = async (card: WordCard) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      try {
        await uploadWordCardImage(card.id, file)
        setSuccess('Image uploaded')
        loadCards(card.themeId)
      } catch (e: any) {
        setError(e?.response?.data?.message || e?.message || 'Error uploading image')
      }
    }
    input.click()
  }

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h4">Word Cards</Typography>
        <Stack direction="row" spacing={1}>
          <Button startIcon={<Refresh />} onClick={loadThemes} disabled={loading}>
            Refresh
          </Button>
          <Button variant="contained" startIcon={<Add />} onClick={openCreateTheme}>
            Add Theme
          </Button>
        </Stack>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {themes.map((theme) => (
        <Card key={theme.id} sx={{ mb: 2 }}>
          <CardContent sx={{ pb: expandedThemeId === theme.id ? 0 : undefined }}>
            <Stack direction="row" alignItems="center" spacing={2}>
              <Typography variant="h5">{theme.emoji}</Typography>
              <Box flex={1}>
                <Typography variant="h6">{theme.titleRu}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {theme.cardsCount} cards &middot; order: {theme.orderIndex}
                </Typography>
              </Box>
              <Chip
                label={theme.quizEnabled !== false ? 'Quiz on' : 'Quiz off'}
                color={theme.quizEnabled !== false ? 'primary' : 'default'}
                size="small"
              />
              <Chip
                label={theme.isActive ? 'Active' : 'Inactive'}
                color={theme.isActive ? 'success' : 'default'}
                size="small"
              />
              <IconButton size="small" onClick={() => openEditTheme(theme)}>
                <Edit fontSize="small" />
              </IconButton>
              <IconButton size="small" color="error" onClick={() => handleDeleteTheme(theme.id)}>
                <Delete fontSize="small" />
              </IconButton>
              <IconButton onClick={() => toggleExpand(theme.id)}>
                {expandedThemeId === theme.id ? <ExpandLess /> : <ExpandMore />}
              </IconButton>
            </Stack>
          </CardContent>

          <Collapse in={expandedThemeId === theme.id}>
            <Box sx={{ px: 2, pb: 2 }}>
              {quizStats[theme.id] && (
                <Box sx={{ mb: 2, p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Quiz stats
                  </Typography>
                  <Typography variant="body2">
                    Attempts: {quizStats[theme.id].totalAttempts} &middot; Avg score:{' '}
                    {quizStats[theme.id].avgScorePercent}%
                    {quizStats[theme.id].lastAttempt && (
                      <> &middot; Last: {quizStats[theme.id].lastAttempt!.correctCount}/{quizStats[theme.id].lastAttempt!.totalQuestions}</>
                    )}
                  </Typography>
                </Box>
              )}
              <Stack direction="row" justifyContent="flex-end" sx={{ mb: 1 }}>
                <Button size="small" startIcon={<Add />} onClick={() => openCreateCard(theme.id)}>
                  Add Card
                </Button>
              </Stack>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>#</TableCell>
                    <TableCell>Arabic</TableCell>
                    <TableCell>Translit</TableCell>
                    <TableCell>Translation (RU)</TableCell>
                    <TableCell>Media</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(themeCards[theme.id] || []).map((card, idx) => (
                    <TableRow key={card.id}>
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell sx={{ fontFamily: 'serif', fontSize: 18 }}>{card.arabic}</TableCell>
                      <TableCell>{card.translit || '—'}</TableCell>
                      <TableCell>{card.translationRu}</TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.5}>
                          <IconButton
                            size="small"
                            color={card.audioUrl ? 'primary' : 'default'}
                            onClick={() => handleUploadAudio(card)}
                            title="Upload audio"
                          >
                            <Audiotrack fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            color={card.imageUrl ? 'primary' : 'default'}
                            onClick={() => handleUploadImage(card)}
                            title="Upload image"
                          >
                            <ImageIcon fontSize="small" />
                          </IconButton>
                        </Stack>
                      </TableCell>
                      <TableCell align="right">
                        <IconButton size="small" onClick={() => openEditCard(card)}>
                          <Edit fontSize="small" />
                        </IconButton>
                        <IconButton size="small" color="error" onClick={() => handleDeleteCard(card)}>
                          <Delete fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(themeCards[theme.id] || []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        <Typography variant="body2" color="text.secondary">
                          No cards yet
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Box>
          </Collapse>
        </Card>
      ))}

      {/* Theme Dialog */}
      <Dialog open={themeDialogOpen} onClose={() => setThemeDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingTheme ? 'Edit Theme' : 'Create Theme'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Emoji"
              value={themeForm.emoji}
              onChange={(e) => setThemeForm({ ...themeForm, emoji: e.target.value })}
              inputProps={{ maxLength: 8 }}
            />
            <TextField
              label="Title (RU)"
              value={themeForm.titleRu}
              onChange={(e) => setThemeForm({ ...themeForm, titleRu: e.target.value })}
            />
            <TextField
              label="Order"
              type="number"
              value={themeForm.orderIndex}
              onChange={(e) => setThemeForm({ ...themeForm, orderIndex: Number(e.target.value) })}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={themeForm.quizEnabled}
                  onChange={(e) => setThemeForm({ ...themeForm, quizEnabled: e.target.checked })}
                />
              }
              label="Quiz enabled"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setThemeDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveTheme}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Card Dialog */}
      <Dialog open={cardDialogOpen} onClose={() => setCardDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingCard ? 'Edit Card' : 'Create Card'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Arabic"
              value={cardForm.arabic}
              onChange={(e) => setCardForm({ ...cardForm, arabic: e.target.value })}
              inputProps={{ dir: 'rtl', style: { fontFamily: 'serif', fontSize: 20 } }}
            />
            <TextField
              label="Transliteration"
              value={cardForm.translit}
              onChange={(e) => setCardForm({ ...cardForm, translit: e.target.value })}
            />
            <TextField
              label="Translation (RU)"
              value={cardForm.translationRu}
              onChange={(e) => setCardForm({ ...cardForm, translationRu: e.target.value })}
            />
            <TextField
              label="Order"
              type="number"
              value={cardForm.orderIndex}
              onChange={(e) => setCardForm({ ...cardForm, orderIndex: Number(e.target.value) })}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCardDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveCard}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
