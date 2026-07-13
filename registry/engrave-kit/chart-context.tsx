"use client"

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import type { ScaleBand, ScaleLinear, ScalePoint } from "d3-scale"
import type { EngraveColor } from "./palette"
import {
  DEFAULT_MARGINS,
  createXBandScale,
  createXPointScale,
  createYLinearScale,
  plotRect,
  yExtent,
  type ChartDatum,
  type Margins,
  type PlotRect,
  type StackType,
} from "./scales"

export type SeriesKind = "area" | "line" | "bar"

export type SeriesEntry = {
  dataKey: string
  kind: SeriesKind
}

export type SeriesConfigEntry = {
  label?: string
  color?: EngraveColor
}

export type ChartConfig = Record<string, SeriesConfigEntry>

export type AxisTickFormatter = (value: string | number) => string

export type XAxisState = {
  dataKey: string
  tickFormatter: AxisTickFormatter
  maxTicks: number
}

export type YAxisState = {
  tickFormatter: AxisTickFormatter
  tickCount: number
}

export type ChartKind = "area" | "line" | "bar"

export type ChartContextValue = {
  data: ChartDatum[]
  config: ChartConfig
  stackType: StackType
  margins: Margins
  width: number
  height: number
  plot: PlotRect
  chartKind: ChartKind
  animate: boolean
  xScale: ScaleBand<string> | ScalePoint<string>
  yScale: ScaleLinear<number, number>
  xAxis: XAxisState
  yAxis: YAxisState
  series: SeriesEntry[]
  registerSeries: (entry: SeriesEntry) => void
  unregisterSeries: (dataKey: string) => void
  setXAxis: (axis: Partial<XAxisState>) => void
  setYAxis: (axis: Partial<YAxisState>) => void
  hoverIndex: number | null
  setHoverIndex: (index: number | null) => void
  selectedIndex: number | null
  setSelectedIndex: (index: number | null) => void
}

const ChartContext = createContext<ChartContextValue | null>(null)

const DEFAULT_X_AXIS: XAxisState = {
  dataKey: "name",
  tickFormatter: (v) => String(v),
  maxTicks: 8,
}

const DEFAULT_Y_AXIS: YAxisState = {
  tickFormatter: (v) => String(v),
  tickCount: 5,
}

export type ChartProviderProps = {
  data: ChartDatum[]
  config?: ChartConfig
  stackType?: StackType
  margins?: Partial<Margins>
  width: number
  height: number
  chartKind: ChartKind
  animate?: boolean
  children: ReactNode
}

export function ChartProvider({
  data,
  config = {},
  stackType = "default",
  margins: marginOverrides,
  width,
  height,
  chartKind,
  animate = true,
  children,
}: ChartProviderProps) {
  const margins = useMemo(
    () => ({ ...DEFAULT_MARGINS, ...marginOverrides }),
    [marginOverrides]
  )

  const [series, setSeries] = useState<SeriesEntry[]>([])
  const [xAxis, setXAxisState] = useState<XAxisState>(DEFAULT_X_AXIS)
  const [yAxis, setYAxisState] = useState<YAxisState>(DEFAULT_Y_AXIS)
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)

  const registerSeries = useCallback((entry: SeriesEntry) => {
    setSeries((prev) => {
      if (prev.some((s) => s.dataKey === entry.dataKey)) return prev
      return [...prev, entry]
    })
  }, [])

  const unregisterSeries = useCallback((dataKey: string) => {
    setSeries((prev) => prev.filter((s) => s.dataKey !== dataKey))
  }, [])

  // Bail when nothing actually changed. Spreading unconditionally returns a new
  // object every call, so a consumer passing an inline `tickFormatter` (a fresh
  // identity each render) would re-render forever. Registration must be a no-op
  // when the values match.
  const setXAxis = useCallback((axis: Partial<XAxisState>) => {
    setXAxisState((prev) =>
      (Object.keys(axis) as (keyof XAxisState)[]).every((k) => prev[k] === axis[k])
        ? prev
        : { ...prev, ...axis }
    )
  }, [])

  const setYAxis = useCallback((axis: Partial<YAxisState>) => {
    setYAxisState((prev) =>
      (Object.keys(axis) as (keyof YAxisState)[]).every((k) => prev[k] === axis[k])
        ? prev
        : { ...prev, ...axis }
    )
  }, [])

  const plot = useMemo(
    () => plotRect(width, height, margins),
    [width, height, margins]
  )

  const seriesKeys = useMemo(() => series.map((s) => s.dataKey), [series])

  const xRange = useMemo(
    (): [number, number] => [plot.x, plot.x + plot.width],
    [plot.x, plot.width]
  )

  const yRange = useMemo(
    (): [number, number] => [plot.y + plot.height, plot.y],
    [plot.y, plot.height]
  )

  const xScale = useMemo(() => {
    if (chartKind === "line") {
      return createXPointScale(data, xAxis.dataKey, xRange)
    }
    return createXBandScale(data, xAxis.dataKey, xRange)
  }, [chartKind, data, xAxis.dataKey, xRange])

  const yScale = useMemo(() => {
    const extent = yExtent(data, seriesKeys, stackType)
    return createYLinearScale(extent, yRange)
  }, [data, seriesKeys, stackType, yRange])

  const value = useMemo<ChartContextValue>(
    () => ({
      data,
      config,
      stackType,
      margins,
      width,
      height,
      plot,
      chartKind,
      animate,
      xScale,
      yScale,
      xAxis,
      yAxis,
      series,
      registerSeries,
      unregisterSeries,
      setXAxis,
      setYAxis,
      hoverIndex,
      setHoverIndex,
      selectedIndex,
      setSelectedIndex,
    }),
    [
      data,
      config,
      stackType,
      margins,
      width,
      height,
      plot,
      chartKind,
      animate,
      xScale,
      yScale,
      xAxis,
      yAxis,
      series,
      registerSeries,
      unregisterSeries,
      setXAxis,
      setYAxis,
      hoverIndex,
      selectedIndex,
    ]
  )

  return (
    <ChartContext.Provider value={value}>{children}</ChartContext.Provider>
  )
}

export function useChartContext(): ChartContextValue {
  const ctx = useContext(ChartContext)
  if (!ctx) {
    throw new Error("engrave-kit: chart components must be used inside a chart root")
  }
  return ctx
}