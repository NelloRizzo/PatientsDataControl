import { useState, useEffect } from 'react';
import { getMyContractStatus } from '../api/contracts';
import type { ContractStatus } from '../api/contracts';

export function DoctorContractStatus() {
  const [contract, setContract] = useState<ContractStatus | null | undefined>(undefined);

  useEffect(() => {
    getMyContractStatus().then(setContract);
  }, []);

  if (contract === undefined) return <p className="text-gray-500 text-sm">Loading contract...</p>;
  if (!contract) return <p className="text-gray-500 text-sm">No active contract</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">My Contract</h1>
      <div className="bg-white rounded-lg shadow-sm border p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Fee Type</p>
            <p className="font-medium capitalize">{contract.feeType === 'fixed' ? 'Fixed' : contract.feeType === 'monthly' ? 'Monthly' : 'Per Patient'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Fee</p>
            <p className="font-medium">{contract.fee} {contract.currency}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Max Patients</p>
            <p className="font-medium">{contract.maxPatients}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Period</p>
            <p className="font-medium">{contract.startDate} → {contract.endDate}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Last Invoice</p>
            <p className="font-medium">{contract.lastInvoiceDate || 'Never'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Consumed Since Last Invoice</p>
            <p className="font-medium text-blue-600">{contract.consumedSinceInvoice} {contract.currency}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
