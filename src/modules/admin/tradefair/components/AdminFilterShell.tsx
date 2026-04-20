interface AdminFilterShellProps {
  children: React.ReactNode;
}

export function AdminFilterShell({ children }: AdminFilterShellProps) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid gap-3 md:grid-cols-3">{children}</div>
    </div>
  );
}
