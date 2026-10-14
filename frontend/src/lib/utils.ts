import { createCn } from "cn/config"

/**
 * Class merger that knows our custom type scale (`text-h1`, `text-eyebrow`, ...).
 * Without this, `text-h3 text-foreground` would be treated as a colour conflict and
 * one of them silently dropped.
 */
export const cn = createCn({
  extend: {
    classGroups: {
      "font-size": [{ text: ["display", "h1", "h2", "h3", "body", "small", "eyebrow", "clock"] }],
    },
  },
})
