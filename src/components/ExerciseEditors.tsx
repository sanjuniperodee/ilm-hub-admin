import { useState, useEffect } from 'react'
import {
    Box,
    TextField,
    Button,
    IconButton,
    Typography,
    Checkbox,
    Tabs,
    Tab,
    Alert,
    Paper,
} from '@mui/material'
import { Add, Delete } from '@mui/icons-material'

interface EditorProps {
    value: any
    onChange: (value: any) => void
}

// ----------------------------------------------------------------------
// Multiple Choice Editor
// ----------------------------------------------------------------------

export const MultipleChoiceEditor = ({ value, onChange }: EditorProps) => {
    const [activeTab, setActiveTab] = useState(0)
    const content = value || {
        question: { ru: '', kz: '', ar: '' },
        options: [{ text: { ru: '', kz: '', ar: '' }, isCorrect: false }],
    }

    // Helper getters/setters with fallbacks
    const getQuestion = (lang: string) => content.question?.[lang] || ''
    const getOptionText = (index: number, lang: string) => content.options?.[index]?.text?.[lang] || ''

    const updateQuestion = (text: string, lang: string) => {
        const newContent = { ...content }
        if (!newContent.question) newContent.question = {}
        newContent.question[lang] = text
        onChange(newContent)
    }

    const updateOptionText = (index: number, text: string, lang: string) => {
        const newContent = { ...content }
        if (!newContent.options) newContent.options = []
        if (!newContent.options[index]) newContent.options[index] = { text: {} }
        if (!newContent.options[index].text) newContent.options[index].text = {}
        newContent.options[index].text[lang] = text
        onChange(newContent)
    }

    const toggleCorrectOption = (index: number) => {
        const newContent = { ...content }
        if (!newContent.options) return
        newContent.options = newContent.options.map((opt: any, i: number) => ({
            ...opt,
            isCorrect: i === index ? !opt.isCorrect : opt.isCorrect
        }))
        onChange(newContent)
    }

    const addOption = () => {
        const newContent = { ...content }
        if (!newContent.options) newContent.options = []
        newContent.options.push({ text: { ru: '', kz: '', ar: '' }, isCorrect: false })
        onChange(newContent)
    }

    const removeOption = (index: number) => {
        const newContent = { ...content }
        if (!newContent.options) return
        newContent.options = newContent.options.filter((_: any, i: number) => i !== index)
        onChange(newContent)
    }

    const langMap = ['ru', 'kz', 'ar']
    const langLabel = ['Русский', 'Казахский', 'Арабский']
    const currentLang = langMap[activeTab]

    return (
        <Box>
            <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 2 }}>
                <Tab label="Русский" />
                <Tab label="Казахский" />
                <Tab label="Арабский" />
            </Tabs>

            <TextField
                fullWidth
                label={`Вопрос (${langLabel[activeTab]})`}
                value={getQuestion(currentLang)}
                onChange={(e) => updateQuestion(e.target.value, currentLang)}
                multiline
                rows={2}
                sx={{ mb: 3 }}
                inputProps={{ dir: currentLang === 'ar' ? 'rtl' : 'ltr' }}
            />

            <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
                Варианты ответов
            </Typography>

            {content.options?.map((option: any, index: number) => (
                <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1 }}>
                    <Checkbox
                        checked={!!option.isCorrect}
                        onChange={() => toggleCorrectOption(index)}
                    />
                    <TextField
                        fullWidth
                        size="small"
                        label={`Вариант ${index + 1}`}
                        value={getOptionText(index, currentLang)}
                        onChange={(e) => updateOptionText(index, e.target.value, currentLang)}
                        inputProps={{ dir: currentLang === 'ar' ? 'rtl' : 'ltr' }}
                    />
                    <IconButton onClick={() => removeOption(index)} color="error" disabled={content.options.length <= 2}>
                        <Delete />
                    </IconButton>
                </Box>
            ))}

            <Button startIcon={<Add />} onClick={addOption} variant="outlined" size="small">
                Добавить вариант
            </Button>
        </Box>
    )
}

// ----------------------------------------------------------------------
// Audio Multiple Choice Editor (multiple_choice + audio upload)
// ----------------------------------------------------------------------

export const AudioMultipleChoiceEditor = ({ value, onChange }: EditorProps) => {
    const content = value || {
        question: { ru: '', kz: '', ar: '' },
        options: [{ text: { ru: '', kz: '', ar: '' }, isCorrect: false }],
        audioUrl: '',
    }

    return (
        <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Аудио для вопроса (загрузите в медиа блока после сохранения)
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                Создайте блок, сохраните его, затем загрузите аудио через «Медиа файлы» ниже. Пользователь сначала прослушает аудио, затем выберет ответ.
            </Typography>
            <MultipleChoiceEditor value={content} onChange={onChange} />
        </Box>
    )
}

