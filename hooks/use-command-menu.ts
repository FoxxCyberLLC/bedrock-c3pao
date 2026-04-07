'use client'

import { useCallback, useEffect, useState } from 'react'

/**
 * Hook that manages the command palette's open/close state and wires the
 * global `Cmd+K` / `Ctrl+K` keyboard shortcut.
 *
 * Usage:
 *   const { open, setOpen, toggle } = useCommandMenu()
 *   <CommandMenu open={open} onOpenChange={setOpen} ... />
 *   <button onClick={toggle}>Search</button>
 */
export function useCommandMenu() {
  const [open, setOpen] = useState(false)

  const toggle = useCallback(() => setOpen((prev) => !prev), [])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      // Cmd+K on Mac, Ctrl+K on Windows/Linux
      if (event.key === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  return { open, setOpen, toggle }
}
