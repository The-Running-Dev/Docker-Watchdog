import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { App } from './App';

describe('App', () => {
  it('shows the API version once /api/info answers', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ version: '1.2.3', buildDate: '', insideDocker: true }), { status: 200 }),
        ),
    );

    render(<App />);

    expect(screen.getByRole('heading', { name: 'SubZeroDev Watchdog' })).toBeInTheDocument();
    expect(await screen.findByText('API version 1.2.3')).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith('/api/info');
  });

  it('says so when the API cannot be reached', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    render(<App />);

    expect(await screen.findByText('API unreachable')).toBeInTheDocument();
  });
});