// ----------------------------------------------------------------------
// Listen Repeat Editor
// ----------------------------------------------------------------------

export const ListenRepeatEditor = ({ value, onChange }: EditorProps) => {
    const content = value || {
        instructionRu: 'Слушай и повторяй',
        audioUrl: '',
    }

    const updateInstruction = (text: string) => {
        onChange({ ...content, instructionRu: text })
    }

    return (
        <Box>
            <TextField
                fullWidth
                label="Инструкция (RU)"
                value={content.instructionRu || 'Слушай и повторяй'}
                onChange={(e) => updateInstruction(e.target.value)}
                multiline
                rows={2}
                sx={{ mb: 2 }}
                placeholder="Слушай и повторяй"
            />
            <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                Загрузите аудио через «Медиа файлы» после сохранения блока.
            </Typography>
        </Box>
    )
}

// ----------------------------------------------------------------------
// Match Pairs Editor
// ----------------------------------------------------------------------

export const MatchPairsEditor = ({ value, onChange }: EditorProps) => {
    const [activeTab, setActiveTab] = useState(0)
    const content = value || { pairs: [] }

    const langMap = ['ru', 'kz', 'ar']
    const currentLang = langMap[activeTab]

    const addPair = () => {
        const newContent = { ...content }
        if (!newContent.pairs) newContent.pairs = []
        newContent.pairs.push({
            left: { ru: '', kz: '', ar: '' },
            right: { ru: '', kz: '', ar: '' },
            leftImageUrl: '',
            rightImageUrl: '',
        })
        onChange(newContent)
    }

    const updatePair = (index: number, side: 'left' | 'right', text: string, lang: string) => {
        const newContent = { ...content }
        if (!newContent.pairs[index]) return
        if (!newContent.pairs[index][side]) newContent.pairs[index][side] = {}
        newContent.pairs[index][side][lang] = text
        onChange(newContent)
    }

    const updatePairImageUrl = (index: number, side: 'left' | 'right', url: string) => {
        const newContent = { ...content }
        if (!newContent.pairs[index]) return
        const key = side === 'left' ? 'leftImageUrl' : 'rightImageUrl'
        newContent.pairs[index][key] = url
        onChange(newContent)
    }

    const removePair = (index: number) => {
        const newContent = { ...content }
        newContent.pairs = newContent.pairs.filter((_: any, i: number) => i !== index)
        onChange(newContent)
    }

    // Initialize with one pair if empty
    useEffect(() => {
        if (!content.pairs || content.pairs.length === 0) {
            addPair()
        }
    }, [])

    return (
        <Box>
            <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 2 }}>
                <Tab label="Русский" />
                <Tab label="Казахский" />
                <Tab label="Арабский" />
            </Tabs>

            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                Введите пары значений. Опционально: URL изображения для левой или правой части.
            </Typography>

            {content.pairs?.map((pair: any, index: number) => (
                <Box key={index} sx={{ mb: 2, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                        <TextField
                            fullWidth
                            size="small"
                            label={`Левая часть ${index + 1}`}
                            value={pair.left?.[currentLang] || ''}
                            onChange={(e) => updatePair(index, 'left', e.target.value, currentLang)}
                            inputProps={{ dir: currentLang === 'ar' ? 'rtl' : 'ltr' }}
                        />
                        <Typography variant="h6">=</Typography>
                        <TextField
                            fullWidth
                            size="small"
                            label={`Правая часть ${index + 1}`}
                            value={pair.right?.[currentLang] || ''}
                            onChange={(e) => updatePair(index, 'right', e.target.value, currentLang)}
                            inputProps={{ dir: currentLang === 'ar' ? 'rtl' : 'ltr' }}
                        />
                        <IconButton onClick={() => removePair(index)} color="error">
                            <Delete />
                        </IconButton>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                        <TextField
                            size="small"
                            label="URL изображения (левая)"
                            value={pair.leftImageUrl || ''}
                            onChange={(e) => updatePairImageUrl(index, 'left', e.target.value)}
                            placeholder="https://..."
                            sx={{ flex: 1, minWidth: 150 }}
                        />
                        <TextField
                            size="small"
                            label="URL изображения (правая)"
                            value={pair.rightImageUrl || ''}
                            onChange={(e) => updatePairImageUrl(index, 'right', e.target.value)}
                            placeholder="https://..."
                            sx={{ flex: 1, minWidth: 150 }}
                        />
                    </Box>
                </Box>
            ))}

            <Button startIcon={<Add />} onClick={addPair} variant="outlined" size="small">
                Добавить пару
            </Button>
        </Box>
    )
}

