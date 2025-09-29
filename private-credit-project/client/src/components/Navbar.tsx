import React from 'react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useWallet } from '@solana/wallet-adapter-react';

export function Navbar() {
  const { connected } = useWallet();

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <h1 className="text-xl font-bold text-gray-900">
                Arcium Private Credit
              </h1>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {connected && (
              <div className="text-sm text-gray-500">
                Connected
              </div>
            )}
            <WalletMultiButton className="!bg-primary-600 hover:!bg-primary-700 !text-white !font-medium !py-2 !px-4 !rounded-md !transition-colors" />
          </div>
        </div>
      </div>
    </nav>
  );
}
