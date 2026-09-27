'use client'

import * as React from 'react'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { AppRouterCacheProvider } from '@mui/material-nextjs/v16-appRouter'

const theme = createTheme({
  cssVariables: true,
  typography: {
    fontFamily: 'var(--font-inter), Inter, sans-serif',
    h5: { fontWeight: 800, letterSpacing: '-0.025em' },
    subtitle1: { fontWeight: 750 },
    body2: { lineHeight: 1.55 },
  },
  palette: {
    primary: { main: '#1769c2', dark: '#0c3f78', light: '#eaf3ff' },
    background: { default: '#f2f6fb', paper: '#ffffff' },
    text: { primary: '#14263d', secondary: '#52657a' },
    divider: '#d9e2ec',
    success: { main: '#237a4b' }, warning: { main: '#a96300' }, error: { main: '#b83232' },
  },
  shape: { borderRadius: 8 },
  components: {
    MuiTextField: { defaultProps: { size: 'small' } },
    MuiButton: { defaultProps: { disableElevation: true }, styleOverrides: { root: { textTransform: 'none', fontWeight: 700, borderRadius: 7 } } },
    MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
    MuiDialogTitle: { styleOverrides: { root: { color: '#fff', background: '#123f77', fontWeight: 750 } } },
    MuiTableCell: { styleOverrides: { root: { borderColor: '#e3e9f0', verticalAlign: 'middle' }, body: { fontSize: '0.8125rem' } } },
    MuiTooltip: { defaultProps: { arrow: true } },
  },
})

export default function ThemeRegistry({ children }: { children: React.ReactNode }) {
  return <AppRouterCacheProvider><ThemeProvider theme={theme}><CssBaseline />{children}</ThemeProvider></AppRouterCacheProvider>
}
