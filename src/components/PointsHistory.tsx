import React, { useState, useEffect } from 'react';
import { usePoints } from '../context/PointsContext';
import { getPointsTransactions, type PointsTransaction } from '../api/pointsApi';
import { format } from 'date-fns';

// Map transaction types to friendly names
type TransactionTypeMap = Record<string, string>;

const TRANSACTION_TYPE_MAP: TransactionTypeMap = {
  'SUBSCRIPTION_GRANT': 'Plan Bonus',
  'SUBSCRIPTION_RENEWAL': 'Subscription Renewal',
  'GENERATE_IMAGE': 'Avatar Gen',
  'DAILY_LOGIN': 'Daily Login',
  'SYSTEM_REFUND_CLEAR': 'Refund Clear',
  'MANUAL_REFUND_DEDUCTION': 'Refund Deduction',
  'SYSTEM_DEDUCTION': 'System Deduction',
  'MANUAL_DEDUCTION': 'Manual Deduction',
  'OTHER': 'Other'
};

// Get friendly transaction name
const getFriendlyTransactionName = (type: string, description: string): string => {
  return TRANSACTION_TYPE_MAP[type] || description || type || 'Unknown';
};

// PointsHistory component - displays user's points transaction history
const PointsHistory: React.FC = () => {
  const [transactions, setTransactions] = useState<PointsTransaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch transactions on component mount
  useEffect(() => {
    const fetchTransactions = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch latest 50 transactions
        const result = await getPointsTransactions(50, 0);
        setTransactions(result.transactions);
      } catch (err) {
        console.error('Failed to fetch transactions:', err);
        setError('Failed to load transaction history');
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, []);

  // Format date to local readable format
  const formatDate = (dateString: string): string => {
    try {
      return format(new Date(dateString), 'yyyy-MM-dd HH:mm');
    } catch (err) {
      console.error('Failed to format date:', err);
      return dateString;
    }
  };

  // Format amount with appropriate styling
  const renderAmount = (amount: number) => {
    const isPositive = amount > 0;
    
    return (
      <span 
        className={`font-medium transition-all duration-200 ${isPositive ? 'text-green-600' : 'text-red-600'}`}
      >
        {isPositive ? '+' : ''}{amount.toLocaleString()}
      </span>
    );
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex justify-center items-center py-16">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-indigo-500"></div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex justify-center items-center py-16 text-red-500">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-slate-200">
      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
        <h2 className="text-lg font-semibold text-slate-800">Transaction History</h2>
      </div>
      
      {transactions.length === 0 ? (
        // Empty state
        <div className="px-6 py-16 text-center text-slate-500">
          <p>No transaction history yet.</p>
        </div>
      ) : (
        // Transactions table
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Action
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Change
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {transactions.map((transaction) => (
                <tr key={transaction.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                    {formatDate(transaction.created_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-800">
                    {getFriendlyTransactionName(transaction.type, transaction.description)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                    {renderAmount(transaction.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default PointsHistory;