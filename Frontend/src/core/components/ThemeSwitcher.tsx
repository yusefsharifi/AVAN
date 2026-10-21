import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/app/providers/ThemeProvider';

/**
 * Dark / light switch for the content canvas.
 *
 * This reads the application's own ThemeProvider, not `next-themes`.
 * `next-themes` is installed and was wired into `ui/sonner`, but no
 * `NextThemesProvider` ever wrapped the tree, so its `useTheme()` always
 * returned the default and the toaster answered `"system"` no matter what the
 * app was showing. There is now exactly one theme source of truth.
 *
 * Switching recolours only the content canvas. The navigation rail tokens
 * (`--sidebar*`) are declared with identical values in `:root` and `.dark` in
 * `styles/theme.css`, so the rail never shifts colour or width underneath the
 * user -- which is what "switch theme while preserving sidebar styling" means
 * in practice rather than a promise made in each layout file.
 *
 * `aria-pressed` carries the state instead of a visual-only affordance, and
 * the label is in Persian because every other control in the app is.
 */
export function ThemeSwitcher({ className = '' }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  const label = isDark ? 'حالت روشن' : 'حالت تاریک';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-pressed={isDark}
      aria-label={label}
      title={label}
      className={`grid h-9 w-9 place-items-center rounded-lg border border-border bg-secondary text-foreground transition-colors hover:bg-muted ${className}`}
    >
      {isDark ? <Sun className="h-4 w-4" aria-hidden="true" /> : <Moon className="h-4 w-4" aria-hidden="true" />}
    </button>
  );
}

export default ThemeSwitcher;
