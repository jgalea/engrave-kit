"use client"

import type { ReactNode } from "react"
import { ChartProvider, type ChartConfig, type ChartKind } from "./chart-context"
import { EngraveCanvas } from "./engrave-canvas"
import { useChartDimensions } from "./use-chart-dimensions"
import type { ChartDatum, Margins, StackType } from "./scales"

export type ChartShellProps = {
  data: ChartDatum[]
  config?: ChartConfig
  stackType?: StackType
  margins?: Partial<Margins>
  animate?: boolean
  className?: string
  chartKind: ChartKind
  children: ReactNode
}

export function ChartShell({
  data,
  config,
  stackType,
  margins,
  animate = true,
  className = "",
  chartKind,
  children,
}: ChartShellProps) {
  const { ref, width, height } = useChartDimensions<HTMLDivElement>()

  return (
    <ChartProvider
      data={data}
      config={config}
      stackType={stackType}
      margins={margins}
      width={width}
      height={height}
      chartKind={chartKind}
      animate={animate}
    >
      <div
        ref={ref}
        className={`relative h-64 w-full ${className}`.trim()}
      >
        <EngraveCanvas />
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
          width={width}
          height={height}
        >
          {children}
        </svg>
      </div>
    </ChartProvider>
  )
}