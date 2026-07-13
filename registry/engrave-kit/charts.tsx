"use client"

import type { ReactNode } from "react"
import { ChartShell, type ChartShellProps } from "./chart-shell"

type RootProps = Omit<ChartShellProps, "chartKind" | "children"> & {
  children: ReactNode
}

export function AreaChart(props: RootProps) {
  return <ChartShell {...props} chartKind="area" />
}

export function LineChart(props: RootProps) {
  return <ChartShell {...props} chartKind="line" />
}

export function BarChart(props: RootProps) {
  return <ChartShell {...props} chartKind="bar" />
}