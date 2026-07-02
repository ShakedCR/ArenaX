import { Box, Modal, Typography } from '@mui/material'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import api from '../../services/api'

import InviteLinkView from './InviteLinkView'
import CreateTournamentForm from './CreateTournamentForm'

import { DARK2, BEBAS } from '../../styles/themeConstants'
import {
  INITIAL_TOURNAMENT_FORM,
  BLACKJACK_MAX_PLAYERS,
  DEFAULT_MAX_PLAYERS,
  TRIVIA_MAX_PLAYERS,
} from '../../styles/tournamentConstants'

export default function CreateTournamentModal({ open, onClose, onCreated }) {
  const navigate = useNavigate()
  const [form, setForm] = useState(INITIAL_TOURNAMENT_FORM)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [inviteLink, setInviteLink] = useState(null)
  const [inviteTournamentId, setInviteTournamentId] = useState(null)

  const isBlackjack = form.gameTitle === 'Blackjack'
  const isTrivia = form.gameTitle === 'Trivia'
  const maxAllowed = isBlackjack ? BLACKJACK_MAX_PLAYERS : isTrivia ? TRIVIA_MAX_PLAYERS : DEFAULT_MAX_PLAYERS

  const resetModal = () => {
    setForm(INITIAL_TOURNAMENT_FORM)
    setInviteLink(null)
    setInviteTournamentId(null)
    setError('')
    setLoading(false)
  }

  const handleClose = () => {
    resetModal()
    onClose()
  }

  const handleChange = (field) => (event) => {
    const value = event.target.value

    setForm(prev => {
      if (field === 'gameTitle') {
        const limit = value === 'Blackjack'
          ? BLACKJACK_MAX_PLAYERS
          : value === 'Trivia'
            ? TRIVIA_MAX_PLAYERS
            : DEFAULT_MAX_PLAYERS
        const nextMax = Math.min(Number(prev.maxParticipants), limit)
        return { ...prev, gameTitle: value, maxParticipants: nextMax }
      }

      if (field === 'maxParticipants') {
        return { ...prev, maxParticipants: Math.min(Number(value), maxAllowed) }
      }

      return { ...prev, [field]: value }
    })
  }

  const handleFileChange = (file) => {
    setForm(prev => ({ ...prev, document: file || null }))
  }

  const handleTypeChange = (type) => {
    setForm(prev => ({
      ...prev,
      type,
      privatePassword: type === 'open' ? '' : prev.privatePassword
    }))
  }

  const validationError = useMemo(() => {
    const maxParticipants = Number(form.maxParticipants)

    if (!form.title.trim()) return 'Tournament name is required'
    if (!form.gameTitle) return 'Please select a game'

    if (isBlackjack && (maxParticipants < 2 || maxParticipants > BLACKJACK_MAX_PLAYERS)) {
      return 'Blackjack tournaments support 2 to 6 players'
    }

    if (isTrivia) {
      if (maxParticipants < 2 || maxParticipants > TRIVIA_MAX_PLAYERS) {
        return 'Trivia tournaments support 2 to 10 players'
      }
      const qc = Number(form.questionCount)
      if (!Number.isInteger(qc) || qc < 1 || qc > 50) {
        return 'Question count must be between 1 and 50'
      }
      const tpq = Number(form.timePerQuestion)
      if (!Number.isInteger(tpq) || tpq < 5 || tpq > 120) {
        return 'Time per question must be between 5 and 120 seconds'
      }
    }

    if (!isBlackjack && !isTrivia && (maxParticipants < 2 || maxParticipants > DEFAULT_MAX_PLAYERS)) {
      return 'Max players must be between 2 and 12'
    }

    if (form.type === 'private' && !form.privatePassword.trim()) {
      return 'Private tournaments require a password'
    }

    return ''
  }, [form, isBlackjack, isTrivia])

  const handleSubmit = async () => {
    if (validationError) {
      setError(validationError)
      return
    }

    setLoading(true)
    setError('')

    try {
      let res

      if (isTrivia) {
        const formData = new FormData()
        formData.append('title', form.title.trim())
        formData.append('category', form.category)
        formData.append('difficulty', form.difficulty)
        formData.append('questionCount', String(Number(form.questionCount)))
        formData.append('timePerQuestion', String(Number(form.timePerQuestion)))
        formData.append('entryFee', String(Number(form.entryFee)))
        formData.append('maxParticipants', String(Number(form.maxParticipants)))
        formData.append('isPrivate', String(form.type === 'private'))
        if (form.type === 'private') formData.append('privatePassword', form.privatePassword)
        if (form.document) formData.append('document', form.document)

        res = await api.post('/trivia/tournaments', formData)
      } else {
        res = await api.post('/tournaments', {
          title: form.title.trim(),
          gameTitle: form.gameTitle,
          entryFee: Number(form.entryFee),
          maxParticipants: Number(form.maxParticipants),
          format: 'single_elimination',
          startDate: new Date(),
          isPrivate: form.type === 'private',
          privatePassword: form.type === 'private' ? form.privatePassword : undefined,
        })
      }

      const tournament = res.data?.tournament
      const inviteCode = tournament?.inviteCode

      if (form.type === 'private' && inviteCode) {
        setInviteLink(`${window.location.origin}/tournaments/join/${inviteCode}`)
        setInviteTournamentId(tournament?._id)
        return
      }

      // For trivia open tournaments: navigate directly to waiting room
      if (isTrivia && tournament?._id) {
        handleClose()
        navigate(`/tournament/${tournament._id}/waiting`)
        return
      }

      await onCreated()
      handleClose()
    } catch {
      setError('Failed to create tournament. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleCopyLink = () => {
    if (inviteLink) navigator.clipboard.writeText(inviteLink)
  }

  const handleDone = async () => {
    if (isTrivia && inviteTournamentId) {
      handleClose()
      navigate(`/tournament/${inviteTournamentId}/waiting`)
      return
    }
    await onCreated()
    handleClose()
  }

  return (
    <Modal open={open} onClose={handleClose}>
      <Box sx={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        bgcolor: DARK2, border: '1px solid rgba(201,168,76,0.2)',
        borderRadius: 2, p: 4, width: '100%', maxWidth: 480,
        outline: 'none', maxHeight: '90vh', overflowY: 'auto'
      }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography sx={{ fontFamily: BEBAS, fontSize: 26, letterSpacing: 3 }}>
            {inviteLink ? 'INVITE LINK' : 'CREATE TOURNAMENT'}
          </Typography>
          <Typography
            onClick={handleClose}
            sx={{ color: '#666', cursor: 'pointer', fontSize: 20, '&:hover': { color: 'white' } }}
          >
            ✕
          </Typography>
        </Box>

        {inviteLink ? (
          <InviteLinkView
            inviteLink={inviteLink}
            password={form.privatePassword}
            onCopyLink={handleCopyLink}
            onDone={handleDone}
          />
        ) : (
          <CreateTournamentForm
            form={form}
            error={error}
            loading={loading}
            isBlackjack={isBlackjack}
            isTrivia={isTrivia}
            maxAllowed={maxAllowed}
            onChange={handleChange}
            onTypeChange={handleTypeChange}
            onFileChange={handleFileChange}
            onSubmit={handleSubmit}
          />
        )}
      </Box>
    </Modal>
  )
}
