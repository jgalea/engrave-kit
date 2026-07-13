export {
  hatch,
  strokeCurve,
  toneBelowCurve,
  toneBlock,
  anglesForSeries,
  rgb,
  clamp01,
  easeOutCubic,
  prefersReducedMotion,
  backingSize,
  type Rgb,
  type ToneFn,
  type HatchOpts,
} from "./engrave-paint"

export {
  PALETTE,
  seedOf,
  resolveColor,
  type EngraveColor,
} from "./palette"

export {
  DEFAULT_MARGINS,
  plotRect,
  createXBandScale,
  createXPointScale,
  createYLinearScale,
  yExtent,
  stackSeries,
  valueAtIndex,
  xCenter,
  type ChartDatum,
  type StackType,
  type PlotRect,
  type Margins,
  type StackLayer,
} from "./scales"

export { useChartDimensions } from "./use-chart-dimensions"

export {
  ChartProvider,
  useChartContext,
  type ChartConfig,
  type ChartContextValue,
  type ChartKind,
  type SeriesConfigEntry,
  type SeriesEntry,
  type SeriesKind,
} from "./chart-context"

export { EngraveCanvas } from "./engrave-canvas"
export { AreaChart, LineChart, BarChart } from "./charts"
export { Area, Line, Bar } from "./series"
export { XAxis, YAxis } from "./axes"
export { Grid } from "./grid"
export { Legend } from "./legend"
export { Tooltip } from "./tooltip"