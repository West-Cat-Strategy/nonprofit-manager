interface LoadFailureNoticeProps {
  title?: string;
  message: string;
}

export default function LoadFailureNotice({
  title = 'Load failed',
  message,
}: LoadFailureNoticeProps) {
  return (
    <div
      className="min-w-0 rounded-md border border-app-accent bg-app-accent-soft px-3 py-2 text-sm text-app-accent-text"
      role="status"
    >
      <p className="break-words font-semibold">{title}</p>
      <p className="mt-1 break-words">{message}</p>
    </div>
  );
}
