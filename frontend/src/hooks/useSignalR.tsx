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
    // Temporariamente desabilitado para evitar erro 401
    if (false && isAuthenticated && user) {
      const hubUrl = process.env.NEXT_PUBLIC_SIGNALR_URL || 'http://localhost:5000/financehub';

      const newConnection = new HubConnectionBuilder()
        .withUrl(hubUrl)
        .withAutomaticReconnect()
        .configureLogging(LogLevel.Information)
        .build();

      newConnection.start()
        .then(() => {
          console.log('SignalR connected');
          setIsConnected(true);
          setConnection(newConnection);
          
          newConnection.invoke('JoinDashboardGroup').catch((err) => {
            console.error('Error joining dashboard group:', err);
          });
        })
        .catch((err) => {
          console.error('SignalR connection error:', err);
        });

      newConnection.on('TransactionCreated', (transaction) => {
        toast.success(`New transaction created: ${transaction.description}`);
        console.log('Transaction created:', transaction);
      });

      newConnection.on('TransactionUpdated', (transaction) => {
        toast.info(`Transaction updated: ${transaction.description}`);
        console.log('Transaction updated:', transaction);
      });

      newConnection.on('TransactionDeleted', (transactionId) => {
        toast.info('Transaction deleted');
        console.log('Transaction deleted:', transactionId);
      });

      newConnection.on('AccountBalanceUpdated', (account) => {
        toast.info(`Account balance updated: ${account.name}`);
        console.log('Account balance updated:', account);
      });

      newConnection.on('BudgetAlert', (alert) => {
        toast.warning(`Budget alert: ${alert.message}`);
        console.log('Budget alert:', alert);
      });

      newConnection.on('ReportGenerated', (report) => {
        toast.success(`Report generated: ${report.name}`);
        console.log('Report generated:', report);
      });

      newConnection.onclose(() => {
        setIsConnected(false);
        setConnection(null);
        console.log('SignalR disconnected');
      });

      newConnection.onreconnected(() => {
        setIsConnected(true);
        console.log('SignalR reconnected');
        
        newConnection.invoke('JoinDashboardGroup').catch((err) => {
          console.error('Error rejoining dashboard group:', err);
        });
      });

      return () => {
        newConnection.stop();
      };
    } else {
      if (connection) {
        connection.stop();
        setConnection(null);
        setIsConnected(false);
      }
    }
  }, [isAuthenticated, user, connection]);

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
