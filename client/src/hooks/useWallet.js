import { useCallback, useEffect, useState } from 'react'

import api from '../services/api'
import { connectSocket } from '../services/socket'
import { useAuth } from '../contexts/useAuth'

export default function useWallet() {
  const { user, setUser } = useAuth()
  const userId = user?.id || user?._id

  const [balance, setBalance] = useState(user?.walletBalance || 0)
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(Boolean(userId))
  const [claimingBonus, setClaimingBonus] = useState(false)
  const [bonusClaimed, setBonusClaimed] = useState(false)

  const updateUserBalance = useCallback((walletBalance) => {
    setBalance(walletBalance)
    setUser(prev => prev ? { ...prev, walletBalance } : prev)
  }, [setUser])

  const resetWallet = useCallback(() => {
    setBalance(0)
    setTransactions([])
    setLoading(false)
    setClaimingBonus(false)
    setBonusClaimed(false)
  }, [])

  const fetchTransactions = useCallback(async () => {
    try {
      const res = await api.get('/transactions/me')
      setTransactions(Array.isArray(res.data?.transactions) ? res.data.transactions : [])
    } catch {
      setTransactions([])
    }
  }, [])

  const fetchWallet = useCallback(async () => {
    if (!userId) {
      resetWallet()
      return
    }

    setLoading(true)

    try {
      const walletRes = await api.get('/wallet/me')
      updateUserBalance(walletRes.data.wallet.walletBalance)
      setBonusClaimed(!walletRes.data.wallet.canClaimDailyBonus)
      await fetchTransactions()
    } catch (err) {
      console.error('[useWallet] fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [fetchTransactions, resetWallet, updateUserBalance, userId])

  useEffect(() => {
    fetchWallet()
  }, [fetchWallet])

  useEffect(() => {
    if (!userId) return

    const token = localStorage.getItem('token')
    if (!token) return

    const sock = connectSocket(token)

    const handleWalletUpdate = async (data) => {
      updateUserBalance(data.walletBalance)
      await fetchTransactions()
    }

    sock.on('wallet:updated', handleWalletUpdate)

    return () => {
      sock.off('wallet:updated', handleWalletUpdate)
    }
  }, [fetchTransactions, updateUserBalance, userId])

  const claimDailyBonus = async () => {
    if (!userId) return

    setClaimingBonus(true)

    try {
      const res = await api.post('/wallet/daily-bonus')
      updateUserBalance(res.data.wallet.walletBalance)
      setBonusClaimed(true)
      await fetchTransactions()
    } catch (err) {
      if (err.response?.status === 400) {
        setBonusClaimed(true)
      }

      console.error('[useWallet] daily bonus error:', err)
    } finally {
      setClaimingBonus(false)
    }
  }

  return {
    balance,
    transactions,
    loading,
    bonusClaimed,
    claimingBonus,
    claimDailyBonus
  }
}