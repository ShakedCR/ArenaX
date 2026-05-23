import { Box, Modal, Typography } from '@mui/material'
import { useMemo, useState } from 'react'

import api from '../../services/api'

import InviteLinkView from './InviteLinkView'
import CreateTournamentForm from './CreateTournamentForm'

import { DARK2, BEBAS } from '../../styles/themeConstants'
import {
  INITIAL_TOURNAMENT_FORM,
  BLACKJACK_MAX_PLAYERS,
  DEFAULT_MAX_PLAYERS
} from '../../styles/tournamentConstants'

export default function CreateTournamentModal({ open, onClose, onCreated }) {
  const [form, setForm] = useState(INITIAL_TOURNAMENT_FORM)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [inviteLink, setInviteLink] = useState(null)

  const isBlackjack = form.gameTitle === 'Blackjack'
  const maxAllowed = isBlackjack ? BLACKJACK_MAX_PLAYERS : DEFAULT_MAX_PLAYERS

  const resetModal = () => {
    setForm(INITIAL_TOURNAMENT_FORM)
    setInviteLink(null)
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
        const nextMax =
          value === 'Blackjack'
            ? Math.min(Number(prev.maxParticipants), BLACKJACK_MAX_PLAYERS)
            : Number(prev.maxParticipants)

        return {
          ...prev,
          gameTitle: value,
          maxParticipants: nextMax
        }
      }

      if (field === 'maxParticipants') {
        return {
          ...prev,
          maxParticipants: Math.min(Number(value), maxAllowed)
        }
      }

      return {
        ...prev,
        [field]: value
      }
    })
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

    if (!isBlackjack && (maxParticipants < 2 || maxParticipants > DEFAULT_MAX_PLAYERS)) {
      return 'Max players must be between 2 and 12'
    }

    if (form.type === 'private' && !form.privatePassword.trim()) {
      return 'Private tournaments require a password'
    }

    return ''
  }, [form, isBlackjack])

  const handleSubmit = async () => {
    if (validationError) {
      setError(validationError)
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await api.post('/tournaments', {
        title: form.title.trim(),
        gameTitle: form.gameTitle,
        entryFee: Number(form.entryFee),
        maxParticipants: Number(form.maxParticipants),
        format: 'round_robin',
        startDate: new Date(),
        isPrivate: form.type === 'private',
        privatePassword: form.type === 'private' ? form.privatePassword : undefined
      })

      const inviteCode = res.data?.tournament?.inviteCode

      if (form.type === 'private' && inviteCode) {
        setInviteLink(`${window.location.origin}/tournaments/join/${inviteCode}`)
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
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink)
    }
  }

  const handleDone = async () => {
    await onCreated()
    handleClose()
  }

  return (
    <Modal open={open} onClose={handleClose}>
      <Box sx={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        bgcolor: DARK2,
        border: '1px solid rgba(201,168,76,0.2)',
        borderRadius: 2,
        p: 4,
        width: '100%',
        maxWidth: 480,
        outline: 'none'
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
            maxAllowed={maxAllowed}
            onChange={handleChange}
            onTypeChange={handleTypeChange}
            onSubmit={handleSubmit}
          />
        )}
      </Box>
    </Modal>
  )
}