const PageLoader = () => (
  <div
    className="flex min-h-screen items-center justify-center bg-[var(--app-bg)] transition-colors duration-300"
    role="status"
    aria-live="polite"
    aria-busy="true"
    aria-label="Loading application"
  >
    <div className="text-center">
      <div
        className="mx-auto h-16 w-16 animate-spin rounded-full border-4 border-[var(--app-border)] border-b-[var(--app-accent)]"
        aria-hidden="true"
      />
      <p className="mt-6 animate-pulse text-xl font-black uppercase tracking-widest text-[var(--app-text)]">
        Loading...
      </p>
    </div>
  </div>
);

export default PageLoader;
