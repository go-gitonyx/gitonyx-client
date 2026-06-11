import type { Commit } from './models'

export const LANE_W = 14
export const NODE_R = 3.5
export const ROW_H = 52

const COLORS = [
  '#00b2ff',
  '#8b5cf6',
  '#34d399',
  '#fb923c',
  '#f472b6',
  '#facc15',
  '#22d3ee',
  '#a78bfa',
]

export function laneColor(lane: number): string {
  return COLORS[lane % COLORS.length]
}

export interface GraphSegment {
  d: string
  color: string
}

export interface GraphRow {
  commit: Commit
  lane: number
  color: string
  totalLanes: number
  segments: GraphSegment[]
}

function cx(lane: number): number {
  return lane * LANE_W + LANE_W / 2
}

function buildSegments(
  commitLane: number,
  slotsIn: (string | null)[],
  slotsOut: (string | null)[],
  parents: string[],
  totalLanes: number,
): GraphSegment[] {
  const segs: GraphSegment[] = []
  const mid = ROW_H / 2
  const nx = cx(commitLane)

  for (let j = 0; j < totalLanes; j++) {
    if (j === commitLane) continue
    const inH = j < slotsIn.length ? slotsIn[j] : null
    const outH = j < slotsOut.length ? slotsOut[j] : null
    if (inH !== null && outH === inH) {
      segs.push({ d: `M ${cx(j)} 0 L ${cx(j)} ${ROW_H}`, color: laneColor(j) })
    }
  }

  // Incoming to node (from top)
  if (commitLane < slotsIn.length && slotsIn[commitLane] !== null) {
    segs.push({ d: `M ${nx} 0 L ${nx} ${mid}`, color: laneColor(commitLane) })
  }

  // Outgoing from node to each parent
  for (const parent of parents) {
    const tl = slotsOut.indexOf(parent)
    if (tl === -1) continue
    const tx = cx(tl)
    if (tl === commitLane) {
      segs.push({ d: `M ${nx} ${mid} L ${nx} ${ROW_H}`, color: laneColor(commitLane) })
    } else {
      // S-curve: CP1 pulls straight down, CP2 pulls from top of target lane
      segs.push({ d: `M ${nx} ${mid} C ${nx} ${ROW_H} ${tx} 0 ${tx} ${ROW_H}`, color: laneColor(tl) })
    }
  }

  return segs
}

export function buildGraph(commits: Commit[]): GraphRow[] {
  const slots: (string | null)[] = []
  const rows: GraphRow[] = []

  for (const commit of commits) {
    let lane = slots.indexOf(commit.hash)
    if (lane === -1) {
      const free = slots.indexOf(null)
      lane = free !== -1 ? free : slots.length
      if (free === -1) slots.push(null)
    }

    const slotsIn = slots.slice()
    const parents = commit.parents

    if (parents.length === 0) {
      slots[lane] = null
    } else {
      const firstExisting = slots.indexOf(parents[0])
      slots[lane] = firstExisting !== -1 && firstExisting !== lane ? null : parents[0]

      for (let i = 1; i < parents.length; i++) {
        if (slots.indexOf(parents[i]) === -1) {
          const free = slots.indexOf(null)
          if (free !== -1) slots[free] = parents[i]
          else slots.push(parents[i])
        }
      }
    }

    while (slots.length > 0 && slots[slots.length - 1] === null) slots.pop()

    const slotsOut = slots.slice()
    const totalLanes = Math.max(slotsIn.length, slotsOut.length, lane + 1, 1)

    rows.push({
      commit,
      lane,
      color: laneColor(lane),
      totalLanes,
      segments: buildSegments(lane, slotsIn, slotsOut, parents, totalLanes),
    })
  }

  return rows
}
