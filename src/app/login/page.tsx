'use client'

import LockOutlined from '@mui/icons-material/LockOutlined'
import { Alert, Avatar, Box, Button, CircularProgress, Paper, TextField, Typography } from '@mui/material'
import { useRouter, useSearchParams } from 'next/navigation'
import { FormEvent, Suspense, useState } from 'react'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await response.json().catch(() => ({})) as { error?: string }
      if (!response.ok) throw new Error(data.error || 'Unable to sign in.')
      const requested = searchParams.get('from')
      router.replace(requested?.startsWith('/') && !requested.startsWith('//') ? requested : '/')
      router.refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to sign in.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Paper component={'main'} elevation={10} sx={{ width: 'min(430px, calc(100vw - 32px))', p: { xs: 3, sm: 5 }, borderRadius: 3 }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
        <Avatar sx={{ bgcolor: 'primary.main', mb: 1.5 }}><LockOutlined /></Avatar>
        <Typography component={'h1'} variant={'h4'} sx={{ fontWeight: 800 }}>Loxon Admin</Typography>
        <Typography color={'text.secondary'} sx={{ mt: 0.5 }}>Sign in to manage website content.</Typography>
      </Box>
      <Box component={'form'} onSubmit={submit} sx={{ display: 'grid', gap: 2 }}>
        {error && <Alert severity={'error'}>{error}</Alert>}
        <TextField label={'Email'} type={'email'} value={email} onChange={event => setEmail(event.target.value)} autoComplete={'username'} slotProps={{ inputLabel: { shrink: true }, htmlInput: { maxLength: 254 } }} required autoFocus />
        <TextField label={'Password'} type={'password'} value={password} onChange={event => setPassword(event.target.value)} autoComplete={'current-password'} slotProps={{ inputLabel: { shrink: true }, htmlInput: { maxLength: 256 } }} required />
        <Button type={'submit'} variant={'contained'} size={'large'} disabled={loading} sx={{ minHeight: 46 }}>
          {loading ? <CircularProgress size={22} color={'inherit'} /> : 'Sign in'}
        </Button>
      </Box>
    </Paper>
  )
}

export default function LoginPage() {
  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', bgcolor: '#eef3f8', p: 2 }}>
      <Suspense fallback={<CircularProgress />}><LoginForm /></Suspense>
    </Box>
  )
}
