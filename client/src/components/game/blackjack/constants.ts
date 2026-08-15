export { GOLD, DARK, DARK2, DARK3, BEBAS } from '../../../styles/themeConstants.js'

export const SUIT_SYMBOLS = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠'
} as const;

export const SUIT_COLORS = {
  hearts: '#E53935',
  diamonds: '#E53935',
  clubs: '#111',
  spades: '#111'
} as const;

export type Suit = keyof typeof SUIT_SYMBOLS;