import { useState } from 'react'
import { Icon } from '@iconify/react'
import type { Commit, CommitRef } from '../git/models'

interface HistoryPanelProps {
  commits: Commit[]
  onCreateBranch: (name: string, hash: string) => void
}

const REF_STYLE: Record<string, string> = {
  head: 'bg-primary/20 text-primary border-primary/40',
  local: 'bg-accent/20 text-accent border-accent/40',
  remote: 'bg-slate-700/60 text-slate-300 border-slate-600',
  tag: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
}

function RefChip({ ref }: { ref: CommitRef }) {
  const cls = REF_STYLE[ref.kind] ?? REF_STYLE.local

  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono border shrink-0 ${cls}`}>
      {ref.kind === 'tag' && <Icon icon="mdi:tag-outline" className="text-[9px]" />}
      {ref.kind === 'remote' && <Icon icon="mdi:cloud-outline" className="text-[9px]" />}
      {ref.name}
    </span>
  )
}

export function HistoryPanel({ commits, onCreateBranch }: HistoryPanelProps) {
  const [targetHash, setTargetHash] = useState<string | null>(null)
  const [name, setName] = useState('')

  const startBranching = (hash: string) => {
    setTargetHash(hash)
    setName('')
  }

  const submit = (hash: string) => {
    const trimmed = name.trim()

    if (trimmed.length === 0) return

    onCreateBranch(trimmed, hash)
    setTargetHash(null)
  }

  return (
    <div className="glass rounded-xl flex flex-col min-h-0">
      <div className="flex items-center gap-2 px-4 pt-3 pb-2 text-xs font-semibold uppercase tracking-widest text-slate-500">
        <Icon icon="mdi:history" className="text-primary" />
        History
        <span className="ml-auto font-mono text-slate-600">{commits.length}</span>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 px-2 pb-2">
        {commits.length === 0 && <p className="px-2 py-2 text-sm text-slate-600">No commits yet.</p>}

        {commits.map((commit, i) => (
          <div key={commit.hash} className="group relative flex gap-3 px-2 py-2.5 rounded-lg hover:bg-white/5 transition-colors">
            <div className="flex flex-col items-center pt-1">
              <div className="size-2.5 rounded-full bg-primary shadow-[0_0_8px_rgba(0,178,255,0.6)]" />
              {i < commits.length - 1 && <div className="w-px flex-1 bg-line mt-1" />}
            </div>

            <div className="min-w-0 flex-1">
              {commit.refs.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-1">
                  {commit.refs.map((r) => <RefChip key={r.name} ref={r} />)}
                </div>
              )}

              <div className="flex items-center gap-2">
                <p className="text-sm leading-snug truncate flex-1" title={commit.subject}>{commit.subject}</p>
                <button
                  type="button"
                  title="Create branch at this commit"
                  onClick={() => startBranching(commit.hash)}
                  className="opacity-0 group-hover:opacity-100 size-6 shrink-0 rounded-md flex items-center justify-center text-primary hover:bg-primary/15 transition-all cursor-pointer"
                >
                  <Icon icon="mdi:source-branch-plus" />
                </button>
              </div>

              <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                <span className="font-mono text-accent">{commit.shortHash}</span>
                <span className="truncate">{commit.author}</span>
                <span className="ml-auto shrink-0 font-mono">{commit.relativeTime}</span>
              </div>

              {targetHash === commit.hash && (
                <div className="flex items-center gap-1.5 mt-2">
                  <input
                    autoFocus
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') submit(commit.hash)

                      if (e.key === 'Escape') setTargetHash(null)
                    }}
                    placeholder="new-branch-name"
                    className="flex-1 min-w-0 rounded-md bg-white/5 border border-line px-2 py-1 text-xs font-mono placeholder:text-slate-600 focus:outline-none focus:border-primary/50"
                  />
                  <button
                    type="button"
                    title="Create branch"
                    onClick={() => submit(commit.hash)}
                    className="size-6 shrink-0 rounded-md flex items-center justify-center text-primary hover:bg-primary/15 transition-colors cursor-pointer"
                  >
                    <Icon icon="mdi:check" />
                  </button>
                  <button
                    type="button"
                    title="Cancel"
                    onClick={() => setTargetHash(null)}
                    className="size-6 shrink-0 rounded-md flex items-center justify-center text-slate-400 hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    <Icon icon="mdi:close" />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
