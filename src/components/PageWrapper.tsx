import { type ReactNode } from 'react';
import Disclaimer from './Disclaimer';

interface PageWrapperProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  showDisclaimer?: boolean;
}

export default function PageWrapper({
  title,
  subtitle,
  children,
  showDisclaimer = true,
}: PageWrapperProps) {
  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h2 className="page-title">{title}</h2>
        {subtitle && <p className="text-gray-500 mt-1 text-sm">{subtitle}</p>}
      </div>
      {showDisclaimer && <Disclaimer />}
      {children}
    </div>
  );
}