// ----------------------------------------------------------------------
// Fill Blank Editor
// ----------------------------------------------------------------------

export const FillBlankEditor = ({ value, onChange }: EditorProps) => {
    const [activeTab, setActiveTab] = useState(0)
    const content = value || { text: { ru: '', kz: '', ar: '' } }

    const langMap = ['ru', 'kz', 'ar']
    const langLabel = ['Русский', 'Казахский', 'Арабский']
    const currentLang = langMap[activeTab]

    const updateText = (text: string, lang: string) => {
        const newContent = { ...content }
        if (!newContent.text) newContent.text = {}
        newContent.text[lang] = text
        onChange(newContent)
    }

    return (
        <Box>
            <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 2 }}>
                <Tab label="Русский" />
                <Tab label="Казахский" />
                <Tab label="Арабский" />
            </Tabs>

            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                Используйте <strong>[ответ]</strong> для создания пропуска.
                <br />
                Пример: <em>Столица Казахстана - [Астана].</em>
            </Typography>

            <TextField
                fullWidth
                multiline
                rows={6}
                label={`Текст с пропусками (${langLabel[activeTab]})`}
                value={content.text?.[currentLang] || ''}
                onChange={(e) => updateText(e.target.value, currentLang)}
                inputProps={{ dir: currentLang === 'ar' ? 'rtl' : 'ltr' }}
            />
        </Box>
    )
}

// ----------------------------------------------------------------------
// Manual Input Editor
// ----------------------------------------------------------------------

// ----------------------------------------------------------------------
// Image Word Match Editor
// ----------------------------------------------------------------------

interface MediaFileItem {
    id: string
    url: string
    type: string
    filename?: string
}

interface ImageWordMatchEditorProps extends EditorProps {
    mediaFiles?: MediaFileItem[]
}

export const ImageWordMatchEditor = ({ value, onChange, mediaFiles = [] }: ImageWordMatchEditorProps) => {
    const content = value || { instruction: '', pairs: [] }

    const pairs: Array<{ id: string; word: string; imageMediaId?: string }> =
        content.pairs ?? []

    const images = mediaFiles.filter((f) => f.type === 'image')

    const addPair = () => {
        onChange({
            ...content,
            pairs: [
                ...pairs,
                { id: crypto.randomUUID(), word: '', imageMediaId: '' },
            ],
        })
    }

    const removePair = (id: string) => {
        onChange({
            ...content,
            pairs: pairs.filter((p) => p.id !== id),
        })
    }

    const updateWord = (id: string, word: string) => {
        onChange({
            ...content,
            pairs: pairs.map((p) => (p.id === id ? { ...p, word } : p)),
        })
    }

    const assignImage = (pairId: string, mediaId: string) => {
        onChange({
            ...content,
            // If already assigned — clicking again deselects
            pairs: pairs.map((p) =>
                p.id === pairId
                    ? { ...p, imageMediaId: p.imageMediaId === mediaId ? '' : mediaId }
                    : p,
            ),
        })
    }

    useEffect(() => {
        if (!content.pairs || content.pairs.length === 0) {
            addPair()
        }
    }, [])

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
                fullWidth
                label="Инструкция"
                value={content.instruction ?? ''}
                onChange={(e) => onChange({ ...content, instruction: e.target.value })}
                placeholder="Соедините картинки и слова"
            />

            {images.length === 0 && (
                <Alert severity="info">
                    Сначала сохраните блок, затем загрузите изображения через раздел{' '}
                    <strong>Изображения для пар</strong> ниже — и они появятся здесь для выбора.
                </Alert>
            )}

            {pairs.map((pair, idx) => {
                const assignedImage = images.find((img) => img.id === pair.imageMediaId)

                return (
                    <Paper key={pair.id} variant="outlined" sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                Пара {idx + 1}
                            </Typography>
                            <IconButton
                                onClick={() => removePair(pair.id)}
                                color="error"
                                size="small"
                                disabled={pairs.length <= 1}
                            >
                                <Delete fontSize="small" />
                            </IconButton>
                        </Box>

                        {/* Arabic word input */}
                        <TextField
                            fullWidth
                            label="Слово (арабский)"
                            value={pair.word ?? ''}
                            onChange={(e) => updateWord(pair.id, e.target.value)}
                            inputProps={{ dir: 'rtl', style: { fontSize: 22 } }}
                            size="small"
                        />

                        {/* Image picker */}
                        {images.length > 0 ? (
                            <Box>
                                <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                                    Выберите картинку для этой пары:
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                    {images.map((img) => {
                                        const isSelected = pair.imageMediaId === img.id
                                        return (
                                            <Box
                                                key={img.id}
                                                onClick={() => assignImage(pair.id, img.id)}
                                                sx={{
                                                    width: 72,
                                                    height: 72,
                                                    borderRadius: 2,
                                                    overflow: 'hidden',
                                                    cursor: 'pointer',
                                                    border: isSelected
                                                        ? '3px solid #2e7d32'
                                                        : '2px solid transparent',
                                                    outline: isSelected
                                                        ? '2px solid #81c784'
                                                        : '2px solid #e0e0e0',
                                                    position: 'relative',
                                                    transition: 'all .15s',
                                                    '&:hover': { outline: '2px solid #66bb6a' },
                                                }}
                                            >
                                                <img
                                                    src={img.url}
                                                    alt={img.filename ?? ''}
                                                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                                                />
                                                {isSelected && (
                                                    <Box
                                                        sx={{
                                                            position: 'absolute',
                                                            top: 2,
                                                            right: 2,
                                                            width: 18,
                                                            height: 18,
                                                            borderRadius: '50%',
                                                            background: '#2e7d32',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                        }}
                                                    >
                                                        <Typography sx={{ color: '#fff', fontSize: 11, lineHeight: 1 }}>✓</Typography>
                                                    </Box>
                                                )}
                                            </Box>
                                        )
                                    })}
                                </Box>
                                {assignedImage && (
                                    <Typography variant="caption" color="success.main" sx={{ mt: 0.5, display: 'block' }}>
                                        Выбрано: {assignedImage.filename ?? assignedImage.id}
                                    </Typography>
                                )}
                                {!pair.imageMediaId && (
                                    <Typography variant="caption" color="warning.main" sx={{ mt: 0.5, display: 'block' }}>
                                        Картинка не выбрана
                                    </Typography>
                                )}
                            </Box>
                        ) : (
                            <Typography variant="caption" color="text.disabled">
                                — изображения появятся здесь после загрузки —
                            </Typography>
                        )}
                    </Paper>
                )
            })}

            <Button startIcon={<Add />} onClick={addPair} variant="outlined" size="small">
                Добавить пару
            </Button>
        </Box>
    )
}

