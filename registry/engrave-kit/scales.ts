import { scaleBand, scaleLinear, scalePoint } from "d3-scale"
import { stack as d3Stack, stackOffsetNone } from "d3-shape"
import type { ScaleBand, ScaleLinear, ScalePoint } from "d3-scale"

export type ChartDatum = Record<string, string | number | null | undefined>

export type StackType = "default" | "stacked"

export type PlotRect = {
  x: number
  y: number
  width: number
  height: number
}

export type Margins = {
  top: number
  right: number
  bottom: number
  left: number
}

export const DEFAULT_MARGINS: Margins = {
  top: 16,
  right: 16,
  bottom: 32,
  left: 44,
}

export function plotRect(
  width: number,
  height: number,
  margins: Margins
): PlotRect {
  return {
    x: margins.left,
    y: margins.top,
    width: Math.max(0, width - margins.left - margins.right),
    height: Math.max(0, height - margins.top - margins.bottom),
  }
}

export function createXBandScale(
  data: ChartDatum[],
  dataKey: string,
  range: [number, number]
): ScaleBand<string> {
  return scaleBand<string>()
    .domain(data.map((d) => String(d[dataKey] ?? "")))
    .range(range)
    .padding(0.2)
}

export function createXPointScale(
  data: ChartDatum[],
  dataKey: string,
  range: [number, number]
): ScalePoint<string> {
  // No padding: an area or line must reach both plot edges. Inset the endpoints
  // and the fill stops short of the axis, which reads as a clipping bug.
  return scalePoint<string>()
    .domain(data.map((d) => String(d[dataKey] ?? "")))
    .range(range)
    .padding(0)
}

export function createYLinearScale(
  domain: [number, number],
  range: [number, number]
): ScaleLinear<number, number> {
  const [min, max] = domain
  const paddedMax = max === min ? max + 1 : max
  return scaleLinear<number, number>()
    .domain([Math.min(0, min), paddedMax])
    .range(range)
    .nice()
}

function numericValue(d: ChartDatum, key: string): number {
  const v = d[key]
  return typeof v === "number" && Number.isFinite(v) ? v : 0
}

export function yExtent(
  data: ChartDatum[],
  keys: string[],
  stackType: StackType
): [number, number] {
  if (keys.length === 0) return [0, 1]

  if (stackType === "stacked") {
    const layers = stackSeries(data, keys)
    let min = 0
    let max = 0
    for (const layer of layers) {
      for (const [, pair] of layer) {
        min = Math.min(min, pair[0])
        max = Math.max(max, pair[1])
      }
    }
    return [min, max]
  }

  let min = 0
  let max = 0
  for (const row of data) {
    for (const key of keys) {
      const v = numericValue(row, key)
      min = Math.min(min, v)
      max = Math.max(max, v)
    }
  }
  return [min, max]
}

export type StackLayer = {
  key: string
  points: Array<[number, number]>
}

export function stackSeries(
  data: ChartDatum[],
  keys: string[]
): Array<Map<number, [number, number]>> {
  const layers = d3Stack<ChartDatum>()
    .keys(keys)
    .offset(stackOffsetNone)(data)

  return layers.map((layer) => {
    const map = new Map<number, [number, number]>()
    layer.forEach((row, i) => {
      map.set(i, [row[0], row[1]])
    })
    return map
  })
}

export function valueAtIndex(
  data: ChartDatum[],
  keys: string[],
  stackType: StackType,
  index: number,
  key: string
): { value: number; baseline: number; top: number } {
  const row = data[index]
  if (!row) return { value: 0, baseline: 0, top: 0 }

  const value = numericValue(row, key)

  if (stackType === "stacked") {
    const keyIndex = keys.indexOf(key)
    const layers = stackSeries(data, keys)
    const layer = layers[keyIndex]
    const pair = layer?.get(index) ?? [0, value]
    return { value: pair[1] - pair[0], baseline: pair[0], top: pair[1] }
  }

  return { value, baseline: 0, top: value }
}

export function xCenter(
  scale: ScaleBand<string> | ScalePoint<string>,
  label: string
): number {
  const x = scale(label)
  if (x == null) return 0
  if ("bandwidth" in scale && typeof scale.bandwidth === "function") {
    return x + scale.bandwidth() / 2
  }
  return x
}