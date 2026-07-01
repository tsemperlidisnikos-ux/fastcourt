export function AppBootLoading({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-fc-body text-fc-muted">
      {label}
    </div>
  );
}
