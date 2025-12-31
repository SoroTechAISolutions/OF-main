import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Loader2, Star, Image, AlertCircle } from 'lucide-react';
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

export function ChatsPage() {
  const navigate = useNavigate();
  const [models, setModels] = useState<Model[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [chats, setChats] = useState<FanvueChat[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(true);
  const [isLoadingChats, setIsLoadingChats] = useState(false);
  const [error, setError] = useState('');

  // Load models on mount
  useEffect(() => {
    loadModels();
  }, []);

  // Load chats when model is selected
  useEffect(() => {
    if (selectedModelId) {
      loadChats(selectedModelId);
    }
  }, [selectedModelId]);

  const loadModels = async () => {
    try {
      const response = await api.getModels();
      if (response.success && response.data) {
        // Filter models that have Fanvue connected
        const fanvueModels = response.data.filter(m =>
          m.platform !== 'onlyfans' && m.fanvue_user_uuid
        );
        setModels(fanvueModels);

        // Auto-select first model if available
        if (fanvueModels.length > 0) {
          setSelectedModelId(fanvueModels[0].id);
        }
      }
    } catch (err) {
      setError('Failed to load models');
    } finally {
      setIsLoadingModels(false);
    }
  };

  const loadChats = async (modelId: string) => {
    setIsLoadingChats(true);
    setError('');

    try {
      const response = await api.getFanvueChats(modelId);
      if (response.success && response.data) {
        setChats(response.data as unknown as FanvueChat[]);
      } else {
        setError(response.error || 'Failed to load chats');
      }
    } catch (err) {
      setError('Failed to load chats. Check Fanvue connection.');
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

  const truncateText = (text: string, maxLength: number = 50) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const selectedModel = models.find(m => m.id === selectedModelId);

  const openChat = (chat: FanvueChat) => {
    if (!selectedModelId) return;
    const params = new URLSearchParams({
      name: chat.user.displayName,
      avatar: chat.user.avatarUrl || '',
      topSpender: String(chat.user.isTopSpender),
      lastMsgType: chat.lastMessage?.type || ''
    });
    navigate(`/chats/${selectedModelId}/${chat.user.uuid}?${params.toString()}`);
  };

  if (isLoadingModels) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  // No Fanvue-connected models
  if (models.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Chats</h1>
          <p className="text-dark-400 mt-1">Fanvue conversations</p>
        </div>

        <div className="card text-center py-12">
          <AlertCircle className="w-12 h-12 text-dark-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No Fanvue Models Connected</h3>
          <p className="text-dark-400 mb-4">
            Connect a model to Fanvue to view and manage chats.
          </p>
          <a href="/models" className="btn btn-primary inline-block">
            Go to Models
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Chats</h1>
          <p className="text-dark-400 mt-1">Fanvue conversations</p>
        </div>

        {/* Model Selector */}
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
      </div>

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
      ) : chats.length === 0 ? (
        <div className="card text-center py-12">
          <MessageSquare className="w-12 h-12 text-dark-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No Chats Yet</h3>
          <p className="text-dark-400">
            {selectedModel?.display_name} has no conversations on Fanvue.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {chats.map((chat) => (
            <div
              key={chat.user.uuid}
              onClick={() => openChat(chat)}
              className={`card p-4 cursor-pointer hover:bg-dark-700/50 transition-colors ${
                !chat.isRead ? 'border-l-4 border-l-primary-500' : ''
              }`}
            >
              <div className="flex items-center gap-4">
                {/* Avatar */}
                <div className="relative">
                  {chat.user.avatarUrl ? (
                    <img
                      src={chat.user.avatarUrl}
                      alt={chat.user.displayName}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-dark-600 flex items-center justify-center">
                      <span className="text-lg font-medium text-dark-300">
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

                {/* Content */}
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
                      {chat.lastMessage?.text
                        ? truncateText(chat.lastMessage.text, 60)
                        : 'No messages yet'}
                    </p>
                  </div>

                  {/* Message type badge */}
                  {chat.lastMessage?.type && chat.lastMessage.type !== 'SINGLE_RECIPIENT' && (
                    <span className="inline-block mt-1 px-2 py-0.5 text-xs rounded bg-dark-600 text-dark-400">
                      {chat.lastMessage.type === 'BROADCAST' ? 'Mass DM' :
                       chat.lastMessage.type === 'AUTOMATED_NEW_FOLLOWER' ? 'Auto-welcome' :
                       chat.lastMessage.type}
                    </span>
                  )}
                </div>

                {/* Unread badge */}
                {chat.unreadMessagesCount > 0 && (
                  <div className="w-6 h-6 rounded-full bg-primary-500 flex items-center justify-center shrink-0">
                    <span className="text-xs font-medium text-white">
                      {chat.unreadMessagesCount > 9 ? '9+' : chat.unreadMessagesCount}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary */}
      {chats.length > 0 && (
        <div className="text-center text-sm text-dark-500">
          {chats.length} conversations • {chats.filter(c => !c.isRead).length} unread
        </div>
      )}
    </div>
  );
}
