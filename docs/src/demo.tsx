import { createRoot } from "react-dom/client"
import { AreaChart, BarChart, LineChart, Area, Bar, Line, XAxis, YAxis, Grid, Legend, Tooltip } from "../../registry/engrave-kit"
const months = [{ month: "Jan", revenue: 42, costs: 28 },{ month: "Feb", revenue: 47, costs: 30 },{ month: "Mar", revenue: 45, costs: 31 },{ month: "Apr", revenue: 61, costs: 34 },{ month: "May", revenue: 58, costs: 33 },{ month: "Jun", revenue: 66, costs: 36 },{ month: "Jul", revenue: 70, costs: 35 },{ month: "Aug", revenue: 73, costs: 37 }]
const quarters = [{ quarter: "Q1", units: 1240 },{ quarter: "Q2", units: 1580 },{ quarter: "Q3", units: 1430 },{ quarter: "Q4", units: 1910 }]
const days = [{ day: "Mon", signal: 12 },{ day: "Tue", signal: 19 },{ day: "Wed", signal: 16 },{ day: "Thu", signal: 27 },{ day: "Fri", signal: 24 },{ day: "Sat", signal: 33 },{ day: "Sun", signal: 41 }]
const cfgM = { revenue: { label: "Revenue", color: "indigo" as const }, costs: { label: "Costs", color: "crimson" as const } }
const cfgQ = { units: { label: "Units", color: "moss" as const } }
const cfgD = { signal: { label: "Signal", color: "ochre" as const } }
function Card({ title, height, children }: { title: string; height: number; children: React.ReactNode }) {
  return (<section className="card"><h2>{title}</h2><div style={{ height }}>{children}</div></section>)
}
function Demo() {
  return (<>
      <header><h1>engrave-kit</h1><p className="sub">Copperplate charts on canvas. Straight hatch, width swelling with tone, zero wobble. Every chart below is the real library.</p></header>
      <div className="grid">
        <Card title="Revenue &amp; costs" height={300}>
          <AreaChart data={months} config={cfgM}>
            <Grid /><XAxis dataKey="month" /><YAxis /><Tooltip labelKey="month" /><Legend />
            <Area dataKey="revenue" /><Area dataKey="costs" />
          </AreaChart>
        </Card>

        <Card title="Quarterly shipments" height={300}>
          <BarChart data={quarters} config={cfgQ}>
            <Grid /><XAxis dataKey="quarter" /><YAxis /><Tooltip labelKey="quarter" /><Bar dataKey="units" />
          </BarChart>
        </Card>

        <Card title="Signal strength" height={220}>
          <LineChart data={days} config={cfgD}>
            <Grid /><XAxis dataKey="day" /><YAxis /><Tooltip labelKey="day" /><Line dataKey="signal" />
          </LineChart>
        </Card>

        <Card title="Area with a trend cut over it" height={220}>
          <AreaChart data={months} config={cfgM}>
            <Grid /><XAxis dataKey="month" /><YAxis /><Tooltip labelKey="month" /><Legend />
            <Area dataKey="revenue" /><Line dataKey="costs" />
          </AreaChart>
        </Card>
      </div>
    </>)
}
createRoot(document.getElementById("root")!).render(<Demo />)
