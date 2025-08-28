// components/DealChat.tsx
'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  fetchAllMessages,
  sendMessage,
  subscribeToNewMessages,
  markMessagesAsSeen,
} from '@/lib/supabase/messages';
import { Image as ImageIcon } from 'lucide-react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';

type Message = {
  id: string;
  deal_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  // other optional fields may exist, but we don't rely on them
};

interface DealChatProps {
  dealId: string;
  currentUserId: string;
  otherUser: {
    name: string;
    profile_url: string | null;
  };
}

export default function DealChat({ dealId, currentUserId, otherUser }: DealChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToEnd = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    try {
      // helpful when debugging auth-related empty lists
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) console.warn('[DealChat] session error:', sessionError);
      else console.log('[DealChat] session:', sessionData?.session?.user?.id ?? 'no-user');

      const all = await fetchAllMessages(dealId);
      all.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      setMessages(all as Message[]);
      await markMessagesAsSeen(dealId, currentUserId);
    } catch (err) {
      console.error('[DealChat] fetch error:', err);
    } finally {
      setLoading(false);
      // ensure we scroll after render
      setTimeout(scrollToEnd, 0);
    }
  }, [dealId, currentUserId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // refresh when tab becomes visible again
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible') fetchMessages();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [fetchMessages]);

  // realtime inserts
  useEffect(() => {
    const channel = subscribeToNewMessages(dealId, (msg) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === (msg as Message).id)) return prev;
        const next = [...prev, msg as Message];
        next.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        return next;
      });
      // scroll after DOM update
      setTimeout(scrollToEnd, 0);
    });

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [dealId]);

  useEffect(() => {
    scrollToEnd();
  }, [messages]);

  const isImage = (text: string) => {
    // robust check including query strings (e.g., .../file.png?token=...)
    try {
      const url = new URL(text);
      const path = url.pathname.toLowerCase();
      return /\.(png|jpg|jpeg|gif|webp|bmp|svg)$/.test(path);
    } catch {
      return /\.(png|jpg|jpeg|gif|webp|bmp|svg)(\?.*)?$/i.test(text);
    }
  };

  const handleSend = async () => {
    const content = newMessage.trim();
    if (!content && !file) return;

    // optimistic temp message
    const tempId = `temp-${crypto.randomUUID?.() ?? Date.now()}`;
    const temp: Message = {
      id: tempId,
      deal_id: dealId,
      sender_id: currentUserId,
      content: content || '(uploading...)',
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, temp]);
    setNewMessage('');

    const currentFile = file;
    setFile(null);

    let finalContent = content;

    if (currentFile) {
      // OPTIONAL: quick guard (e.g., 10MB)
      const maxBytes = 10 * 1024 * 1024;
      if (currentFile.size > maxBytes) {
        alert('File too large (max 10MB).');
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        return;
      }

      const fileName = `${Date.now()}-${currentFile.name}`;
      const { error: uploadErr } = await supabase.storage.from('chat-files').upload(fileName, currentFile);
      if (uploadErr) {
        alert('File upload failed');
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        return;
      }
      const { data } = supabase.storage.from('chat-files').getPublicUrl(fileName);
      finalContent = data?.publicUrl || '';
    }

    try {
      const saved = await sendMessage({ dealId, senderId: currentUserId, content: finalContent });
      // swap temp with saved
      setMessages((prev) => prev.map((m) => (m.id === tempId ? (saved as Message) : m)));
    } catch (err) {
      console.error('[DealChat] send error:', err);
      // rollback optimistic message
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    } finally {
      setTimeout(scrollToEnd, 0);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const avatar = otherUser.profile_url || '/profile-default.png';

  const formatRelativeTime = (ts: string) => {
    const date = new Date(ts);
    const diffMs = Date.now() - date.getTime();
    const mins = Math.round(diffMs / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.round(hrs / 24);
    return `${days}d ago`;
  };

  return (
    <div className="w-96 h-[30rem] bg-gray-900 border border-gray-700 rounded-xl flex flex-col overflow-hidden shadow-lg fixed bottom-4 right-4 z-50">
      {/* Header */}
      <div className="p-3 border-b border-gray-700 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Image
            src={avatar}
            alt="avatar"
            width={32}
            height={32}
            className="rounded-full object-cover"
            onError={(e) => ((e.currentTarget as HTMLImageElement).src = '/profile-default.png')}
          />
          <span className="text-sm font-semibold text-gray-300">{otherUser.name || 'Chat'}</span>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="text-sm text-gray-400 hover:text-white"
          aria-label="Close chat"
        >
          ✕
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
        {loading ? (
          <p className="text-gray-500 text-sm">Loading messages...</p>
        ) : messages.length === 0 ? (
          <p className="text-gray-500 text-sm">No messages yet.</p>
        ) : (
          messages.map((msg) => (
            <div key={msg.id}>
              <div
                className={`max-w-[75%] p-2 rounded-md text-sm whitespace-pre-line break-words ${
                  msg.sender_id === currentUserId
                    ? 'ml-auto bg-gray-700 text-white'
                    : 'mr-auto bg-gray-800 text-gray-200'
                }`}
              >
                {isImage(msg.content) ? (
                  <Image
                    src={msg.content}
                    alt="Uploaded"
                    width={250}
                    height={250}
                    className="rounded-md max-w-full h-auto object-contain"
                  />
                ) : (
                  msg.content
                )}
                <div className="text-xs text-gray-400 mt-1 text-right">
                  {formatRelativeTime(msg.created_at)}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Composer */}
      <div className="border-t border-gray-700 p-2 flex flex-col gap-2">
        <div className="flex gap-2">
          <input
            className="flex-1 text-sm bg-gray-800 text-white px-3 py-2 rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
            placeholder="Type a message…"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={onKeyDown}
          />
          <button
            onClick={handleSend}
            className="bg-yellow-700 hover:bg-yellow-600 text-white px-3 py-2 rounded-md text-sm font-semibold"
          >
            Send
          </button>
        </div>
        <div className="flex items-center gap-2">
          <label
            htmlFor="file-upload"
            className="cursor-pointer text-sm text-gray-400 hover:underline flex items-center gap-1"
          >
            <ImageIcon className="w-4 h-4" /> Upload image
          </label>
          <input
            id="file-upload"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
          {file && <span className="text-xs text-gray-300 truncate max-w-[160px]">{file.name}</span>}
        </div>
      </div>
    </div>
  );
}