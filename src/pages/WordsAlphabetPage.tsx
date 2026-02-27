import { useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Grid,
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
import { Audiotrack, Refresh, Save } from '@mui/icons-material'
import {
  getWordsAlphabet,
  updateWordLetter,
  uploadWordLetterAudio,
} from '../api/adminApi'

interface WordLetter {
  id: string
  code: string
  orderIndex: number
  arabic: string
  nameRu: string
  translit?: string | null
  important?: string | null
  audioUrl?: string | null
}

export default function WordsAlphabetPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [letters, setLetters] = useState<WordLetter[]>([])

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await getWordsAlphabet()
      const list: WordLetter[] = (data.letters || []).sort(
        (a: WordLetter, b: WordLetter) => a.orderIndex - b.orderIndex,
      )
      setLetters(list)
    } catch (e: any) {
      const msg =
        e?.response?.data?.message?.[0] || e?.response?.data?.message || e?.message || 'Ошибка загрузки алфавита'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const handleFieldChange = (code: string, field: keyof WordLetter, value: any) => {
    setLetters((prev) =>
      prev.map((l) => (l.code === code ? { ...l, [field]: field === 'orderIndex' ? Number(value) || 0 : value } : l)),
    )
  }

  const handleSaveLetter = async (letter: WordLetter) => {
    try {
      setLoading(true)
      setError('')
      setSuccess('')
      await updateWordLetter(letter.code, {
        nameRu: letter.nameRu,
        translit: letter.translit,
        important: letter.important,
        orderIndex: letter.orderIndex,
      })
      setSuccess(`Буква ${letter.code} обновлена`)
      await load()
    } catch (e: any) {
      const msg =
        e?.response?.data?.message?.[0] || e?.response?.data?.message || e?.message || 'Ошибка сохранения буквы'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleUploadAudio = async (code: string, file: File | null) => {
    if (!file) return
    try {
      setLoading(true)
      setError('')
      setSuccess('')
      await uploadWordLetterAudio(code, file)
      setSuccess(`Аудио для ${code} загружено`)
      await load()
    } catch (e: any) {
      const msg =
        e?.response?.data?.message?.[0] || e?.response?.data?.message || e?.message || 'Ошибка загрузки аудио'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, letterSpacing: -0.4 }}>
            Words / Алфавит
          </Typography>
          <Typography color="text.secondary">
            Управление буквами алфавита и аудио‑произношением для мобильного приложения.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={load}
            disabled={loading}
          >
            Обновить
          </Button>
        </Stack>
      </Stack>

      {loading && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Загрузка...
        </Alert>
      )}
      {!!error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {!!success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ width: 60 }}>№</TableCell>
                    <TableCell sx={{ width: 80 }}>Араб.</TableCell>
                    <TableCell>Название (RU)</TableCell>
                    <TableCell>Транслит</TableCell>
                    <TableCell>Важно знать</TableCell>
                    <TableCell sx={{ width: 120 }}>Аудио</TableCell>
                    <TableCell sx={{ width: 90 }} />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {letters.map((letter) => (
                    <TableRow key={letter.id}>
                      <TableCell>
                        <TextField
                          type="number"
                          size="small"
                          value={letter.orderIndex}
                          onChange={(e) => handleFieldChange(letter.code, 'orderIndex', e.target.value)}
                          sx={{ width: 70 }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="h5" sx={{ textAlign: 'center' }}>
                          {letter.arabic}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <TextField
                          fullWidth
                          size="small"
                          value={letter.nameRu}
                          onChange={(e) => handleFieldChange(letter.code, 'nameRu', e.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          fullWidth
                          size="small"
                          value={letter.translit || ''}
                          onChange={(e) => handleFieldChange(letter.code, 'translit', e.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          fullWidth
                          size="small"
                          multiline
                          minRows={2}
                          value={letter.important || ''}
                          onChange={(e) => handleFieldChange(letter.code, 'important', e.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Button
                            component="label"
                            size="small"
                            variant="outlined"
                            startIcon={<Audiotrack />}
                          >
                            {letter.audioUrl ? 'Заменить' : 'Загрузить'}
                            <input
                              type="file"
                              accept="audio/*"
                              hidden
                              onChange={(e) => handleUploadAudio(letter.code, e.target.files?.[0] || null)}
                            />
                          </Button>
                        </Stack>
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handleSaveLetter(letter)}
                        >
                          <Save fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}

