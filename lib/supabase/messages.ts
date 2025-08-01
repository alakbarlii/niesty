import { createBrowserClient } from '@supabase/ssr';

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export interface SupabaseMessage {
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

// FETCH ALL MESSAGES
export async function fetchAllMessages(dealId: string): Promise<SupabaseMessage[]> {
  console.log('[fetchAllMessages] START', { dealId });
  const { data, error } = await supabase
    .from('deal_messages')
    .select('*, profiles!deal_messages_sender_id_fkey(full_name, avatar_url)')
    .eq('deal_id', dealId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[fetchAllMessages] ERROR:', error);
    return [];
  }

  console.log('[fetchAllMessages] RESULT:', data);
  return data || [];
}

// MARK AS SEEN
export async function markMessagesAsSeen(dealId: string, userId: string) {
  console.log('[markMessagesAsSeen] START', { dealId, userId });
  const { error } = await supabase
    .from('deal_messages')
    .update({ is_seen: true })
    .eq('deal_id', dealId)
    .neq('sender_id', userId)
    .is('is_seen', false);

  if (error) {
    console.error('[markMessagesAsSeen] ERROR:', error);
  } else {
    console.log('[markMessagesAsSeen] SUCCESS');
  }
}

// SEND MESSAGE
export async function sendMessage({ dealId, senderId, content }: { dealId: string; senderId: string; content: string }) {
  console.log('[sendMessage] PAYLOAD:', { dealId, senderId, content });
  const { data, error } = await supabase
    .from('deal_messages')
    .insert({
      deal_id: dealId,
      sender_id: senderId,
      content,
    })
    .select()
    .single();

  if (error) {
    console.error('[sendMessage] ERROR:', error);
    throw error;
  }

  console.log('[sendMessage] RESULT:', data);
  return data as SupabaseMessage;
}

// SUBSCRIBE TO NEW MESSAGES
export function subscribeToNewMessages(dealId: string, onNew: (msg: SupabaseMessage) => void) {
  console.log('[subscribeToNewMessages] START', { dealId });
  const channel = supabase
    .channel(`chat-${dealId}-${Date.now()}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'deal_messages',
        filter: `deal_id=eq.${dealId}`,
      },
      async (payload) => {
        console.log('[subscribeToNewMessages] PAYLOAD RECEIVED:', payload);
        try {
          const { data, error } = await supabase
            .from('deal_messages')
            .select('*, profiles!deal_messages_sender_id_fkey(full_name, avatar_url)')
            .eq('id', payload.new.id)
            .single();

          if (error) {
            console.error('[subscribeToNewMessages] FETCH ERROR:', error);
            return;
          }

          if (data) {
            console.log('[subscribeToNewMessages] FINAL MESSAGE DATA:', data);
            onNew(data);
          }
        } catch (err) {
          console.error('[subscribeToNewMessages] PROCESSING FAILED:', err);
        }
      }
    )
    .subscribe();

  return channel;
}
