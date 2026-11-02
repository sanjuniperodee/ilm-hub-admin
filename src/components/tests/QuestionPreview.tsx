import { Box, Stack, Typography } from '@mui/material'
import { CheckCircle, GraphicEqOutlined, ImageOutlined, PlayArrowRounded } from '@mui/icons-material'
import type { ReactNode } from 'react'
import { ArabicText } from '../ui'
import { color } from '../../theme'

const ARABIC_RE = /[\u0600-\u06FF]/
const NON_ARABIC_LETTER_RE = /[A-Za-z\u0400-\u04FF]/
/** True when the text is Arabic only (mixed Cyrillic/Arabic lines stay LTR). */
const isArabic = (t: string) => ARABIC_RE.test(t) && !NON_ARABIC_LETTER_RE.test(t)

/** Renders text with Arabic typography when it contains Arabic script. */
function Smart({ text, size = 'sm', placeholder = '—' }: { text?: string; size?: 'sm' | 'md' | 'lg'; placeholder?: string }) {
  const t = (text ?? '').trim()
  if (!t) return <Typography component="span" variant="body2" color="text.disabled">{placeholder}</Typography>
  if (isArabic(t)) return <ArabicText size={size} component="span">{t}</ArabicText>
  return <Typography component="span" variant="body2">{t}</Typography>
}

function OptionTile({ children, correct, compact }: { children: ReactNode; correct?: boolean; compact?: boolean }) {
  return (
    <Box
      sx={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: compact ? 'center' : 'flex-start',
        gap: 1,
        minHeight: 40,
        px: 1.25,
        py: 0.5,
        borderRadius: 1.5,
        border: '1px solid',
        borderColor: correct ? 'success.main' : 'divider',
        bgcolor: correct ? color.success.soft : 'background.paper',
      }}
    >
      {children}
      {correct && (
        <CheckCircle
          aria-label="Правильный"
          sx={{ fontSize: 16, color: 'success.main', ml: compact ? 0 : 'auto', position: compact ? 'absolute' : 'static', top: 2, right: 2 }}
        />
      )}
    </Box>
  )
}

function AudioBar({ url }: { url?: string }) {
  const has = !!(url && url.trim())
  return (
    <Stack
      direction="row"
      alignItems="center"
      spacing={1}
      sx={{ p: 1, borderRadius: 2, bgcolor: has ? color.bronze[50] : color.neutral[100], border: '1px solid', borderColor: has ? color.bronze[100] : 'divider' }}
    >
      <Box
        sx={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: has ? 'primary.main' : color.neutral[300],
          color: 'common.white',
          flexShrink: 0,
        }}
      >
        <PlayArrowRounded fontSize="small" />
      </Box>
      <GraphicEqOutlined sx={{ color: has ? 'primary.light' : 'text.disabled' }} />
      <Typography variant="caption" color={has ? 'text.secondary' : 'warning.dark'} noWrap sx={{ minWidth: 0 }}>
        {has ? 'Аудио выбрано' : 'Аудио не выбрано'}
      </Typography>
    </Stack>
  )
}

function Thumb({ url }: { url?: string }) {
  return (
    <Box
      sx={{
        width: '100%',
        aspectRatio: '1 / 1',
        borderRadius: 1.5,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'surface.sunken',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'text.disabled',
      }}
    >
      {url ? <Box component="img" src={url} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <ImageOutlined fontSize="small" />}
    </Box>
  )
}

export interface QuestionPreviewProps {
  type: string
  questionRu?: { text?: string; hint?: string }
  config?: Record<string, any>
  answers?: Array<{ id?: string; answerRu?: string; isCorrect?: boolean }>
}

/**
 * Approximate learner view of a test question, with correct answers marked.
 * It is a schematic preview (not pixel-perfect with the mobile app).
 */
