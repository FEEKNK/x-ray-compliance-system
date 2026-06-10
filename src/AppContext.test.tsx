/// <reference types="@testing-library/jest-dom" />
import { render, screen } from '@testing-library/react';
import { AppProvider, useApp } from './AppContext';
import { api } from './api';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock the API layer
vi.mock('./api', () => ({
  api: {
    users: { getAll: vi.fn() },
    forms: { getAll: vi.fn() },
    schedules: { getAll: vi.fn() },
    submissions: { getAll: vi.fn() },
    bundles: { getAll: vi.fn() },
    alerts: { getAll: vi.fn() },
    config: { get: vi.fn() },
  }
}));

// Test component to consume the context
const TestComponent = () => {
  const { isLoading, language, settings } = useApp();
  if (isLoading) return <div>Loading...</div>;
  return (
    <div>
      <span data-testid="lang">{language}</span>
      <span data-testid="hospital">{settings.hospitalName}</span>
    </div>
  );
};

describe('AppContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default successful mock responses
    (api.users.getAll as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (api.forms.getAll as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (api.schedules.getAll as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (api.submissions.getAll as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (api.bundles.getAll as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (api.alerts.getAll as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (api.config.get as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      settings: { hospitalName: "Mock Hospital" },
      announcements: []
    });
  });

  it('renders loading state initially then provides context data', async () => {
    render(
      <AppProvider>
        <TestComponent />
      </AppProvider>
    );

    // Should initially show loading
    expect(screen.getByText('Loading...')).toBeInTheDocument();

    // Wait for API calls to resolve by looking for the loaded text
    const langElement = await screen.findByTestId('lang');
    expect(langElement).toHaveTextContent('TH');
    expect(screen.getByTestId('hospital')).toHaveTextContent('Mock Hospital');
  });
});
