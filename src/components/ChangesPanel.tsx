import { useState, type ReactNode } from 'react'
import { Icon } from '@iconify/react'
import type { FileChange, ChangeKind } from '../git/models'

const ICON_BY_KIND: Record<ChangeKind, { icon: string; color: string }> = {
  modified: { icon: 'mdi:circle-edit-outline', color: 'text-amber-400' },
  added: { icon: 'mdi:plus-circle-outline', color: 'text-emerald-400' },
  deleted: { icon: 'mdi:minus-circle-outline', color: 'text-red-400' },
  renamed: { icon: 'mdi:arrow-right-circle-outline', color: 'text-accent' },
  untracked: { icon: 'mdi:help-circle-outline', color: 'text-slate-400' },
  unknown: { icon: 'mdi:circle-outline', color: 'text-slate-500' },
}

interface ChangesPanelProps {
  changes: FileChange[]
  loading: boolean
  onStage: (path: string) => void
  onStageAll: () => void
  onUnstage: (path: string) => void
  onCommit: (message: string) => void
  /** When true, omits the outer glass/rounded container (parent provides it) */
  inner?: boolean
}

function ChangeRow({ change, actionIcon, actionTitle, onAction }: { change: FileChange; actionIcon: string; actionTitle: string; onAction: () => void }) {
  const kind = ICON_BY_KIND[change.kind]

  return (
    <div className="group flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors">
      <Icon icon={kind.icon} className={`shrink-0 ${kind.color}`} />
      <span className="text-sm font-mono truncate flex-1" title={change.path}>{change.path}</span>
      <button
        type="button"
        title={actionTitle}
        onClick={onAction}
        className="opacity-0 group-hover:opacity-100 size-7 rounded-md flex items-center justify-center text-primary hover:bg-primary/15 transition-all cursor-pointer"
      >
        <Icon icon={actionIcon} />
      </button>
    </div>
  )
}

function SectionLabel({ icon, label, count, action }: { icon: string; label: string; count: number; action?: ReactNode }) {
  return (
    <div className="flex items-center gap-2 px-3 pt-3 pb-1 text-xs font-semibold uppercase tracking-widest text-slate-500">
      <Icon icon={icon} className="text-primary" />
      {label}
      <span className="ml-auto font-mono text-slate-600">{count}</span>
      {action}
    </div>
  )
}

export function ChangesPanel({ changes, loading, onStage, onStageAll, onUnstage, onCommit, inner }: ChangesPanelProps) {
  const [message, setMessage] = useState('')

  const staged = changes.filter((c) => c.staged)
  const unstaged = changes.filter((c) => !c.staged)
  const canCommit = staged.length > 0 && message.trim().length > 0 && !loading

  const commit = () => {
    if (!canCommit) return

    onCommit(message.trim())
    setMessage('')
  }

  return (
    <div className={`flex flex-col min-h-0 h-full ${inner ? '' : 'glass rounded-xl'}`}>
      <div className="flex-1 overflow-y-auto min-h-0">
        <SectionLabel icon="mdi:tray-arrow-up" label="Staged" count={staged.length} />
        {staged.length === 0 && <p className="px-3 py-2 text-sm text-slate-600">Nothing staged yet.</p>}
        {staged.map((c) => (
          <ChangeRow key={`s-${c.path}`} change={c} actionIcon="mdi:minus" actionTitle="Unstage file" onAction={() => onUnstage(c.path)} />
        ))}

        <SectionLabel
          icon="mdi:pencil-outline"
          label="Changes"
          count={unstaged.length}
          action={unstaged.length > 0 ? (
            <button
              type="button"
              title="Stage all changes"
              onClick={onStageAll}
              disabled={loading}
              className="size-6 rounded-md flex items-center justify-center text-primary hover:bg-primary/15 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-default"
            >
              <Icon icon="mdi:plus-box-multiple-outline" />
            </button>
          ) : undefined}
        />
        {unstaged.length === 0 && <p className="px-3 py-2 text-sm text-slate-600">Working tree clean.</p>}
        {unstaged.map((c) => (
          <ChangeRow key={`u-${c.path}`} change={c} actionIcon="mdi:plus" actionTitle="Stage file" onAction={() => onStage(c.path)} />
        ))}
      </div>

      <div className="border-t border-line p-3 flex flex-col gap-2">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) commit()
          }}
          placeholder="Commit message"
          rows={2}
          className="w-full resize-none rounded-lg bg-white/5 border border-line px-3 py-2 text-sm font-mono placeholder:text-slate-600 focus:outline-none focus:border-primary/50"
        />
        <button
          type="button"
          onClick={commit}
          disabled={!canCommit}
          className="flex items-center justify-center gap-2 py-2 rounded-lg bg-primary text-[#030912] font-semibold text-sm hover:bg-primary/85 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-default"
        >
          <Icon icon="mdi:check" className="text-base" />
          Commit {staged.length > 0 && `(${staged.length})`}
        </button>
      </div>
    </div>
  )
}
