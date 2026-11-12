
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import type { ReactNode } from 'react'

export type ColorMode = 'light' | 'dark'

type ThemeContextValue = {
  mode: ColorMode
  toggleMode: () => void
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

const STORAGE_KEY = 'staffmate-color-mode'

function getInitialMode(): ColorMode {
  try {
    const savedMode = window.localStorage.getItem(STORAGE_KEY)

    return savedMode === 'dark' || savedMode === 'light'
      ? savedMode
      : 'light'
  } catch {
    return 'light'
  }
}

export function AppThemeProvider({
  children,
}: {
  children: ReactNode
}) {
  const [mode, setMode] = useState<ColorMode>(getInitialMode)

  useEffect(() => {
    document.documentElement.dataset.theme = mode
    document.documentElement.style.colorScheme = mode

    try {
      window.localStorage.setItem(STORAGE_KEY, mode)
    } catch {
      // Theme continues working if storage is unavailable.
    }
  }, [mode])

  const toggleMode = useCallback(() => {
    setMode((currentMode) =>
      currentMode === 'light' ? 'dark' : 'light'
    )
  }, [])

  const value = useMemo(
    () => ({ mode, toggleMode }),
    [mode, toggleMode]
  )

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useAppTheme() {
  const context = useContext(ThemeContext)

  if (!context) {
    throw new Error(
      'useAppTheme must be used within AppThemeProvider'
    )
  }

  return context
}