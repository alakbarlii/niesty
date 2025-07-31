'use client';

import { useEffect, useRef, useState } from 'react';
import {
  fetchRecentMessages,
  fetchMoreMessages,
  sendMessage,
  subscribeToNewMessages,
} from '@/lib/supabase/messages';
import { Image as ImageIcon } from 'lucide-react';
import Image from 'next/image';
import { createBrowserClient } from '@supabase/ssr';

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface SupabaseMessage {
  id: string;
  deal_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  is_seen?: boolean;
  profiles?: {
    full_name?: string;
    avatar_url?: string;
  };
}

interface DealChatProps {
  dealId: string;
  currentUserId: string;
  otherUser: {
    name: string;
    avatar: string | null;
  };
}

export default function DealChat({
  dealId,
  currentUserId,
  otherUser,
}: DealChatProps) {
  const [messages, setMessages] = useState<SupabaseMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const load = async () => {
      const data = await fetchRecentMessages(dealId);
      setMessages(data);
      setLoading(false);
    };
    load();
  }, [dealId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleScroll = async () => {
    const scrollTop = containerRef.current?.scrollTop || 0;
    if (scrollTop < 50 && !loadingMore && messages.length > 0) {
      setLoadingMore(true);
      const earlier = await fetchMoreMessages(dealId, messages[0].created_at);
      setMessages((prev) => [...earlier, ...prev]);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    const sub = subscribeToNewMessages(dealId, (msg) => {
      if (msg.sender_id !== currentUserId) {
        setMessages((prev) => [...prev, msg]);
      }
    });
    return () => {
      supabase.removeChannel(sub);
    };
  }, [dealId, currentUserId]);

  const handleSend = async () => {
    const content = newMessage.trim();
    if (!content && !file) return;

    let finalContent = content;

    if (file) {
      const fileName = `${Date.now()}-${file.name}`;
      const { error: uploadErr } = await supabase.storage
        .from('chat-files')
        .upload(fileName, file);
      if (uploadErr) return alert('Upload failed');

      const { data } = supabase.storage
        .from('chat-files')
        .getPublicUrl(fileName);
      finalContent = data?.publicUrl || '';
    }

    await sendMessage({
      dealId,
      senderId: currentUserId,
      content: finalContent,
    });

    const tempMsg: SupabaseMessage = {
      id: `${Date.now()}`,
      deal_id: dealId,
      sender_id: currentUserId,
      content: finalContent,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempMsg]);

    setNewMessage('');
    setFile(null);

    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const isImage = (text: string) => /\.(jpg|jpeg|png|gif|webp)$/i.test(text);

  const formatRelativeTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const mins = Math.round(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.round(hrs / 24);
    return `${days}d ago`;
  };

  return (
    <div className="w-96 h-[30rem] bg-gray-900 border border-gray-700 rounded-xl flex flex-col overflow-hidden shadow-lg fixed bottom-4 right-4 z-50">
      <div className="p-3 border-b border-gray-700 flex justify-between items-center">
        <div className="flex items-center gap-2">
          {otherUser.avatar && (
            <Image
              src={otherUser.avatar}
              alt="avatar"
              width={32}
              height={32}
              className="rounded-full"
            />
          )}
          <span className="text-sm font-semibold text-gray-300">
            {otherUser.name || 'Chat'}
          </span>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="text-sm text-gray-400 hover:text-white"
          aria-label="Close chat"
        >
          ✕
        </button>
      </div>

      <div
        className="flex-1 overflow-y-auto px-3 py-2 space-y-2"
        ref={containerRef}
        onScroll={handleScroll}
      >
        {loading ? (
          <p className="text-gray-500 text-sm">Loading messages...</p>
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
                    className="rounded-md max-w-full h-auto"
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

      <div className="border-t border-gray-700 p-2 flex flex-col gap-2">
        <div className="flex gap-2">
          <input
            className="flex-1 text-sm bg-gray-800 text-white px-3 py-2 rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />
          <button
            onClick={handleSend}
            className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded-md text-sm font-semibold"
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
          {file && (
            <span className="text-xs text-gray-300 truncate max-w-[140px]">
              {file.name}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
