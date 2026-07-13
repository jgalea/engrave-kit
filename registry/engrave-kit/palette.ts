import type { Rgb } from "./engrave-paint"

export type EngraveColor = "ink" | "crimson" | "indigo" | "moss" | "ochre" | "slate"

export const PALETTE: Record<EngraveColor, Rgb> = {
  ink: [18, 18, 22],
  crimson: [120, 28, 36],
  indigo: [36, 44, 92],
  moss: [48, 72, 44],
  ochre: [148, 108, 36],
  slate: [72, 80, 92],
}

/** Stable pseudo-random pick from the ink drawer for unconfigured series. */
export function seedOf(key: string): EngraveColor {
  const colors = Object.keys(PALETTE) as EngraveColor[]
  let h = 0
  for (let i = 0; i < key.length; i++) {
    h = (h * 31 + key.charCodeAt(i)) >>> 0
  }
  return colors[h % colors.length]
}

export function resolveColor(
  name: EngraveColor | undefined,
  dataKey: string
): Rgb {
  return PALETTE[name ?? seedOf(dataKey)]
}