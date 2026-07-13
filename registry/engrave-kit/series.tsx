"use client"

import { useEffect } from "react"
import { useChartContext, type SeriesKind } from "./chart-context"

export type SeriesProps = {
  dataKey: string
}

function useSeriesRegistration(dataKey: string, kind: SeriesKind) {
  const { registerSeries, unregisterSeries } = useChartContext()

  useEffect(() => {
    registerSeries({ dataKey, kind })
    return () => {
      unregisterSeries(dataKey)
    }
  }, [dataKey, kind, registerSeries, unregisterSeries])

  return null
}

export function Area({ dataKey }: SeriesProps) {
  useSeriesRegistration(dataKey, "area")
  return null
}

export function Line({ dataKey }: SeriesProps) {
  useSeriesRegistration(dataKey, "line")
  return null
}

export function Bar({ dataKey }: SeriesProps) {
  useSeriesRegistration(dataKey, "bar")
  return null
}