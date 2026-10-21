"use client";

import { useTheme } from "@/app/providers/ThemeProvider";
import { Toaster as Sonner, ToasterProps } from "sonner";

/**
 * Wired to the app's own ThemeProvider.
 *
 * This previously imported `useTheme` from `next-themes`, but no
 * `NextThemesProvider` was ever mounted anywhere in the tree, so the hook fell
 * back to its default and this component resolved `theme` to "system"
 * permanently -- toasts never followed the app's dark/light setting at all.
 * `next-themes` is now unreferenced by source; the local provider is the single
 * theme authority.
 */
const Toaster = ({ ...props }: ToasterProps) => {
  const { theme } = useTheme();

  return (
    <Sonner
      theme={theme}
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
