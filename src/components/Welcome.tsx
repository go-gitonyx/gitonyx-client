import { Icon } from "@iconify/react";

interface WelcomeProps {
  onOpen: () => void;
}

export function Welcome({ onOpen }: WelcomeProps) {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-6">
      <div className="glass rounded-2xl p-10 flex flex-col items-center gap-5 max-w-md text-center">
        <div className="size-16 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center">
          <Icon icon="mdi:source-branch" className="text-3xl text-primary" />
        </div>

        <div>
          <h1 className="text-2xl font-bold tracking-tight">gitonyx</h1>
          <p className="text-sm text-slate-400 mt-1">
            Open a local repository to see its status, stage changes and browse
            history.
          </p>
        </div>

        <button
          type="button"
          onClick={onOpen}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-base font-semibold text-[#030912] hover:bg-primary/85 transition-colors cursor-pointer"
        >
          <Icon icon="mdi:folder-open-outline" className="text-lg" />
          Open repository
        </button>
      </div>
    </div>
  );
}
