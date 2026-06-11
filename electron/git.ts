import { app, ipcMain, dialog } from 'electron'
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

export interface GitResult {
  ok: boolean
  stdout: string
  stderr: string
  code: number
}

export interface GitAuthStatus {
  authenticated: boolean
  username: string | null
}

export interface FsEntry {
  name: string
  path: string
  isDir: boolean
}

export interface Project {
  id: string
  path: string
  name: string
}

const ALLOWED_COMMANDS = new Set([
  'status', 'log', 'diff', 'branch', 'checkout', 'add',
  'commit', 'push', 'pull', 'fetch', 'clone', 'init',
  'remote', 'stash', 'rev-parse', 'show', 'config', 'restore',
])

// Kept only in main-process memory, never written to disk.
let auth: { username: string; password: string } | null = null
let askPassPath: string | null = null

const ASKPASS_SH = `#!/bin/sh
case "$1" in
  Username*) printf '%s\\n' "$GITONYX_GIT_USERNAME" ;;
  *) printf '%s\\n' "$GITONYX_GIT_PASSWORD" ;;
esac
`

const ASKPASS_BAT = '@echo off\r\necho %~1 | findstr /B /C:"Username" >nul && (echo %GITONYX_GIT_USERNAME%) || (echo %GITONYX_GIT_PASSWORD%)\r\n'

function ensureAskPass(): string {
  if (askPassPath && fs.existsSync(askPassPath)) return askPassPath

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gitonyx-'))

  if (process.platform === 'win32') {
    askPassPath = path.join(dir, 'askpass.bat')
    fs.writeFileSync(askPassPath, ASKPASS_BAT)
  } else {
    askPassPath = path.join(dir, 'askpass.sh')
    fs.writeFileSync(askPassPath, ASKPASS_SH, { mode: 0o700 })
  }

  return askPassPath
}

function runGit(args: string[], cwd: string): Promise<GitResult> {
  // GIT_TERMINAL_PROMPT=0 makes git fail fast instead of hanging on a
  // credential prompt it can never answer (there is no attached terminal).
  const env: NodeJS.ProcessEnv = { ...process.env, GIT_TERMINAL_PROMPT: '0' }
  const finalArgs = [...args]

  if (auth) {
    env.GIT_ASKPASS = ensureAskPass()
    env.GITONYX_GIT_USERNAME = auth.username
    env.GITONYX_GIT_PASSWORD = auth.password
    // Prepend -c credential.helper= so system helpers (git-credential-manager,
    // gnome-keyring, etc.) don't shadow our ASKPASS script.
    finalArgs.unshift('-c', 'credential.helper=')
  }

  return new Promise((resolve) => {
    const proc = spawn('git', finalArgs, { cwd, env })

    let stdout = ''
    let stderr = ''

    proc.stdout.on('data', (chunk) => stdout += chunk.toString())
    proc.stderr.on('data', (chunk) => stderr += chunk.toString())

    proc.on('error', (err) => {
      resolve({ ok: false, stdout: '', stderr: err.message, code: -1 })
    })

    proc.on('close', (code) => {
      resolve({ ok: code === 0, stdout, stderr, code: code ?? -1 })
    })
  })
}

export function registerGitHandlers() {
  ipcMain.handle('git:exec', async (_event, args: string[], cwd: string) => {
    if (args.length === 0) {
      return { ok: false, stdout: '', stderr: 'No arguments given', code: -1 }
    }

    if (!ALLOWED_COMMANDS.has(args[0])) {
      return { ok: false, stdout: '', stderr: `Command not allowed: ${args[0]}`, code: -1 }
    }

    return runGit(args, cwd)
  })

  ipcMain.handle('git:version', async () => {
    return runGit(['--version'], process.cwd())
  })

  ipcMain.handle('git:selectRepo', async () => {
    const result = await dialog.showOpenDialog({ properties: ['openDirectory'] })

    if (result.canceled || result.filePaths.length === 0) return null

    return result.filePaths[0]
  })

  ipcMain.handle('git:setAuth', async (_event, username: string, password: string) => {
    auth = { username, password }
  })

  ipcMain.handle('git:clearAuth', async () => {
    auth = null
  })

  ipcMain.handle('git:authStatus', async (): Promise<GitAuthStatus> => {
    return { authenticated: auth !== null, username: auth?.username ?? null }
  })

  ipcMain.handle('fs:readdir', async (_event, dirPath: string): Promise<FsEntry[]> => {
    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true })
      return entries
        .filter((e) => e.name !== '.git')
        .map((e) => ({ name: e.name, path: path.join(dirPath, e.name), isDir: e.isDirectory() }))
        .sort((a, b) => {
          if (a.isDir !== b.isDir) return a.isDir ? -1 : 1
          return a.name.localeCompare(b.name)
        })
    } catch {
      return []
    }
  })

  const projectsDir = () => path.join(os.homedir(), '.gitonyx')
  const projectsFile = () => path.join(projectsDir(), 'projects.json')

  ipcMain.handle('projects:load', async (): Promise<Project[]> => {
    try {
      return JSON.parse(fs.readFileSync(projectsFile(), 'utf8'))
    } catch {
      return []
    }
  })

  ipcMain.handle('projects:save', async (_event, projects: Project[]) => {
    fs.mkdirSync(projectsDir(), { recursive: true })
    fs.writeFileSync(projectsFile(), JSON.stringify(projects))
  })

  app.on('will-quit', () => {
    if (askPassPath) fs.rmSync(path.dirname(askPassPath), { recursive: true, force: true })
  })
}
