"use client"

import { useEffect, useState } from "react"
import { Moon, Sun } from "lucide-react"

import { Button } from "@/components/ui/button"

type Theme = "light" | "dark"

function getCurrentTheme(): Theme {
  if (typeof document === "undefined") return "light"
  return document.documentElement.classList.contains("dark") ? "dark" : "light"
}

function applyTheme(theme: Theme) {
  const root = document.documentElement
  root.classList.toggle("dark", theme === "dark")
  // Helps form controls / scrollbars match theme.
  root.style.colorScheme = theme
  try {
    localStorage.setItem("theme", theme)
  } catch {
    // ignore
  }
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light")

  useEffect(() => {
    setTheme(getCurrentTheme())
  }, [])

  return (
    <Button
      type="button"
      variant="secondary"
      onClick={() => {
        const next = theme === "dark" ? "light" : "dark"
        applyTheme(next)
        setTheme(next)
      }}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
      title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
      className="px-3"
    >
      {theme === "dark" ? (
        <>
          <Sun className="mr-2 size-4" />
          Light
        </>
      ) : (
        <>
          <Moon className="mr-2 size-4" />
          Dark
        </>
      )}
    </Button>
  )
}

