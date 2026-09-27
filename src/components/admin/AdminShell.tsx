'use client'

import Logout from '@mui/icons-material/Logout'
import { Box, Button } from '@mui/material'
import { useRouter } from 'next/navigation'
import AdminDashboard from './AdminDashboard'

export default function AdminShell() {
  const router = useRouter()

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.replace('/login')
    router.refresh()
  }

  return (
    <Box>
      <Box sx={{ position: 'fixed', top: 14, right: 18, zIndex: 1300 }}>
        <Button variant={'outlined'} color={'inherit'} size={'small'} startIcon={<Logout />} onClick={() => void logout()} sx={{ bgcolor: 'background.paper' }}>
          Sign out
        </Button>
      </Box>
      <AdminDashboard />
    </Box>
  )
}
