import { GAMES } from './gameConstants'

export const TOURNAMENT_GAMES = GAMES

export const TOURNAMENT_TYPES = [
  'open',
  'private'
]

export const INITIAL_TOURNAMENT_FORM = {
  title: '',
  gameTitle: '',
  entryFee: 0,
  maxParticipants: 2,
  type: 'open',
  privatePassword: ''
}

export const BLACKJACK_MAX_PLAYERS = 6
export const DEFAULT_MAX_PLAYERS = 12

export const TOURNAMENT_TABS = [
  'All',
  'Ongoing',
  'Completed'
]