import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ModernLoginForm } from '@/components/auth/ModernLoginForm';
import { useAuth } from '@/hooks/useAuth';

const pushMock = jest.fn();
const loginMock = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

jest.mock('@/hooks/useAuth', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/i18n/locale-context', () => ({
  useTranslation: () => ({
    localize: (portuguese: string, english?: string) => english ?? portuguese,
  }),
}));

jest.mock('@/components/ui/theme-toggle', () => ({
  ThemeToggle: () => <div data-testid="theme-toggle" />,
}));

jest.mock('@/components/ui/locale-toggle', () => ({
  LocaleToggle: () => <div data-testid="locale-toggle" />,
}));

describe('ModernLoginForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({
      login: loginMock,
    });
  });

  it('submits credentials and redirects to the dashboard', async () => {
    loginMock.mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(<ModernLoginForm />);

    await user.type(screen.getByLabelText('Email address'), 'test@smartfinance.com');
    await user.type(screen.getByLabelText('Password'), 'SmartFinance123!');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() =>
      expect(loginMock).toHaveBeenCalledWith({
        email: 'test@smartfinance.com',
        password: 'SmartFinance123!',
      })
    );

    expect(pushMock).toHaveBeenCalledWith('/dashboard');
  });

  it('shows the backend error message when login fails', async () => {
    loginMock.mockRejectedValue(new Error('Invalid credentials'));
    const user = userEvent.setup();

    render(<ModernLoginForm />);

    await user.type(screen.getByLabelText('Email address'), 'test@smartfinance.com');
    await user.type(screen.getByLabelText('Password'), 'wrong-password');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText('Invalid credentials')).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });
});
