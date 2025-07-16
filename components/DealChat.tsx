'use client';

import { useEffect, useRef, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { MessageSquare, Image as ImageIcon } from 'lucide-react';
import Image from 'next/image';

interface DealChatProps {
  dealId: string;
  currentUserId: string;
}

interface SupabaseMessage {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  is_seen?: boolean;
  profiles?: {
    full_name?: string;
  };
}

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  is_seen?: boolean;
  sender_name?: string;
}

export default function DealChat({ dealId, currentUserId }: DealChatProps) {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const loadMessages = async () => {
      const { data, error } = await supabase
        .from('deal_messages')
        .select('*, profiles!deal_messages_sender_id_fkey(full_name)')
        .eq('deal_id', dealId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading messages:', error);
      } else if (data) {
        const mapped: Message[] = data.map((msg: SupabaseMessage) => ({
          id: msg.id,
          content: msg.content,
          sender_id: msg.sender_id,
          created_at: msg.created_at,
          is_seen: msg.is_seen,
          sender_name: msg.profiles?.full_name || 'Unknown',
        }));

        setMessages(mapped);

        const unseen = mapped.filter(
          (msg) => !msg.is_seen && msg.sender_id !== currentUserId
        );
        if (unseen.length > 0) {
          const ids = unseen.map((msg) => msg.id);
          await supabase
            .from('deal_messages')
            .update({ is_seen: true })
            .in('id', ids);
        }
      }
      setLoading(false);
    };

    loadMessages();
  }, [dealId, supabase, currentUserId]);

  useEffect(() => {
    const channel = supabase
      .channel(`realtime-deal-${dealId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'deal_messages',
          filter: `deal_id=eq.${dealId}`,
        },
        (payload) => {
          const msg = payload.new as Message;
          setMessages((prev) => [...prev, msg]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [dealId, supabase]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    const content = newMessage.trim();
    if (!content && !file) return;

    let uploadedUrl = '';
    if (file) {
      const filename = `${Date.now()}-${file.name}`;
      const { error } = await supabase.storage
        .from('chat-files')
        .upload(filename, file);

      if (error) {
        console.error('Upload error:', error);
        return;
      }

      const { data: urlData } = supabase.storage
        .from('chat-files')
        .getPublicUrl(filename);

      uploadedUrl = urlData?.publicUrl || '';
    }

    const { error } = await supabase.from('deal_messages').insert({
      deal_id: dealId,
      sender_id: currentUserId,
      content: uploadedUrl || content,
    });

    if (error) {
      console.error('Error sending message:', error);
      return;
    }

    setNewMessage('');
    setFile(null);
  };

  const formatRelativeTime = (timestamp: string) => {
    const now = new Date();
    const date = new Date(timestamp);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.round(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.round(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.round(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const isImage = (url: string) => {
    return url.match(/\.(jpeg|jpg|gif|png|webp)$/i);
  };

  return (
    <div className="absolute bottom-4 right-4 z-50">
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="bg-gray-800 hover:bg-gray-700 p-2 rounded-full shadow text-white"
          aria-label="Open chat"
        >
          <MessageSquare className="w-5 h-5" />
        </button>
      )}

      {open && (
        <div className="w-80 h-96 bg-gray-900 border border-gray-700 rounded-xl flex flex-col overflow-hidden shadow-lg">
          <div className="p-3 border-b border-gray-700 flex justify-between items-center">
            <span className="text-sm font-semibold text-gray-300">Live Chat</span>
            <button
              onClick={() => setOpen(false)}
              className="text-sm text-gray-400 hover:text-white"
              aria-label="Close chat"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
            {loading ? (
              <p className="text-gray-500 text-sm">Loading messages...</p>
            ) : (
              messages.map((msg, i) => (
                <div key={msg.id}>
                  {msg.sender_id !== currentUserId && (
                    <p className="text-xs text-gray-400 mb-0.5">
                      {msg.sender_name}
                    </p>
                  )}
                  <div
                    className={`max-w-[75%] p-2 rounded-md text-sm whitespace-pre-line break-words ${
                      msg.sender_id === currentUserId
                        ? 'ml-auto bg-blue-600 text-white'
                        : 'mr-auto bg-gray-700 text-gray-200'
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
                      {msg.sender_id === currentUserId &&
                        i === messages.length - 1 &&
                        msg.is_seen && <span className="ml-1">✓</span>}
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
                className="flex-1 text-sm bg-gray-800 text-white px-3 py-2 rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              />
              <button
                onClick={sendMessage}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-md text-sm font-semibold"
              >
                Send
              </button>
            </div>
            <div className="flex items-center gap-2">
              <label
                htmlFor="file-upload"
                className="cursor-pointer text-sm text-blue-400 hover:underline flex items-center gap-1"
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
      )}
    </div>
  );
}
