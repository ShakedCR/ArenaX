export const GOLD  = '#C9A84C'
export const DARK  = '#0A0A0F'
export const DARK2 = '#12121A'
export const DARK3 = '#1C1C28'
export const BEBAS = "'Bebas Neue', sans-serif"

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