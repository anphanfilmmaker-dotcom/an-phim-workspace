import React, { useState, useRef, useEffect } from 'react';
import { AgentItem } from '../types';
import { Send, X, Bot, User, Loader2 } from 'lucide-react';

interface AgentChatModalProps {
  agent: AgentItem;
  onClose: () => void;
  lang: 'en' | 'vi';
}

interface Message {
  id: string;
  sender: 'user' | 'agent';
  text: string;
}

export default function AgentChatModal({ agent, onClose, lang }: AgentChatModalProps) {
  const storageKey = `chat_history_${agent.id}`;

  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // ignore
      }
    }
    return [
      {
        id: 'welcome',
        sender: 'agent',
        text: lang === 'en' 
          ? `Hello, I'm ${agent.name}. How can I assist you today?` 
          : `Xin chào, tôi là ${agent.name}. Tôi có thể giúp gì cho sếp hôm nay?`
      }
    ];
  });
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
    localStorage.setItem(storageKey, JSON.stringify(messages));
  }, [messages, storageKey]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = { id: Date.now().toString(), sender: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('anphim_auth_token')}`
        },
        body: JSON.stringify({
          history: [...messages, userMessage].slice(-20), // Send last 20 messages to keep context window reasonable
          agentName: agent.name,
          agentRole: agent.keyResponsibility || 'Assistant'
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'API error');
      }

      const agentMessage: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'agent',
        text: data.reply
      };
      
      setMessages(prev => [...prev, agentMessage]);
    } catch (error: any) {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        sender: 'agent',
        text: `[Error]: ${error.message}`
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    const initialMsg = [
      {
        id: 'welcome',
        sender: 'agent',
        text: lang === 'en' 
          ? `Hello, I'm ${agent.name}. How can I assist you today?` 
          : `Xin chào, tôi là ${agent.name}. Tôi có thể giúp gì cho sếp hôm nay?`
      }
    ];
    setMessages(initialMsg);
    localStorage.removeItem(storageKey);
  };

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-black/60 backdrop-blur-sm p-4 sm:p-8" onClick={onClose}>
      <div 
        className="bg-[#0E1012] border border-neutral-800 rounded-xl shadow-2xl w-full max-w-2xl flex flex-col h-[75vh] min-h-[450px] animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-800/80 shrink-0">
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${agent.avatarColor || 'bg-emerald-500/10 text-emerald-400'}`}>
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-sans font-bold text-white">{agent.name}</h3>
              <div className="flex items-center space-x-2 mt-0.5">
                <span className="text-[10px] font-mono text-emerald-400">Tokens: {agent.tokenInput || 0}</span>
                <span className="text-[10px] font-mono text-orange-400">Runs: {agent.runCount || 0}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button 
              onClick={handleClearChat}
              className="text-xs font-mono font-bold text-neutral-400 hover:text-white px-2 py-1.5 rounded-lg hover:bg-neutral-800 transition-colors"
              title={lang === "en" ? "Clear Chat" : "Xóa lịch sử"}
            >
              {lang === "en" ? "CLEAR" : "XÓA LỊCH SỬ"}
            </button>
            <button 
              onClick={onClose}
              className="flex items-center space-x-1 text-neutral-400 hover:text-red-400 p-2 rounded-lg hover:bg-red-500/10 transition-colors"
              title="Đóng cửa sổ"
            >
              <span className="text-xs font-mono font-bold hidden sm:inline-block mr-1">ĐÓNG</span>
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Chat History */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 font-sans text-sm">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex space-x-2 max-w-[80%] ${msg.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center shrink-0">
                  {msg.sender === 'user' ? <User className="w-4 h-4 text-neutral-400" /> : <Bot className="w-4 h-4 text-emerald-400" />}
                </div>
                <div className={`p-3 rounded-2xl ${
                  msg.sender === 'user' 
                    ? 'bg-blue-600 text-white rounded-tr-sm' 
                    : 'bg-neutral-800 text-neutral-200 rounded-tl-sm'
                }`}>
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="flex space-x-2 max-w-[80%]">
                <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="p-4 rounded-2xl bg-neutral-800 text-neutral-400 rounded-tl-sm flex items-center space-x-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-xs">{lang === 'en' ? 'Thinking...' : 'Đang nghĩ...'}</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-neutral-800/80 bg-[#0A0C0E] rounded-b-xl">
          <div className="flex items-center space-x-2 relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={lang === 'en' ? 'Type a message...' : 'Nhập tin nhắn...'}
              className="w-full bg-neutral-900 border border-neutral-700/50 rounded-xl px-4 py-3 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 resize-none min-h-[44px] max-h-32"
              rows={1}
            />
            <button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="absolute right-2 p-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center justify-center"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[10px] text-neutral-500 text-center mt-2 font-mono">
            {lang === 'en' ? 'Powered by Google Gemini' : 'Cung cấp sức mạnh bởi Google Gemini'}
          </p>
        </div>
      </div>
    </div>
  );
}
