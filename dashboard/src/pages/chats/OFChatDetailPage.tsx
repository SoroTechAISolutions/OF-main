import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Image, AlertCircle, ExternalLink } from 'lucide-react';
import api from '../../services/api';

interface OFMessage {
  id: string;
  direction: string;
  content: string;
  has_media: boolean;
  is_ppv: boolean;
  created_at: string;
}

export function OFChatDetailPage() {
  const { chatId } = useParams<{ chatId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [messages, setMessages] = useState<OFMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [fanName, setFanName] = useState('Fan');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Get fan name from URL params
  useEffect(() => {
    const name = searchParams.get('name');
    if (name) {
      setFanName(decodeURIComponent(name));
    }
  }, [searchParams]);

  // Load messages
  useEffect(() => {
    if (chatId) {
      loadMessages();
    }
  }, [chatId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadMessages = async () => {
    if (!chatId) return;

    setIsLoading(true);
    setError('');

    try {
      const response = await api.getOnlyFansMessages(chatId);
      if (response.success && response.data) {
        // Messages come oldest first for chat display
        setMessages(response.data);
      } else {
        setError(response.error || 'Failed to load messages');
      }
    } catch (err) {
      setError('Failed to load messages');
    } finally {
      setIsLoading(false);
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

  const isFromCreator = (message: OFMessage) => {
    return message.direction === 'outgoing' || message.direction === 'creator_to_fan';
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] lg:h-[calc(100vh-6rem)]">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-dark-700">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/chats')}
            className="p-2 hover:bg-dark-700 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-dark-300" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
              <span className="text-sm font-medium text-blue-400">
                {fanName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h2 className="font-medium text-white">{fanName}</h2>
              <p className="text-xs text-blue-400">OnlyFans Chat</p>
            </div>
          </div>
        </div>

        <a
          href="https://onlyfans.com/my/chats"
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-secondary text-sm flex items-center gap-2"
        >
          <ExternalLink className="w-4 h-4" />
          Open in OF
        </a>
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
            No messages synced yet. Open this chat in OnlyFans with the extension active.
          </div>
        ) : (
          <>
            {messages.map((message) => {
              const fromCreator = isFromCreator(message);
              return (
                <div
                  key={message.id}
                  className={`flex ${fromCreator ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                      fromCreator
                        ? 'bg-blue-500 text-white rounded-br-md'
                        : 'bg-dark-700 text-dark-100 rounded-bl-md'
                    }`}
                  >
                    {/* Media indicator */}
                    {message.has_media && (
                      <div className={`flex items-center gap-2 p-3 rounded-lg mb-2 ${
                        fromCreator ? 'bg-blue-600/30' : 'bg-dark-600/50'
                      }`}>
                        <Image className="w-5 h-5 text-dark-300" />
                        <span className="text-sm text-dark-200">
                          {message.is_ppv ? '💰 PPV Content' : '📷 Media attached'}
                        </span>
                      </div>
                    )}

                    {/* Text */}
                    {message.content && (
                      <p className="whitespace-pre-wrap break-words">{message.content}</p>
                    )}

                    {/* Time */}
                    <p className={`text-xs mt-1 ${
                      fromCreator ? 'text-blue-200' : 'text-dark-500'
                    }`}>
                      {formatTime(message.created_at)}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Reply Footer */}
      <div className="pt-4 border-t border-dark-700">
        <a
          href="https://onlyfans.com/my/chats"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full btn btn-primary flex items-center justify-center gap-2"
        >
          <ExternalLink className="w-5 h-5" />
          Reply in OnlyFans
        </a>
      </div>
    </div>
  );
}
