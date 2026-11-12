/**
 * Predefined icon keys editors can pick for cards and pills.
 * The frontend maps each key to a bundled SVG icon (lucide), so no uploaded markup is ever rendered inline.
 * Keep in sync with frontend/src/components/ui/icon.tsx.
 */
export const ICON_KEYS = [
  "palette", "pen-tool", "layout", "code", "layers", "smartphone", "sparkles", "cpu",
  "plug", "database", "server", "shopping-cart", "video", "radio", "mic", "users",
  "gamepad", "wallet", "coins", "gift", "bar-chart", "chart-line", "shield", "globe",
  "briefcase", "calendar", "message", "zap", "rocket", "search", "settings", "heart",
  "building", "graduation-cap", "truck", "landmark", "stethoscope", "store", "film",
  "music", "trophy", "gem", "target", "compass", "workflow", "bot", "headset", "clock",
  "check-circle", "lock", "cloud", "refresh", "handshake", "lightbulb", "map-pin", "mail", "phone",
] as const;

export type IconKey = (typeof ICON_KEYS)[number];
