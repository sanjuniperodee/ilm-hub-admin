import { useState } from 'react'
import { Box, Dialog, DialogContent, IconButton, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material'
import { Close, PlayCircleFilled, VolumeUp, MusicOff, MenuBook, Star, TrendingUp, PhoneIphone, TabletMac } from '@mui/icons-material'
import { ILM_RICHTEXT_TABLE_WRAP_CLASS, wrapRichTextTables } from '../utils/wrapRichTextTables'

/* ─── Phone models ─── */
const PHONE_MODELS = [
  { id: 'iphone-se', label: 'iPhone SE', w: 320, h: 568, radius: 30 },
  { id: 'iphone-14', label: 'iPhone 14', w: 390, h: 844, radius: 44 },
  { id: 'iphone-15-pro-max', label: 'iPhone 15 Pro Max', w: 430, h: 932, radius: 50 },
  { id: 'pixel-7', label: 'Pixel 7', w: 412, h: 915, radius: 36 },
  { id: 'samsung-s24', label: 'Samsung S24', w: 360, h: 780, radius: 34 },
  { id: 'ipad-mini', label: 'iPad Mini', w: 744, h: 1133, radius: 24 },
] as const

type PhoneModelId = typeof PHONE_MODELS[number]['id']

/* ─── Design tokens (matching mobile IlmColors / IlmTypography / IlmSpacing) ─── */
const C = {
  primary: '#B68A60',
  accent: '#EBCA70',
  bg: '#FFF9F0',
  bgWhite: '#FFFFFF',
  textPrimary: '#1F1F1F',
  textSecondary: '#7A7A7A',
  textDisabled: '#A0A0A0',
  success: '#8ABE61',
  error: '#D9534F',
  border: '#E0E0E0',
  cardBg: '#F6E5CE',
  selected: '#E9E2D8',
  tabActive: '#A85F1E',
}
const S = { xs: 4, s: 8, m: 16, l: 24, xl: 32 }
const font = (size: number, weight: number, family = "'Montserrat', sans-serif") =>
  ({ fontFamily: family, fontSize: size, fontWeight: weight, color: C.textPrimary } as const)

/* ─── Types ─── */
interface MobilePreviewProps {
  open: boolean
  onClose: () => void
  block: { type: string; contentRu?: Record<string, any> } | null
}

const BLOCK_LABELS: Record<string, string> = {
  theory: 'Теория',
  illustration: 'Иллюстрация',
  audio: 'Аудио',
  video: 'Видео',
  lesson_complete: 'Завершение урока',
  multiple_choice: 'Выбор ответов',
  single_choice: 'Выбор ответа',
  audio_multiple_choice: 'Аудио + выбор',
  match_pairs: 'Сопоставление пар',
  fill_blank: 'Заполни пропуск',
  manual_input: 'Ввод ответа',
  listen_repeat: 'Слушай и повтори',
  image_word_match: 'Картинка ↔ Слово',
  audio_choice: 'Аудио → Буква',
  find_letter_in_word: 'Найди букву',
  listen_and_choose_word: 'Послушай → Слово',
  element_grid: 'Сетка (старый тип)',
  grid: 'Сетка',
}

/* ─── Main Component ─── */
export default function MobilePreview({ open, onClose, block }: MobilePreviewProps) {
  const [modelId, setModelId] = useState<PhoneModelId>('iphone-14')
  if (!block) return null
  const cr = block.contentRu || {}
  const model = PHONE_MODELS.find((m) => m.id === modelId) || PHONE_MODELS[1]

  // Scale phone to fit dialog (max visible height ~80vh)
  const maxFrameH = 600
  const scale = model.h > maxFrameH ? maxFrameH / model.h : 1
  const isTablet = model.w > 500

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={isTablet ? 'md' : 'sm'}
      fullWidth
      PaperProps={{ sx: { bgcolor: '#f5f5f5', borderRadius: 3, maxHeight: '95vh' } }}
    >
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 3, pt: 2, overflow: 'auto' }}>
        {/* Header row */}
        <Box sx={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
          <Typography sx={{ ...font(14, 600), color: C.textSecondary }}>
            {BLOCK_LABELS[block.type] || block.type}
          </Typography>
          <IconButton size="small" onClick={onClose}>
            <Close fontSize="small" />
          </IconButton>
        </Box>

        {/* Phone model selector */}
        <ToggleButtonGroup
          value={modelId}
          exclusive
          onChange={(_, v) => { if (v) setModelId(v as PhoneModelId) }}
          size="small"
          sx={{ mb: 2, flexWrap: 'wrap', justifyContent: 'center' }}
        >
          {PHONE_MODELS.map((m) => (
            <ToggleButton
              key={m.id}
              value={m.id}
              sx={{ textTransform: 'none', fontSize: 11, px: 1.5, py: 0.5, gap: 0.5 }}
            >
              {m.w > 500 ? <TabletMac sx={{ fontSize: 14 }} /> : <PhoneIphone sx={{ fontSize: 14 }} />}
              {m.label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>

        {/* Device size label */}
        <Typography sx={{ ...font(11, 400), color: C.textDisabled, mb: 1 }}>
          {model.w} × {model.h}pt
          {scale < 1 && ` (масштаб ${Math.round(scale * 100)}%)`}
        </Typography>

        {/* Phone frame — outer border at scaled size, inner content at real device px */}
        <Box sx={{
          width: model.w * scale + Math.round(10 * scale) * 2,
          height: model.h * scale + Math.round(10 * scale) * 2,
          border: `${Math.round(10 * scale)}px solid #1a1a1a`,
          borderRadius: `${model.radius * scale}px`,
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}>
          {/* Wrapper: exact scaled size so transform fits; clips scaled content correctly */}
          <Box sx={{
            width: model.w * scale,
            height: model.h * scale,
            overflow: 'hidden',
          }}>
            {/* Single scaled container — all content inside uses real device pixels */}
            <Box sx={{
              width: model.w,
              height: model.h,
              transform: scale < 1 ? `scale(${scale})` : undefined,
              transformOrigin: 'top left',
              bgcolor: C.bg,
              display: 'flex',
              flexDirection: 'column',
            }}>
            {/* Notch / status bar */}
            <Box sx={{
              height: 44, bgcolor: C.bg,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderBottom: '1px solid rgba(0,0,0,0.04)',
              flexShrink: 0,
            }}>
              <Box sx={{ width: 80, height: 24, bgcolor: '#1a1a1a', borderRadius: '12px' }} />
            </Box>

            {/* Scrollable content */}
            <Box sx={{ flex: 1, overflow: 'auto', p: `${S.m}px`, minHeight: 0 }}>
              {block.type === 'theory' && <TheoryPreview c={cr} />}
              {(block.type === 'element_grid' || block.type === 'grid') && <ElementGridPreview c={cr} />}
              {block.type === 'illustration' && <IllustrationPreview c={cr} />}
              {block.type === 'audio' && <AudioBlockPreview c={cr} />}
              {block.type === 'video' && <VideoBlockPreview c={cr} />}
              {block.type === 'lesson_complete' && <LessonCompletePreview c={cr} />}
              {(block.type === 'multiple_choice' || block.type === 'single_choice') && <MultipleChoicePreview c={cr} type={block.type} />}
              {block.type === 'audio_multiple_choice' && <AudioMultipleChoicePreview c={cr} />}
              {block.type === 'match_pairs' && <MatchPairsPreview c={cr} />}
              {block.type === 'fill_blank' && <FillBlankPreview c={cr} />}
              {block.type === 'manual_input' && <ManualInputPreview c={cr} />}
              {block.type === 'listen_repeat' && <ListenRepeatPreview c={cr} />}
              {block.type === 'image_word_match' && <ImageWordMatchPreview c={cr} />}
              {block.type === 'audio_choice' && <AudioChoicePreview c={cr} />}
              {block.type === 'find_letter_in_word' && <FindLetterPreview c={cr} />}
              {block.type === 'listen_and_choose_word' && <ListenAndChooseWordPreview c={cr} />}
            </Box>

            {/* Bottom button — inside the same scaled container, always at bottom */}
            <Box sx={{ p: `${S.m}px`, pt: 0, flexShrink: 0 }}>
              <MobileButton label="Продолжить" />
            </Box>
            </Box>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  )
}

/* ─── Shared widgets ─── */
function MobileButton({ label, disabled }: { label: string; disabled?: boolean }) {
  return (
    <Box sx={{
      width: '100%', height: 52, borderRadius: '24px',
      bgcolor: disabled ? C.border : C.primary,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      ...font(16, 600),
      color: '#fff',
      opacity: disabled ? 0.5 : 1,
    }}>
      {label}
    </Box>
  )
}

function AudioPlayerMock() {
  return (
    <Box sx={{
      p: `${S.s}px ${S.m}px`,
      bgcolor: C.bgWhite, borderRadius: '12px', border: `1px solid ${C.border}`,
      display: 'flex', alignItems: 'center', gap: 1,
    }}>
      <PlayCircleFilled sx={{ fontSize: 36, color: C.primary }} />
      <Box sx={{ flex: 1 }}>
        <Box sx={{ height: 3, bgcolor: C.border, borderRadius: 2, position: 'relative' }}>
          <Box sx={{ width: '30%', height: '100%', bgcolor: C.primary, borderRadius: 2 }} />
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
          <Typography sx={{ ...font(11, 400), color: C.textSecondary }}>00:05</Typography>
          <Typography sx={{ ...font(11, 400), color: C.textSecondary }}>00:12</Typography>
        </Box>
      </Box>
    </Box>
  )
}

function OptionCard({ text, isRadio = true, arabic }: { text: string; isRadio?: boolean; arabic?: boolean }) {
  return (
    <Box sx={{
      mb: `${S.m}px`, p: `${S.m}px`, borderRadius: '12px',
      bgcolor: C.bgWhite, border: `1px solid ${C.border}`,
      display: 'flex', alignItems: 'center', gap: 1.5,
    }}>
      <Box sx={{
        width: 24, height: 24, borderRadius: isRadio ? '12px' : '4px',
        border: `2px solid ${C.border}`, flexShrink: 0,
      }} />
      <Typography sx={{
        ...font(16, 400),
        flex: 1,
        direction: arabic ? 'rtl' : undefined,
        textAlign: arabic ? 'right' : undefined,
      }}>
        {text}
      </Typography>
    </Box>
  )
}

/* FeedbackBanner — reserved for interactive preview mode */

/* ─── Element grid (letters / symbols) ─── */
function ElementGridPreview({ c }: { c: Record<string, any> }) {
  const title = (c.title as string) || ''
  const rawItems = (c.items as unknown[]) || []
  const n = rawItems.length
  const colSpec = c.columns
  const isAuto = colSpec === 'auto' || colSpec === 'Auto'
  let cols = Math.min(4, Math.max(2, Number(colSpec) || 3))
  if (isAuto) {
    if (n <= 4) cols = 2
    else if (n <= 9) cols = 3
    else cols = 4
  }
  const gap = cols === 4 ? 6 : 8
  const isLegacy = rawItems.length > 0 && typeof rawItems[0] === 'string'
  const cells: { main: string; sub?: string }[] = isLegacy
    ? (rawItems as string[]).map((t) => ({ main: t }))
    : (rawItems as { mainText?: string; caption?: string }[]).map((it) => ({
        main: (it?.mainText as string) || '',
        sub: (c.showCaption && (it?.caption as string)) || undefined,
      }))
  return (
    <Box>
      {title && <Typography sx={{ ...font(20, 600), textAlign: 'center', mb: `${S.m}px` }}>{title}</Typography>}
      {cells.length === 0 ? (
        <Typography sx={{ ...font(14, 400), color: C.textSecondary, textAlign: 'center' }}>—</Typography>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
            gap: `${gap}px`,
            maxWidth: 360,
            mx: 'auto',
            py: `${S.m}px`,
          }}
        >
          {cells.map((cell, i) => (
            <Box
              key={i}
              sx={{
                border: `0.5px solid ${C.border}`,
                borderRadius: '8px',
                p: 1.25,
                textAlign: 'center',
                bgcolor: C.bgWhite,
                fontFamily: "'Noto Sans Arabic', 'Montserrat', sans-serif",
                color: C.textPrimary,
                minHeight: 44,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 0.5,
              }}
            >
              <Box sx={{ fontSize: 22, fontWeight: 600 }}>{cell.main}</Box>
              {cell.sub && (
                <Box sx={{ ...font(12, 500), color: C.textSecondary }}>{cell.sub}</Box>
              )}
            </Box>
          ))}
        </Box>
      )}
    </Box>
  )
}

/* ─── Theory ─── */
function TheoryPreview({ c }: { c: Record<string, any> }) {
  const title = (c.title as string) || ''
  const html = (c.html as string) || (c.text as string) || ''
  const examples = (c.examples as any[]) || []
  const htmlForPreview = html ? wrapRichTextTables(html) : ''

  return (
    <Box>
      {title && <Typography sx={{ ...font(22, 600), mb: `${S.m}px` }}>{title}</Typography>}
      {htmlForPreview && (
        <Box
          sx={{
            ...font(16, 400),
            lineHeight: 1.6,
            '& h1': { fontSize: 22, fontWeight: 600, m: '8px 0' },
            '& h2': { fontSize: 20, fontWeight: 600, m: '8px 0' },
            '& h3': { fontSize: 18, fontWeight: 600, m: '8px 0' },
            '& p': { m: '6px 0', lineHeight: 1.6 },
            '& img': { maxWidth: '100%', height: 'auto', borderRadius: '8px', my: 1 },
            '& audio': { width: '100%', my: 1 },
            '.ilm-richtext-audio--compact': {
              width: 'auto',
              minWidth: 120,
              maxWidth: 220,
              height: 40,
              display: 'inline-block',
              verticalAlign: 'middle',
              my: 0.25,
            },
            // Compact chip: only the dedicated «аудио» column; text column = full width bar
            [`& .${ILM_RICHTEXT_TABLE_WRAP_CLASS} .ilm-richtext-td-audio audio`]: {
              width: 'auto',
              minWidth: 120,
              maxWidth: 220,
              height: 40,
              display: 'inline-block',
              verticalAlign: 'middle',
              borderRadius: '8px',
            },
            [`& .${ILM_RICHTEXT_TABLE_WRAP_CLASS} .ilm-richtext-td-audio`]: {
              minWidth: '112px',
              textAlign: 'center',
              whiteSpace: 'nowrap',
              verticalAlign: 'middle',
              bgcolor: '#faf8f5',
            },
            '& video': { maxWidth: '100%', borderRadius: '8px', my: 1 },
            [`& .${ILM_RICHTEXT_TABLE_WRAP_CLASS}`]: {
              borderRadius: '14px',
              overflow: 'hidden',
              my: 1.5,
              width: '100%',
              maxWidth: '100%',
              boxSizing: 'border-box',
              textAlign: 'center',
              border: '1px solid #c9bcad',
              boxShadow: '0 6px 18px rgba(26, 15, 0, 0.07)',
            },
            [`& .${ILM_RICHTEXT_TABLE_WRAP_CLASS} table`]: {
              display: 'inline-table',
              maxWidth: '100%',
              borderCollapse: 'collapse',
              borderSpacing: 0,
              tableLayout: 'fixed',
              m: 0,
            },
            [`& .${ILM_RICHTEXT_TABLE_WRAP_CLASS} th, & .${ILM_RICHTEXT_TABLE_WRAP_CLASS} td`]: {
              border: '1px solid #c9bcad',
              p: 1.5,
              textAlign: 'left',
            },
            [`& .${ILM_RICHTEXT_TABLE_WRAP_CLASS} th`]: { bgcolor: '#f0ebe4', fontWeight: 600 },
            '& ul, & ol': { pl: 2.5, my: 1 },
            '& a': { color: C.primary },
          }}
          dangerouslySetInnerHTML={{ __html: htmlForPreview }}
        />
      )}
      {examples.length > 0 && (
        <Box sx={{ mt: `${S.m}px` }}>
          <Typography sx={{ ...font(20, 600), mb: `${S.m}px` }}>Примеры</Typography>
          {examples.map((ex: any, i: number) => (
            <Box key={i} sx={{
              mb: `${S.m}px`, p: `${S.m}px`,
              bgcolor: C.bgWhite, borderRadius: '12px',
              display: 'flex', alignItems: 'center', gap: `${S.m}px`,
            }}>
              {ex.illustration && (
                <Box
                  component="img"
                  src={ex.illustration}
                  sx={{ width: 80, height: 80, borderRadius: '8px', objectFit: 'cover' }}
                />
              )}
              <Box>
                <Typography sx={font(16, 700)}>{ex.text || ''}</Typography>
                {ex.group && <Typography sx={{ ...font(14, 400), color: C.textSecondary, mt: 0.5 }}>{ex.group}</Typography>}
              </Box>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  )
}

/* ─── Illustration ─── */
function IllustrationPreview({ c }: { c: Record<string, any> }) {
  const arabicWord = (c.arabicWord as string) || ''
  const transcription = (c.transcription as string) || ''
  const translation = (c.translation as string) || (c.translationRu as string) || ''

  return (
    <Box sx={{ bgcolor: C.bgWhite, borderRadius: '24px', p: `${S.l}px`, textAlign: 'center' }}>
      {/* Image placeholder */}
      <Box sx={{
        width: 200, height: 200, borderRadius: '16px', bgcolor: C.cardBg,
        mx: 'auto', mb: `${S.m}px`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Typography sx={{ fontSize: 48, color: C.textSecondary }}>🖼</Typography>
      </Box>

      <Typography sx={{
        fontFamily: "'Noto Sans Arabic', 'Amiri', serif",
        fontSize: 32, fontWeight: 700, color: C.textPrimary,
        direction: 'rtl', mb: `${S.s}px`,
      }}>
        {arabicWord}
      </Typography>

      {transcription && (
        <Typography sx={{ ...font(16, 400), color: C.textSecondary, mb: `${S.s}px` }}>
          [ {transcription} ]
        </Typography>
      )}

      {translation && (
        <Typography sx={{ ...font(16, 600), mb: `${S.m}px` }}>{translation}</Typography>
      )}

      {/* Audio button */}
      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
        <VolumeUp sx={{ fontSize: 48, color: C.primary }} />
      </Box>
    </Box>
  )
}

/* ─── Audio Block ─── */
function AudioBlockPreview({ c }: { c: Record<string, any> }) {
  const title = (c.title as string) || ''

  return (
    <Box sx={{ bgcolor: C.bgWhite, borderRadius: '24px', p: `${S.l}px` }}>
      {title && <Typography sx={{ ...font(20, 600), mb: `${S.l}px` }}>{title}</Typography>}
      {c.audioUrl ? <AudioPlayerMock /> : (
        <Box sx={{ textAlign: 'center', py: `${S.xl}px` }}>
          <MusicOff sx={{ fontSize: 48, color: C.textSecondary }} />
        </Box>
      )}
    </Box>
  )
}

/* ─── Video Block ─── */
function VideoBlockPreview({ c }: { c: Record<string, any> }) {
  const title = (c.title as string) || ''

  return (
    <Box sx={{ bgcolor: C.bgWhite, borderRadius: '24px', p: `${S.l}px` }}>
      {title && <Typography sx={{ ...font(20, 600), mb: `${S.l}px`, textAlign: 'center' }}>{title}</Typography>}
      <Box sx={{
        height: 200, borderRadius: '16px', bgcolor: '#000',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <PlayCircleFilled sx={{ fontSize: 64, color: 'rgba(255,255,255,0.7)' }} />
      </Box>
    </Box>
  )
}

/* ─── Lesson Complete ─── */
function LessonCompletePreview({ c }: { c: Record<string, any> }) {
  const message = (c.messageRu as string) || 'Урок завершен!'
  const summary = (c.summaryRu as string) || ''

  return (
    <Box sx={{ textAlign: 'center' }}>
      <Typography sx={{ ...font(22, 700), mb: `${S.m}px` }}>{message}</Typography>
      {summary && <Typography sx={{ ...font(16, 400), color: C.textSecondary, mb: `${S.m}px` }}>{summary}</Typography>}

      {/* Illustration */}
      <Box sx={{
        width: 200, height: 200, borderRadius: '24px', bgcolor: '#8B5A2B',
        mx: 'auto', my: `${S.xl}px`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <MenuBook sx={{ fontSize: 80, color: '#fff' }} />
      </Box>

      {/* Metrics */}
      <Box sx={{ display: 'flex', gap: `${S.m}px`, mt: `${S.m}px` }}>
        <Box sx={{
          flex: 1, p: `${S.m}px`, borderRadius: '16px',
          bgcolor: `${C.accent}33`, border: `1px solid ${C.accent}80`,
          textAlign: 'center',
        }}>
          <Star sx={{ fontSize: 32, color: C.accent }} />
          <Typography sx={font(20, 700)}>10</Typography>
          <Typography sx={{ ...font(14, 400), color: C.textSecondary }}>Баллы</Typography>
        </Box>
        <Box sx={{
          flex: 1, p: `${S.m}px`, borderRadius: '16px',
          bgcolor: `${C.success}33`, border: `1px solid ${C.success}80`,
          textAlign: 'center',
        }}>
          <TrendingUp sx={{ fontSize: 32, color: C.success }} />
          <Typography sx={font(20, 700)}>100%</Typography>
          <Typography sx={{ ...font(14, 400), color: C.textSecondary }}>Прогресс</Typography>
        </Box>
      </Box>
    </Box>
  )
}

/* ─── Multiple / Single Choice ─── */
function MultipleChoicePreview({ c, type }: { c: Record<string, any>; type: string }) {
  const question = (c.question as string) || ''
  const options = (c.options as any[]) || []
  const isMulti = type === 'multiple_choice'

  return (
    <Box>
      <Typography sx={{ ...font(20, 700), mb: `${S.m}px` }}>{question}</Typography>
      {isMulti && <Typography sx={{ ...font(14, 400), color: C.textSecondary, mb: `${S.m}px` }}>Выберите несколько вариантов</Typography>}
      {options.map((opt: any, i: number) => {
        const text = typeof opt === 'string' ? opt : (opt.text || '')
        const isArabic = /[\u0600-\u06FF]/.test(text)
        return <OptionCard key={i} text={text} isRadio={!isMulti} arabic={isArabic} />
      })}
    </Box>
  )
}

/* ─── Audio Multiple Choice ─── */
function AudioMultipleChoicePreview({ c }: { c: Record<string, any> }) {
  const question = (c.question as string) || 'Послушайте и выберите ответ'
  const options = (c.options as any[]) || []

  return (
    <Box>
      <Typography sx={{ ...font(20, 700), mb: `${S.m}px` }}>{question}</Typography>
      <Box sx={{ mb: `${S.xl}px` }}><AudioPlayerMock /></Box>
      {options.map((opt: any, i: number) => {
        const text = typeof opt === 'string' ? opt : (opt.text || '')
        return <OptionCard key={i} text={text} />
      })}
    </Box>
  )
}

/* ─── Match Pairs ─── */
function MatchPairsPreview({ c }: { c: Record<string, any> }) {
  const instruction = (c.instructionRu as string) || 'Сопоставь пары'
  const leftItems = (c.leftItems || c.leftColumn || []) as any[]
  const rightItems = (c.rightItems || c.rightColumn || []) as any[]

  // Fallback to pairs format
  const pairs = (c.pairs as any[]) || []
  const left = leftItems.length > 0 ? leftItems : pairs.map((p: any, i: number) => ({ id: `l${i + 1}`, text: p.left || '' }))
  const right = rightItems.length > 0 ? rightItems : pairs.map((p: any, i: number) => ({ id: `r${i + 1}`, text: p.right || '' }))

  return (
    <Box>
      <Typography sx={{ ...font(20, 700), mb: `${S.xl}px` }}>{instruction}</Typography>
      <Box sx={{ display: 'flex', gap: `${S.m}px` }}>
        <Box sx={{ flex: 1 }}>
          {left.map((item: any, i: number) => (
            <Box key={i} sx={{
              mb: `${S.m}px`, p: `${S.m}px`, borderRadius: '12px',
              bgcolor: C.bgWhite, border: `1px solid ${C.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              minHeight: 48,
            }}>
              {(item.itemType === 'audio') ? (
                <PlayCircleFilled sx={{ fontSize: 32, color: C.primary }} />
              ) : item.imageUrl ? (
                <Box component="img" src={item.imageUrl} sx={{ width: 48, height: 48, borderRadius: '8px', objectFit: 'cover' }} />
              ) : (
                <Typography sx={{ ...font(16, 600), textAlign: 'center', direction: /[\u0600-\u06FF]/.test(item.text || '') ? 'rtl' : undefined }}>
                  {item.text || `[${item.id}]`}
                </Typography>
              )}
            </Box>
          ))}
        </Box>
        <Box sx={{ flex: 1 }}>
          {right.map((item: any, i: number) => (
            <Box key={i} sx={{
              mb: `${S.m}px`, p: `${S.m}px`, borderRadius: '12px',
              bgcolor: C.bgWhite, border: `1px solid ${C.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              minHeight: 48,
            }}>
              {(item.itemType === 'audio') ? (
                <PlayCircleFilled sx={{ fontSize: 32, color: C.primary }} />
              ) : (
                <Typography sx={{ ...font(16, 600), textAlign: 'center', direction: /[\u0600-\u06FF]/.test(item.text || '') ? 'rtl' : undefined }}>
                  {item.text || `[${item.id}]`}
                </Typography>
              )}
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  )
}

/* ─── Fill Blank ─── */
function FillBlankPreview({ c }: { c: Record<string, any> }) {
  const instruction = (c.instructionRu as string) || 'Заполни пропуск'
  const template = (c.sentenceTemplateRu as string) || ''
  const options = (c.options as any[]) || []

  const parts = template.split('___')

  return (
    <Box>
      <Typography sx={{ ...font(20, 700), mb: `${S.xl}px` }}>{instruction}</Typography>

      {/* Sentence with blank */}
      <Box sx={{ bgcolor: C.bgWhite, borderRadius: '12px', p: `${S.m}px`, mb: `${S.xl}px` }}>
        <Typography sx={{ ...font(16, 400), lineHeight: 2 }}>
          {parts[0]}
          <Box component="span" sx={{
            borderBottom: `2px dashed ${C.textSecondary}`,
            px: 1.5, mx: 0.5, color: C.textSecondary,
          }}>
            __________
          </Box>
          {parts[1] || ''}
        </Typography>
      </Box>

      {/* Options */}
      {options.map((opt: any, i: number) => {
        const text = typeof opt === 'string' ? opt : (opt.text || opt.id || '')
        return (
          <Box key={i} sx={{
            mb: `${S.m}px`, p: `${S.m}px`, borderRadius: '12px',
            bgcolor: C.bgWhite, border: `1px solid ${C.border}`, textAlign: 'center',
          }}>
            <Typography sx={font(16, 400)}>{text}</Typography>
          </Box>
        )
      })}
    </Box>
  )
}

/* ─── Manual Input ─── */
function ManualInputPreview({ c }: { c: Record<string, any> }) {
  const question = (c.question as string) || (c.instructionRu as string) || ''
  const hint = (c.hintRu as string) || ''
  const correctAnswer = (c.correctAnswer as string) || ''
  const correctAnswers = (c.correctAnswers as string[]) || []
  const answer = correctAnswer || correctAnswers[0] || ''

  return (
    <Box>
      <Typography sx={{ ...font(20, 700), mb: `${S.xl}px` }}>{question}</Typography>

      {/* Input field */}
      <Box sx={{
        p: `${S.m}px`, borderRadius: '12px',
        border: `1px solid ${C.border}`, bgcolor: C.bgWhite,
      }}>
        <Typography sx={{ ...font(16, 400), color: C.textDisabled }}>
          {hint || 'Введите ответ...'}
        </Typography>
      </Box>

      {answer && (
        <Typography sx={{ ...font(14, 400), color: C.textSecondary, mt: `${S.s}px` }}>
          Ответ: {answer}
        </Typography>
      )}
    </Box>
  )
}

/* ─── Listen Repeat ─── */
function ListenRepeatPreview({ c }: { c: Record<string, any> }) {
  const instruction = (c.instructionRu as string) || 'Слушай и повторяй'

  return (
    <Box sx={{ textAlign: 'center' }}>
      <Typography sx={{ ...font(20, 700), mb: `${S.xl}px` }}>{instruction}</Typography>
      <Box sx={{ my: `${S.xl}px` }}><AudioPlayerMock /></Box>
    </Box>
  )
}

/* ─── Image Word Match ─── */
function ImageWordMatchPreview({ c }: { c: Record<string, any> }) {
  const instruction = (c.instruction as string) || (c.instructionRu as string) || 'Сопоставь картинки со словами'
  const pairs = (c.pairs as any[]) || []

  return (
    <Box>
      <Typography sx={{ ...font(20, 700), mb: `${S.xl}px` }}>{instruction}</Typography>
      <Box sx={{ display: 'flex', gap: `${S.m}px` }}>
        {/* Images column */}
        <Box sx={{ flex: 1 }}>
          {pairs.map((p: any, i: number) => (
            <Box key={i} sx={{
              height: 90, mb: `${S.m}px`, borderRadius: '12px',
              border: `1px solid ${C.border}`, bgcolor: C.bgWhite,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden',
            }}>
              {p.imageUrl ? (
                <Box component="img" src={p.imageUrl} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <Typography sx={{ fontSize: 32, color: C.textSecondary }}>🖼</Typography>
              )}
            </Box>
          ))}
        </Box>
        {/* Words column */}
        <Box sx={{ flex: 1 }}>
          {pairs.map((p: any, i: number) => (
            <Box key={i} sx={{
              height: 90, mb: `${S.m}px`, borderRadius: '12px',
              border: `1px solid ${C.border}`, bgcolor: C.bgWhite,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              p: `${S.s}px`,
            }}>
              <Typography sx={{
                ...font(20, 700), textAlign: 'center',
                direction: /[\u0600-\u06FF]/.test(p.word || p.text || '') ? 'rtl' : undefined,
              }}>
                {p.word || p.text || ''}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  )
}

/* ─── Audio Choice (Makhraj) ─── */
function AudioChoicePreview({ c }: { c: Record<string, any> }) {
  const instruction = (c.instructionRu as string) || 'Выберите правильную букву'
  const options = (c.options as any[]) || []

  return (
    <Box>
      <Typography sx={{ ...font(20, 700), mb: `${S.m}px` }}>{instruction}</Typography>
      <Box sx={{ mb: `${S.xl}px` }}><AudioPlayerMock /></Box>
      {options.map((opt: any, i: number) => {
        const text = opt.text || ''
        const isArabic = /[\u0600-\u06FF]/.test(text)
        return <OptionCard key={i} text={text} arabic={isArabic} />
      })}
    </Box>
  )
}

/* ─── Find Letter in Word ─── */
function FindLetterPreview({ c }: { c: Record<string, any> }) {
  const instruction = (c.instructionRu as string) || 'Найдите букву в слове'
  const word = (c.word as string) || ''
  const targetLetter = (c.targetLetter as string) || ''

  return (
    <Box>
      <Typography sx={{ ...font(20, 700), mb: `${S.s}px` }}>{instruction}</Typography>

      {targetLetter && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: `${S.xl}px` }}>
          <Typography sx={{ ...font(14, 400), color: C.textSecondary }}>Найдите:</Typography>
          <Box sx={{
            px: 1.5, py: 0.5, borderRadius: '8px',
            bgcolor: `${C.primary}1f`, border: `1px solid ${C.primary}`,
          }}>
            <Typography sx={{
              fontFamily: "'Noto Sans Arabic', serif",
              fontSize: 20, fontWeight: 700, color: C.primary,
              direction: 'rtl',
            }}>
              {targetLetter}
            </Typography>
          </Box>
        </Box>
      )}

      {/* Word container */}
      <Box sx={{
        p: `${S.l}px`, borderRadius: '16px',
        bgcolor: C.cardBg, border: `1px solid ${C.border}`,
        textAlign: 'center',
      }}>
        <Typography sx={{
          fontFamily: "'Noto Sans Arabic', serif",
          fontSize: 48, fontWeight: 400, color: C.textPrimary,
          direction: 'rtl', lineHeight: 1.5,
        }}>
          {word}
        </Typography>
      </Box>
    </Box>
  )
}

/* ─── Listen and Choose Word ─── */
function ListenAndChooseWordPreview({ c }: { c: Record<string, any> }) {
  const instruction = (c.instructionRu as string) || 'Послушайте и выберите слово'
  const options = (c.options as any[]) || []

  return (
    <Box>
      <Typography sx={{ ...font(20, 700), mb: `${S.m}px` }}>{instruction}</Typography>
      <Box sx={{ mb: `${S.xl}px` }}><AudioPlayerMock /></Box>
      {options.map((opt: any, i: number) => {
        const text = opt.text || ''
        return (
          <Box key={i} sx={{
            mb: `${S.m}px`, px: `${S.m}px`, py: '20px', borderRadius: '12px',
            bgcolor: C.bgWhite, border: `1px solid ${C.border}`,
            display: 'flex', alignItems: 'center', gap: 1.5,
          }}>
            <Box sx={{
              width: 24, height: 24, borderRadius: '12px',
              border: `2px solid ${C.border}`, flexShrink: 0,
            }} />
            <Typography sx={{
              fontFamily: "'Noto Sans Arabic', serif",
              fontSize: 22, fontWeight: 400, color: C.textPrimary,
              flex: 1, textAlign: 'right', direction: 'rtl',
            }}>
              {text}
            </Typography>
          </Box>
        )
      })}
    </Box>
  )
}
