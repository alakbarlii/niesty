'use client';

import { useEffect, useRef, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { MessageSquare } from 'lucide-react';

interface DealChatProps {
  dealId: string;
  currentUserId: string;
}

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
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
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const loadMessages = async () => {
      const { data, error } = await supabase
        .from('deal_messages')
        .select('*')
        .eq('deal_id', dealId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading messages:', error);
      } else if (data) {
        setMessages(data);
      }
      setLoading(false);
    };

    loadMessages();
  }, [dealId, supabase]);

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
          setMessages((prev) => [...prev, payload.new as Message]);
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
    if (!content) return;

    const { error } = await supabase.from('deal_messages').insert({
      deal_id: dealId,
      sender_id: currentUserId,
      content,
    });

    if (error) {
      console.error('Error sending message:', error);
      return;
    }

    setNewMessage('');
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
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`max-w-[75%] p-2 rounded-md text-sm whitespace-pre-line break-words ${
                    msg.sender_id === currentUserId
                      ? 'ml-auto bg-blue-600 text-white'
                      : 'mr-auto bg-gray-700 text-gray-200'
                  }`}
                >
                  {msg.content}
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="border-t border-gray-700 p-2 flex gap-2">
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
        </div>
      )}
    </div>
  );
}
