import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Dashboard } from '../components/Dashboard';
import { PoolManagement } from '../components/PoolManagement';
import { LoanApplication } from '../components/LoanApplication';
import { AuditRequest } from '../components/AuditRequest';
import { Navbar } from '../components/Navbar';
import { Sidebar } from '../components/Sidebar';

export default function Home() {
  const { connected } = useWallet();
  const [activeTab, setActiveTab] = useState('dashboard');

  if (!connected) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900">
              Arcium Private Credit
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              Private Credit on-chain, privately
            </p>
          </div>
          <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
            <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Connect Your Wallet
                </h2>
                <p className="text-gray-600 mb-6">
                  Connect your Solana wallet to access the private credit platform
                </p>
                <WalletMultiButton className="!bg-primary-600 hover:!bg-primary-700 !text-white !font-medium !py-2 !px-4 !rounded-md !transition-colors" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        <main className="flex-1 p-6">
          {activeTab === 'dashboard' && <Dashboard />}
          {activeTab === 'pools' && <PoolManagement />}
          {activeTab === 'loans' && <LoanApplication />}
          {activeTab === 'audit' && <AuditRequest />}
        </main>
      </div>
    </div>
  );
}
