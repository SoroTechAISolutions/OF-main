import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, MessageSquare, Zap, TrendingUp, Loader2 } from 'lucide-react';
import api from '../../services/api';

interface DashboardStats {
  activeModels: number;
  aiResponsesToday: number;
  aiResponsesChange: number;
  avgResponseTime: number;
  totalMessages: number;
  usedCount: number;
}

interface Activity {
  id: string;
  model: string;
  action: string;
  fanName: string;
  persona: string;
  time: string;
  responseTime: number;
}

export function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [statsRes, activityRes] = await Promise.all([
        api.getDashboardStats(),
        api.getDashboardActivity(5),
      ]);

      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data);
      }
      if (activityRes.success && activityRes.data) {
        setActivities(activityRes.data);
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  const statCards = [
    {
      name: 'Active Models',
      value: stats?.activeModels || 0,
      icon: Users,
      change: null,
    },
    {
      name: 'AI Responses Today',
      value: stats?.aiResponsesToday || 0,
      icon: MessageSquare,
      change: stats?.aiResponsesChange
        ? `${stats.aiResponsesChange > 0 ? '+' : ''}${stats.aiResponsesChange}% from yesterday`
        : null,
    },
    {
      name: 'Avg Response Time',
      value: `${stats?.avgResponseTime || 0}s`,
      icon: Zap,
      change: null,
    },
    {
      name: 'Total Messages',
      value: stats?.totalMessages || 0,
      icon: TrendingUp,
      change: null,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-dark-400 mt-1">Overview of your agency performance</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => (
          <div key={stat.name} className="card">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-dark-400">{stat.name}</p>
                <p className="text-2xl font-bold text-white mt-1">{stat.value}</p>
                {stat.change && (
                  <p className="text-xs text-primary-400 mt-1">{stat.change}</p>
                )}
              </div>
              <div className="w-10 h-10 rounded-lg bg-primary-500/10 flex items-center justify-center">
                <stat.icon className="w-5 h-5 text-primary-400" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="card">
          <h2 className="text-lg font-semibold text-white mb-4">Recent Activity</h2>
          {activities.length === 0 ? (
            <p className="text-dark-400 text-sm">No recent activity</p>
          ) : (
            <div className="space-y-4">
              {activities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center justify-between py-2 border-b border-dark-700 last:border-0"
                >
                  <div>
                    <p className="text-sm text-dark-100">
                      {activity.model}
                      {activity.fanName && activity.fanName !== 'Unknown' && (
                        <span className="text-dark-400"> → {activity.fanName}</span>
                      )}
                    </p>
                    <p className="text-xs text-dark-400">
                      {activity.action}
                      {activity.persona && activity.persona !== 'default' && (
                        <span className="text-primary-400"> ({activity.persona})</span>
                      )}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-dark-500">{formatTimeAgo(activity.time)}</span>
                    <p className="text-xs text-dark-500">{activity.responseTime}ms</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Links */}
        <div className="card">
          <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link
              to="/models/new"
              className="p-4 bg-dark-700 rounded-lg hover:bg-dark-600 transition-colors text-left"
            >
              <Users className="w-6 h-6 text-primary-400 mb-2" />
              <p className="text-sm font-medium text-white">Add Model</p>
              <p className="text-xs text-dark-400">Create new model profile</p>
            </Link>
            <Link
              to="/chats"
              className="p-4 bg-dark-700 rounded-lg hover:bg-dark-600 transition-colors text-left"
            >
              <MessageSquare className="w-6 h-6 text-green-400 mb-2" />
              <p className="text-sm font-medium text-white">View Chats</p>
              <p className="text-xs text-dark-400">Check Fanvue messages</p>
            </Link>
            <Link
              to="/models"
              className="p-4 bg-dark-700 rounded-lg hover:bg-dark-600 transition-colors text-left"
            >
              <Zap className="w-6 h-6 text-yellow-400 mb-2" />
              <p className="text-sm font-medium text-white">Manage Personas</p>
              <p className="text-xs text-dark-400">Configure AI styles</p>
            </Link>
            <Link
              to="/analytics"
              className="p-4 bg-dark-700 rounded-lg hover:bg-dark-600 transition-colors text-left"
            >
              <TrendingUp className="w-6 h-6 text-purple-400 mb-2" />
              <p className="text-sm font-medium text-white">Analytics</p>
              <p className="text-xs text-dark-400">View detailed stats</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
