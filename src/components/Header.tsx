import { useState } from "react";
import { Icon } from "@iconify/react";
import type { Branch } from "../git/models";

interface HeaderProps {
  repoPath: string;
  branch: string;
  branches: Branch[];
  ahead: number;
  behind: number;
  loading: boolean;
  authUser: string | null;
  onCheckout: (branch: Branch) => void;
  onPull: () => void;
  onPush: () => void;
  onRefresh: () => void;
  onOpenAuth: () => void;
  onClose: () => void;
}

function ActionButton({
  icon,
  label,
  onClick,
  disabled,
}: {
  icon: string;
  label: string;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass text-sm text-slate-300 hover:border-primary/40 hover:text-white transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-default"
    >
      <Icon icon={icon} className="text-base text-primary" />
      {label}
    </button>
  );
}

function MenuLabel({ label }: { label: string }) {
  return (
    <div className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
      {label}
    </div>
  );
}

function BranchMenu({
  branch,
  branches,
  ahead,
  behind,
  loading,
  onCheckout,
}: {
  branch: string;
  branches: Branch[];
  ahead: number;
  behind: number;
  loading: boolean;
  onCheckout: (branch: Branch) => void;
}) {
  const [open, setOpen] = useState(false);

  const locals = branches.filter((b) => !b.remote);
  const localNames = new Set(locals.map((b) => b.name));
  const remotes = branches.filter(
    (b) => b.remote && !localNames.has(b.localName),
  );

  const pick = (b: Branch) => {
    setOpen(false);

    if (!b.current) onCheckout(b);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        disabled={loading}
        title="Switch branch"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/10 border border-accent/30 text-sm hover:border-accent/60 transition-colors cursor-pointer disabled:cursor-default"
      >
        <Icon icon="mdi:source-branch" className="text-accent" />
        <span className="font-mono">{branch || "..."}</span>
        {ahead > 0 && (
          <span className="text-emerald-400 font-mono">↑{ahead}</span>
        )}
        {behind > 0 && (
          <span className="text-amber-400 font-mono">↓{behind}</span>
        )}
        <Icon icon="mdi:chevron-down" className="text-slate-400" />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-9999"
            onClick={() => setOpen(false)}
          />

          <div className="absolute left-0 top-full mt-2 z-9998 w-72 max-h-80 overflow-y-auto rounded-xl bg-surface border border-line shadow-2xl py-1">
            <MenuLabel label="Local branches" />
            {locals.length === 0 && (
              <p className="px-3 py-1.5 text-sm text-slate-600">
                No local branches.
              </p>
            )}
            {locals.map((b) => (
              <button
                key={b.name}
                type="button"
                onClick={() => pick(b)}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm font-mono text-left text-slate-300 hover:bg-white/5 hover:text-white transition-colors cursor-pointer"
              >
                <Icon
                  icon="mdi:source-branch"
                  className="text-accent shrink-0"
                />
                <span className="truncate">{b.name}</span>
                {b.current && (
                  <Icon
                    icon="mdi:check"
                    className="ml-auto text-primary shrink-0"
                  />
                )}
              </button>
            ))}

            {remotes.length > 0 && <MenuLabel label="Remote branches" />}
            {remotes.map((b) => (
              <button
                key={b.name}
                type="button"
                onClick={() => pick(b)}
                title={`Check out ${b.name} as a new local branch`}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm font-mono text-left text-slate-400 hover:bg-white/5 hover:text-white transition-colors cursor-pointer"
              >
                <Icon
                  icon="mdi:cloud-outline"
                  className="text-accent shrink-0"
                />
                <span className="truncate">{b.name}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function Header({
  repoPath,
  branch,
  branches,
  ahead,
  behind,
  loading,
  authUser,
  onCheckout,
  onPull,
  onPush,
  onRefresh,
  onOpenAuth,
  onClose,
}: HeaderProps) {
  const repoName = repoPath.split(/[\\/]/).filter(Boolean).pop() ?? repoPath;

  return (
    <header className="relative z-10 glass rounded-xl px-4 py-3 flex items-center gap-4">
      <button
        type="button"
        onClick={onClose}
        title="Close repository"
        className="size-9 rounded-lg glass flex items-center justify-center text-slate-400 hover:text-white hover:border-primary/40 transition-colors cursor-pointer"
      >
        <Icon icon="mdi:folder-open-outline" className="text-lg" />
      </button>

      <div className="min-w-0">
        <div className="font-semibold leading-tight truncate">{repoName}</div>
        <div className="text-xs text-slate-500 font-mono truncate">
          {repoPath}
        </div>
      </div>

      <BranchMenu
        branch={branch}
        branches={branches}
        ahead={ahead}
        behind={behind}
        loading={loading}
        onCheckout={onCheckout}
      />

      <div className="ml-auto flex items-center gap-2">
        {loading && (
          <Icon
            icon="mdi:loading"
            className="text-primary text-lg animate-spin"
          />
        )}
        <ActionButton
          icon="mdi:arrow-down"
          label="Pull"
          onClick={onPull}
          disabled={loading}
        />
        <ActionButton
          icon="mdi:arrow-up"
          label="Push"
          onClick={onPush}
          disabled={loading}
        />
        <ActionButton
          icon="mdi:refresh"
          label="Refresh"
          onClick={onRefresh}
          disabled={loading}
        />

        <button
          type="button"
          onClick={onOpenAuth}
          title={authUser ? `Signed in as ${authUser}` : "Set git credentials"}
          className="size-9 rounded-lg glass flex items-center justify-center text-slate-400 hover:text-white hover:border-primary/40 transition-colors cursor-pointer"
        >
          <Icon
            icon={authUser ? "mdi:account-check" : "mdi:account-key-outline"}
            className={`text-lg ${authUser ? "text-emerald-400" : ""}`}
          />
        </button>
      </div>
    </header>
  );
}
