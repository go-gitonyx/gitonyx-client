import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import { Icon } from '@iconify/react'
import type { FsEntry } from '../types/git'
import type { FileChange, ChangeKind } from '../git/models'

interface ExplorerPanelProps {
  repoPath: string
  changes: FileChange[]
}

const STATUS_ICON: Record<ChangeKind, { icon: string; color: string; title: string }> = {
  modified: { icon: 'mdi:circle-edit-outline', color: 'text-amber-400', title: 'Modified' },
  added: { icon: 'mdi:plus-circle-outline', color: 'text-emerald-400', title: 'Added' },
  deleted: { icon: 'mdi:minus-circle-outline', color: 'text-red-400', title: 'Deleted' },
  renamed: { icon: 'mdi:arrow-right-circle-outline', color: 'text-accent', title: 'Renamed' },
  untracked: { icon: 'mdi:help-circle-outline', color: 'text-slate-400', title: 'Untracked' },
  unknown: { icon: 'mdi:circle-outline', color: 'text-slate-500', title: 'Unknown' },
}

const EXT_ICON: Record<string, string> = {
  ts: 'mdi:language-typescript',
  tsx: 'mdi:language-typescript',
  js: 'mdi:language-javascript',
  jsx: 'mdi:language-javascript',
  json: 'mdi:code-json',
  html: 'mdi:language-html5',
  css: 'mdi:language-css3',
  scss: 'mdi:language-css3',
  md: 'mdi:language-markdown',
  svg: 'mdi:svg',
  png: 'mdi:image-outline',
  jpg: 'mdi:image-outline',
  jpeg: 'mdi:image-outline',
  gif: 'mdi:image-outline',
  webp: 'mdi:image-outline',
  sh: 'mdi:bash',
  py: 'mdi:language-python',
  rs: 'mdi:language-rust',
  go: 'mdi:language-go',
  toml: 'mdi:file-cog-outline',
  yaml: 'mdi:file-cog-outline',
  yml: 'mdi:file-cog-outline',
  lock: 'mdi:lock-outline',
  env: 'mdi:shield-key-outline',
  gitignore: 'mdi:eye-off-outline',
}

function fileIcon(name: string): string {
  const ext = name.includes('.') ? name.split('.').pop()!.toLowerCase() : name.toLowerCase()
  return EXT_ICON[ext] ?? 'mdi:file-outline'
}

function sep() {
  return navigator.platform.startsWith('Win') ? '\\' : '/'
}

function relPath(absPath: string, repoPath: string): string {
  const prefix = repoPath.endsWith(sep()) ? repoPath : repoPath + sep()
  return absPath.startsWith(prefix) ? absPath.slice(prefix.length) : absPath
}

function TreeRow({
  entry, depth, expanded, status, onToggle,
}: {
  entry: FsEntry
  depth: number
  expanded: boolean
  status: { kind: ChangeKind; staged: boolean } | null
  onToggle: () => void
}) {
  const icon = entry.isDir
    ? (expanded ? 'mdi:folder-open-outline' : 'mdi:folder-outline')
    : fileIcon(entry.name)

  const s = status ? STATUS_ICON[status.kind] : null

  return (
    <div
      className="flex items-center gap-1.5 py-1 rounded-md hover:bg-white/5 transition-colors cursor-pointer select-none"
      style={{ paddingLeft: `${8 + depth * 14}px`, paddingRight: '8px' }}
      onClick={onToggle}
      title={entry.name}
    >
      {entry.isDir && (
        <Icon
          icon={expanded ? 'mdi:chevron-down' : 'mdi:chevron-right'}
          className="text-slate-500 shrink-0 text-xs"
        />
      )}
      {!entry.isDir && <span className="w-3 shrink-0" />}

      <Icon
        icon={icon}
        className={`shrink-0 text-base ${entry.isDir ? 'text-primary/70' : 'text-slate-400'}`}
      />

      <span className={`text-xs font-mono truncate flex-1 ${status ? 'text-slate-200' : 'text-slate-400'}`}>
        {entry.name}
      </span>

      {s && (
        <span title={s.title}>
          <Icon icon={s.icon} className={`shrink-0 text-sm ${s.color}`} />
        </span>
      )}
    </div>
  )
}

export function ExplorerPanel({ repoPath, changes }: ExplorerPanelProps) {
  const [root, setRoot] = useState<FsEntry[]>([])
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [childMap, setChildMap] = useState<Record<string, FsEntry[]>>({})

  // Map relative path -> worst-priority change (unstaged > staged)
  const statusMap = useMemo(() => {
    const m = new Map<string, { kind: ChangeKind; staged: boolean }>()

    for (const c of changes) {
      const existing = m.get(c.path)

      if (!existing || (existing.staged && !c.staged)) {
        m.set(c.path, { kind: c.kind, staged: c.staged })
      }
    }

    return m
  }, [changes])

  useEffect(() => {
    setRoot([])
    setExpanded(new Set())
    setChildMap({})
    window.gitBridge.readdir(repoPath).then(setRoot)
  }, [repoPath])

  const toggle = useCallback(async (entry: FsEntry) => {
    if (!entry.isDir) return

    const key = entry.path

    if (expanded.has(key)) {
      setExpanded((prev) => { const s = new Set(prev); s.delete(key); return s })
      return
    }

    setExpanded((prev) => new Set([...prev, key]))

    if (!childMap[key]) {
      const kids = await window.gitBridge.readdir(entry.path)
      setChildMap((prev) => ({ ...prev, [key]: kids }))
    }
  }, [expanded, childMap])

  const renderEntries = (entries: FsEntry[], depth: number): React.ReactNode => {
    return entries.map((entry) => {
      const rel = relPath(entry.path, repoPath)
      const isExpanded = expanded.has(entry.path)
      const status = statusMap.get(rel) ?? null

      return (
        <Fragment key={entry.path}>
          <TreeRow
            entry={entry}
            depth={depth}
            expanded={isExpanded}
            status={status}
            onToggle={() => toggle(entry)}
          />
          {entry.isDir && isExpanded && childMap[entry.path] && (
            renderEntries(childMap[entry.path], depth + 1)
          )}
        </Fragment>
      )
    })
  }

  return (
    <div className="flex flex-col min-h-0 h-full">
      <div className="flex-1 overflow-y-auto min-h-0 py-1 px-1">
        {root.length === 0 && (
          <p className="px-3 py-2 text-sm text-slate-600">Loading…</p>
        )}
        {renderEntries(root, 0)}
      </div>
    </div>
  )
}
