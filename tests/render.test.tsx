import { describe, expect, it, beforeAll, vi } from "vitest"
import { render, cleanup } from "@testing-library/react"
import {
  AreaChart,
  BarChart,
  LineChart,
  Area,
  Bar,
  Line,
  XAxis,
  YAxis,
  Grid,
  Legend,
  Tooltip,
} from "../registry/engrave-kit"
import { useChartContext } from "../registry/engrave-kit/chart-context"

// jsdom has no canvas. We only need the components to mount and drive the
// painter, not to produce pixels, so a recording stub is enough — and it lets us
// assert that the canvas was actually drawn into rather than merely created.
const calls: string[] = []

function stubCanvas() {
  const ctx = new Proxy(
    {},
    {
      get(_t, prop: string) {
        if (prop === "canvas") return { width: 600, height: 300 }
        if (prop === "getImageData") return () => ({ data: new Uint8ClampedArray(4) })
        if (prop === "createLinearGradient")
          return () => ({ addColorStop: () => {} })
        if (prop === "measureText") return () => ({ width: 10 })
        return (...args: unknown[]) => {
          calls.push(prop)
          return args
        }
      },
      set() {
        return true
      },
    }
  )
  HTMLCanvasElement.prototype.getContext = vi.fn(() => ctx) as never
}

beforeAll(() => {
  stubCanvas()
  // Charts size themselves from a ResizeObserver; jsdom lays everything out at 0,
  // so hand them a real box or nothing paints.
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  )
  Object.defineProperty(HTMLElement.prototype, "getBoundingClientRect", {
    value: () => ({ width: 600, height: 300, top: 0, left: 0, right: 600, bottom: 300, x: 0, y: 0 }),
  })
  // Drive the reveal to completion. The clock must ADVANCE on each frame: a stub
  // that always reports the same timestamp leaves the easing at t=0, so the loop
  // re-schedules forever and blows the stack.
  let clock = 0
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
    clock += 5000
    cb(clock)
    return 1
  })
  vi.stubGlobal("cancelAnimationFrame", () => {})
})

const rows = [
  { month: "Jan", revenue: 42, costs: 28 },
  { month: "Feb", revenue: 47, costs: 30 },
  { month: "Mar", revenue: 45, costs: 31 },
  { month: "Apr", revenue: 61, costs: 34 },
]

const config = {
  revenue: { label: "Revenue", color: "indigo" as const },
  costs: { label: "Costs", color: "crimson" as const },
}

describe("engrave-kit mounts and paints", () => {
  it("renders an area chart with every part composed", () => {
    calls.length = 0
    const { container } = render(
      <AreaChart data={rows} config={config}>
        <Grid />
        <XAxis dataKey="month" />
        <YAxis />
        <Tooltip labelKey="month" />
        <Legend />
        <Area dataKey="revenue" />
        <Area dataKey="costs" />
      </AreaChart>
    )
    expect(container.querySelector("canvas")).not.toBeNull()
    // The painter strokes hatch lines; if it never drew, the swell isn't there.
    expect(calls).toContain("stroke")
    cleanup()
  })

  it("renders bar and line charts", () => {
    const bar = render(
      <BarChart data={rows} config={config}>
        <XAxis dataKey="month" />
        <YAxis />
        <Bar dataKey="revenue" />
      </BarChart>
    )
    expect(bar.container.querySelector("canvas")).not.toBeNull()
    cleanup()

    const line = render(
      <LineChart data={rows} config={config}>
        <Line dataKey="revenue" />
      </LineChart>
    )
    expect(line.container.querySelector("canvas")).not.toBeNull()
    cleanup()
  })

  // The regression that shipped in 0.1.0: XAxis/YAxis registered themselves in an
  // effect whose deps held a `tickFormatter` default parameter — a fresh function
  // identity every render — so the effect re-ran, set axis state, re-rendered, and
  // looped. That loop spins synchronously and simply hangs the runner, which is a
  // miserable signal. This tripwire converts it into a fast, obvious failure.
  // Must sit inside the chart AND read the context. A child whose element identity
  // is unchanged gets bailed out of re-rendering by React unless it subscribes to
  // the context that's churning — so a passive counter would never trip.
  function makeTripwire(limit = 60) {
    let renders = 0
    return function Tripwire() {
      useChartContext()
      renders += 1
      if (renders > limit) {
        throw new Error(
          `render loop: ${renders} renders. An effect is setting state on every render — check that axis/series registration deps are stable.`
        )
      }
      return null
    }
  }

  it("does not loop when axes are used without explicit formatters", () => {
    const Tripwire = makeTripwire()
    expect(() =>
      render(
        <AreaChart data={rows} config={config}>
          <XAxis dataKey="month" />
          <YAxis />
          <Area dataKey="revenue" />
          <Tripwire />
        </AreaChart>
      )
    ).not.toThrow()
    cleanup()
  })

  // The same loop reached the other way: an inline arrow from a consumer is a new
  // identity every render too, so the setters must no-op when nothing changed.
  it("does not loop when a consumer passes an inline tickFormatter", () => {
    const Tripwire = makeTripwire()
    expect(() =>
      render(
        <AreaChart data={rows} config={config}>
          <XAxis dataKey="month" tickFormatter={(v) => String(v).slice(0, 3)} />
          <YAxis tickFormatter={(v) => `$${v}`} />
          <Area dataKey="revenue" />
          <Tripwire />
        </AreaChart>
      )
    ).not.toThrow()
    cleanup()
  })
})
