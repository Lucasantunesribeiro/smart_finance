import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { authService } from '@/services/authService';
import { UserRole } from '@/types/auth';

jest.mock('@/services/authService', () => ({
  authService: {
    getSession: jest.fn(),
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
  },
}));

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

const mockedAuthService = authService as jest.Mocked<typeof authService>;

const sampleUser = {
  id: 'user-123',
  email: 'test@smartfinance.com',
  firstName: 'Test',
  lastName: 'User',
  role: UserRole.User,
  isActive: true,
  createdAt: '2026-03-12T10:00:00.000Z',
};

function AuthConsumer() {
  const { user, isAuthenticated, isLoading, login, logout } = useAuth();

  return (
    <div>
      <div data-testid="status">{isLoading ? 'loading' : 'ready'}</div>
      <div data-testid="authenticated">{isAuthenticated ? 'yes' : 'no'}</div>
      <div data-testid="email">{user?.email ?? ''}</div>
      <button onClick={() => void login({ email: sampleUser.email, password: 'SmartFinance123!' })}>
        login
      </button>
      <button onClick={() => void logout()}>
        logout
      </button>
    </div>
  );
}

function renderWithProviders() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    </QueryClientProvider>
  );
}

describe('AuthProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('loads the current session on startup', async () => {
    mockedAuthService.getSession.mockResolvedValue({ user: sampleUser });

    renderWithProviders();

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('ready'));

    expect(screen.getByTestId('authenticated')).toHaveTextContent('yes');
    expect(screen.getByTestId('email')).toHaveTextContent(sampleUser.email);
  });

  it('updates the auth state after login and logout', async () => {
    mockedAuthService.getSession.mockRejectedValue(new Error('No active session'));
    mockedAuthService.login.mockResolvedValue({ user: sampleUser });
    mockedAuthService.logout.mockResolvedValue();

    renderWithProviders();
    const user = userEvent.setup();

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('ready'));
    expect(screen.getByTestId('authenticated')).toHaveTextContent('no');

    await user.click(screen.getByRole('button', { name: 'login' }));

    await waitFor(() => expect(screen.getByTestId('authenticated')).toHaveTextContent('yes'));
    expect(screen.getByTestId('email')).toHaveTextContent(sampleUser.email);

    await user.click(screen.getByRole('button', { name: 'logout' }));

    await waitFor(() => expect(screen.getByTestId('authenticated')).toHaveTextContent('no'));
    expect(screen.getByTestId('email')).toHaveTextContent('');
  });
});
