import { useEffect, useCallback } from 'react';

interface ShortcutHandlers {
  onNewLetter?: () => void;
  onSearch?: () => void;
  onEscape?: () => void;
  onSave?: () => void;
  onReply?: () => void;
  onArchive?: () => void;
  onDelete?: () => void;
  onApprove?: () => void;
  onHelp?: () => void;
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers, enabled: boolean = true) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Don't trigger in input/textarea
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    // Don't trigger with modifier keys
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    
    switch (e.key) {
      case 'n': handlers.onNewLetter?.(); break;
      case '/': e.preventDefault(); handlers.onSearch?.(); break;
      case 'Escape': handlers.onEscape?.(); break;
      case 's': handlers.onSave?.(); break;
      case 'r': handlers.onReply?.(); break;
      case 'f': handlers.onArchive?.(); break;
      case 'd': handlers.onDelete?.(); break;
      case 'a': handlers.onApprove?.(); break;
      case '?': handlers.onHelp?.(); break;
    }
  }, [handlers]);

  useEffect(() => {
    if (!enabled) return;
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown, enabled]);
}
