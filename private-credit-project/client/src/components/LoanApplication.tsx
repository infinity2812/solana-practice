import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { usePrivateCredit } from '../contexts/PrivateCreditContext';
import { useWallet } from '@solana/wallet-adapter-react';
import { DocumentTextIcon, ClockIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export function LoanApplication() {
  const { client, isInitialized } = usePrivateCredit();
  const { publicKey } = useWallet();
  const queryClient = useQueryClient();
  const [showApplicationForm, setShowApplicationForm] = useState(false);

  const { data: applications, isLoading } = useQuery(
    'loan-applications',
    async () => {
      if (!client || !publicKey) return [];
      
      // This would fetch actual applications from the orchestrator
      return [
        {
          id: '1',
          borrower: publicKey.toString(),
          amount: 500000,
          interestRateBps: 500,
          duration: 365,
          status: 'pending',
          createdAt: new Date('2024-01-20'),
          poolId: '1',
        },
        {
          id: '2',
          borrower: publicKey.toString(),
          amount: 250000,
          interestRateBps: 750,
          duration: 180,
          status: 'approved',
          createdAt: new Date('2024-01-18'),
          poolId: '2',
        },
      ];
    },
    {
      enabled: isInitialized && !!publicKey,
      refetchInterval: 30000,
    }
  );

  const applyLoanMutation = useMutation(
    async (applicationData: any) => {
      if (!client || !publicKey) throw new Error('Client not initialized');
      
      // This would submit the loan application via the orchestrator
      const tx = await client.applyForLoan({
        borrowerPubkey: publicKey,
        amount: applicationData.amount,
        interestRateBps: applicationData.interestRateBps,
        duration: applicationData.duration,
        collateralHash: new Uint8Array(32),
        tranche: applicationData.tranche,
        encryptedData: new Uint8Array(0),
      });
      
      return tx;
    },
    {
      onSuccess: () => {
        toast.success('Loan application submitted successfully');
        queryClient.invalidateQueries('loan-applications');
        setShowApplicationForm(false);
      },
      onError: (error: any) => {
        toast.error(`Failed to submit application: ${error.message}`);
      },
    }
  );

  const handleApplyLoan = (formData: any) => {
    applyLoanMutation.mutate(formData);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <ClockIcon className="h-5 w-5 text-yellow-500" />;
      case 'approved':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'rejected':
        return <DocumentTextIcon className="h-5 w-5 text-red-500" />;
      default:
        return <DocumentTextIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="card">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
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
          <h1 className="text-2xl font-bold text-gray-900">Loan Applications</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your loan applications and track their status
          </p>
        </div>
        <button
          onClick={() => setShowApplicationForm(true)}
          className="btn-primary flex items-center"
        >
          <DocumentTextIcon className="h-5 w-5 mr-2" />
          Apply for Loan
        </button>
      </div>

      {/* Applications List */}
      <div className="space-y-4">
        {applications?.map((application) => (
          <div key={application.id} className="card">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {getStatusIcon(application.status)}
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    Loan Application #{application.id}
                  </h3>
                  <p className="text-sm text-gray-500">
                    Pool ID: {application.poolId}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <span className={`status-badge status-${application.status}`}>
                  {application.status}
                </span>
                <div className="text-right">
                  <p className="text-lg font-semibold text-gray-900">
                    ${application.amount.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-500">
                    {application.interestRateBps / 100}% APR
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-500">Duration</p>
                <p className="text-sm font-medium text-gray-900">
                  {application.duration} days
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Interest Rate</p>
                <p className="text-sm font-medium text-gray-900">
                  {application.interestRateBps / 100}%
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Applied</p>
                <p className="text-sm font-medium text-gray-900">
                  {application.createdAt.toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Application Form Modal */}
      {showApplicationForm && (
        <LoanApplicationModal
          onClose={() => setShowApplicationForm(false)}
          onSubmit={handleApplyLoan}
          isLoading={applyLoanMutation.isLoading}
        />
      )}
    </div>
  );
}

interface LoanApplicationModalProps {
  onClose: () => void;
  onSubmit: (data: any) => void;
  isLoading: boolean;
}

function LoanApplicationModal({ onClose, onSubmit, isLoading }: LoanApplicationModalProps) {
  const [formData, setFormData] = useState({
    amount: '',
    interestRateBps: '',
    duration: '',
    tranche: '1',
    collateralDescription: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      amount: parseInt(formData.amount),
      interestRateBps: parseInt(formData.interestRateBps),
      duration: parseInt(formData.duration),
      tranche: parseInt(formData.tranche),
    });
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Apply for Loan
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Loan Amount (USDC)</label>
              <input
                type="number"
                className="input"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
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
              <label className="label">Duration (days)</label>
              <input
                type="number"
                className="input"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">Tranche</label>
              <select
                className="input"
                value={formData.tranche}
                onChange={(e) => setFormData({ ...formData, tranche: e.target.value })}
                required
              >
                <option value="1">Senior (1)</option>
                <option value="2">Mezzanine (2)</option>
                <option value="3">Junior (3)</option>
              </select>
            </div>
            <div>
              <label className="label">Collateral Description</label>
              <textarea
                className="input"
                rows={3}
                value={formData.collateralDescription}
                onChange={(e) => setFormData({ ...formData, collateralDescription: e.target.value })}
                placeholder="Describe the collateral for this loan..."
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
                {isLoading ? 'Submitting...' : 'Submit Application'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
