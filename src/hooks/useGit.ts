import { useState, useCallback } from 'react'
import type { GitResult } from '../../electron/git'

export interface GitState {
  loading: boolean
  error: string | null
  lastResult: GitResult | null
}

export function useGit(repoPath: string) {
  const [state, setState] = useState<GitState>({
    loading: false,
    error: null,
    lastResult: null,
  })

  const exec = useCallback(async (...args: string[]): Promise<GitResult> => {
    setState((prev) => ({ ...prev, loading: true, error: null }))

    const result = await window.gitBridge.exec(args, repoPath)

    setState({
      loading: false,
      error: result.ok ? null : result.stderr.trim(),
      lastResult: result,
    })

    return result
  }, [repoPath])

  const status = useCallback(() => exec('status', '--porcelain=v2', '--branch'), [exec])
  const log = useCallback((count = 20) => exec('log', `--max-count=${count}`, '--pretty=format:%H|%an|%at|%D|%s'), [exec])
  const currentBranch = useCallback(() => exec('rev-parse', '--abbrev-ref', 'HEAD'), [exec])
  const branches = useCallback(() => exec('branch', '-a', '--format=%(HEAD)|%(refname)|%(refname:short)'), [exec])
  const checkout = useCallback((name: string, isRemote = false) => isRemote ? exec('checkout', '--track', name) : exec('checkout', name), [exec])
  const createBranchAt = useCallback((name: string, hash: string) => exec('checkout', '-b', name, hash), [exec])
  const add = useCallback((files: string[]) => exec('add', ...files), [exec])
  const stageAll = useCallback(() => exec('add', '-A'), [exec])
  const commit = useCallback((message: string) => exec('commit', '-m', message), [exec])
  const pull = useCallback(() => exec('pull'), [exec])
  const push = useCallback(() => exec('push'), [exec])

  const isAvailable = useCallback(async () => {
    const result = await window.gitBridge.version()
    return result.ok
  }, [])

  return { ...state, exec, status, log, currentBranch, branches, checkout, createBranchAt, add, stageAll, commit, pull, push, isAvailable }
}
