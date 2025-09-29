import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import { PrivateCreditClient } from '@arcium/private-credit-sdk';

interface PrivateCreditContextType {
  client: PrivateCreditClient | null;
  isInitialized: boolean;
}

const PrivateCreditContext = createContext<PrivateCreditContextType>({
  client: null,
  isInitialized: false,
});

interface PrivateCreditProviderProps {
  children: ReactNode;
}

export function PrivateCreditProvider({ children }: PrivateCreditProviderProps) {
  const { client, isInitialized } = useMemo(() => {
    try {
      // Initialize Private Credit client (API-only)
      const client = new PrivateCreditClient(
        process.env.NEXT_PUBLIC_ORCHESTRATOR_URL || 'http://localhost:3001'
      );

      return {
        client,
        isInitialized: true,
      };
    } catch (error) {
      console.error('Failed to initialize Private Credit client:', error);
      return {
        client: null,
        isInitialized: false,
      };
    }
  }, []);

  return (
    <PrivateCreditContext.Provider
      value={{
        client,
        isInitialized,
      }}
    >
      {children}
    </PrivateCreditContext.Provider>
  );
}

export function usePrivateCredit() {
  const context = useContext(PrivateCreditContext);
  if (!context) {
    throw new Error('usePrivateCredit must be used within a PrivateCreditProvider');
  }
  return context;
}
