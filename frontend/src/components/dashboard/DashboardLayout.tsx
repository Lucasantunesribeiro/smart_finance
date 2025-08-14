'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import {
  Menu,
  Bell,
  Home,
  Receipt,
  Wallet,
  Target,
  PieChart,
  BarChart3,
  Calendar,
  Settings,
  LogOut
} from 'lucide-react';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const sidebarItems = [
    { icon: Home, label: 'Overview', href: '/dashboard' },
    { icon: Receipt, label: 'Transactions', href: '/dashboard/transactions' },
    { icon: Wallet, label: 'Accounts', href: '/dashboard/accounts' },
    { icon: Target, label: 'Budgets', href: '/dashboard/budgets' },
    { icon: PieChart, label: 'Categories', href: '/dashboard/categories' },
    { icon: BarChart3, label: 'Analytics', href: '/dashboard/analytics' },
    { icon: Calendar, label: 'Reports', href: '/dashboard/reports' },
    { icon: Settings, label: 'Settings', href: '/dashboard/settings' },
  ];

  const handleNavigation = (href: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    router.push(href as any);
    setSidebarOpen(false); // Close mobile sidebar
  };

  const isActivePage = (href: string) => {
    return pathname === href;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-16 items-center justify-between px-4 lg:px-8">
          <div className="flex items-center">
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64">
                <SheetHeader>
                  <SheetTitle>SmartFinance</SheetTitle>
                  <SheetDescription>Financial Management</SheetDescription>
                </SheetHeader>
                <nav className="mt-8 space-y-2">
                  {sidebarItems.map((item) => (
                    <Button
                      key={item.label}
                      variant={isActivePage(item.href) ? "default" : "ghost"}
                      className="w-full justify-start"
                      onClick={() => handleNavigation(item.href)}
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {item.label}
                    </Button>
                  ))}
                </nav>
              </SheetContent>
            </Sheet>
            <h1 className="ml-2 text-lg font-semibold lg:ml-0">SmartFinance</h1>
          </div>

          <div className="flex items-center space-x-2">
            <Button variant="outline" size="icon">
              <Bell className="h-4 w-4" />
            </Button>
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="" alt={`${user?.firstName} ${user?.lastName}`} />
                    <AvatarFallback>{user?.firstName?.charAt(0) || 'U'}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{`${user?.firstName} ${user?.lastName}`}</p>
                    <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleNavigation('/dashboard/settings')}>
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => logout()}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:block fixed left-0 top-16 z-40 w-64 h-[calc(100vh-4rem)] border-r bg-background">
        <ScrollArea className="h-full p-4">
          <nav className="space-y-2">
            {sidebarItems.map((item) => (
              <Button
                key={item.label}
                variant={isActivePage(item.href) ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => handleNavigation(item.href)}
              >
                <item.icon className="mr-2 h-4 w-4" />
                {item.label}
              </Button>
            ))}
          </nav>
        </ScrollArea>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-64 pt-4 pb-8">
        <div className="px-4 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
};