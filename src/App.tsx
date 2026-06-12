import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { useGit } from "./hooks/useGit";
import { FileChange, Commit, Branch } from "./git/models";
import type { GitResult } from "../electron/git";
import type { Project } from "./types/git";
import { Welcome } from "./components/Welcome";
import { Header } from "./components/Header";
import { ChangesPanel } from "./components/ChangesPanel";
import { HistoryPanel } from "./components/HistoryPanel";
import { ExplorerPanel } from "./components/ExplorerPanel";
import { AuthDialog } from "./components/AuthDialog";

interface RepoState {
  branch: string;
  ahead: number;
  behind: number;
  changes: FileChange[];
  commits: Commit[];
  branches: Branch[];
}

const EMPTY_REPO: RepoState = {
  branch: "",
  ahead: 0,
  behind: 0,
  changes: [],
  commits: [],
  branches: [],
};

function looksLikeAuthError(stderr: string): boolean {
  return /authentication failed|could not read username|invalid credentials|access denied|http 40[13]|401|403|support for password authentication|repository not found|terminal prompts disabled/i.test(
    stderr,
  );
}

type LeftTab = "changes" | "explorer";

function Workspace({
  repoPath,
  onClose,
}: {
  repoPath: string;
  onClose: () => void;
}) {
  const git = useGit(repoPath);
  const [repo, setRepo] = useState<RepoState>(EMPTY_REPO);
  const [authOpen, setAuthOpen] = useState(false);
  const [authUser, setAuthUser] = useState<string | null>(null);
  const [leftTab, setLeftTab] = useState<LeftTab>("changes");
  const pendingRef = useRef<(() => void) | null>(null);

  const refresh = useCallback(async () => {
    const statusResult = await git.status();

    if (!statusResult.ok) return;

    const parsed = FileChange.parseStatus(statusResult.stdout);
    const [logResult, branchResult] = await Promise.all([
      git.log(50),
      git.branches(),
    ]);
    const commits = logResult.ok ? Commit.parseLog(logResult.stdout) : [];
    const branches = branchResult.ok
      ? Branch.parseBranches(branchResult.stdout)
      : [];

    setRepo({
      branch: parsed.branch,
      ahead: parsed.ahead,
      behind: parsed.behind,
      changes: parsed.changes,
      commits,
      branches,
    });
  }, [git]);

  useEffect(() => {
    refresh();
  }, [repoPath]);

  useEffect(() => {
    window.gitBridge
      .authStatus()
      .then((status) => setAuthUser(status.username));
  }, []);

  const runRemote = useCallback(
    async (op: () => Promise<GitResult>) => {
      const result = await op();

      if (looksLikeAuthError(result.stderr)) {
        pendingRef.current = () => runRemote(op);
        setAuthOpen(true);
        return;
      }

      refresh();
    },
    [refresh],
  );

  const stage = async (path: string) => {
    await git.add([path]);
    refresh();
  };

  const stageAll = async () => {
    await git.stageAll();
    refresh();
  };

  const unstage = async (path: string) => {
    await git.exec("restore", "--staged", "--", path);
    refresh();
  };

  const commit = async (message: string) => {
    await git.commit(message);
    refresh();
  };

  const checkout = async (branch: Branch) => {
    await git.checkout(branch.name, branch.remote !== null);
    refresh();
  };

  const createBranch = async (name: string, hash: string) => {
    await git.createBranchAt(name, hash);
    refresh();
  };

  const pull = () => runRemote(git.pull);
  const push = () => runRemote(git.push);

  const saveAuth = async (username: string, password: string) => {
    await window.gitBridge.setAuth(username, password);
    setAuthUser(username);
    setAuthOpen(false);

    const pending = pendingRef.current;
    pendingRef.current = null;
    pending?.();
  };

  const clearAuth = async () => {
    await window.gitBridge.clearAuth();
    setAuthUser(null);
    setAuthOpen(false);
  };

  const closeAuth = () => {
    pendingRef.current = null;
    setAuthOpen(false);
  };

  // Don't surface auth errors in the banner — the dialog handles them
  const visibleError =
    git.error && !looksLikeAuthError(git.error) ? git.error : null;

  return (
    <div className="h-full flex flex-col gap-3 p-3">
      <Header
        repoPath={repoPath}
        branch={repo.branch}
        branches={repo.branches}
        ahead={repo.ahead}
        behind={repo.behind}
        loading={git.loading}
        authUser={authUser}
        onCheckout={checkout}
        onPull={pull}
        onPush={push}
        onRefresh={refresh}
        onOpenAuth={() => setAuthOpen(true)}
        onClose={onClose}
      />

      {visibleError && (
        <div className="glass rounded-xl px-4 py-2.5 flex items-start gap-2 border-red-500/40 text-sm text-red-300">
          <Icon
            icon="mdi:alert-circle-outline"
            className="text-lg shrink-0 mt-0.5"
          />
          <pre className="font-mono whitespace-pre-wrap break-all">
            {visibleError}
          </pre>
        </div>
      )}

      <main className="flex-1 grid grid-cols-[1.2fr_20rem] gap-3 min-h-0">
        <HistoryPanel commits={repo.commits} onCreateBranch={createBranch} />

        {/* Right: tabbed Changes / Explorer */}
        <div className="glass rounded-xl flex flex-col min-h-0 overflow-hidden">
          {/* Tab bar */}
          <div className="flex border-b border-line shrink-0">
            <TabButton
              active={leftTab === "changes"}
              onClick={() => setLeftTab("changes")}
              icon="mdi:pencil-outline"
            >
              Changes
            </TabButton>
            <TabButton
              active={leftTab === "explorer"}
              onClick={() => setLeftTab("explorer")}
              icon="mdi:folder-tree-outline"
            >
              Explorer
            </TabButton>
          </div>

          {/* Panels: both always mounted so Changes commit message isn't lost */}
          <div
            className={`flex-1 min-h-0 flex flex-col ${leftTab === "changes" ? "" : "hidden"}`}
          >
            <ChangesPanel
              changes={repo.changes}
              loading={git.loading}
              onStage={stage}
              onStageAll={stageAll}
              onUnstage={unstage}
              onCommit={commit}
              inner
            />
          </div>
          <div
            className={`flex-1 min-h-0 flex flex-col ${leftTab === "explorer" ? "" : "hidden"}`}
          >
            <ExplorerPanel repoPath={repoPath} changes={repo.changes} />
          </div>
        </div>
      </main>

      <AuthDialog
        open={authOpen}
        currentUser={authUser}
        onSave={saveAuth}
        onClear={clearAuth}
        onClose={closeAuth}
      />
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold uppercase tracking-widest transition-colors cursor-pointer border-b-2 -mb-px ${
        active
          ? "text-primary border-primary"
          : "text-slate-500 border-transparent hover:text-slate-300"
      }`}
    >
      <Icon icon={icon} className="text-sm" />
      {children}
    </button>
  );
}

function ProjectTabBar({
  projects,
  activeId,
  onSelect,
  onClose,
  onNew,
}: {
  projects: Project[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
  onNew: () => void;
}) {
  return (
    <div className="flex items-end gap-0.5 px-2 pt-1.5 shrink-0 border-b border-line">
      {projects.map((p) => (
        <div
          key={p.id}
          onClick={() => onSelect(p.id)}
          className={`group relative flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg text-xs cursor-pointer transition-colors select-none max-w-45 border border-b-0 -mb-px ${
            p.id === activeId
              ? "bg-surface border-line text-white z-10"
              : "border-transparent text-slate-500 hover:text-slate-300 hover:bg-white/5"
          }`}
        >
          <Icon icon="mdi:source-branch" className="text-accent shrink-0" />
          <span className="truncate min-w-0 font-medium">{p.name}</span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose(p.id);
            }}
            className="shrink-0 size-3.5 flex items-center justify-center rounded text-slate-500 hover:text-white hover:bg-white/15 opacity-0 group-hover:opacity-100 transition-opacity ml-0.5 cursor-pointer"
          >
            <Icon icon="mdi:close" className="text-[10px]" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={onNew}
        title="Open repository"
        className="mb-0.5 ml-1 size-6 flex items-center justify-center rounded text-slate-500 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
      >
        <Icon icon="mdi:plus" className="text-primary" />
      </button>
    </div>
  );
}

function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    window.gitBridge.loadProjects().then((loaded) => {
      setProjects(loaded);
      if (loaded.length > 0) setActiveId(loaded[loaded.length - 1].id);
    });
  }, []);

  const persistProjects = (next: Project[]) => {
    setProjects(next);
    window.gitBridge.saveProjects(next);
  };

  const openRepo = async () => {
    const repoPath = await window.gitBridge.selectRepo();
    if (!repoPath) return;

    const existing = projects.find((p) => p.path === repoPath);
    if (existing) {
      setActiveId(existing.id);
      return;
    }

    const name = repoPath.split(/[\\/]/).filter(Boolean).pop() ?? repoPath;
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2);
    const project: Project = { id, path: repoPath, name };
    persistProjects([...projects, project]);
    setActiveId(id);
  };

  const closeProject = (id: string) => {
    const next = projects.filter((p) => p.id !== id);
    persistProjects(next);
    if (activeId === id) {
      setActiveId(next.length > 0 ? next[next.length - 1].id : null);
    }
  };

  const activeProject = projects.find((p) => p.id === activeId) ?? null;

  return (
    <div className="h-full glow-bg flex flex-col">
      <ProjectTabBar
        projects={projects}
        activeId={activeId}
        onSelect={setActiveId}
        onClose={closeProject}
        onNew={openRepo}
      />
      <div className="flex-1 min-h-0">
        {activeProject ? (
          <Workspace
            key={activeProject.id}
            repoPath={activeProject.path}
            onClose={() => closeProject(activeProject.id)}
          />
        ) : (
          <Welcome onOpen={openRepo} />
        )}
      </div>
    </div>
  );
}

export default App;
