import { type ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  message: string;
  action?: ReactNode;
}

export default function EmptyState({ title, message, action }: EmptyStateProps) {
  return (
    <div className="card text-center py-12">
      <div className="w-14 h-14 bg-navy-50 rounded-full mx-auto mb-4 flex items-center justify-center">
        <svg className="w-7 h-7 text-navy-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
      </div>
      <h3 className="text-navy-500 font-semibold text-lg">{title}</h3>
      <p className="text-gray-500 text-sm mt-2 max-w-md mx-auto">{message}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
