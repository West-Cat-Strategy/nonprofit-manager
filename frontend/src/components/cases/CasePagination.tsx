/**
 * Case Pagination Component
 * Reusable pagination controls for case list
 */

interface CasePaginationProps {
  currentPage: number;
  totalPages: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
}

export default function CasePagination({
  currentPage,
  totalPages,
  total,
  limit,
  onPageChange,
}: CasePaginationProps) {
  if (totalPages <= 1) return null;

  // Calculate visible page numbers
  const windowSize = 5;
  const halfWindow = Math.floor(windowSize / 2);
  const start = Math.max(1, Math.min(currentPage - halfWindow, totalPages - windowSize + 1));
  const end = Math.min(totalPages, start + windowSize - 1);

  const paginationPages: number[] = [];
  for (let page = start; page <= end; page += 1) {
    paginationPages.push(page);
  }

  const buttonBaseClass =
    'border-2 border-black dark:border-white px-4 py-2 font-black uppercase shadow-[2px_2px_0px_var(--shadow-color)] transition-colors';
  const buttonActiveClass = 'bg-black dark:bg-white text-white dark:text-black';
  const buttonInactiveClass =
    'bg-white dark:bg-black text-black dark:text-white hover:bg-[var(--loop-yellow)]';
  const buttonDisabledClass =
    'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white dark:disabled:hover:bg-black';

  return (
    <nav
      className="mt-6 flex justify-between items-center"
      role="navigation"
      aria-label="Cases pagination"
    >
      <div className="text-sm font-bold text-black dark:text-white">
        Showing {(currentPage - 1) * limit + 1} to {Math.min(currentPage * limit, total)} of {total}{' '}
        cases
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={`${buttonBaseClass} ${buttonInactiveClass} ${buttonDisabledClass}`}
          aria-label="Previous page"
        >
          Previous
        </button>

        <div className="flex items-center gap-2" role="group" aria-label="Page numbers">
          {paginationPages[0] !== 1 && (
            <>
              <button
                onClick={() => onPageChange(1)}
                className={`${buttonBaseClass} ${buttonInactiveClass}`}
                aria-label="Go to page 1"
              >
                1
              </button>
              <span className="text-sm font-black text-black/60 dark:text-white/60">…</span>
            </>
          )}

          {paginationPages.map((page) => (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={`${buttonBaseClass} ${
                currentPage === page ? buttonActiveClass : buttonInactiveClass
              }`}
              aria-label={`Go to page ${page}`}
              aria-current={currentPage === page ? 'page' : undefined}
            >
              {page}
            </button>
          ))}

          {paginationPages[paginationPages.length - 1] !== totalPages && (
            <>
              <span className="text-sm font-black text-black/60 dark:text-white/60">…</span>
              <button
                onClick={() => onPageChange(totalPages)}
                className={`${buttonBaseClass} ${buttonInactiveClass}`}
                aria-label={`Go to page ${totalPages}`}
              >
                {totalPages}
              </button>
            </>
          )}
        </div>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={`${buttonBaseClass} ${buttonInactiveClass} ${buttonDisabledClass}`}
          aria-label="Next page"
        >
          Next
        </button>
      </div>
    </nav>
  );
}
