import { useEffect } from 'react'
import { toast } from '../components/Toast.jsx'

export function useKeyboardShortcuts(shortcuts) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Check if user is typing in an input/textarea
      const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)
      
      for (const s of shortcuts) {
        const ctrlMatch = s.ctrl ? (e.ctrlKey || e.metaKey) : !(e.ctrlKey || e.metaKey)
        const shiftMatch = s.shift ? e.shiftKey : !e.shiftKey
        const altMatch = s.alt ? e.altKey : !e.altKey
        
        if (ctrlMatch && shiftMatch && altMatch && e.key.toLowerCase() === s.key.toLowerCase()) {
          if (isInput && !s.allowInInput) continue
          e.preventDefault()
          s.action()
          break
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [shortcuts])
}

// Global Undo/Redo State Management (Simple Implementation)
let historyStack = []
let redoStack = []

export const useHistory = () => {
  const pushAction = (undoAction, redoAction, label = 'Action') => {
    historyStack.push({ undo: undoAction, redo: redoAction, label })
    redoStack = [] // Clear redo on new action
  }

  const undo = () => {
    if (historyStack.length === 0) return
    const action = historyStack.pop()
    action.undo()
    redoStack.push(action)
    toast(`Undone: ${action.label}`, 'info')
  }

  const redo = () => {
    if (redoStack.length === 0) return
    const action = redoStack.pop()
    action.redo()
    historyStack.push(action)
    toast(`Redone: ${action.label}`, 'info')
  }

  return { pushAction, undo, redo, canUndo: historyStack.length > 0, canRedo: redoStack.length > 0 }
}
