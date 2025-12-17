import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { usePoints } from '../context/PointsContext';

interface PointsExhaustedModalProps {
  isOpen: boolean;
  onClose: () => void;
  remainingPoints: number;
  requiredPoints: number;
  action: string;
}

interface Task {
  id: string;
  title: string;
  description: string;
  points: number;
  isCompleted: boolean;
  isClaimable: boolean;
  action: () => void;
}

const PointsExhaustedModal: React.FC<PointsExhaustedModalProps> = ({ 
  isOpen, 
  onClose, 
  remainingPoints, 
  requiredPoints,
  action
}) => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { refreshBalance } = usePoints();
  const [activeTab, setActiveTab] = useState<'upgrade' | 'earn'>('upgrade');
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set());

  if (!isOpen) return null;

  const handleUpgrade = () => {
    onClose();
    navigate('/pricing?plan=pro');
  };

  // Mock tasks data
  const tasks: Task[] = [
    {
      id: 'daily-checkin',
      title: '每日签到',
      description: '每天登录并签到获取积分',
      points: 10,
      isCompleted: completedTasks.has('daily-checkin'),
      isClaimable: completedTasks.has('daily-checkin'),
      action: () => {
        setCompletedTasks(prev => new Set(prev).add('daily-checkin'));
        alert(`获得 10 积分！`);
        refreshBalance();
      }
    },
    {
      id: 'invite-friend',
      title: '邀请好友',
      description: '成功邀请一位好友注册',
      points: 50,
      isCompleted: completedTasks.has('invite-friend'),
      isClaimable: completedTasks.has('invite-friend'),
      action: () => {
        setCompletedTasks(prev => new Set(prev).add('invite-friend'));
        alert(`获得 50 积分！`);
        refreshBalance();
      }
    },
    {
      id: 'share-story',
      title: '分享作品',
      description: '分享你的作品到社交媒体',
      points: 30,
      isCompleted: completedTasks.has('share-story'),
      isClaimable: completedTasks.has('share-story'),
      action: () => {
        setCompletedTasks(prev => new Set(prev).add('share-story'));
        alert(`获得 30 积分！`);
        refreshBalance();
      }
    },
    {
      id: 'write-review',
      title: '撰写评论',
      description: '为我们的服务撰写评论',
      points: 20,
      isCompleted: completedTasks.has('write-review'),
      isClaimable: completedTasks.has('write-review'),
      action: () => {
        setCompletedTasks(prev => new Set(prev).add('write-review'));
        alert(`获得 20 积分！`);
        refreshBalance();
      }
    },
    {
      id: 'complete-profile',
      title: '完善个人资料',
      description: '完成你的个人资料设置',
      points: 15,
      isCompleted: completedTasks.has('complete-profile'),
      isClaimable: completedTasks.has('complete-profile'),
      action: () => {
        setCompletedTasks(prev => new Set(prev).add('complete-profile'));
        alert(`获得 15 积分！`);
        refreshBalance();
      }
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 transform transition-all duration-300 scale-100">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-5xl mb-4">💎</div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">积分不足</h2>
          <p className="text-slate-600">
            你需要 {requiredPoints} 积分才能{action}，但目前只有 {remainingPoints} 积分
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 mb-6">
          <button
            onClick={() => setActiveTab('upgrade')}
            className={`flex-1 py-3 px-4 text-sm font-medium transition-colors relative ${
              activeTab === 'upgrade'
                ? 'text-indigo-600'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            升级到 Pro
            {activeTab === 'upgrade' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600"></div>
            )}
          </button>
          <button
            onClick={() => setActiveTab('earn')}
            className={`flex-1 py-3 px-4 text-sm font-medium transition-colors relative ${
              activeTab === 'earn'
                ? 'text-indigo-600'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            免费赚取积分
            {activeTab === 'earn' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600"></div>
            )}
          </button>
        </div>

        {/* Tab Content */}
        <div className="mb-6">
          {/* Upgrade Tab */}
          {activeTab === 'upgrade' && (
            <div className="space-y-4">
              <button
                onClick={handleUpgrade}
                className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold text-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                升级到 Pro 版
                <span className="block text-sm text-indigo-100 mt-1">
                  无限积分 · 无限生成 · 高级功能
                </span>
              </button>

              {/* Plan details */}
              <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                <h3 className="font-semibold text-slate-900 mb-2">Pro 版权益</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-slate-700">
                    <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>无限积分，可用于所有AI生成功能</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700">
                    <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>无限文本生成，无字数限制</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700">
                    <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>高级AI助手和风格仿写功能</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700">
                    <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>优先队列，更快的生成速度</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Earn Points Tab */}
          {activeTab === 'earn' && (
            <div className="space-y-3">
              <h3 className="font-semibold text-slate-900 mb-3">完成任务赚取积分</h3>
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className="bg-slate-50 rounded-xl p-4 flex items-center justify-between transition-all hover:shadow-md"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        task.isCompleted
                          ? 'bg-green-100 text-green-600'
                          : 'bg-slate-200 text-slate-500'
                      }`}>
                        {task.isCompleted ? (
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-slate-900">{task.title}</h4>
                          <span className="text-xs font-semibold bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full">
                            +{task.points} 💧
                          </span>
                        </div>
                        <p className="text-sm text-slate-600 mt-1">{task.description}</p>
                      </div>
                    </div>
                    <button
                      onClick={task.action}
                      disabled={task.isCompleted}
                      className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                        task.isCompleted
                          ? 'bg-slate-100 text-slate-500 cursor-not-allowed'
                          : 'bg-indigo-600 text-white hover:bg-indigo-700'
                      }`}
                    >
                      {task.isCompleted ? '已完成' : '立即完成'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Info text */}
        <div className="text-center text-xs text-slate-500 space-y-2">
          <p>积分可用于AI生成、续写和助手功能</p>
          <p className="text-indigo-600 font-medium">
            Pro用户享有无限积分特权
          </p>
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
          aria-label="Close"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default PointsExhaustedModal;
