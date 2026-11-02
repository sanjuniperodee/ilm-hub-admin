import type { Modifier } from '@dnd-kit/core'

/** Lists in the editor only move vertically (avoids pulling in @dnd-kit/modifiers). */
export const restrictToVerticalAxis: Modifier = ({ transform }) => ({ ...transform, x: 0 })
