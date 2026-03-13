'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { HubConnection, HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

interface SignalRContextType {
  connection: HubConnection | null;
  isConnected: boolean;
}

const SignalRContext = createContext<SignalRContextType | undefined>(undefined);

export function SignalRProvider({ children }: { children: ReactNode }) {
  const [connection, setConnection] = useState<HubConnection | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setIsConnected(false);
      setConnection(null);
      return;
    }

    const configuredHubUrl = process.env.NEXT_PUBLIC_SIGNALR_URL || '/financehub';
    const hubUrl = configuredHubUrl.startsWith('http')
      ? configuredHubUrl
      : `${window.location.origin}${configuredHubUrl}`;

    const newConnection = new HubConnectionBuilder()
      .withUrl(hubUrl, { withCredentials: true })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Information)
      .build();

    newConnection.on('TransactionCreated', (transaction) => {
      toast.success(`New transaction created: ${transaction.description}`);
    });

    newConnection.on('TransactionUpdated', (transaction) => {
      toast.info(`Transaction updated: ${transaction.description}`);
    });

    newConnection.on('TransactionDeleted', () => {
      toast.info('Transaction deleted');
    });

    newConnection.on('AccountBalanceUpdated', (account) => {
      toast.info(`Account balance updated: ${account.name}`);
    });

    newConnection.on('BudgetAlert', (alert) => {
      toast.warning(`Budget alert: ${alert.message}`);
    });

    newConnection.on('ReportGenerated', (report) => {
      toast.success(`Report generated: ${report.name}`);
    });

    newConnection.onclose(() => {
      setIsConnected(false);
      setConnection(null);
    });

    newConnection.onreconnected(async () => {
      setIsConnected(true);
      await newConnection.invoke('JoinDashboardGroup');
    });

    void newConnection
      .start()
      .then(async () => {
        setIsConnected(true);
        setConnection(newConnection);
        await newConnection.invoke('JoinDashboardGroup');
      })
      .catch((error) => {
        console.error('SignalR connection error:', error);
      });

    return () => {
      setIsConnected(false);
      setConnection(null);
      void newConnection.stop();
    };
  }, [isAuthenticated, user]);

  return (
    <SignalRContext.Provider value={{ connection, isConnected }}>
      {children}
    </SignalRContext.Provider>
  );
}

export function useSignalR() {
  const context = useContext(SignalRContext);
  if (context === undefined) {
    throw new Error('useSignalR must be used within a SignalRProvider');
  }
  return context;
}
