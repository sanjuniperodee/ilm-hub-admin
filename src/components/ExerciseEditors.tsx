import { useState, useEffect } from 'react'
import {
    Box,
    TextField,
    Button,
    Chip,
    Divider,
    IconButton,
    MenuItem,
    Select,
    Stack,
    Typography,
    Checkbox,
    Tabs,
    Tab,
    Alert,
    Paper,
} from '@mui/material'
import { Add, Delete, LinkOff } from '@mui/icons-material'

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

// MatchPairsEditor supports distractors (more right items than left)
// Data shape: { leftItems, rightItems, correctPairs, instructionRu }
// Compatible with leftColumn/rightColumn on mobile
// Media references use imageMediaId / audioMediaId (picked from uploaded media)

type MatchItemType = 'text' | 'audio' | 'image'

type MatchItem = {
    id: string
    text: { ru: string; kz: string; ar: string }
    imageUrl: string
    imageMediaId?: string
    itemType?: MatchItemType
    audioUrl?: string
    audioMediaId?: string
}
type CorrectPair = { leftId: string; rightId: string }

function migrateMatchPairsValue(value: any): { leftItems: MatchItem[]; rightItems: MatchItem[]; correctPairs: CorrectPair[]; instructionRu: string } {
    // Old format: { pairs: [{left:{ru,kz,ar}, right:{ru,kz,ar}, leftImageUrl, rightImageUrl}] }
    if (Array.isArray(value?.pairs) && value.pairs.length > 0 && value.pairs[0]?.left) {
        const leftItems: MatchItem[] = value.pairs.map((p: any, i: number) => ({
            id: `l${i + 1}`,
            text: { ru: p.left?.ru ?? '', kz: p.left?.kz ?? '', ar: p.left?.ar ?? '' },
            imageUrl: p.leftImageUrl ?? '',
        }))
        const rightItems: MatchItem[] = value.pairs.map((p: any, i: number) => ({
            id: `r${i + 1}`,
            text: { ru: p.right?.ru ?? '', kz: p.right?.kz ?? '', ar: p.right?.ar ?? '' },
            imageUrl: p.rightImageUrl ?? '',
        }))
        const correctPairs: CorrectPair[] = value.pairs.map((_: any, i: number) => ({ leftId: `l${i + 1}`, rightId: `r${i + 1}` }))
        return { leftItems, rightItems, correctPairs, instructionRu: value.instructionRu ?? '' }
    }
    // New format: { leftItems, rightItems, correctPairs }
    if (Array.isArray(value?.leftItems)) {
        return {
            leftItems: value.leftItems.map((item: any) => ({ id: item.id, text: item.text ?? { ru: '', kz: '', ar: '' }, imageUrl: item.imageUrl ?? '', imageMediaId: item.imageMediaId ?? '', itemType: item.itemType ?? 'text', audioUrl: item.audioUrl ?? '', audioMediaId: item.audioMediaId ?? '' })),
            rightItems: (value.rightItems ?? []).map((item: any) => ({ id: item.id, text: item.text ?? { ru: '', kz: '', ar: '' }, imageUrl: item.imageUrl ?? '', imageMediaId: item.imageMediaId ?? '', itemType: item.itemType ?? 'text', audioUrl: item.audioUrl ?? '', audioMediaId: item.audioMediaId ?? '' })),
            correctPairs: value.correctPairs ?? [],
            instructionRu: value.instructionRu ?? '',
        }
    }
    return { leftItems: [], rightItems: [], correctPairs: [], instructionRu: '' }
}

interface MatchPairsEditorProps extends EditorProps {
    mediaFiles?: MediaFileItem[]
}

