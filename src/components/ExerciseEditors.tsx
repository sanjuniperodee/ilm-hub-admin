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
        // Each pair has { left: {ru, kz, ar}, right: {ru, kz, ar} }
        newContent.pairs.push({
            left: { ru: '', kz: '', ar: '' },
            right: { ru: '', kz: '', ar: '' }
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
                Введите пары значений, которые нужно сопоставить
            </Typography>

            {content.pairs?.map((pair: any, index: number) => (
                <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 2 }}>
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
