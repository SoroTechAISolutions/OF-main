import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Loader2, Star, Image, RefreshCw } from 'lucide-react';
import api from '../../services/api';
import type { Model } from '../../types';

interface FanvueUser {
  uuid: string;
  handle: string;
  displayName: string;
  nickname: string | null;
  isTopSpender: boolean;
  avatarUrl: string;
}

interface FanvueLastMessage {
  sentAt: string;
  text: string;
  hasMedia: boolean;
  type: string;
  mediaType: string | null;
  uuid: string;
  senderUuid: string;
}

interface FanvueChat {
  createdAt: string;
  lastMessageAt: string | null;
  isRead: boolean;
  unreadMessagesCount: number;
  isMuted: boolean;
  user: FanvueUser;
  lastMessage: FanvueLastMessage | null;
}

interface OnlyFansChat {
  id: string;
  fan_of_id: string;
  fan_username: string;
  fan_display_name: string;
  total_messages: number;
  last_message_at: string | null;
  last_message_preview: string | null;
  created_at: string;
}

type Platform = 'onlyfans' | 'fanvue';

export function ChatsPage() {
  const navigate = useNavigate();
  const [platform, setPlatform] = useState<Platform>('fanvue');

  // Fanvue state
  const [models, setModels] = useState<Model[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [fanvueChats, setFanvueChats] = useState<FanvueChat[]>([]);

  // OnlyFans state
  const [onlyfansChats, setOnlyfansChats] = useState<OnlyFansChat[]>([]);

  // Common state
  const [isLoadingModels, setIsLoadingModels] = useState(true);
  const [isLoadingChats, setIsLoadingChats] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Polling refs
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const POLL_INTERVAL = 10000; // 10 seconds

  // Function definitions (before useEffects)
  const loadModels = useCallback(async () => {
    try {
      const response = await api.getModels();
      if (response.success && response.data) {
        const fanvueModels = response.data.filter(m => m.fanvue_user_uuid);
        setModels(fanvueModels);
        if (fanvueModels.length > 0) {
          setSelectedModelId(fanvueModels[0].id);
        }
      }
    } catch (err) {
      setError('Failed to load models');
    } finally {
      setIsLoadingModels(false);
    }
  }, []);

  const loadFanvueChats = useCallback(async (modelId: string, silent = false) => {
    if (!silent) {
      setIsLoadingChats(true);
    } else {
      setIsPolling(true);
    }
    setError('');
    try {
      const response = await api.getFanvueChats(modelId);
      if (response.success && response.data) {
        setFanvueChats(response.data as unknown as FanvueChat[]);
        setLastUpdated(new Date());
      } else if (!silent) {
        setError(response.error || 'Failed to load Fanvue chats');
      }
    } catch (err) {
      if (!silent) {
        setError('Failed to load Fanvue chats');
      }
    } finally {
      setIsLoadingChats(false);
      setIsPolling(false);
    }
  }, []);

  // Load models on mount
  useEffect(() => {
    loadModels();
  }, [loadModels]);

  // Load chats when platform or model changes
  useEffect(() => {
    if (platform === 'fanvue' && selectedModelId) {
      loadFanvueChats(selectedModelId);
    } else if (platform === 'onlyfans') {
      loadOnlyFansChats();
    }
  }, [platform, selectedModelId, loadFanvueChats]);

  // Polling for auto-refresh
  useEffect(() => {
    // Clear existing interval
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }

    // Only poll for Fanvue when we have a selected model
    if (platform === 'fanvue' && selectedModelId) {
      pollIntervalRef.current = setInterval(() => {
        loadFanvueChats(selectedModelId, true); // Silent refresh
      }, POLL_INTERVAL);
    }

    // Cleanup on unmount or dependency change
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [platform, selectedModelId, loadFanvueChats]);

  const loadOnlyFansChats = async () => {
    setIsLoadingChats(true);
    setError('');
    try {
      const response = await api.getOnlyFansChats();
      if (response.success && response.data) {
        setOnlyfansChats(response.data);
      } else {
        setError(response.error || 'Failed to load OnlyFans chats');
      }
    } catch (err) {
      setError('Failed to load OnlyFans chats');
    } finally {
      setIsLoadingChats(false);
    }
  };

  const formatTimeAgo = (dateString: string | null) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString();
  };

  const truncateText = (text: string | null, maxLength: number = 50) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const openFanvueChat = (chat: FanvueChat) => {
    if (!selectedModelId) return;
    const params = new URLSearchParams({
      name: chat.user.displayName,
      avatar: chat.user.avatarUrl || '',
      topSpender: String(chat.user.isTopSpender),
    });
    // Pass lastMessage for broadcast messages that API doesn't return
    if (chat.lastMessage) {
      params.set('lastMsg', JSON.stringify(chat.lastMessage));
    }
    navigate(`/chats/${selectedModelId}/${chat.user.uuid}?${params.toString()}`);
  };

  const openOnlyFansChat = (chat: OnlyFansChat) => {
    const params = new URLSearchParams({
      name: chat.fan_display_name || chat.fan_username,
      platform: 'onlyfans',
    });
    navigate(`/chats/of/${chat.id}?${params.toString()}`);
  };

  if (isLoadingModels) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Chats</h1>
          <p className="text-dark-400 mt-1">Conversations from all platforms</p>
        </div>
        <div className="flex items-center gap-3">
          {isPolling && (
            <RefreshCw className="w-4 h-4 text-purple-400 animate-spin" />
          )}
          {lastUpdated && (
            <span className="text-xs text-dark-500">
              Updated {formatTimeAgo(lastUpdated.toISOString())}
            </span>
          )}
          <button
            onClick={() => {
              if (platform === 'fanvue' && selectedModelId) {
                loadFanvueChats(selectedModelId);
              } else if (platform === 'onlyfans') {
                loadOnlyFansChats();
              }
            }}
            disabled={isLoadingChats}
            className="p-2 rounded-lg bg-dark-700 hover:bg-dark-600 text-dark-300 hover:text-white transition-colors disabled:opacity-50"
            title="Refresh chats"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingChats ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Platform Tabs */}
      <div className="flex gap-2 border-b border-dark-700 pb-2">
        <button
          onClick={() => setPlatform('fanvue')}
          className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${
            platform === 'fanvue'
              ? 'bg-purple-500/20 text-purple-400 border-b-2 border-purple-400'
              : 'text-dark-400 hover:text-dark-200'
          }`}
        >
          Fanvue
          {fanvueChats.length > 0 && (
            <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-purple-500/30">
              {fanvueChats.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setPlatform('onlyfans')}
          className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${
            platform === 'onlyfans'
              ? 'bg-blue-500/20 text-blue-400 border-b-2 border-blue-400'
              : 'text-dark-400 hover:text-dark-200'
          }`}
        >
          OnlyFans
          {onlyfansChats.length > 0 && (
            <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-blue-500/30">
              {onlyfansChats.length}
            </span>
          )}
        </button>
      </div>

      {/* Model Selector (Fanvue only) */}
      {platform === 'fanvue' && models.length > 0 && (
        <select
          value={selectedModelId || ''}
          onChange={(e) => setSelectedModelId(e.target.value)}
          className="input w-full sm:w-64"
        >
          {models.map((model) => (
            <option key={model.id} value={model.id}>
              {model.display_name}
            </option>
          ))}
        </select>
      )}

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
          {error}
        </div>
      )}

      {/* Chats List */}
      {isLoadingChats ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
        </div>
      ) : platform === 'onlyfans' ? (
        // OnlyFans Chats
        onlyfansChats.length === 0 ? (
          <div className="card text-center py-12">
            <MessageSquare className="w-12 h-12 text-dark-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No OnlyFans Chats Yet</h3>
            <p className="text-dark-400 mb-2">
              Chats will appear here when synced from the Chrome Extension.
            </p>
            <p className="text-sm text-dark-500">
              Make sure the Muse AI extension is installed and you've visited OF chats.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {onlyfansChats.map((chat) => (
              <div
                key={chat.id}
                onClick={() => openOnlyFansChat(chat)}
                className="card p-4 cursor-pointer hover:bg-dark-700/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <span className="text-lg font-medium text-blue-400">
                      {(chat.fan_display_name || chat.fan_username || '?').charAt(0).toUpperCase()}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-white truncate">
                        {chat.fan_display_name || chat.fan_username}
                      </h3>
                      <span className="text-xs text-dark-500 ml-2 shrink-0">
                        {formatTimeAgo(chat.last_message_at)}
                      </span>
                    </div>

                    <p className="text-sm text-dark-400 truncate mt-1">
                      {truncateText(chat.last_message_preview, 60) || 'No preview'}
                    </p>
                  </div>

                  <div className="text-xs text-dark-500 shrink-0">
                    {chat.total_messages} msgs
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        // Fanvue Chats
        fanvueChats.length === 0 ? (
          <div className="card text-center py-12">
            <MessageSquare className="w-12 h-12 text-dark-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No Fanvue Chats</h3>
            <p className="text-dark-400">
              {models.length === 0
                ? 'Connect a model to Fanvue first.'
                : 'No conversations found for this model.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {fanvueChats.map((chat) => (
              <div
                key={chat.user.uuid}
                onClick={() => openFanvueChat(chat)}
                className={`card p-4 cursor-pointer hover:bg-dark-700/50 transition-colors ${
                  !chat.isRead ? 'border-l-4 border-l-purple-500' : ''
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="relative">
                    {chat.user.avatarUrl ? (
                      <img
                        src={chat.user.avatarUrl}
                        alt={chat.user.displayName}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                        <span className="text-lg font-medium text-purple-400">
                          {chat.user.displayName.charAt(0)}
                        </span>
                      </div>
                    )}
                    {chat.user.isTopSpender && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center">
                        <Star className="w-3 h-3 text-yellow-900" fill="currentColor" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className={`font-medium truncate ${!chat.isRead ? 'text-white' : 'text-dark-200'}`}>
                        {chat.user.displayName}
                      </h3>
                      <span className="text-xs text-dark-500 ml-2 shrink-0">
                        {formatTimeAgo(chat.lastMessageAt)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-1">
                      {chat.lastMessage?.hasMedia && (
                        <Image className="w-4 h-4 text-dark-400 shrink-0" />
                      )}
                      <p className={`text-sm truncate ${!chat.isRead ? 'text-dark-300' : 'text-dark-500'}`}>
                        {chat.lastMessage?.type === 'BROADCAST' && (
                          <span className="text-yellow-500 mr-1">📢</span>
                        )}
                        {chat.lastMessage?.type?.startsWith('AUTOMATED') && (
                          <span className="text-blue-400 mr-1">🤖</span>
                        )}
                        {chat.lastMessage?.text
                          ? truncateText(chat.lastMessage.text, 50)
                          : 'No messages yet'}
                      </p>
                    </div>
                  </div>

                  {chat.unreadMessagesCount > 0 && (
                    <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center shrink-0">
                      <span className="text-xs font-medium text-white">
                        {chat.unreadMessagesCount > 9 ? '9+' : chat.unreadMessagesCount}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Summary */}
      {platform === 'onlyfans' && onlyfansChats.length > 0 && (
        <div className="text-center text-sm text-dark-500">
          {onlyfansChats.length} OnlyFans conversations synced
        </div>
      )}
      {platform === 'fanvue' && fanvueChats.length > 0 && (
        <div className="text-center text-sm text-dark-500">
          {fanvueChats.length} Fanvue conversations • {fanvueChats.filter(c => !c.isRead).length} unread
        </div>
      )}
    </div>
  );
}