export const MatchPairsEditor = ({ value, onChange, mediaFiles = [] }: MatchPairsEditorProps) => {
    const [activeTab, setActiveTab] = useState(0)
    const langMap = ['ru', 'kz', 'ar'] as const
    const currentLang = langMap[activeTab]

    const { leftItems, rightItems, correctPairs, instructionRu } = migrateMatchPairsValue(value)

    const images = mediaFiles.filter((f) => f.type === 'image')
    const audios = mediaFiles.filter((f) => f.type === 'audio')

    const emit = (li: MatchItem[], ri: MatchItem[], cp: CorrectPair[], instr?: string) => {
        onChange({ leftItems: li, rightItems: ri, correctPairs: cp, instructionRu: instr ?? instructionRu })
    }

    useEffect(() => {
        if (leftItems.length === 0) {
            const li: MatchItem[] = [{ id: 'l1', text: { ru: '', kz: '', ar: '' }, imageUrl: '' }]
            const ri: MatchItem[] = [{ id: 'r1', text: { ru: '', kz: '', ar: '' }, imageUrl: '' }]
            emit(li, ri, [{ leftId: 'l1', rightId: 'r1' }])
        }
    }, [])

    const addPair = () => {
        const n = Math.max(leftItems.length, rightItems.length) + 1
        const lId = `l${n}`
        const rId = `r${n}`
        emit(
            [...leftItems, { id: lId, text: { ru: '', kz: '', ar: '' }, imageUrl: '', imageMediaId: '', itemType: 'text' as const, audioUrl: '', audioMediaId: '' }],
            [...rightItems, { id: rId, text: { ru: '', kz: '', ar: '' }, imageUrl: '', imageMediaId: '', itemType: 'text' as const, audioUrl: '', audioMediaId: '' }],
            [...correctPairs, { leftId: lId, rightId: rId }],
        )
    }

    const addDistractor = () => {
        const n = rightItems.length + 1
        const rId = `d${n}`
        emit(leftItems, [...rightItems, { id: rId, text: { ru: '', kz: '', ar: '' }, imageUrl: '', imageMediaId: '', itemType: 'text' as const, audioUrl: '', audioMediaId: '' }], correctPairs)
    }

    const updateLeftItemType = (id: string, itemType: MatchItemType) => {
        emit(leftItems.map((i) => i.id === id ? { ...i, itemType } : i), rightItems, correctPairs)
    }

    const updateRightItemType = (id: string, itemType: MatchItemType) => {
        emit(leftItems, rightItems.map((i) => i.id === id ? { ...i, itemType } : i), correctPairs)
    }

    const assignLeftAudio = (id: string, mediaId: string) => {
        const media = audios.find((a) => a.id === mediaId)
        emit(leftItems.map((i) => i.id === id ? { ...i, audioMediaId: i.audioMediaId === mediaId ? '' : mediaId, audioUrl: i.audioMediaId === mediaId ? '' : (media?.url ?? '') } : i), rightItems, correctPairs)
    }

    const assignRightAudio = (id: string, mediaId: string) => {
        const media = audios.find((a) => a.id === mediaId)
        emit(leftItems, rightItems.map((i) => i.id === id ? { ...i, audioMediaId: i.audioMediaId === mediaId ? '' : mediaId, audioUrl: i.audioMediaId === mediaId ? '' : (media?.url ?? '') } : i), correctPairs)
    }

    const assignLeftImage = (id: string, mediaId: string) => {
        const media = images.find((img) => img.id === mediaId)
        emit(leftItems.map((i) => i.id === id ? { ...i, imageMediaId: i.imageMediaId === mediaId ? '' : mediaId, imageUrl: i.imageMediaId === mediaId ? '' : (media?.url ?? '') } : i), rightItems, correctPairs)
    }

    const assignRightImage = (id: string, mediaId: string) => {
        const media = images.find((img) => img.id === mediaId)
        emit(leftItems, rightItems.map((i) => i.id === id ? { ...i, imageMediaId: i.imageMediaId === mediaId ? '' : mediaId, imageUrl: i.imageMediaId === mediaId ? '' : (media?.url ?? '') } : i), correctPairs)
    }

    const removeLeft = (id: string) => {
        emit(
            leftItems.filter((i) => i.id !== id),
            rightItems,
            correctPairs.filter((p) => p.leftId !== id),
        )
    }

    const removeRight = (id: string) => {
        emit(
            leftItems,
            rightItems.filter((i) => i.id !== id),
            correctPairs.filter((p) => p.rightId !== id),
        )
    }

    const updateLeftText = (id: string, text: string, lang: string) => {
        emit(
            leftItems.map((i) => i.id === id ? { ...i, text: { ...i.text, [lang]: text } } : i),
            rightItems, correctPairs,
        )
    }

    const updateRightText = (id: string, text: string, lang: string) => {
        emit(
            leftItems,
            rightItems.map((i) => i.id === id ? { ...i, text: { ...i.text, [lang]: text } } : i),
            correctPairs,
        )
    }

    const setPairRight = (leftId: string, rightId: string) => {
        const next = correctPairs.filter((p) => p.leftId !== leftId)
        if (rightId) next.push({ leftId, rightId })
        emit(leftItems, rightItems, next)
    }

    const getPairedRight = (leftId: string) => correctPairs.find((p) => p.leftId === leftId)?.rightId ?? ''
    const usedRightIds = new Set(correctPairs.map((p) => p.rightId))

    /** Reusable media thumbnail grid picker */
    const renderMediaPicker = (
        files: MediaFileItem[],
        selectedId: string | undefined,
        onSelect: (mediaId: string) => void,
        kind: 'image' | 'audio',
    ) => {
        if (files.length === 0) {
            return (
                <Typography variant="caption" color="text.disabled">
                    {kind === 'image'
                        ? '— загрузите изображения через раздел «Медиа файлы» ниже —'
                        : '— загрузите аудио через раздел «Медиа файлы» ниже —'}
                </Typography>
            )
        }
        const selectedFile = files.find((f) => f.id === selectedId)
        return (
            <Box>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                    {kind === 'image' ? 'Выберите картинку:' : 'Выберите аудио:'}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {files.map((file) => {
                        const isSelected = selectedId === file.id
                        return kind === 'image' ? (
                            <Box
                                key={file.id}
                                onClick={() => onSelect(file.id)}
                                sx={{
                                    width: 72, height: 72, borderRadius: 2, overflow: 'hidden', cursor: 'pointer',
                                    border: isSelected ? '3px solid #2e7d32' : '2px solid transparent',
                                    outline: isSelected ? '2px solid #81c784' : '2px solid #e0e0e0',
                                    position: 'relative', transition: 'all .15s',
                                    '&:hover': { outline: '2px solid #66bb6a' },
                                }}
                            >
                                <img src={file.url} alt={file.filename ?? ''} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                                {isSelected && (
                                    <Box sx={{ position: 'absolute', top: 2, right: 2, width: 18, height: 18, borderRadius: '50%', background: '#2e7d32', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Typography sx={{ color: '#fff', fontSize: 11, lineHeight: 1 }}>&#10003;</Typography>
                                    </Box>
                                )}
                            </Box>
                        ) : (
                            <Chip
                                key={file.id}
                                label={file.filename ?? file.id.slice(0, 8)}
                                onClick={() => onSelect(file.id)}
                                color={isSelected ? 'success' : 'default'}
                                variant={isSelected ? 'filled' : 'outlined'}
                                sx={{ cursor: 'pointer' }}
                            />
                        )
                    })}
                </Box>
                {selectedFile && (
                    <Typography variant="caption" color="success.main" sx={{ mt: 0.5, display: 'block' }}>
                        Выбрано: {selectedFile.filename ?? selectedFile.id}
                    </Typography>
                )}
            </Box>
        )
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
                size="small"
                label="Инструкция"
                value={instructionRu}
                onChange={(e) => emit(leftItems, rightItems, correctPairs, e.target.value)}
                sx={{ mb: 2 }}
            />

            {images.length === 0 && audios.length === 0 && (
                <Alert severity="info" sx={{ mb: 2 }}>
                    Сначала сохраните блок, затем загрузите медиа файлы (изображения / аудио) через раздел <strong>Медиа файлы</strong> ниже — и они появятся здесь для выбора.
                </Alert>
            )}

            {/* Left items */}
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Левые элементы (вопросы)</Typography>
            {leftItems.map((item, i) => (
                <Box key={item.id} sx={{ mb: 1.5, p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1 }}>
                        <Select
                            size="small"
                            value={item.itemType ?? 'text'}
                            onChange={(e) => updateLeftItemType(item.id, e.target.value as MatchItemType)}
                            sx={{ minWidth: 110 }}
                        >
                            <MenuItem value="text">Текст</MenuItem>
                            <MenuItem value="audio">Аудио</MenuItem>
                            <MenuItem value="image">Картинка</MenuItem>
                        </Select>
                        {(item.itemType ?? 'text') === 'text' ? (
                            <TextField
                                fullWidth
                                size="small"
                                label={`Левая часть ${i + 1}`}
                                value={item.text[currentLang] || ''}
                                onChange={(e) => updateLeftText(item.id, e.target.value, currentLang)}
                                inputProps={{ dir: currentLang === 'ar' ? 'rtl' : 'ltr' }}
                            />
                        ) : (item.itemType ?? 'text') === 'audio' ? (
                            <Box sx={{ flex: 1 }}>
                                {renderMediaPicker(audios, item.audioMediaId, (mediaId) => assignLeftAudio(item.id, mediaId), 'audio')}
                            </Box>
                        ) : (
                            <Box sx={{ flex: 1 }}>
                                {renderMediaPicker(images, item.imageMediaId, (mediaId) => assignLeftImage(item.id, mediaId), 'image')}
                            </Box>
                        )}
                        <IconButton size="small" color="error" onClick={() => removeLeft(item.id)} disabled={leftItems.length <= 1}>
                            <Delete />
                        </IconButton>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        {(item.itemType ?? 'text') === 'text' && (
                            <Box sx={{ flex: 1 }}>
                                {renderMediaPicker(images, item.imageMediaId, (mediaId) => assignLeftImage(item.id, mediaId), 'image')}
                            </Box>
                        )}
                        <Box sx={{ flex: 1 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                                Правильный ответ (правая сторона)
                            </Typography>
                            <Select
                                size="small"
                                fullWidth
                                value={getPairedRight(item.id)}
                                onChange={(e) => setPairRight(item.id, e.target.value as string)}
                                displayEmpty
                            >
                                <MenuItem value=""><em>— не выбрано —</em></MenuItem>
                                {rightItems.map((r) => (
                                    <MenuItem key={r.id} value={r.id}
                                        disabled={usedRightIds.has(r.id) && getPairedRight(item.id) !== r.id}>
                                        {r.itemType === 'audio' ? `🔊 [аудио]` : r.itemType === 'image' ? `🖼 [картинка]` : (r.text[currentLang] || `[${r.id}]`)}
                                        {usedRightIds.has(r.id) && getPairedRight(item.id) !== r.id ? ' (занято)' : ''}
                                    </MenuItem>
                                ))}
                            </Select>
                        </Box>
                    </Box>
                </Box>
            ))}

            <Divider sx={{ my: 2 }} />

            {/* Right items (including distractors) */}
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                <Typography variant="subtitle2">Правые элементы (варианты ответов)</Typography>
                {rightItems.length > leftItems.length && (
                    <Chip size="small" label={`${rightItems.length - leftItems.length} дистракторов`} color="warning" />
                )}
            </Stack>
            {rightItems.map((item) => {
                const isPaired = usedRightIds.has(item.id)
                return (
                    <Box key={item.id} sx={{ mb: 1.5, p: 1.5, border: '1px solid', borderColor: isPaired ? 'success.light' : 'warning.light', borderRadius: 1, bgcolor: isPaired ? 'rgba(76,175,80,0.04)' : 'rgba(255,152,0,0.04)' }}>
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1 }}>
                            <Chip size="small" label={isPaired ? '&#10003; правильный' : '&#10007; дистрактор'} color={isPaired ? 'success' : 'warning'} variant="outlined" sx={{ flexShrink: 0 }} />
                            <Select
                                size="small"
                                value={item.itemType ?? 'text'}
                                onChange={(e) => updateRightItemType(item.id, e.target.value as MatchItemType)}
                                sx={{ minWidth: 110 }}
                            >
                                <MenuItem value="text">Текст</MenuItem>
                                <MenuItem value="audio">Аудио</MenuItem>
                                <MenuItem value="image">Картинка</MenuItem>
                            </Select>
                            {(item.itemType ?? 'text') === 'text' ? (
                                <TextField
                                    fullWidth
                                    size="small"
                                    value={item.text[currentLang] || ''}
                                    onChange={(e) => updateRightText(item.id, e.target.value, currentLang)}
                                    placeholder="Текст правой части"
                                    inputProps={{ dir: currentLang === 'ar' ? 'rtl' : 'ltr' }}
                                />
                            ) : (item.itemType ?? 'text') === 'audio' ? (
                                <Box sx={{ flex: 1 }}>
                                    {renderMediaPicker(audios, item.audioMediaId, (mediaId) => assignRightAudio(item.id, mediaId), 'audio')}
                                </Box>
                            ) : (
                                <Box sx={{ flex: 1 }}>
                                    {renderMediaPicker(images, item.imageMediaId, (mediaId) => assignRightImage(item.id, mediaId), 'image')}
                                </Box>
                            )}
                            <IconButton size="small" color="error" onClick={() => removeRight(item.id)} disabled={rightItems.length <= 1}>
                                <Delete />
                            </IconButton>
                        </Box>
                        {(item.itemType ?? 'text') === 'text' && (
                            <Box>
                                {renderMediaPicker(images, item.imageMediaId, (mediaId) => assignRightImage(item.id, mediaId), 'image')}
                            </Box>
                        )}
                    </Box>
                )
            })}

            <Stack direction="row" spacing={1}>
                <Button startIcon={<Add />} onClick={addPair} variant="outlined" size="small">
                    Добавить пару
                </Button>
                <Button startIcon={<LinkOff />} onClick={addDistractor} variant="outlined" size="small" color="warning">
                    Добавить дистрактор
                </Button>
            </Stack>
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

// ----------------------------------------------------------------------
// Audio Choice Editor (Mahraj: слушай звук → выбери букву/слог)
// ----------------------------------------------------------------------

export const AudioChoiceEditor = ({ value, onChange }: EditorProps) => {
    const content = value || {
        instructionRu: 'Послушайте звук и выберите правильную букву',
        audioUrl: '',
        options: [{ id: crypto.randomUUID(), text: '', isCorrect: false }],
    }

    const updateInstruction = (text: string) => onChange({ ...content, instructionRu: text })

    const addOption = () => {
        const newOptions = [...(content.options || []), { id: crypto.randomUUID(), text: '', isCorrect: false }]
        onChange({ ...content, options: newOptions })
    }

    const removeOption = (idx: number) => {
        if ((content.options?.length ?? 0) <= 2) return
        onChange({ ...content, options: content.options.filter((_: any, i: number) => i !== idx) })
    }

    const setCorrect = (idx: number) => {
        const newOptions = (content.options || []).map((o: any, i: number) => ({ ...o, isCorrect: i === idx }))
        onChange({ ...content, options: newOptions })
    }

    const updateOptionText = (idx: number, text: string) => {
        const newOptions = [...(content.options || [])]
        newOptions[idx] = { ...newOptions[idx], text }
        onChange({ ...content, options: newOptions })
    }

    return (
        <Box>
            <Alert severity="info" sx={{ mb: 2 }}>
                Загрузите аудио через «Аудио файл» после сохранения блока.
            </Alert>

            <TextField
                fullWidth
                label="Инструкция (RU)"
                value={content.instructionRu || ''}
                onChange={(e) => updateInstruction(e.target.value)}
                multiline
                rows={2}
                sx={{ mb: 3 }}
            />

            <Typography variant="subtitle1" gutterBottom>
                Варианты (буквы или слоги)
            </Typography>

            {(content.options || []).map((opt: any, idx: number) => (
                <Box key={opt.id ?? idx} sx={{ display: 'flex', alignItems: 'center', mb: 1.5, gap: 1 }}>
                    <input
                        type="radio"
                        checked={!!opt.isCorrect}
                        onChange={() => setCorrect(idx)}
                        style={{ width: 18, height: 18, cursor: 'pointer', flexShrink: 0 }}
                    />
                    <TextField
                        size="small"
                        label={`Буква/слог ${idx + 1}`}
                        value={opt.text || ''}
                        onChange={(e) => updateOptionText(idx, e.target.value)}
                        inputProps={{ dir: 'rtl', style: { fontSize: 22, fontWeight: 'bold', textAlign: 'center' } }}
                        sx={{ width: 120 }}
                    />
                    <IconButton onClick={() => removeOption(idx)} color="error" size="small"
                        disabled={(content.options?.length ?? 0) <= 2}>
                        <Delete />
                    </IconButton>
                </Box>
            ))}

            <Button startIcon={<Add />} onClick={addOption} variant="outlined" size="small" sx={{ mt: 1 }}>
                Добавить вариант
            </Button>
        </Box>
    )
}

// ----------------------------------------------------------------------
// Find Letter In Word Editor (Mahraj: найди букву в слове)
// ----------------------------------------------------------------------

/** Split Arabic word into grapheme clusters (letter + attached diacritics) */
function splitArabicWord(word: string): string[] {
    const result: string[] = []
    let i = 0
    while (i < word.length) {
        let cluster = word[i]
        i++
        // Attach Arabic diacritics (harakat): U+064B–U+065F, tatweel U+0640, U+0670
        while (i < word.length) {
            const code = word.charCodeAt(i)
            if ((code >= 0x064B && code <= 0x065F) || code === 0x0670 || code === 0x0640) {
                cluster += word[i]
                i++
            } else {
                break
            }
        }
        result.push(cluster)
    }
    return result
}

export const FindLetterInWordEditor = ({ value, onChange }: EditorProps) => {
    const content = value || {
        instructionRu: 'Найдите букву в слове',
        word: '',
        targetLetter: '',
    }

    const letters = content.word ? splitArabicWord(content.word) : []

    return (
        <Box>
            <TextField
                fullWidth
                label="Инструкция (RU)"
                value={content.instructionRu || ''}
                onChange={(e) => onChange({ ...content, instructionRu: e.target.value })}
                multiline
                rows={2}
                sx={{ mb: 3 }}
                placeholder="Найдите букву ح в слове"
            />

            <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                <TextField
                    label="Арабское слово"
                    value={content.word || ''}
                    onChange={(e) => onChange({ ...content, word: e.target.value })}
                    inputProps={{ dir: 'rtl', style: { fontSize: 28, fontWeight: 'bold', letterSpacing: 2 } }}
                    sx={{ flex: 2 }}
                    placeholder="حَرَكَة"
                />
                <TextField
                    label="Целевая буква"
                    value={content.targetLetter || ''}
                    onChange={(e) => onChange({ ...content, targetLetter: e.target.value })}
                    inputProps={{ dir: 'rtl', style: { fontSize: 28, fontWeight: 'bold', textAlign: 'center' } }}
                    sx={{ flex: 1, maxWidth: 130 }}
                    placeholder="ح"
                />
            </Box>

            {letters.length > 0 && (
                <Box>
                    <Typography variant="subtitle2" gutterBottom>
                        Предпросмотр (слово разбито на буквы):
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.5, flexDirection: 'row-reverse', flexWrap: 'wrap', mt: 1 }}>
                        {letters.map((letter, idx) => {
                            const strippedLetter = letter.replace(/[\u064B-\u065F\u0670\u0640]/g, '')
                            const strippedTarget = (content.targetLetter || '').replace(/[\u064B-\u065F\u0670\u0640]/g, '')
                            const isTarget = strippedLetter === strippedTarget
                            return (
                                <Chip
                                    key={idx}
                                    label={letter}
                                    color={isTarget ? 'primary' : 'default'}
                                    variant={isTarget ? 'filled' : 'outlined'}
                                    sx={{ fontSize: 22, height: 44, px: 1, direction: 'rtl' }}
                                />
                            )
                        })}
                    </Box>
                    {content.targetLetter && !letters.some((l) =>
                        l.replace(/[\u064B-\u065F\u0670\u0640]/g, '') === (content.targetLetter || '').replace(/[\u064B-\u065F\u0670\u0640]/g, ''))
                        && (
                            <Alert severity="warning" sx={{ mt: 1 }}>
                                Буква «{content.targetLetter}» не найдена в слове «{content.word}»
                            </Alert>
                        )}
                </Box>
            )}
        </Box>
    )
}

// ----------------------------------------------------------------------
// Listen And Choose Word Editor (Mahraj: послушай → выбери слово)
// ----------------------------------------------------------------------

export const ListenAndChooseWordEditor = ({ value, onChange }: EditorProps) => {
    const content = value || {
        instructionRu: 'Послушайте и выберите слово',
        audioUrl: '',
        options: [{ id: crypto.randomUUID(), text: '', isCorrect: false }],
    }

    const updateInstruction = (text: string) => onChange({ ...content, instructionRu: text })

    const addOption = () => {
        const newOptions = [...(content.options || []), { id: crypto.randomUUID(), text: '', isCorrect: false }]
        onChange({ ...content, options: newOptions })
    }

    const removeOption = (idx: number) => {
        if ((content.options?.length ?? 0) <= 2) return
        onChange({ ...content, options: content.options.filter((_: any, i: number) => i !== idx) })
    }

    const setCorrect = (idx: number) => {
        const newOptions = (content.options || []).map((o: any, i: number) => ({ ...o, isCorrect: i === idx }))
        onChange({ ...content, options: newOptions })
    }

    const updateOptionText = (idx: number, text: string) => {
        const newOptions = [...(content.options || [])]
        newOptions[idx] = { ...newOptions[idx], text }
        onChange({ ...content, options: newOptions })
    }

    return (
        <Box>
            <Alert severity="info" sx={{ mb: 2 }}>
                Загрузите аудио через «Аудио файл» после сохранения блока.
            </Alert>

            <TextField
                fullWidth
                label="Инструкция (RU)"
                value={content.instructionRu || ''}
                onChange={(e) => updateInstruction(e.target.value)}
                multiline
                rows={2}
                sx={{ mb: 3 }}
            />

            <Typography variant="subtitle1" gutterBottom>
                Варианты — слова с огласовками (арабский)
            </Typography>

            {(content.options || []).map((opt: any, idx: number) => (
                <Box key={opt.id ?? idx} sx={{ display: 'flex', alignItems: 'center', mb: 1.5, gap: 1 }}>
                    <input
                        type="radio"
                        checked={!!opt.isCorrect}
                        onChange={() => setCorrect(idx)}
                        style={{ width: 18, height: 18, cursor: 'pointer', flexShrink: 0 }}
                    />
                    <TextField
                        fullWidth
                        size="small"
                        label={`Слово ${idx + 1} (с огласовками)`}
                        value={opt.text || ''}
                        onChange={(e) => updateOptionText(idx, e.target.value)}
                        inputProps={{ dir: 'rtl', style: { fontSize: 20 } }}
                        placeholder="قَمَر"
                    />
                    <IconButton onClick={() => removeOption(idx)} color="error" size="small"
                        disabled={(content.options?.length ?? 0) <= 2}>
                        <Delete />
                    </IconButton>
                </Box>
            ))}

            <Button startIcon={<Add />} onClick={addOption} variant="outlined" size="small" sx={{ mt: 1 }}>
                Добавить вариант
            </Button>
        </Box>
    )
}

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
