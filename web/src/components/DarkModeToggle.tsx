'use client'

import { useState, useEffect } from 'react'

export function DarkModeToggle() {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    // Check if user has a preference stored
    const stored = localStorage.getItem('darkMode')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    
    const shouldBeDark = stored ? stored === 'true' : prefersDark
    setIsDark(shouldBeDark)
    
    // Apply dark class to html element
    if (shouldBeDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [])

  const toggleDarkMode = () => {
    const newDarkMode = !isDark
    setIsDark(newDarkMode)
    
    // Store preference
    localStorage.setItem('darkMode', newDarkMode.toString())
    
    // Toggle dark class on html element
    if (newDarkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  return (
    <button
      onClick={toggleDarkMode}
      className="dark-mode-toggle"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <div className="dark-mode-toggle-content">
        {isDark ? '☀️' : '🌙'}
      </div>
    </button>
  )
}