// ----------------------------------------------------------------------
// Manual Input Editor
// ----------------------------------------------------------------------

export const ManualInputEditor = ({ value, onChange }: EditorProps) => {
    const [activeTab, setActiveTab] = useState(0)
    const content = value || {
        question: { ru: '', kz: '', ar: '' },
        correctAnswers: { ru: [], kz: [], ar: [] } // Array of strings due to possible multiple correct answers
    }

    const langMap = ['ru', 'kz', 'ar']
    const langLabel = ['Русский', 'Казахский', 'Арабский']
    const currentLang = langMap[activeTab]

    const updateQuestion = (text: string, lang: string) => {
        const newContent = { ...content }
        if (!newContent.question) newContent.question = {}
        newContent.question[lang] = text
        onChange(newContent)
    }

    const updateAnswers = (text: string, lang: string) => {
        const newContent = { ...content }
        if (!newContent.correctAnswers) newContent.correctAnswers = {}
        // Split by comma or newline and trim
        newContent.correctAnswers[lang] = text.split(/[\n,]/).map(s => s.trim()).filter(Boolean)
        onChange(newContent)
    }

    return (
        <Box>
            <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 2 }}>
                <Tab label="Русский" />
                <Tab label="Казахский" />
                <Tab label="Арабский" />
            </Tabs>

            <TextField
                fullWidth
                multiline
                rows={3}
                label={`Вопрос (${langLabel[activeTab]})`}
                value={content.question?.[currentLang] || ''}
                onChange={(e) => updateQuestion(e.target.value, currentLang)}
                sx={{ mb: 3 }}
                inputProps={{ dir: currentLang === 'ar' ? 'rtl' : 'ltr' }}
            />

            <TextField
                fullWidth
                multiline
                rows={3}
                label={`Правильные ответы (${langLabel[activeTab]})`}
                helperText="Введите варианты правильных ответов через запятую или с новой строки"
                value={content.correctAnswers?.[currentLang]?.join('\n') || ''}
                onChange={(e) => updateAnswers(e.target.value, currentLang)}
                inputProps={{ dir: currentLang === 'ar' ? 'rtl' : 'ltr' }}
            />
        </Box>
    )
}
