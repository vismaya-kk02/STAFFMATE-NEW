import { CssBaseline, ThemeProvider, createTheme } from '@mui/material'
import { useMemo } from 'react'
import { AuthProvider } from './auth/AuthProvider'
import { AppRoutes } from './routing/AppRoutes'
import { AppThemeProvider, useAppTheme } from './theme/ThemeContext'

/**
 * Colour tokens. These match the CSS variables in AdminWorkspace.tsx
 * (--green, --bg, --card, --line, --text, --muted, --danger, --warn-*),
 * so MUI components (Select, Tabs, Alert, Buttons...) look the same as the
 * custom `sm-*` components in both themes.
 */
const tokens = {
  light: {
    green: '#1b6b2f',
    onGreen: '#ffffff',
    bg: '#f5f4f0',
    card: '#ffffff',
    surface2: '#faf9f6',
    line: '#e4e2dc',
    text: '#1c1c1a',
    muted: '#5f5e58',
    danger: '#b81d1d',
    warnBg: '#fdeccf',
    warnText: '#7a4a00',
    hover: '#ecebe6',
  },
  dark: {
    green: '#79c995',
    onGreen: '#0f2416',
    bg: '#0f1511',
    card: '#131a15',
    surface2: '#18211b',
    line: '#2b382f',
    text: '#edf2ee',
    muted: '#b2bdb5',
    danger: '#ff8585',
    warnBg: '#66480a',
    warnText: '#ffd98a',
    hover: '#222e26',
  },
} as const

function ThemedApplication() {
  const { mode } = useAppTheme()

  const theme = useMemo(() => {
    const t = tokens[mode]

    return createTheme({
      palette: {
        mode,
        primary: { main: t.green, contrastText: t.onGreen },
        error: { main: t.danger },
        warning: { main: t.warnText },
        divider: t.line,
        background: { default: t.bg, paper: t.card },
        text: { primary: t.text, secondary: t.muted },
        action: { hover: t.hover },
      },
      typography: {
        fontFamily:
          '"Inter Variable", "Inter", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        button: { textTransform: 'none', fontWeight: 700 },
      },
      shape: { borderRadius: 8 },
      components: {
        // MUI dark mode adds a lighter gradient overlay to Paper; remove it
        // so cards keep the exact --card colour.
        MuiPaper: {
          styleOverrides: { root: { backgroundImage: 'none' } },
        },
        MuiOutlinedInput: {
          styleOverrides: {
            root: {
              backgroundColor: t.card,
              color: t.text,
              '& .MuiOutlinedInput-notchedOutline': { borderColor: t.line },
              '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: t.muted },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderColor: t.green,
              },
            },
          },
        },
        MuiSelect: {
          styleOverrides: { icon: { color: t.muted } },
        },
        MuiTab: {
          styleOverrides: {
            root: {
              color: t.muted,
              '&.Mui-selected': { color: t.green },
            },
          },
        },
        MuiTabs: {
          styleOverrides: {
            indicator: { backgroundColor: t.green },
          },
        },
        MuiAlert: {
          styleOverrides: {
            root: {
              '&.MuiAlert-standardWarning': {
                backgroundColor: t.warnBg,
                color: mode === 'dark' ? t.warnText : t.text,
                '& .MuiAlert-icon': { color: t.warnText },
              },
            },
          },
        },
        MuiSvgIcon: {
          styleOverrides: { root: { color: 'inherit' } },
        },
      },
    })
  }, [mode])

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </ThemeProvider>
  )
}

export function App() {
  return (
    <AppThemeProvider>
      <ThemedApplication />
    </AppThemeProvider>
  )
}
