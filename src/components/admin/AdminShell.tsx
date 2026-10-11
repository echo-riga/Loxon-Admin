'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import AdminDashboard from './AdminDashboard'

export default function AdminShell() {
  const router = useRouter()
  const [signingOut, setSigningOut] = useState(false)

  const logout = async () => {
    setSigningOut(true)
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.replace('/login')
      router.refresh()
    } finally {
      setSigningOut(false)
    }
  }

  return <AdminDashboard onSignOut={() => void logout()} signingOut={signingOut} />
}
