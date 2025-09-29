import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { usePrivateCredit } from '../contexts/PrivateCreditContext';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { PlusIcon, CogIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export function PoolManagement() {
  const { client, isInitialized } = usePrivateCredit();
  const { publicKey } = useWallet();
  const queryClient = useQueryClient();
  const [showCreateForm, setShowCreateForm] = useState(false);

  const { data: pools, isLoading } = useQuery(
    'pools',
    async () => {
      if (!client || !publicKey) return [];
      
      // This would fetch actual pools from the orchestrator
      return [
        {
          id: '1',
          name: 'Senior Credit Pool',
          owner: publicKey.toString(),
          totalDeposits: 1000000,
          totalLoans: 5,
          navPerToken: 1.05,
          status: 'active',
          createdAt: new Date('2024-01-15'),
        },
        {
          id: '2',
          name: 'Mezzanine Pool',
          owner: publicKey.toString(),
          totalDeposits: 750000,
          totalLoans: 3,
          navPerToken: 1.02,
          status: 'active',
          createdAt: new Date('2024-01-20'),
        },
      ];
    },
    {
      enabled: isInitialized && !!publicKey,
      refetchInterval: 30000,
    }
  );

  const createPoolMutation = useMutation(
    async (poolData: any) => {
      if (!client || !publicKey) throw new Error('Client not initialized');
      
      // This would create the pool via the orchestrator
      const tx = await client.initializePool(
        publicKey,
        publicKey, // authority
        new PublicKey('11111111111111111111111111111111'), // receipt mint placeholder
        new PublicKey('11111111111111111111111111111111'), // squads address placeholder
        poolData
      );
      
      return tx;
    },
    {
      onSuccess: () => {
        toast.success('Pool created successfully');
        queryClient.invalidateQueries('pools');
        setShowCreateForm(false);
      },
      onError: (error: any) => {
        toast.error(`Failed to create pool: ${error.message}`);
      },
    }
  );

  const handleCreatePool = (formData: any) => {
    createPoolMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="card">
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
              <div className="h-6 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pool Management</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your private credit pools
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="btn-primary flex items-center"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Create Pool
        </button>
      </div>

      {/* Pools List */}
      <div className="space-y-4">
        {pools?.map((pool) => (
          <div key={pool.id} className="card">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">
                    {pool.name}
                  </h3>
                  <span className={`status-badge status-${pool.status}`}>
                    {pool.status}
                  </span>
                </div>
                <div className="mt-2 grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Total Deposits</p>
                    <p className="text-lg font-semibold text-gray-900">
                      ${pool.totalDeposits.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Active Loans</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {pool.totalLoans}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">NAV per Token</p>
                    <p className="text-lg font-semibold text-gray-900">
                      ${pool.navPerToken.toFixed(4)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Created</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {pool.createdAt.toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
              <div className="ml-4 flex space-x-2">
                <button className="btn-secondary flex items-center">
                  <CogIcon className="h-4 w-4 mr-1" />
                  Configure
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create Pool Modal */}
      {showCreateForm && (
        <CreatePoolModal
          onClose={() => setShowCreateForm(false)}
          onSubmit={handleCreatePool}
          isLoading={createPoolMutation.isLoading}
        />
      )}
    </div>
  );
}

interface CreatePoolModalProps {
  onClose: () => void;
  onSubmit: (data: any) => void;
  isLoading: boolean;
}

function CreatePoolModal({ onClose, onSubmit, isLoading }: CreatePoolModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    maxLoanAmount: '',
    minLoanAmount: '',
    interestRateBps: '',
    managementFeeBps: '',
    reserveRatioBps: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Create New Pool
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Pool Name</label>
              <input
                type="text"
                className="input"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">Max Loan Amount (USDC)</label>
              <input
                type="number"
                className="input"
                value={formData.maxLoanAmount}
                onChange={(e) => setFormData({ ...formData, maxLoanAmount: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">Min Loan Amount (USDC)</label>
              <input
                type="number"
                className="input"
                value={formData.minLoanAmount}
                onChange={(e) => setFormData({ ...formData, minLoanAmount: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">Interest Rate (bps)</label>
              <input
                type="number"
                className="input"
                value={formData.interestRateBps}
                onChange={(e) => setFormData({ ...formData, interestRateBps: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">Management Fee (bps)</label>
              <input
                type="number"
                className="input"
                value={formData.managementFeeBps}
                onChange={(e) => setFormData({ ...formData, managementFeeBps: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">Reserve Ratio (bps)</label>
              <input
                type="number"
                className="input"
                value={formData.reserveRatioBps}
                onChange={(e) => setFormData({ ...formData, reserveRatioBps: e.target.value })}
                required
              />
            </div>
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={isLoading}
              >
                {isLoading ? 'Creating...' : 'Create Pool'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