export function QuestionPreview({ type, questionRu, config = {}, answers = [] }: QuestionPreviewProps) {
  const instruction: string | undefined = config.instructionRu

  const body = (() => {
    switch (type) {
      case 'single_choice':
      case 'multiple_choice':
        return (
          <Stack spacing={0.75}>
            {answers.length === 0 && <Typography variant="caption" color="text.disabled">Нет вариантов ответа</Typography>}
            {answers.map((a, i) => (
              <OptionTile key={a.id ?? i} correct={!!a.isCorrect}>
                <Smart text={a.answerRu} placeholder="Пустой вариант" />
              </OptionTile>
            ))}
          </Stack>
        )
      case 'fill_blank': {
        const opts: Array<{ id: string; text: string }> = (Array.isArray(config.options) ? config.options : []).map((o: any, i: number) =>
          typeof o === 'string' ? { id: `opt_${i + 1}`, text: o } : { id: o?.id ?? `opt_${i + 1}`, text: o?.text ?? '' },
        )
        const sentence: string = config.sentenceTemplateRu || ''
        const parts = sentence.split(/_{3,}/)
        return (
          <Stack spacing={1.25}>
            <Box sx={{ p: 1.25, borderRadius: 1.5, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
              {sentence ? (
                <Typography variant="body2" component="div" sx={{ lineHeight: 2 }}>
                  {parts.map((p, i) => (
                    <span key={i}>
                      {isArabic(p) ? <ArabicText size="sm" component="span">{p}</ArabicText> : p}
                      {i < parts.length - 1 && (
                        <Box component="span" sx={{ display: 'inline-block', minWidth: 56, mx: 0.5, borderBottom: '2px solid', borderColor: 'primary.light' }}>&nbsp;</Box>
                      )}
                    </span>
                  ))}
                </Typography>
              ) : (
                <Typography variant="caption" color="text.disabled">Предложение не задано</Typography>
              )}
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 0.75 }}>
              {opts.map((o) => (
                <OptionTile key={o.id} correct={o.id === config.correctAnswerId} compact>
                  <Smart text={o.text} placeholder="Пусто" />
                </OptionTile>
              ))}
            </Box>
          </Stack>
        )
      }
      case 'manual_input':
        return (
          <Stack spacing={1}>
            <Box sx={{ height: 40, borderRadius: 1.5, border: '1px solid', borderColor: color.neutral[400], bgcolor: 'background.paper', px: 1.25, display: 'flex', alignItems: 'center' }}>
              <Typography variant="body2" color="text.disabled">Ответ ученика</Typography>
            </Box>
            <Typography variant="caption" color="text.secondary">
              Правильный ответ: <Smart text={config.correctAnswer} placeholder="не указан" />
            </Typography>
          </Stack>
        )
      case 'match_pairs': {
        const left: any[] = config.leftItems ?? config.leftColumn ?? []
        const right: any[] = config.rightItems ?? config.rightColumn ?? []
        const pairs: Array<{ leftId: string; rightId: string }> = config.correctPairs ?? []
        const label = (it: any) =>
          typeof it === 'string' ? <Smart text={it} /> : (it?.itemType ?? 'text') === 'audio' ? (
            <Stack direction="row" spacing={0.5} alignItems="center"><GraphicEqOutlined fontSize="small" color="action" /><Typography variant="caption">Аудио</Typography></Stack>
          ) : (
            <Smart text={it?.text} placeholder="Пусто" />
          )
        const pairedRight = new Set(pairs.map((p) => p.rightId))
        return (
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.75 }}>
            <Stack spacing={0.75}>
              {left.map((it, i) => {
                const pairIdx = pairs.findIndex((p) => p.leftId === it?.id)
                return (
                  <OptionTile key={it?.id ?? i} compact>
                    {label(it)}
                    {pairIdx >= 0 && <PairBadge n={pairIdx + 1} />}
                  </OptionTile>
                )
              })}
            </Stack>
            <Stack spacing={0.75}>
              {right.map((it, i) => {
                const pairIdx = pairs.findIndex((p) => p.rightId === it?.id)
                return (
                  <OptionTile key={it?.id ?? i} compact>
                    {label(it)}
                    {pairedRight.has(it?.id) ? <PairBadge n={pairIdx + 1} /> : <Typography variant="caption" color="warning.dark" sx={{ ml: 0.5 }}>лишний</Typography>}
                  </OptionTile>
                )
              })}
            </Stack>
          </Box>
        )
      }
      case 'audio_multiple_choice':
      case 'audio_choice':
      case 'listen_and_choose_word': {
        const opts: any[] = Array.isArray(config.options) ? config.options : []
        const compact = type === 'audio_choice'
        return (
          <Stack spacing={1.25}>
            <AudioBar url={config.audioUrl} />
            <Box sx={{ display: 'grid', gridTemplateColumns: compact ? 'repeat(3, minmax(0, 1fr))' : '1fr', gap: 0.75 }}>
              {opts.map((o, i) => (
                <OptionTile key={o?.id ?? i} correct={!!o?.isCorrect} compact={compact}>
                  <Smart text={o?.text} size={compact ? 'md' : 'sm'} placeholder="Пусто" />
                </OptionTile>
              ))}
            </Box>
          </Stack>
        )
      }
      case 'image_word_match': {
        const pairs: any[] = Array.isArray(config.pairs) ? config.pairs : []
        return (
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 1 }}>
            {pairs.map((p, i) => (
              <Stack key={p?.id ?? i} spacing={0.5} alignItems="center">
                <Thumb url={p?.imageUrl} />
                <Smart text={p?.word} placeholder="Слово" />
              </Stack>
            ))}
          </Box>
        )
      }
      case 'find_letter_in_word': {
        const word: string = config.word || ''
        const target: string = config.targetLetter || ''
        const strip = (s: string) => s.replace(/[\u064B-\u065F\u0670\u0640]/g, '')
        const clusters: string[] = []
        for (const ch of word) {
          if (clusters.length && /[\u064B-\u065F\u0670\u0640]/.test(ch)) clusters[clusters.length - 1] += ch
          else clusters.push(ch)
        }
        return word ? (
          <Stack direction="row" dir="rtl" spacing={0.5} flexWrap="wrap" useFlexGap justifyContent="center">
            {clusters.map((l, i) => {
              const hit = !!target && strip(l) === strip(target)
              return (
                <OptionTile key={i} correct={hit} compact>
                  <ArabicText size="md" component="span">{l}</ArabicText>
                </OptionTile>
              )
            })}
          </Stack>
        ) : (
          <Typography variant="caption" color="text.disabled">Слово не задано</Typography>
        )
      }
      default:
        return null
    }
  })()

  return (
    <Box
      sx={{
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'surface.canvas',
        p: 1.5,
      }}
      aria-label="Предпросмотр вопроса"
    >
      <Stack spacing={1.25}>
        {instruction && <Typography variant="caption" color="text.secondary">{instruction}</Typography>}
        <Box>
          <Typography variant="subtitle1" component="p" sx={{ fontSize: '0.9375rem', overflowWrap: 'anywhere' }}>
            {questionRu?.text?.trim() ? (isArabic(questionRu.text) ? <ArabicText size="md" component="span">{questionRu.text}</ArabicText> : questionRu.text) : (
              <Box component="span" sx={{ color: 'text.disabled' }}>Текст вопроса</Box>
            )}
          </Typography>
          {questionRu?.hint && <Typography variant="caption" color="text.secondary">Подсказка: {questionRu.hint}</Typography>}
        </Box>
        {body}
      </Stack>
    </Box>
  )
}

function PairBadge({ n }: { n: number }) {
  return (
    <Box
      component="span"
      sx={{
        ml: 0.5,
        minWidth: 18,
        height: 18,
        px: 0.5,
        borderRadius: 9,
        bgcolor: color.success.soft,
        color: 'success.dark',
        fontSize: '0.6875rem',
        fontWeight: 700,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      aria-label={`Пара ${n}`}
    >
      {n}
    </Box>
  )
}
