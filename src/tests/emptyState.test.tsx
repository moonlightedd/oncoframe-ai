import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import EmptyState from '@/components/EmptyState';

describe('EmptyState', () => {
  it('renders the title and message', () => {
    const html = renderToString(
      <EmptyState title="No dataset loaded" message="Upload a file to begin." />
    );
    expect(html).toContain('No dataset loaded');
    expect(html).toContain('Upload a file to begin.');
  });
});
