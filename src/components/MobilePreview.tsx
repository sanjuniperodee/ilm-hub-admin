import { Box, Dialog, DialogContent, DialogTitle, IconButton, Typography } from '@mui/material'
import { Close } from '@mui/icons-material'

interface MobilePreviewProps {
  open: boolean
  onClose: () => void
  block: {
    type: string
    contentRu?: Record<string, any>
  } | null
}

const EXERCISE_TYPES = [
  'multiple_choice',
  'single_choice',
  'match_pairs',
  'find_letter_in_word',
  'manual_input',
  'audio_multiple_choice',
  'listen_repeat',
  'image_word_match',
]

export default function MobilePreview({ open, onClose, block }: MobilePreviewProps) {
  if (!block) return null

  const contentRu = block.contentRu || {}
  const isExercise = EXERCISE_TYPES.includes(block.type)

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="subtitle1" fontWeight={600}>
          {block.type}
        </Typography>
        <IconButton size="small" onClick={onClose}>
          <Close fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
        <Box
          sx={{
            width: 375,
            height: 667,
            border: '8px solid #1a1a1a',
            borderRadius: '36px',
            overflow: 'auto',
            bgcolor: '#FFF9F1',
            position: 'relative',
          }}
        >
          {/* Status bar */}
          <Box
            sx={{
              height: 44,
              bgcolor: '#FFF9F1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderBottom: '1px solid rgba(0,0,0,0.06)',
              px: 2,
            }}
          >
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              ILM HUB
            </Typography>
          </Box>

          {/* Content */}
          <Box sx={{ p: 2, height: 'calc(100% - 44px)', overflow: 'auto' }}>
            {block.type === 'theory' && <TheoryPreview contentRu={contentRu} />}
            {block.type === 'illustration' && <IllustrationPreview contentRu={contentRu} />}
            {isExercise && <ExercisePreview type={block.type} contentRu={contentRu} />}
            {block.type === 'lesson_complete' && <LessonCompletePreview contentRu={contentRu} />}
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  )
}

function TheoryPreview({ contentRu }: { contentRu: Record<string, any> }) {
  const title = (contentRu.title as string) || ''
  const html = (contentRu.html as string) || (contentRu.text as string) || ''

  return (
    <Box>
      {title && (
        <Typography variant="h6" fontWeight={700} sx={{ mb: 1.5, color: '#0E0B08' }}>
          {title}
        </Typography>
      )}
      {html && (
        <Box
          sx={{
            '& h1, & h2, & h3': { margin: '8px 0', color: '#0E0B08' },
            '& p': { margin: '6px 0', color: '#0E0B08', lineHeight: 1.6 },
            '& img': { maxWidth: '100%', height: 'auto', borderRadius: '8px' },
            '& audio': { width: '100%' },
            '& video': { maxWidth: '100%', borderRadius: '8px' },
            fontSize: 14,
            color: '#0E0B08',
            lineHeight: 1.6,
          }}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      )}
    </Box>
  )
}

function IllustrationPreview({ contentRu }: { contentRu: Record<string, any> }) {
  const arabicWord = (contentRu.arabicWord as string) || ''
  const transcription = (contentRu.transcription as string) || ''
  const translation = (contentRu.translation as string) || (contentRu.translationRu as string) || ''

  return (
    <Box sx={{ textAlign: 'center', pt: 4 }}>
      <Typography variant="h4" sx={{ fontWeight: 500, color: '#0E0B08', direction: 'rtl' }}>
        {arabicWord}
      </Typography>
      {transcription && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          [ {transcription} ]
        </Typography>
      )}
      {translation && (
        <Typography variant="h6" sx={{ mt: 2, color: '#0E0B08' }}>
          {translation}
        </Typography>
      )}
    </Box>
  )
}

