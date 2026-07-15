"use client"

import { useCallback, useEffect, useRef } from "react"
import type { ScaleBand, ScalePoint } from "d3-scale"
import { useChartContext } from "./chart-context"
import {
  anglesForSeries,
  backingSize,
  easeOutCubic,
  hatch,
  prefersReducedMotion,
  strokeCurve,
  toneBlock,
} from "./engrave-paint"
import { resolveColor } from "./palette"
import {
  stackSeries,
  valueAtIndex,
  xCenter,
  type ChartDatum,
} from "./scales"

const REVEAL_MS = 900

function numeric(d: ChartDatum, key: string): number {
  const v = d[key]
  return typeof v === "number" && Number.isFinite(v) ? v : 0
}

function indexAtX(
  data: ChartDatum[],
  xKey: string,
  xScale: ScaleBand<string> | ScalePoint<string>,
  px: number
): number {
  let best = 0
  let bestDist = Infinity
  for (let i = 0; i < data.length; i++) {
    const label = String(data[i][xKey] ?? "")
    const cx = xCenter(xScale, label)
    const dist = Math.abs(cx - px)
    if (dist < bestDist) {
      bestDist = dist
      best = i
    }
  }
  return best
}

export function EngraveCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const rafRef = useRef<number | null>(null)
  const startRef = useRef<number | null>(null)
  const progressRef = useRef(1)

  const ctx = useChartContext()
  const {
    width,
    height,
    plot,
    data,
    series,
    config,
    stackType,
    chartKind,
    xScale,
    yScale,
    xAxis,
    animate,
    setHoverIndex,
  } = ctx

  const drawFrame = useCallback(
    (reveal: number) => {
      const canvas = canvasRef.current
      if (!canvas || width <= 0 || height <= 0 || series.length === 0) return

      const { width: bw, height: bh, dpr } = backingSize(width, height)
      canvas.width = bw
      canvas.height = bh
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`

      const c = canvas.getContext("2d")
      if (!c) return

      c.setTransform(dpr, 0, 0, dpr, 0, 0)
      c.clearRect(0, 0, width, height)

      const revealX = plot.x + plot.width * reveal

      c.save()
      c.beginPath()
      c.rect(plot.x, plot.y, Math.max(0, revealX - plot.x), plot.height)
      c.clip()

      const keys = series.map((s) => s.dataKey)
      const layers =
        stackType === "stacked" && chartKind !== "line"
          ? stackSeries(data, keys)
          : null

      series.forEach((entry, seriesIndex) => {
        const color = resolveColor(config[entry.dataKey]?.color, entry.dataKey)
        const angles = anglesForSeries(seriesIndex)

        if (entry.kind === "bar" || chartKind === "bar") {
          drawBars(c, {
            data,
            dataKey: entry.dataKey,
            keys,
            layers,
            stackType,
            xScale,
            yScale,
            xKey: xAxis.dataKey,
            color,
            angles,
            reveal,
          })
          return
        }

        const curves = buildCurveLookup({
          data,
          dataKey: entry.dataKey,
          keys,
          layers,
          stackType,
          xScale,
          yScale,
          xKey: xAxis.dataKey,
        })

        const isLine = entry.kind === "line" || chartKind === "line"

        if (isLine) {
          // A line is a cut, not a fill. Hatching it to the baseline (which is what
          // this used to do) turns a trend line into a solid mass and buries
          // whatever it's drawn over. Stroke the curve and stop.
          c.save()
          strokeCurve(c, plot, curves.yTop, {
            color,
            width: 1.6,
            alpha: reveal,
          })
          c.restore()
          return
        }

        const depth = Math.max(18, plot.height * 0.14)

        // A nearer object occludes a farther one — an engraver never weaves two
        // ground tones over each other, the front fill simply covers what's
        // behind it. So each area only hatches where it rises above the areas
        // drawn in front of it (later series). Own outline plus every later area
        // outline, clipped even-odd, leaves exactly that sliver: the shared band
        // cancels out. Single-area and stacked charts have nothing to subtract,
        // so they're untouched.
        const occluders = series
          .slice(seriesIndex + 1)
          .filter((s) => s.kind !== "line" && s.kind !== "bar")
          .map((s) =>
            buildCurveLookup({
              data,
              dataKey: s.dataKey,
              keys,
              layers,
              stackType,
              xScale,
              yScale,
              xKey: xAxis.dataKey,
            })
          )

        c.save()
        c.beginPath()
        traceAreaPath(c, data, xAxis.dataKey, xScale, curves.yTop, curves.yBase)
        for (const later of occluders) {
          traceAreaPath(c, data, xAxis.dataKey, xScale, later.yTop, later.yBase)
        }
        c.clip(occluders.length ? "evenodd" : "nonzero")
        hatch(c, plot, toneBetweenCurves(curves.yTop, curves.yBase, depth), {
          angles,
          color,
          alpha: reveal,
        })
        c.restore()
      })

      c.restore()
    },
    [
      width,
      height,
      plot,
      data,
      series,
      config,
      stackType,
      chartKind,
      xScale,
      yScale,
      xAxis.dataKey,
    ]
  )

  useEffect(() => {
    if (!animate || prefersReducedMotion()) {
      progressRef.current = 1
      drawFrame(1)
      return
    }

    progressRef.current = 0
    startRef.current = null

    const tick = (now: number) => {
      if (startRef.current == null) startRef.current = now
      const elapsed = now - startRef.current
      const t = Math.min(1, elapsed / REVEAL_MS)
      progressRef.current = easeOutCubic(t)
      drawFrame(progressRef.current)
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick)
      }
    }

    rafRef.current = requestAnimationFrame(tick)

    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
    }
  }, [animate, drawFrame])

  useEffect(() => {
    if (!animate || progressRef.current >= 1) {
      drawFrame(progressRef.current)
    }
  }, [drawFrame, animate])

  const handlePointer = useCallback(
    (clientX: number) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const x = clientX - rect.left
      if (x < plot.x || x > plot.x + plot.width) {
        setHoverIndex(null)
        return
      }
      setHoverIndex(indexAtX(data, xAxis.dataKey, xScale, x))
    },
    [data, plot, setHoverIndex, xAxis.dataKey, xScale]
  )

  const onMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      handlePointer(e.clientX)
    },
    [handlePointer]
  )

  const onMouseLeave = useCallback(() => {
    setHoverIndex(null)
  }, [setHoverIndex])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 block h-full w-full"
      // Pinned inline, not left to the utility classes. The canvas MUST stay out of
      // normal flow: its height is set from the measured container, so if it ever
      // lands in flow it grows the container, which is measured again, and the
      // canvas runs away to tens of thousands of pixels until the tab dies. A
      // consumer without Tailwind (or with it purged) would hit exactly that.
      style={{ position: "absolute", inset: 0, display: "block" }}
      aria-hidden
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
    />
  )
}

type DrawBarsOpts = {
  data: ChartDatum[]
  dataKey: string
  keys: string[]
  layers: Array<Map<number, [number, number]>> | null
  stackType: "default" | "stacked"
  xScale: ScaleBand<string> | ScalePoint<string>
  yScale: (v: number) => number
  xKey: string
  color: [number, number, number]
  angles: number[]
  reveal: number
}

function drawBars(
  c: CanvasRenderingContext2D,
  opts: DrawBarsOpts
): void {
  const {
    data,
    dataKey,
    keys,
    layers,
    stackType,
    xScale,
    yScale,
    xKey,
    color,
    angles,
    reveal,
  } = opts

  const bandwidth =
    "bandwidth" in xScale && typeof xScale.bandwidth === "function"
      ? xScale.bandwidth()
      : 16
  const barWidth = Math.max(4, bandwidth * 0.72)

  data.forEach((row, i) => {
    const label = String(row[xKey] ?? "")
    const cx = xCenter(xScale, label)
    const { baseline, top } = valueAtIndex(
      data,
      keys,
      stackType,
      i,
      dataKey
    )
    const yTop = yScale(top)
    const yBase = yScale(baseline)
    const left = cx - barWidth / 2

    c.save()
    c.beginPath()
    c.rect(left, yTop, barWidth, yBase - yTop)
    c.clip()
    hatch(
      c,
      { x: left, y: yTop, width: barWidth, height: yBase - yTop },
      toneBlock(yTop, yBase),
      { angles, color, alpha: reveal }
    )
    c.restore()
  })
}

type CurveLookupOpts = {
  data: ChartDatum[]
  dataKey: string
  keys: string[]
  layers: Array<Map<number, [number, number]>> | null
  stackType: "default" | "stacked"
  xScale: ScaleBand<string> | ScalePoint<string>
  yScale: (v: number) => number
  xKey: string
}

type CurveLookup = {
  yTop: (x: number) => number
  yBase: (x: number) => number
}

function buildCurveLookup(opts: CurveLookupOpts): CurveLookup {
  const { data, dataKey, keys, layers, stackType, xScale, yScale, xKey } =
    opts
  const points = data.map((row, i) => {
    const label = String(row[xKey] ?? "")
    const cx = xCenter(xScale, label)
    let top = numeric(row, dataKey)
    let base = 0
    if (stackType === "stacked" && layers) {
      const keyIndex = keys.indexOf(dataKey)
      const pair = layers[keyIndex]?.get(i) ?? [0, top]
      base = pair[0]
      top = pair[1]
    }
    return { x: cx, yTop: yScale(top), yBase: yScale(base) }
  })

  const interpolate = (
    pick: (p: (typeof points)[number]) => number
  ): ((x: number) => number) => {
    return (x: number) => {
      if (points.length === 0) return yScale(0)
      if (x <= points[0].x) return pick(points[0])
      if (x >= points[points.length - 1].x) return pick(points[points.length - 1])

      for (let i = 0; i < points.length - 1; i++) {
        const a = points[i]
        const b = points[i + 1]
        if (x >= a.x && x <= b.x) {
          const t = (x - a.x) / Math.max(1e-6, b.x - a.x)
          return pick(a) + (pick(b) - pick(a)) * t
        }
      }
      return pick(points[points.length - 1])
    }
  }

  return {
    yTop: interpolate((p) => p.yTop),
    yBase: interpolate((p) => p.yBase),
  }
}

function toneBetweenCurves(
  yTop: (x: number) => number,
  yBase: (x: number) => number,
  depth: number
) {
  return (x: number, y: number) => {
    const top = yTop(x)
    const base = yBase(x)
    if (y < top || y > base) return 0
    const span = base - top
    if (span <= 0) return 1
    const effectiveDepth = Math.min(depth, span)
    const i = (y - top) / effectiveDepth
    return i > 1 ? 1 : i
  }
}

function traceAreaPath(
  c: CanvasRenderingContext2D,
  data: ChartDatum[],
  xKey: string,
  xScale: ScaleBand<string> | ScalePoint<string>,
  yTop: (x: number) => number,
  yBase: (x: number) => number
): void {
  if (data.length === 0) return

  const first = String(data[0][xKey] ?? "")
  const last = String(data[data.length - 1][xKey] ?? "")
  const x0 = xCenter(xScale, first)
  const x1 = xCenter(xScale, last)

  // Caller owns beginPath: this subpath may be one of several composed into a
  // single clip (see the area occlusion pass), so it must not reset the path.
  c.moveTo(x0, yTop(x0))
  for (let i = 1; i < data.length; i++) {
    const label = String(data[i][xKey] ?? "")
    const x = xCenter(xScale, label)
    c.lineTo(x, yTop(x))
  }
  c.lineTo(x1, yBase(x1))
  for (let i = data.length - 2; i >= 0; i--) {
    const label = String(data[i][xKey] ?? "")
    const x = xCenter(xScale, label)
    c.lineTo(x, yBase(x))
  }
  c.closePath()
}