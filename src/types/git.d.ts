import type { GitResult, GitAuthStatus, FsEntry, Project } from '../../electron/git'

declare global {
  interface Window {
    gitBridge: {
      exec: (args: string[], cwd: string) => Promise<GitResult>
      version: () => Promise<GitResult>
      selectRepo: () => Promise<string | null>
      setAuth: (username: string, password: string) => Promise<void>
      clearAuth: () => Promise<void>
      authStatus: () => Promise<GitAuthStatus>
      readdir: (dirPath: string) => Promise<FsEntry[]>
      loadProjects: () => Promise<Project[]>
      saveProjects: (projects: Project[]) => Promise<void>
    }
  }
}

export type { FsEntry, Project }
