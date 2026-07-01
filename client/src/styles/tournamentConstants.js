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
  privatePassword: '',
  // Trivia-specific fields
  category: 'General',
  document: null,
  difficulty: 'medium',
  questionCount: 10,
  timePerQuestion: 20,
}

export const TRIVIA_CATEGORIES = [
  'General',
  'Cyber Security',
  'Network Security',
  'Web Security',
  'Movies',
  'Gaming',
  'Sports',
  'Football',
  'History',
  'Science',
  'Technology',
  'Music',
]

export const TRIVIA_DIFFICULTIES = ['easy', 'medium', 'hard']

export const TRIVIA_MAX_PLAYERS = 10

export const BLACKJACK_MAX_PLAYERS = 6
export const DEFAULT_MAX_PLAYERS = 12

export const TOURNAMENT_TABS = [
  'All',
  'Ongoing',
  'Completed'
]