import type { Config } from "tailwindcss";

const rgb = (v: string) => `rgb(var(${v}) / <alpha-value>)`;

export default {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Semantic, theme-aware tokens
        bg: rgb("--bg"),
        surface: rgb("--surface"),
        "surface-2": rgb("--surface-2"),
        fg: rgb("--fg"),
        muted: rgb("--muted"),
        line: rgb("--line"),
        "line-strong": rgb("--line-strong"),
        primary: rgb("--primary"),
        "primary-hover": rgb("--primary-hover"),
        "on-primary": rgb("--on-primary"),
        accent: rgb("--accent"),
        ring: rgb("--ring"),
        // Brand denim scale
        denim: {
          50: rgb("--denim-50"),
          100: rgb("--denim-100"),
          200: rgb("--denim-200"),
          300: rgb("--denim-300"),
          400: rgb("--denim-400"),
          500: rgb("--denim-500"),
          600: rgb("--denim-600"),
          700: rgb("--denim-700"),
          800: rgb("--denim-800"),
          900: rgb("--denim-900"),
        },
        sand: {
          50: rgb("--sand-50"),
          100: rgb("--sand-100"),
          200: rgb("--sand-200"),
          300: rgb("--sand-300"),
        },
        // Back-compat aliases: the legacy navy/green/gold token names now resolve
        // to the new NAD denim system, so pages not individually rewritten
        // (e.g. the private dashboard) stay on-brand instead of losing color.
        sda: {
          navy: rgb("--denim-600"),
          green: rgb("--denim-500"),
          gold: rgb("--accent"),
        },
      },
      fontFamily: {
        serif: ["var(--font-serif)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "var(--radius)",
        lg: "var(--radius)",
        xl: "var(--radius-lg)",
        "2xl": "1.5rem",
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
      },
      maxWidth: {
        content: "72rem",
      },
    },
  },
  plugins: [],
} satisfies Config;
