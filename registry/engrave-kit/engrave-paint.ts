/**
 * The burin. Everything else in this kit is scaffolding around this file.
 *
 * A copperplate engraver has no grey ink. Tone comes from line work: lines cut
 * closer together and, crucially, cut *deeper* — a deeper cut holds more ink and
 * prints wider. One continuous line therefore swells and tapers along its length
 * as it crosses light and dark passages. That swell is the whole tell. It is what
 * separates an engraving from a sketch, and it's why a hand-drawn chart library
 * (rough.js and friends) can't get here: their lines wobble, and wobble reads as
 * pencil, not steel.
 *
 * So: straight lines, zero jitter, width modulated by local tone.
 */

export type Rgb = [number, number, number]

/** Tone at a point: 0 at the top of the fill, 1 deep in it. */
export type ToneFn = (x: number, y: number) => number

export type HatchOpts = {
  /** Hatch angles in degrees. Two entries = cross-hatch. */
  angles: number[]
  /** Perpendicular gap between neighbouring lines, in px. */
  spacing?: number
  /** Sampling step along each line, in px. Smaller = smoother swell, slower. */
  step?: number
  /** Line width at zero tone and at full tone. */
  minWidth?: number
  maxWidth?: number
  /** Tone below this is left as bare paper. */
  floor?: number
  color: Rgb
  /** 0-1, scales every line width — used for the entrance reveal. */
  alpha?: number
}

const DEG = Math.PI / 180

export const rgb = ([r, g, b]: Rgb, a = 1) =>
  a >= 1 ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${a})`

/**
 * Series 1 hatches one way, series 2 the other, series 3+ cross-hatch. Overlapping
 * fills stay separable because their line directions differ, which is exactly the
 * trick 19th-century engravers used to keep adjacent objects legible in one ink.
 */
export function anglesForSeries(index: number): number[] {
  switch (index % 3) {
    case 0:
      return [-38]
    case 1:
      return [38]
    default:
      return [-38, 38]
  }
}

/**
 * Lay hatch across the current clip region.
 *
 * Walks a lattice of parallel lines in rotated space and maps each sample back to
 * screen space, so the lines stay dead straight regardless of angle. Width is
 * re-evaluated every `step` px from `tone`, which is what produces the swell.
 *
 * The caller owns the clip: set it to the fill path (an area, a bar) before
 * calling. Nothing here knows what shape it is filling.
 */
export function hatch(
  c: CanvasRenderingContext2D,
  bounds: { x: number; y: number; width: number; height: number },
  tone: ToneFn,
  opts: HatchOpts
): void {
  const {
    angles,
    spacing = 5,
    step = 2.2,
    minWidth = 0.35,
    maxWidth = 2.0,
    floor = 0.04,
    color,
    alpha = 1,
  } = opts

  if (alpha <= 0) return

  const { x: bx, y: by, width: bw, height: bh } = bounds
  const cx = bx + bw / 2
  const cy = by + bh / 2
  // Half-diagonal: far enough that a line at any angle still spans the bounds.
  const reach = Math.hypot(bw, bh) / 2 + spacing

  c.save()
  c.lineCap = "round"
  c.strokeStyle = rgb(color)

  for (const deg of angles) {
    const cos = Math.cos(deg * DEG)
    const sin = Math.sin(deg * DEG)

    for (let off = -reach; off <= reach; off += spacing) {
      // One straight line. `t` runs along it; `off` steps across the lattice.
      for (let t = -reach; t < reach; t += step) {
        const x1 = cx + t * cos - off * sin
        const y1 = cy + t * sin + off * cos
        if (x1 < bx || x1 > bx + bw || y1 < by || y1 > by + bh) continue

        const i = tone(x1, y1)
        if (i <= floor) continue

        const x2 = cx + (t + step) * cos - off * sin
        const y2 = cy + (t + step) * sin + off * cos

        c.lineWidth = (minWidth + i * (maxWidth - minWidth)) * alpha
        c.beginPath()
        c.moveTo(x1, y1)
        c.lineTo(x2, y2)
        c.stroke()
      }
    }
  }

  c.restore()
}

/**
 * Tone that deepens with distance below a curve — the default for area fills.
 * `depth` is how far below the line the ink reaches full black; shallower values
 * make a heavier, flatter fill.
 */
export function toneBelowCurve(
  yAt: (x: number) => number,
  baseline: number,
  depth: number
): ToneFn {
  return (x, y) => {
    const top = yAt(x)
    if (y < top || y > baseline) return 0
    const i = (y - top) / depth
    return i > 1 ? 1 : i
  }
}

/** Flat tone across a shape (bars), with a slight gradient so it isn't dead. */
export function toneBlock(top: number, bottom: number, lift = 0.35): ToneFn {
  const span = Math.max(1, bottom - top)
  return (_x, y) => {
    if (y < top || y > bottom) return 0
    return lift + (1 - lift) * ((y - top) / span)
  }
}

export const clamp01 = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t)
export const easeOutCubic = (t: number) => 1 - (1 - t) ** 3

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true
  )
}

/** Backing-store size for a crisp canvas on retina, capped so huge charts
 * don't allocate absurd buffers. */
export function backingSize(width: number, height: number, cap = 2) {
  const dpr = Math.min(
    typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1,
    cap
  )
  return { width: Math.round(width * dpr), height: Math.round(height * dpr), dpr }
}
