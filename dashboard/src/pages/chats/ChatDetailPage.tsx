import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Send, Loader2, Image, Star, AlertCircle, Lock } from 'lucide-react';
import api from '../../services/api';

interface FanvueMessage {
  uuid: string;
  text: string;           // Fanvue uses 'text' not 'content'
  sentAt: string;         // Fanvue uses 'sentAt' not 'createdAt'
  sender: {               // Nested sender object from Fanvue
    uuid: string;
    handle: string;
  };
  recipient: {
    uuid: string;
    handle: string;
  };
  hasMedia: boolean;
  mediaType: string | null;
  type: string;           // SINGLE_RECIPIENT, BROADCAST, etc.
}

interface FanInfo {
  uuid: string;
  displayName: string;
  avatarUrl: string;
  isTopSpender: boolean;
}

export function ChatDetailPage() {
  const { modelId, fanUserUuid } = useParams<{ modelId: string; fanUserUuid: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [messages, setMessages] = useState<FanvueMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [fanInfo, setFanInfo] = useState<FanInfo | null>(null);
  const [creatorUuid, setCreatorUuid] = useState<string | null>(null);
  const [canReply, setCanReply] = useState(true);
  const [replyBlockReason, setReplyBlockReason] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Get fan info from URL params
  useEffect(() => {
    const name = searchParams.get('name');
    const avatar = searchParams.get('avatar');
    const topSpender = searchParams.get('topSpender') === 'true';

    if (name && fanUserUuid) {
      setFanInfo({
        uuid: fanUserUuid,
        displayName: decodeURIComponent(name),
        avatarUrl: avatar ? decodeURIComponent(avatar) : '',
        isTopSpender: topSpender
      });
    }
  }, [searchParams, fanUserUuid]);

  // Check if chat is locked (from previous failed attempt)
  useEffect(() => {
    if (fanUserUuid) {
      const lockedChats = JSON.parse(localStorage.getItem('lockedChats') || '{}');
      if (lockedChats[fanUserUuid]) {
        setCanReply(false);
        setReplyBlockReason('Subscribe to send messages');
      }
    }
  }, [fanUserUuid]);

  // Load messages
  useEffect(() => {
    if (modelId && fanUserUuid) {
      loadMessages();
    }
  }, [modelId, fanUserUuid]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadMessages = async () => {
    if (!modelId || !fanUserUuid) return;

    setIsLoading(true);
    setError('');

    try {
      // First get model info to know creator UUID
      const modelRes = await api.getModel(modelId);
      // API returns { model: {...} } so we need to access .model
      const modelData = (modelRes.data as any)?.model || modelRes.data;
      const newCreatorUuid = modelData?.fanvue_user_uuid || null;
      if (modelRes.success && newCreatorUuid) {
        setCreatorUuid(newCreatorUuid);
      }

      const response = await api.getFanvueMessages(modelId, fanUserUuid);
      if (response.success && response.data) {
        // Messages come newest first, reverse for chat display
        setMessages([...(response.data.messages as unknown as FanvueMessage[])].reverse());
      } else {
        setError(response.error || 'Failed to load messages');
      }
    } catch (err) {
      setError('Failed to load messages');
    } finally {
      setIsLoading(false);
    }
  };

  // Check if message is from the creator (model) or the fan
  const isFromCreator = (message: FanvueMessage) => {
    return creatorUuid ? message.sender?.uuid === creatorUuid : false;
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !modelId || !fanUserUuid || isSending) return;

    const messageText = newMessage.trim();
    setNewMessage('');
    setIsSending(true);

    // Optimistic update
    const tempMessage: FanvueMessage = {
      uuid: `temp-${Date.now()}`,
      text: messageText,
      sender: { uuid: creatorUuid || 'creator', handle: '' },
      recipient: { uuid: fanUserUuid || '', handle: '' },
      sentAt: new Date().toISOString(),
      hasMedia: false,
      mediaType: null,
      type: 'SINGLE_RECIPIENT'
    };
    setMessages(prev => [...prev, tempMessage]);

    try {
      const response = await api.sendFanvueMessage(modelId, fanUserUuid, messageText);
      if (!response.success) {
        // Remove optimistic message on error
        setMessages(prev => prev.filter(m => m.uuid !== tempMessage.uuid));

        // Check if this is a "can't reply" error
        const errorMsg = response.error || 'Failed to send message';
        if (errorMsg.includes('Invalid user') || errorMsg.includes('cannot send') || errorMsg.includes('Fanvue API error')) {
          setCanReply(false);
          setReplyBlockReason('Subscribe to send messages');
          // Save to localStorage so we remember this chat is locked
          if (fanUserUuid) {
            const lockedChats = JSON.parse(localStorage.getItem('lockedChats') || '{}');
            lockedChats[fanUserUuid] = true;
            localStorage.setItem('lockedChats', JSON.stringify(lockedChats));
          }
        } else {
          setError(errorMsg);
          setNewMessage(messageText); // Restore message
        }
      }
    } catch (err) {
      setMessages(prev => prev.filter(m => m.uuid !== tempMessage.uuid));
      setError('Failed to send message');
      setNewMessage(messageText);
    } finally {
      setIsSending(false);
      if (canReply) {
        inputRef.current?.focus();
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] lg:h-[calc(100vh-6rem)]">
      {/* Header */}
      <div className="flex items-center gap-4 pb-4 border-b border-dark-700">
        <button
          onClick={() => navigate('/chats')}
          className="p-2 hover:bg-dark-700 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-dark-300" />
        </button>

        {fanInfo && (
          <div className="flex items-center gap-3">
            <div className="relative">
              {fanInfo.avatarUrl ? (
                <img
                  src={fanInfo.avatarUrl}
                  alt={fanInfo.displayName}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-dark-600 flex items-center justify-center">
                  <span className="text-sm font-medium text-dark-300">
                    {fanInfo.displayName.charAt(0)}
                  </span>
                </div>
              )}
              {fanInfo.isTopSpender && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center">
                  <Star className="w-2.5 h-2.5 text-yellow-900" fill="currentColor" />
                </div>
              )}
            </div>
            <div>
              <h2 className="font-medium text-white">{fanInfo.displayName}</h2>
              <p className="text-xs text-dark-400">Fanvue Chat</p>
            </div>
          </div>
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
            <p className="text-red-400 mb-4">{error}</p>
            <button onClick={loadMessages} className="btn btn-primary">
              Retry
            </button>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-dark-400">
            No messages yet. Start the conversation!
          </div>
        ) : (
          <>
            {messages.map((message) => {
              const fromCreator = isFromCreator(message);
              return (
              <div
                key={message.uuid}
                className={`flex ${fromCreator ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                    fromCreator
                      ? 'bg-primary-500 text-white rounded-br-md'
                      : 'bg-dark-700 text-dark-100 rounded-bl-md'
                  }`}
                >
                  {/* Media indicator */}
                  {message.hasMedia && (
                    <div className={`flex items-center gap-2 p-3 rounded-lg mb-2 ${
                      fromCreator ? 'bg-primary-600/30' : 'bg-dark-600/50'
                    }`}>
                      <Image className="w-5 h-5 text-dark-300" />
                      <span className="text-sm text-dark-200">
                        {message.mediaType === 'image' ? '📷 Image attached' :
                         message.mediaType === 'video' ? '🎬 Video attached' :
                         '📎 Media attached'}
                      </span>
                    </div>
                  )}

                  {/* Text */}
                  <p className="whitespace-pre-wrap break-words">{message.text}</p>

                  {/* Time */}
                  <p className={`text-xs mt-1 ${
                    fromCreator ? 'text-primary-200' : 'text-dark-500'
                  }`}>
                    {formatTime(message.sentAt)}
                  </p>
                </div>
              </div>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Message Input */}
      <div className="pt-4 border-t border-dark-700">
        {canReply ? (
          <>
            <div className="flex gap-3">
              <textarea
                ref={inputRef}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message..."
                rows={1}
                className="input flex-1 resize-none min-h-[44px] max-h-32"
                disabled={isSending}
              />
              <button
                onClick={handleSend}
                disabled={!newMessage.trim() || isSending}
                className="btn btn-primary px-4 h-[44px] disabled:opacity-50"
              >
                {isSending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </div>
            <p className="text-xs text-dark-500 mt-2">
              Press Enter to send, Shift+Enter for new line
            </p>
          </>
        ) : (
          <div className="flex items-center gap-3 p-3 bg-dark-800 rounded-lg">
            <Lock className="w-5 h-5 text-dark-500" />
            <p className="text-dark-400 text-sm">
              {replyBlockReason || 'Replies are disabled for this chat'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
