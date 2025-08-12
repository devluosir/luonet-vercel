import { useError } from '../state/mail.selectors';

export function ErrorDisplay() {
  const error = useError();

  if (!error) return null;

  return (
    <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 rounded-lg text-sm">
      {error}
    </div>
  );
}