function ExercisePreview({ type, contentRu }: { type: string; contentRu: Record<string, any> }) {
  const question = (contentRu.question as string) || (contentRu.instructionRu as string) || ''
  const options = (contentRu.options as string[]) || []

  return (
    <Box>
      <Typography
        variant="caption"
        sx={{
          bgcolor: '#A85F1E',
          color: '#fff',
          px: 1.5,
          py: 0.5,
          borderRadius: 1,
          display: 'inline-block',
          mb: 1.5,
          fontWeight: 600,
        }}
      >
        {type.replace(/_/g, ' ')}
      </Typography>

      {question && (
        <Typography variant="body1" fontWeight={600} sx={{ mb: 2, color: '#0E0B08' }}>
          {question}
        </Typography>
      )}

      {options.length > 0 &&
        options.map((opt, i) => (
          <Box
            key={i}
            sx={{
              p: 1.5,
              mb: 1,
              border: '1px solid #EFE6DA',
              borderRadius: 2,
              bgcolor: '#fff',
            }}
          >
            <Typography variant="body2" color="#0E0B08">
              {opt}
            </Typography>
          </Box>
        ))}

      {type === 'match_pairs' && <MatchPairsExercisePreview contentRu={contentRu} />}
      {type === 'find_letter_in_word' && <FindLetterPreview contentRu={contentRu} />}
      {type === 'manual_input' && <ManualInputPreview contentRu={contentRu} />}
    </Box>
  )
}

function MatchPairsExercisePreview({ contentRu }: { contentRu: Record<string, any> }) {
  const leftItems = (contentRu.leftItems || contentRu.leftColumn || []) as Array<Record<string, any>>
  const rightItems = (contentRu.rightItems || contentRu.rightColumn || []) as Array<Record<string, any>>

  if (leftItems.length === 0 && rightItems.length === 0) return null

  return (
    <Box sx={{ display: 'flex', gap: 1 }}>
      <Box sx={{ flex: 1 }}>
        {leftItems.map((item, i) => (
          <Box key={i} sx={{ p: 1, mb: 1, border: '1px solid #EFE6DA', borderRadius: 2, bgcolor: '#fff', textAlign: 'center' }}>
            <Typography variant="body2" color="#0E0B08">
              {item.itemType === 'audio' ? '🔊' : (item.text || `[${item.id}]`)}
            </Typography>
          </Box>
        ))}
      </Box>
      <Box sx={{ flex: 1 }}>
        {rightItems.map((item, i) => (
          <Box key={i} sx={{ p: 1, mb: 1, border: '1px solid #EFE6DA', borderRadius: 2, bgcolor: '#fff', textAlign: 'center' }}>
            <Typography variant="body2" color="#0E0B08">
              {item.itemType === 'audio' ? '🔊' : (item.text || `[${item.id}]`)}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  )
}

function FindLetterPreview({ contentRu }: { contentRu: Record<string, any> }) {
  const word = (contentRu.word as string) || ''
  const targetLetter = (contentRu.targetLetter as string) || ''

  return (
    <Box sx={{ textAlign: 'center', mt: 2 }}>
      {targetLetter && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="caption" color="text.secondary">
            {'  '}
          </Typography>
          <Box
            component="span"
            sx={{
              px: 1.5,
              py: 0.5,
              bgcolor: 'rgba(168, 95, 30, 0.12)',
              border: '1px solid #A85F1E',
              borderRadius: 1,
              fontSize: 24,
              direction: 'rtl',
            }}
          >
            {targetLetter}
          </Box>
        </Box>
      )}
      <Typography variant="h4" sx={{ direction: 'rtl', color: '#0E0B08' }}>
        {word}
      </Typography>
    </Box>
  )
}

function ManualInputPreview({ contentRu }: { contentRu: Record<string, any> }) {
  const hint = (contentRu.hintRu as string) || ''

  return (
    <Box sx={{ mt: 1 }}>
      <Box
        sx={{
          p: 1.5,
          border: '1px solid #EFE6DA',
          borderRadius: 2,
          bgcolor: '#fff',
          color: 'text.disabled',
          fontSize: 14,
        }}
      >
        {hint || '...'}
      </Box>
    </Box>
  )
}

function LessonCompletePreview({ contentRu }: { contentRu: Record<string, any> }) {
  const message = (contentRu.messageRu as string) || ''
  const summary = (contentRu.summaryRu as string) || ''

  return (
    <Box sx={{ textAlign: 'center', pt: 6 }}>
      <Typography variant="h5" fontWeight={700} color="#0E0B08" sx={{ mb: 2 }}>
        {message || 'Урок завершен!'}
      </Typography>
      {summary && (
        <Typography variant="body2" color="text.secondary">
          {summary}
        </Typography>
      )}
    </Box>
  )
}
