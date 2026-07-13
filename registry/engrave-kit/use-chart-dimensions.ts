"use client"

import { useCallback, useEffect, useRef, useState } from "react"

export type ChartDimensions = {
  width: number
  height: number
}

export function useChartDimensions<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T | null>(null)
  const [dimensions, setDimensions] = useState<ChartDimensions>({
    width: 0,
    height: 0,
  })

  const measure = useCallback(() => {
    const node = ref.current
    if (!node) return
    const rect = node.getBoundingClientRect()
    const nextWidth = Math.round(rect.width)
    const nextHeight = Math.round(rect.height)
    setDimensions((prev) =>
      prev.width === nextWidth && prev.height === nextHeight
        ? prev
        : { width: nextWidth, height: nextHeight }
    )
  }, [])

  useEffect(() => {
    const node = ref.current
    if (!node) return

    measure()

    const observer = new ResizeObserver(() => {
      measure()
    })
    observer.observe(node)

    return () => {
      observer.disconnect()
    }
  }, [measure])

  return { ref, ...dimensions }
}