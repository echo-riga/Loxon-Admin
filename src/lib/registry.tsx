'use client'

import * as React from 'react'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { AppRouterCacheProvider } from '@mui/material-nextjs/v16-appRouter'

const theme = createTheme({
  cssVariables: true,
  typography: {
    fontFamily: 'var(--font-inter), Inter, sans-serif',
    h4: { fontSize: '1.75rem', fontWeight: 600, letterSpacing: '-0.035em' },
    h5: { fontSize: '1.5rem', fontWeight: 600, letterSpacing: '-0.025em' },
    subtitle1: { fontWeight: 600 },
    subtitle2: { fontWeight: 600 },
    body1: { lineHeight: 1.6 },
    body2: { fontSize: '0.875rem', lineHeight: 1.6 },
  },
  palette: {
    primary: { main: '#1769c2', dark: '#104d91', light: '#eaf3ff' },
    background: { default: '#f6f7f9', paper: '#ffffff' },
    text: { primary: '#1c2736', secondary: '#627084' },
    divider: '#e3e7ed',
    success: { main: '#237a4b' }, warning: { main: '#a96300' }, error: { main: '#b83232' },
  },
  shape: { borderRadius: 8 },
  components: {
    MuiTextField: { defaultProps: { size: 'small' } },
    MuiOutlinedInput: { styleOverrides: { root: { backgroundColor: '#fff', minHeight: 40 }, input: { '&:autofill, &:-webkit-autofill': { WebkitBoxShadow: '0 0 0 1000px #fff inset', WebkitTextFillColor: '#1c2736', caretColor: '#1c2736', borderRadius: 'inherit' } } } },
    MuiButton: { defaultProps: { disableElevation: true }, styleOverrides: { root: { textTransform: 'none', fontWeight: 600, borderRadius: 6, minHeight: 36, paddingInline: 14 } } },
    MuiIconButton: { styleOverrides: { root: { '&.Mui-focusVisible': { outline: '2px solid #1769c2', outlineOffset: 2 } } } },
    MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
    MuiDialog: { styleOverrides: { paper: { borderRadius: 12, boxShadow: '0 24px 80px rgba(28,39,54,.18)' } } },
    MuiDialogTitle: { styleOverrides: { root: { color: '#1c2736', background: '#fff', fontSize: '1.25rem', fontWeight: 600, padding: '20px 24px', borderBottom: '1px solid #e3e7ed' } } },
    MuiDialogActions: { styleOverrides: { root: { padding: '16px 24px', borderTop: '1px solid #e3e7ed', gap: 8 } } },
    MuiTableCell: { styleOverrides: { root: { borderColor: '#e9edf2', verticalAlign: 'middle', padding: '14px 16px' }, body: { fontSize: '0.875rem' } } },
    MuiTableRow: { styleOverrides: { root: { '&.MuiTableRow-hover:hover': { backgroundColor: '#f8fafc' } } } },
    MuiChip: { styleOverrides: { root: { fontWeight: 500, borderRadius: 5 } } },
    MuiTooltip: { defaultProps: { arrow: true }, styleOverrides: { tooltip: { fontSize: '0.8125rem', padding: '8px 12px', backgroundColor: '#273447' }, arrow: { color: '#273447' } } },
  },
})

export default function ThemeRegistry({ children }: { children: React.ReactNode }) {
  return <AppRouterCacheProvider><ThemeProvider theme={theme}><CssBaseline enableColorScheme />{children}</ThemeProvider></AppRouterCacheProvider>
}
