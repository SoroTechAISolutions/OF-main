import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Link2, Loader2, CheckCircle, ExternalLink } from 'lucide-react';
import api from '../../services/api';

export function FanvueConnectPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const modelId = id || '';

  const [status, setStatus] = useState<'checking' | 'disconnected' | 'connected' | 'connecting'>('checking');
  const [creatorId, setCreatorId] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    checkStatus();
  }, [modelId]);

  const checkStatus = async () => {
    try {
      const response = await api.getFanvueStatus(modelId);
      if (response.success && response.data) {
        if (response.data.connected) {
          setStatus('connected');
          setCreatorId(response.data.creatorId || null);
        } else {
          setStatus('disconnected');
        }
      }
    } catch {
      setStatus('disconnected');
    }
  };

  const handleConnect = async () => {
    setStatus('connecting');
    setError('');

    try {
      const response = await api.startFanvueAuth(modelId);
      if (response.success && response.data?.authUrl) {
        // Open Fanvue OAuth in new window
        window.open(response.data.authUrl, '_blank', 'width=600,height=700');
        // Start polling for connection status
        pollStatus();
      } else {
        setError(response.error || 'Failed to start OAuth flow');
        setStatus('disconnected');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed');
      setStatus('disconnected');
    }
  };

  const pollStatus = () => {
    const interval = setInterval(async () => {
      try {
        const response = await api.getFanvueStatus(modelId);
        if (response.success && response.data?.connected) {
          clearInterval(interval);
          setStatus('connected');
          setCreatorId(response.data.creatorId || null);
        }
      } catch {
        // Continue polling
      }
    }, 3000);

    // Stop polling after 5 minutes
    setTimeout(() => clearInterval(interval), 5 * 60 * 1000);
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect Fanvue?')) return;

    try {
      await api.disconnectFanvue(modelId);
      setStatus('disconnected');
      setCreatorId(null);
    } catch {
      setError('Failed to disconnect');
    }
  };

  return (
    <div className="max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate('/models')}
          className="p-2 hover:bg-dark-800 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-dark-400" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white">Connect Fanvue</h1>
          <p className="text-dark-400 mt-1">Link your Fanvue account for AI-powered messaging</p>
        </div>
      </div>

      <div className="card">
        {error && (
          <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Status display */}
        <div className="text-center py-8">
          {status === 'checking' && (
            <>
              <Loader2 className="w-12 h-12 text-primary-500 animate-spin mx-auto mb-4" />
              <p className="text-dark-300">Checking connection status...</p>
            </>
          )}

          {status === 'disconnected' && (
            <>
              <div className="w-16 h-16 rounded-full bg-dark-700 flex items-center justify-center mx-auto mb-4">
                <Link2 className="w-8 h-8 text-dark-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Not Connected</h3>
              <p className="text-dark-400 mb-6 max-w-md mx-auto">
                Connect your Fanvue account to enable AI-powered message responses and chat management.
              </p>
              <button onClick={handleConnect} className="btn btn-primary inline-flex items-center gap-2">
                <ExternalLink className="w-5 h-5" />
                Connect with Fanvue
              </button>
            </>
          )}

          {status === 'connecting' && (
            <>
              <Loader2 className="w-12 h-12 text-primary-500 animate-spin mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Connecting...</h3>
              <p className="text-dark-400">
                Complete the authorization in the popup window.
                <br />
                This page will update automatically.
              </p>
            </>
          )}

          {status === 'connected' && (
            <>
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Connected!</h3>
              {creatorId && (
                <p className="text-dark-400 mb-2">Creator ID: {creatorId}</p>
              )}
              <p className="text-dark-400 mb-6">
                Your Fanvue account is linked. AI responses are now enabled.
              </p>
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={() => navigate(`/chats?model=${modelId}`)}
                  className="btn btn-primary"
                >
                  View Chats
                </button>
                <button
                  onClick={handleDisconnect}
                  className="btn btn-secondary text-red-400 hover:text-red-300"
                >
                  Disconnect
                </button>
              </div>
            </>
          )}
        </div>

        {/* Info */}
        <div className="mt-8 pt-6 border-t border-dark-700">
          <h4 className="text-sm font-medium text-white mb-3">What happens when you connect:</h4>
          <ul className="space-y-2 text-sm text-dark-400">
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
              AI can respond to fan messages automatically
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
              View and manage chats from your dashboard
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
              Send mass messages to subscribers
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
              Real-time webhooks for new messages
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
