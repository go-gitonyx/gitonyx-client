import { useState } from 'react'
import { Icon } from '@iconify/react'

interface AuthDialogProps {
  open: boolean
  currentUser: string | null
  onSave: (username: string, password: string) => void
  onClear: () => void
  onClose: () => void
}

export function AuthDialog({ open, ...props }: AuthDialogProps) {
  // Mount the form fresh on every open so its fields reset.
  if (!open) return null

  return <AuthForm {...props} />
}

function AuthForm({ currentUser, onSave, onClear, onClose }: Omit<AuthDialogProps, 'open'>) {
  const [username, setUsername] = useState(currentUser ?? '')
  const [password, setPassword] = useState('')

  const canSave = username.trim().length > 0 && password.length > 0

  const save = () => {
    if (!canSave) return

    onSave(username.trim(), password)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-2xl bg-surface border border-line p-6 flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose()

          if (e.key === 'Enter') save()
        }}
      >
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center">
            <Icon icon="mdi:account-key-outline" className="text-xl text-primary" />
          </div>

          <div>
            <h2 className="font-semibold leading-tight">Git credentials</h2>
            <p className="text-xs text-slate-500">Used for HTTPS remotes when pushing or pulling.</p>
          </div>
        </div>

        <label className="flex flex-col gap-1 text-xs text-slate-400">
          Username
          <input
            autoFocus
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="your-username"
            className="rounded-lg bg-white/5 border border-line px-3 py-2 text-sm font-mono text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-primary/50"
          />
        </label>

        <label className="flex flex-col gap-1 text-xs text-slate-400">
          Password / access token
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="personal access token"
            className="rounded-lg bg-white/5 border border-line px-3 py-2 text-sm font-mono text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-primary/50"
          />
        </label>

        <p className="text-xs text-slate-500 bg-white/5 rounded-lg px-3 py-2 border border-line">
          <span className="text-slate-300 font-medium">GitHub:</span> password authentication was removed in 2021.
          Enter a <span className="font-mono text-primary">Personal Access Token</span> as the password
          — Settings → Developer settings → Personal access tokens → classic, with <span className="font-mono">repo</span> scope.
        </p>

        <p className="text-xs text-slate-600">Credentials are kept in memory for this session only and are never written to disk.</p>

        <div className="flex items-center gap-2">
          {currentUser && (
            <button
              type="button"
              onClick={onClear}
              className="px-3 py-2 rounded-lg glass text-sm text-red-300 hover:border-red-500/40 transition-colors cursor-pointer"
            >
              Sign out
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="ml-auto px-3 py-2 rounded-lg glass text-sm text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={save}
            disabled={!canSave}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-[#030912] font-semibold text-sm hover:bg-primary/85 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-default"
          >
            <Icon icon="mdi:check" />
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
