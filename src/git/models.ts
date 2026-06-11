export type ChangeKind = 'modified' | 'added' | 'deleted' | 'renamed' | 'untracked' | 'unknown'

const KIND_BY_CODE: Record<string, ChangeKind> = {
  M: 'modified',
  A: 'added',
  D: 'deleted',
  R: 'renamed',
  '?': 'untracked',
}

export class FileChange {
  readonly path: string
  readonly staged: boolean
  readonly kind: ChangeKind

  constructor(path: string, staged: boolean, kind: ChangeKind) {
    this.path = path
    this.staged = staged
    this.kind = kind
  }

  static parseStatus(porcelainV2: string): { branch: string; upstream: string | null; ahead: number; behind: number; changes: FileChange[] } {
    let branch = ''
    let upstream: string | null = null
    let ahead = 0
    let behind = 0
    const changes: FileChange[] = []

    for (const line of porcelainV2.split('\n')) {
      if (line.startsWith('# branch.head ')) {
        branch = line.slice(14)
        continue
      }

      if (line.startsWith('# branch.upstream ')) {
        upstream = line.slice(18)
        continue
      }

      if (line.startsWith('# branch.ab ')) {
        const [a, b] = line.slice(12).split(' ')
        ahead = Math.abs(Number(a))
        behind = Math.abs(Number(b))
        continue
      }

      if (line.startsWith('? ')) {
        changes.push(new FileChange(line.slice(2), false, 'untracked'))
        continue
      }

      if (!line.startsWith('1 ') && !line.startsWith('2 ')) continue

      const parts = line.split(' ')
      const xy = parts[1]
      const stagedCode = xy[0]
      const unstagedCode = xy[1]
      const rawPath = parts.slice(8).join(' ')
      const path = line.startsWith('2 ') ? rawPath.split('\t')[0] : rawPath

      if (stagedCode !== '.') {
        changes.push(new FileChange(path, true, KIND_BY_CODE[stagedCode] ?? 'unknown'))
      }

      if (unstagedCode !== '.') {
        changes.push(new FileChange(path, false, KIND_BY_CODE[unstagedCode] ?? 'unknown'))
      }
    }

    return { branch, upstream, ahead, behind, changes }
  }
}

export class Branch {
  readonly name: string
  readonly localName: string
  readonly remote: string | null
  readonly current: boolean

  constructor(name: string, localName: string, remote: string | null, current: boolean) {
    this.name = name
    this.localName = localName
    this.remote = remote
    this.current = current
  }

  static parseBranches(raw: string): Branch[] {
    const branches: Branch[] = []

    for (const line of raw.split('\n')) {
      if (line.trim().length === 0) continue

      const [head, refname, short] = line.split('|')

      if (!refname || !short) continue

      if (refname.startsWith('refs/heads/')) {
        branches.push(new Branch(short, short, null, head === '*'))
        continue
      }

      if (!refname.startsWith('refs/remotes/')) continue

      const parts = refname.slice('refs/remotes/'.length).split('/')
      const remote = parts[0]
      const localName = parts.slice(1).join('/')

      if (localName.length === 0 || localName === 'HEAD') continue

      branches.push(new Branch(short, localName, remote, false))
    }

    return branches
  }
}

export type RefKind = 'head' | 'local' | 'remote' | 'tag'
export interface CommitRef { name: string; kind: RefKind }

function parseDecorations(raw: string): CommitRef[] {
  if (!raw.trim()) return []

  return raw.split(', ').flatMap((part) => {
    part = part.trim()

    if (part.startsWith('HEAD -> ')) {
      return [{ name: part.slice(8), kind: 'head' as RefKind }]
    }

    if (part === 'HEAD') return []

    if (part.startsWith('tag: ')) {
      return [{ name: part.slice(5), kind: 'tag' as RefKind }]
    }

    if (part.includes('/')) {
      return [{ name: part, kind: 'remote' as RefKind }]
    }

    return [{ name: part, kind: 'local' as RefKind }]
  })
}

export class Commit {
  readonly hash: string
  readonly author: string
  readonly date: Date
  readonly subject: string
  readonly refs: CommitRef[]

  constructor(hash: string, author: string, date: Date, subject: string, refs: CommitRef[] = []) {
    this.hash = hash
    this.author = author
    this.date = date
    this.subject = subject
    this.refs = refs
  }

  get shortHash(): string {
    return this.hash.slice(0, 7)
  }

  get relativeTime(): string {
    const seconds = Math.floor((Date.now() - this.date.getTime()) / 1000)

    if (seconds < 60) return 'just now'

    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`

    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`

    if (seconds < 2592000) return `${Math.floor(seconds / 86400)}d ago`

    return this.date.toLocaleDateString()
  }

  static parseLog(raw: string): Commit[] {
    const commits: Commit[] = []

    for (const line of raw.split('\n')) {
      if (line.trim().length === 0) continue

      // Format: %H|%an|%at|%D|%s — subject may contain | so join tail
      const parts = line.split('|')

      if (parts.length < 4) continue

      const [hash, author, timestamp, decoration, ...subjectParts] = parts

      if (!hash || !timestamp) continue

      commits.push(new Commit(
        hash,
        author,
        new Date(Number(timestamp) * 1000),
        subjectParts.join('|'),
        parseDecorations(decoration ?? ''),
      ))
    }

    return commits
  }
}
