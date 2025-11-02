'use client';

import { useState, useRef, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, ThumbsUp, ThumbsDown, Copy, Send, Check } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AIChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuestion?: string;
}

export default function AIChatPanel({ isOpen, onClose, initialQuestion }: AIChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [likedMessages, setLikedMessages] = useState<Set<string>>(new Set());
  const [dislikedMessages, setDislikedMessages] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // 自动滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 初始化时发送第一个问题
  useEffect(() => {
    if (isOpen && initialQuestion && messages.length === 0) {
      handleSendMessage(initialQuestion);
    }
  }, [isOpen, initialQuestion]);

  // 发送消息
  const handleSendMessage = async (content?: string) => {
    const messageText = content || inputValue.trim();
    if (!messageText) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: messageText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    // TODO: 这里接入真实的 AI API
    // 模拟 AI 回复
    setTimeout(() => {
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: `这是一个模拟的 AI 回复。您的问题是："${messageText}"。\n\n在真实环境中，这里会调用 AI API 来生成回答。回答会包含对选中文字的解释、历史背景、文学价值等内容。`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 1000);
  };

  // 复制消息
  const handleCopyMessage = async (messageId: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  // 点赞
  const handleLike = (messageId: string) => {
    setLikedMessages((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
        // 取消踩
        setDislikedMessages((prev) => {
          const newDisliked = new Set(prev);
          newDisliked.delete(messageId);
          return newDisliked;
        });
      }
      return newSet;
    });
  };

  // 踩
  const handleDislike = (messageId: string) => {
    setDislikedMessages((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
        // 取消赞
        setLikedMessages((prev) => {
          const newLiked = new Set(prev);
          newLiked.delete(messageId);
          return newLiked;
        });
      }
      return newSet;
    });
  };

  if (!isOpen) return null;

  return (
    <div
      className={`classic-card h-full flex flex-col transition-all duration-300 ${
        isMinimized ? 'w-16' : 'w-full'
      }`}
    >
      {/* 头部 */}
      <div className="flex items-center justify-between pb-3 border-b-2 border-border flex-shrink-0">
        {!isMinimized && (
          <h3 className="text-base font-bold text-foreground">AI 助手</h3>
        )}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1.5 rounded hover:bg-muted transition-colors"
            title={isMinimized ? '展开' : '最小化'}
          >
            {isMinimized ? (
              <ChevronLeft className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-muted transition-colors"
            title="关闭"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* 聊天内容区域 */}
      {!isMinimized && (
        <>
          <div
            ref={chatContainerRef}
            className="flex-1 overflow-y-auto py-4 space-y-4"
            style={{ minHeight: 0 }}
          >
            {messages.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <p className="text-sm">选中文字后点击"问AI"开始对话</p>
              </div>
            ) : (
              <>
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-[85%] rounded-lg px-4 py-3 ${
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-foreground'
                      }`}
                    >
                      <div className="text-sm whitespace-pre-wrap break-words">
                        {message.content}
                      </div>

                      {/* AI 回复的操作按钮 */}
                      {message.role === 'assistant' && (
                        <div className="flex items-center gap-2 mt-3 pt-2 border-t border-border/30">
                          <button
                            onClick={() => handleCopyMessage(message.id, message.content)}
                            className="p-1 rounded hover:bg-background/50 transition-colors"
                            title={copiedMessageId === message.id ? '已复制' : '复制'}
                          >
                            {copiedMessageId === message.id ? (
                              <Check className="h-3.5 w-3.5 text-green-600" />
                            ) : (
                              <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                            )}
                          </button>

                          <button
                            onClick={() => handleLike(message.id)}
                            className={`p-1 rounded hover:bg-background/50 transition-colors ${
                              likedMessages.has(message.id) ? 'text-primary' : 'text-muted-foreground'
                            }`}
                            title="赞"
                          >
                            <ThumbsUp className="h-3.5 w-3.5" />
                          </button>

                          <button
                            onClick={() => handleDislike(message.id)}
                            className={`p-1 rounded hover:bg-background/50 transition-colors ${
                              dislikedMessages.has(message.id) ? 'text-red-600' : 'text-muted-foreground'
                            }`}
                            title="踩"
                          >
                            <ThumbsDown className="h-3.5 w-3.5" />
                          </button>

                          <span className="ml-auto text-xs text-muted-foreground">
                            {message.timestamp.toLocaleTimeString('zh-CN', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      )}

                      {/* 用户消息的时间戳 */}
                      {message.role === 'user' && (
                        <div className="text-xs text-primary-foreground/70 mt-1 text-right">
                          {message.timestamp.toLocaleTimeString('zh-CN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* 加载指示器 */}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-lg px-4 py-3">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <div className="flex gap-1">
                          <span className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                        <span className="text-sm">AI 思考中...</span>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* 输入区域 */}
          <div className="pt-3 border-t-2 border-border flex-shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="继续提问..."
                className="flex-1 px-3 py-2 text-sm border-2 border-border rounded-md focus:outline-none focus:border-primary"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !inputValue.trim()}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Send className="h-4 w-4" />
                <span className="text-sm">发送</span>
              </button>
            </form>
          </div>
        </>
      )}

      {/* 最小化状态 */}
      {isMinimized && (
        <div className="flex-1 flex items-center justify-center">
          <div className="writing-mode-vertical-rl text-sm text-muted-foreground">
            AI助手
          </div>
        </div>
      )}
    </div>
  );
}
