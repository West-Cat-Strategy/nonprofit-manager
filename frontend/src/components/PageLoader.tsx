const PageLoader = () => (
<<<<<<< HEAD
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
=======
  <div className="min-h-screen flex items-center justify-center bg-[var(--app-bg)] transition-colors duration-300">
    <div className="text-center">
      <div className="animate-spin rounded-full h-16 w-16 border-4 border-[var(--app-border)] border-b-[var(--app-accent)] mx-auto"></div>
      <p className="mt-6 text-[var(--app-text)] font-black uppercase tracking-widest text-xl animate-pulse">Loading...</p>
>>>>>>> origin/main
    </div>
  </div>
);

export default PageLoader;
