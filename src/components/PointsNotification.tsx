import React, { useEffect, useState } from 'react';
import { usePoints } from '../context/PointsContext';

interface PointsNotificationProps {
  duration?: number;
}

const PointsNotification: React.FC<PointsNotificationProps> = ({ duration = 3000 }) => {
  const { balance } = usePoints();
  const [show, setShow] = useState(false);
  const [message, setMessage] = useState('');
  const prevBalanceRef = React.useRef(balance);

  // Show notification when balance increases
  useEffect(() => {
    if (balance > prevBalanceRef.current) {
      const pointsEarned = balance - prevBalanceRef.current;
      setMessage(`+${pointsEarned} 积分到账！`);
      setShow(true);
      
      // Hide after duration
      const timer = setTimeout(() => {
        setShow(false);
      }, duration);
      
      return () => clearTimeout(timer);
    }
    prevBalanceRef.current = balance;
  }, [balance, duration]);

  if (!show) return null;

  return (
    <div className="fixed bottom-8 right-8 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-4 rounded-xl shadow-2xl transition-all duration-300 transform translate-y-0 opacity-100 z-50">
      <div className="flex items-center gap-3">
        <div className="text-2xl">💎</div>
        <div>
          <h3 className="font-semibold">积分到账</h3>
          <p className="text-sm opacity-90">{message}</p>
        </div>
      </div>
    </div>
  );
};

export default PointsNotification;