import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { usePrivateCredit } from '../contexts/PrivateCreditContext';
import { useWallet } from '@solana/wallet-adapter-react';
import { ShieldCheckIcon, DocumentTextIcon, ClockIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export function AuditRequest() {
  const { client, isInitialized } = usePrivateCredit();
  const { publicKey } = useWallet();
  const queryClient = useQueryClient();
  const [showRequestForm, setShowRequestForm] = useState(false);

  const { data: requests, isLoading } = useQuery(
    'audit-requests',
    async () => {
      if (!client || !publicKey) return [];
      
      // This would fetch actual audit requests from the orchestrator
      return [
        {
          id: '1',
          requester: publicKey.toString(),
          loanId: 'abc123',
          auditor: 'auditor1.example.com',
          status: 'pending',
          createdAt: new Date('2024-01-20'),
          legalOrderHash: 'def456',
        },
        {
          id: '2',
          requester: publicKey.toString(),
          loanId: 'xyz789',
          auditor: 'auditor2.example.com',
          status: 'approved',
          createdAt: new Date('2024-01-18'),
          grantedAt: new Date('2024-01-19'),
          legalOrderHash: 'ghi789',
        },
      ];
    },
    {
      enabled: isInitialized && !!publicKey,
      refetchInterval: 30000,
    }
  );

  const requestAuditMutation = useMutation(
    async (requestData: any) => {
      if (!client || !publicKey) throw new Error('Client not initialized');
      
      // This would submit the audit request via the orchestrator
      const tx = await client.requestAudit(
        publicKey,
        new Uint8Array(Buffer.from(requestData.loanId, 'hex')),
        new PublicKey(requestData.auditor),
        new Uint8Array(Buffer.from(requestData.legalOrderHash, 'hex'))
      );
      
      return tx;
    },
    {
      onSuccess: () => {
        toast.success('Audit request submitted successfully');
        queryClient.invalidateQueries('audit-requests');
        setShowRequestForm(false);
      },
      onError: (error: any) => {
        toast.error(`Failed to submit audit request: ${error.message}`);
      },
    }
  );

  const handleRequestAudit = (formData: any) => {
    requestAuditMutation.mutate(formData);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <ClockIcon className="h-5 w-5 text-yellow-500" />;
      case 'approved':
        return <ShieldCheckIcon className="h-5 w-5 text-green-500" />;
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
          <h1 className="text-2xl font-bold text-gray-900">Audit Requests</h1>
          <p className="mt-1 text-sm text-gray-500">
            Request and manage audit access for loan data
          </p>
        </div>
        <button
          onClick={() => setShowRequestForm(true)}
          className="btn-primary flex items-center"
        >
          <ShieldCheckIcon className="h-5 w-5 mr-2" />
          Request Audit
        </button>
      </div>

      {/* Audit Requests List */}
      <div className="space-y-4">
        {requests?.map((request) => (
          <div key={request.id} className="card">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {getStatusIcon(request.status)}
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    Audit Request #{request.id}
                  </h3>
                  <p className="text-sm text-gray-500">
                    Loan ID: {request.loanId}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <span className={`status-badge status-${request.status}`}>
                  {request.status}
                </span>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {request.auditor}
                  </p>
                  <p className="text-sm text-gray-500">
                    {request.createdAt.toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-500">Auditor</p>
                <p className="text-sm font-medium text-gray-900">
                  {request.auditor}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Legal Order Hash</p>
                <p className="text-sm font-medium text-gray-900 font-mono">
                  {request.legalOrderHash}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">
                  {request.status === 'approved' ? 'Granted' : 'Requested'}
                </p>
                <p className="text-sm font-medium text-gray-900">
                  {request.grantedAt 
                    ? request.grantedAt.toLocaleDateString()
                    : request.createdAt.toLocaleDateString()
                  }
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Request Form Modal */}
      {showRequestForm && (
        <AuditRequestModal
          onClose={() => setShowRequestForm(false)}
          onSubmit={handleRequestAudit}
          isLoading={requestAuditMutation.isLoading}
        />
      )}
    </div>
  );
}

interface AuditRequestModalProps {
  onClose: () => void;
  onSubmit: (data: any) => void;
  isLoading: boolean;
}

function AuditRequestModal({ onClose, onSubmit, isLoading }: AuditRequestModalProps) {
  const [formData, setFormData] = useState({
    loanId: '',
    auditor: '',
    legalOrderHash: '',
    reason: '',
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
            Request Audit Access
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Loan ID</label>
              <input
                type="text"
                className="input"
                value={formData.loanId}
                onChange={(e) => setFormData({ ...formData, loanId: e.target.value })}
                placeholder="Enter loan ID in hex format"
                required
              />
            </div>
            <div>
              <label className="label">Auditor Public Key</label>
              <input
                type="text"
                className="input"
                value={formData.auditor}
                onChange={(e) => setFormData({ ...formData, auditor: e.target.value })}
                placeholder="Enter auditor's public key"
                required
              />
            </div>
            <div>
              <label className="label">Legal Order Hash</label>
              <input
                type="text"
                className="input"
                value={formData.legalOrderHash}
                onChange={(e) => setFormData({ ...formData, legalOrderHash: e.target.value })}
                placeholder="Enter legal order hash"
                required
              />
            </div>
            <div>
              <label className="label">Reason for Audit</label>
              <textarea
                className="input"
                rows={3}
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                placeholder="Describe the reason for requesting audit access..."
                required
              />
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <ShieldCheckIcon className="h-5 w-5 text-yellow-400" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">
                    Legal Authorization Required
                  </h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p>
                      Audit access requires proper legal authorization. 
                      Ensure you have the necessary legal order or consent 
                      before submitting this request.
                    </p>
                  </div>
                </div>
              </div>
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
                {isLoading ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
