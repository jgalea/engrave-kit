import { readdir, readFile, writeFile, mkdir } from "node:fs/promises"
import { join } from "node:path"

// engrave-kit ships as SOURCE through a shadcn registry: `shadcn add` drops these
// files into the consumer's repo, so they own and can edit them. This script turns
// registry/engrave-kit/*.{ts,tsx} into the r/*.json items the CLI fetches.
//
// Every chart root delegates to the same ChartShell, so there is no subset of the
// source that renders only a bar chart. Rather than pretend otherwise with
// partial items, each named item carries the whole kit; the names exist so
// `add @engrave-kit/bar-chart` does what a user expects.

const SRC = "registry/engrave-kit"
const OUT = "r"
const TARGET = "components/engrave-kit"
const REPO = "https://github.com/jgalea/engrave-kit"

const DEPS = ["d3-scale", "d3-shape"]
const DEV_DEPS = ["@types/d3-scale", "@types/d3-shape"]

const ALIASES = {
  "engrave-kit": "Copperplate-engraved charts: area, line and bar.",
  "area-chart": "Engraved area chart.",
  "line-chart": "Engraved line chart.",
  "bar-chart": "Engraved bar chart.",
}

const files = (await readdir(SRC)).filter((f) => /\.tsx?$/.test(f)).sort()
if (!files.includes("index.ts")) {
  console.error("✗ registry/engrave-kit/index.ts is missing — nothing to export")
  process.exit(1)
}

const entries = await Promise.all(
  files.map(async (name) => ({
    path: `${TARGET}/${name}`,
    content: await readFile(join(SRC, name), "utf8"),
    type: "registry:component",
    target: `${TARGET}/${name}`,
  }))
)

await mkdir(OUT, { recursive: true })

for (const [name, description] of Object.entries(ALIASES)) {
  const item = {
    $schema: "https://ui.shadcn.com/schema/registry-item.json",
    name,
    type: "registry:component",
    title: `engrave-kit — ${name}`,
    description,
    dependencies: DEPS,
    devDependencies: DEV_DEPS,
    registryDependencies: [],
    files: entries,
  }
  await writeFile(join(OUT, `${name}.json`), JSON.stringify(item, null, 2))
}

await writeFile(
  "registry.json",
  JSON.stringify(
    {
      $schema: "https://ui.shadcn.com/schema/registry.json",
      name: "engrave-kit",
      homepage: REPO,
      items: Object.keys(ALIASES).map((name) => ({ name, type: "registry:component" })),
    },
    null,
    2
  )
)

console.log(
  `built ${Object.keys(ALIASES).length} registry items, ${entries.length} source files each:\n  ${files.join("\n  ")}`
)
