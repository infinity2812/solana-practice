import React from 'react';
import { useQuery } from 'react-query';
import { usePrivateCredit } from '../contexts/PrivateCreditContext';
import { useWallet } from '@solana/wallet-adapter-react';
import { 
  ChartBarIcon, 
  CurrencyDollarIcon, 
  DocumentTextIcon,
  ShieldCheckIcon 
} from '@heroicons/react/24/outline';

export function Dashboard() {
  const { client, isInitialized } = usePrivateCredit();
  const { publicKey } = useWallet();

  const { data: stats, isLoading } = useQuery(
    'dashboard-stats',
    async () => {
      if (!client || !publicKey) return null;
      
      // This would fetch actual data from the orchestrator
      return {
        totalPools: 3,
        totalLoans: 12,
        totalDeposits: 2500000,
        activeAudits: 2,
        navPerToken: 1.05,
        totalValueLocked: 2500000,
      };
    },
    {
      enabled: isInitialized && !!publicKey,
      refetchInterval: 30000, // Refetch every 30 seconds
    }
  );

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const statCards = [
    {
      name: 'Total Pools',
      value: stats?.totalPools || 0,
      icon: ChartBarIcon,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      name: 'Active Loans',
      value: stats?.totalLoans || 0,
      icon: DocumentTextIcon,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      name: 'Total Deposits',
      value: `$${(stats?.totalDeposits || 0).toLocaleString()}`,
      icon: CurrencyDollarIcon,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      name: 'Active Audits',
      value: stats?.activeAudits || 0,
      icon: ShieldCheckIcon,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Overview of your private credit activities
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => (
          <div key={stat.name} className="card">
            <div className="flex items-center">
              <div className={`p-2 rounded-md ${stat.bgColor}`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">{stat.name}</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {stat.value}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* NAV Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Net Asset Value
          </h3>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-500">NAV per Token</p>
              <p className="text-3xl font-bold text-gray-900">
                ${stats?.navPerToken?.toFixed(4) || '0.0000'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Value Locked</p>
              <p className="text-2xl font-semibold text-gray-900">
                ${stats?.totalValueLocked?.toLocaleString() || '0'}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Recent Activity
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-3"></div>
                <span className="text-sm text-gray-600">New deposit received</span>
              </div>
              <span className="text-xs text-gray-500">2m ago</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-blue-400 rounded-full mr-3"></div>
                <span className="text-sm text-gray-600">Loan application approved</span>
              </div>
              <span className="text-xs text-gray-500">1h ago</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-orange-400 rounded-full mr-3"></div>
                <span className="text-sm text-gray-600">Audit request submitted</span>
              </div>
              <span className="text-xs text-gray-500">3h ago</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Quick Actions
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="btn-primary text-center">
            Create New Pool
          </button>
          <button className="btn-secondary text-center">
            Apply for Loan
          </button>
          <button className="btn-secondary text-center">
            Request Audit
          </button>
        </div>
      </div>
    </div>
  );
}
