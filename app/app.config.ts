// Neutral + "subtle" is our go-to variant for secondary buttons/badges
// throughout the app — overridden once here (instead of a `class` prop on
// every usage) so it always renders as a flat zinc-100/800 instead of
// Nuxt UI's default `bg-elevated` token.
const subtleNeutralBg
  = "bg-zinc-100 hover:bg-zinc-200 active:bg-zinc-200 disabled:bg-zinc-100 aria-disabled:bg-zinc-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:active:bg-zinc-700 dark:disabled:bg-zinc-800 dark:aria-disabled:bg-zinc-800";

export default defineAppConfig({
  ui: {
    colors: {
      primary: "purple",
      neutral: "neutral",
    },
    input: { defaultVariants: { variant: "soft" } },
    inputNumber: { defaultVariants: { variant: "soft" } },
    inputDate: { defaultVariants: { variant: "soft" } },
    inputTime: { defaultVariants: { variant: "soft" } },
    textarea: { defaultVariants: { variant: "soft" } },
    select: { defaultVariants: { variant: "soft" } },
    selectMenu: { defaultVariants: { variant: "soft" } },
    button: {
      compoundVariants: [
        { color: "neutral", variant: "subtle", class: subtleNeutralBg },
      ],
    },
    badge: {
      compoundVariants: [
        { color: "neutral", variant: "subtle", class: subtleNeutralBg },
      ],
    },
  },
});
