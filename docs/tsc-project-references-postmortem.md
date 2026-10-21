# tsc project references on web/ — post-mortem (2026-10-21)

Extension proposal: split `web/tsconfig.json` into layered composite
projects so a full type check runs in bounded per-project memory on this
8GB box. **Outcome: refuted by measurement.** The planner tool and the
numbers are kept so the question never has to be re-litigated from zero.

## What was built (all fork-only, zero shared files touched)

`web/scripts/plan-tsc-projects.mjs` — builds the src import graph
(3078 files, ~15k edges), condenses it into strongly-connected components
(2538 SCCs; largest = 456 files: 408 components + 21 hooks + lib/stores
tails), and packs SCCs dependency-first into size-capped projects
(5 × ≤700 files, references acyclic by DAG coarsening).

## The measurements that killed it

| run | peak RSS | note |
|---|---|---|
| full project, tsc6 --noEmit | heap-OOM at 3162 and 3565 MB caps; peak RSS 3746 at death | live set ≈ 3.7–4 GB |
| p00 (700 leaf files, no refs) | **3258–3298 MB** | + declaration-emit tax |
| p01 / p02 (700 files + upstream .d.ts) | 3358 / 3357 MB | |
| p03 / p04 | heap-OOM at 3400 (peak 3572/3581) | |

Two structural facts cancel the chunking benefit:

1. **Composite projects must emit declarations**, and the declaration
   emitter (+ the node_modules type floor loaded whole by every project)
   costs roughly what the excluded source graph saved: per-project peaks
   land at 3.3–3.6 GB against the full run's 3.7–4 GB — a 10–15% saving,
   not the <2 GB target.
2. **The declaration-boundary tax is a source-edit campaign**: converged
   error runs surfaced TS2883/TS7056 (inferred export types that cannot
   be named across a boundary — need explicit annotations, est. 150–250
   files), plus ambient/augmentation carriers (`declare module` in
   paletteLight/Dark, puck/config, stores/temporal) that only apply
   globally if listed in every project, which in turn drags each
   carrier's own import closure into every program (957 TS6307s from
   puck/config alone). Fixing that class cleanly means moving declare
   blocks into ambient .d.ts — shared-source edits the zero-shared-file
   design had ruled out.

## Also recorded here: the full-run requirement

The full-project tsc6 check on this tree needs a live set ≈ 3.7–4 GB
(progression: OOM at caps 3162 → 3565; watchdog kills at MemAvailable
< 794 MB per the 10% hard reserve). With the dev stack resident the box
holds 4.5–5.4 GB available, which cannot host a ~4.4 GB RSS run plus the
reserve. **G2 full runs need ≈5.6 GB MemAvailable — a window with the dev
stack paused AND the other sessions idle.** The gate's dual-line watchdog
(MemAvailable + SwapFree 15%) enforces this safely; every failed attempt
in the 2026-10-20/21 series died by its own watchdog or by earlyoom's
swap line, never by a system OOM.

## If this is ever revisited

The premise could change if (a) the box RAM grows past ~12 GB, (b) a
TypeScript build mode appears that redirects cross-project imports to
declarations without emitting them, or (c) the codebase adopts explicit
export type annotations wholesale (upstream trend, would shrink the
boundary tax). Until then: quiet-window full runs, guarded by the gate.
