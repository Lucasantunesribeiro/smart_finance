'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/i18n/locale-context';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { LocaleToggle } from '@/components/ui/locale-toggle';
import { Loader2, Mail, Lock, DollarSign } from 'lucide-react';

export const ModernLoginForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const { login } = useAuth();
  const { localize } = useTranslation();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await login({ email, password });
      router.push('/dashboard');
    } catch (err) {
      console.error('Login error:', err);
      setError(
        err instanceof Error
          ? err.message
          : localize('Falha ao entrar. Tente novamente.', 'Login failed. Please try again.')
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-accent/20 p-4">
      <div className="absolute top-4 right-4 flex items-center space-x-2">
        <LocaleToggle />
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center space-y-4">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary text-primary-foreground">
            <DollarSign className="h-8 w-8" />
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tight">SmartFinance</h1>
            <p className="text-muted-foreground">
              {localize(
                'Gestão Financeira Empresarial',
                'Enterprise Financial Management'
              )}
            </p>
          </div>
        </div>

        <Card className="border-0 shadow-2xl">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">
              {localize('Bem-vindo de volta', 'Welcome back')}
            </CardTitle>
            <CardDescription className="text-center">
              {localize(
                'Digite suas credenciais para acessar sua conta',
                'Enter your credentials to access your account'
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <h4 className="font-semibold text-sm text-blue-800 dark:text-blue-200 mb-2">
                {localize('🔐 Credenciais de Teste', '🔐 Test Credentials')}
              </h4>
              <div className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                <div>
                  <strong>Admin Principal:</strong> admin@smartfinance.com / password
                </div>
                <div>
                  <strong>Admin Alt:</strong> admin@smartfinance.com / admin123
                </div>
                <div>
                  <strong>Usuário:</strong> Lucas.afvr@gmail.com / 123456
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  {localize('E-mail', 'Email address')}
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={localize('Informe seu e-mail', 'Enter your email')}
                    className="pl-10"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  {localize('Senha', 'Password')}
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={localize('Informe sua senha', 'Enter your password')}
                    className="pl-10"
                    disabled={isLoading}
                  />
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full" disabled={isLoading} size="lg">
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {localize('Autenticando...', 'Signing in...')}
                  </>
                ) : (
                  localize('Entrar', 'Sign in')
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="text-center text-sm text-muted-foreground">
          <p>
            {localize(
              '© 2024 SmartFinance. Todos os direitos reservados.',
              '© 2024 SmartFinance. All rights reserved.'
            )}
          </p>
        </div>
      </div>
    </div>
  );
};
