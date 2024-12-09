import { createContext, useContext, useEffect, useState, useRef } from "react"

type Theme = "dark" | "light" | "system"

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

type ThemeProviderState = {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const initialState: ThemeProviderState = {
  theme: "system",
  setTheme: () => null,
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

function useThemeColor(theme: Theme) {
  const metaRef = useRef<HTMLMetaElement | null>(null)

  useEffect(() => {
    // Get or create the theme-color meta tag
    if (!metaRef.current) {
      metaRef.current = document.head.querySelector('meta[name="theme-color"]')
      if (!metaRef.current) {
        metaRef.current = document.createElement('meta')
        metaRef.current.name = 'theme-color'
        document.head.appendChild(metaRef.current)
      }
    }

    const updateThemeColor = (isDark: boolean) => {
      if (metaRef.current) {
        metaRef.current.content = isDark ? '#0F172A' : '#FFFFFF'
      }
    }

    if (theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
      updateThemeColor(mediaQuery.matches)

      // Handle system theme changes
      const handleChange = (e: MediaQueryListEvent) => updateThemeColor(e.matches)
      mediaQuery.addEventListener("change", handleChange)
      return () => mediaQuery.removeEventListener("change", handleChange)
    } else {
      updateThemeColor(theme === "dark")
    }
  }, [theme])
}

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "vite-ui-theme",
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem(storageKey) as Theme) || defaultTheme
  )

  useThemeColor(theme)

  useEffect(() => {
    const root = window.document.documentElement
    root.classList.remove("light", "dark")

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? "dark"
        : "light"

      root.classList.add(systemTheme)
      return
    }

    root.classList.add(theme)
  }, [theme])

  const value = {
    theme,
    setTheme: (theme: Theme) => {
      localStorage.setItem(storageKey, theme)
      setTheme(theme)
    },
  }

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext)

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider")

  return context
} 