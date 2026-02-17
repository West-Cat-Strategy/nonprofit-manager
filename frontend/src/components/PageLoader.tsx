const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-[var(--app-bg)] transition-colors duration-300">
    <div className="text-center">
      <div className="animate-spin rounded-full h-16 w-16 border-4 border-[var(--app-border)] border-b-[var(--app-accent)] mx-auto"></div>
      <p className="mt-6 text-[var(--app-text)] font-black uppercase tracking-widest text-xl animate-pulse">Loading...</p>
    </div>
  </div>
);

export default PageLoader;
