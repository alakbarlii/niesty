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

export async function fetchAllMessages(dealId: string): Promise<SupabaseMessage[]> {
  console.log('[fetchAllMessages] start', { dealId });
  const { data, error } = await supabase
    .from('deal_messages')
    .select('*, profiles!deal_messages_sender_id_fkey(full_name, avatar_url)')
    .eq('deal_id', dealId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[fetchAllMessages] error:', error);
    return [];
  }

  console.log('[fetchAllMessages] result:', data);
  return data || [];
}

export async function markMessagesAsSeen(dealId: string, userId: string) {
  console.log('[markMessagesAsSeen] start', { dealId, userId });
  const { error } = await supabase
    .from('deal_messages')
    .update({ is_seen: true })
    .eq('deal_id', dealId)
    .neq('sender_id', userId)
    .is('is_seen', false);

  if (error) {
    console.error('[markMessagesAsSeen] error:', error);
  } else {
    console.log('[markMessagesAsSeen] success');
  }
}

export async function sendMessage({ dealId, senderId, content }: { dealId: string; senderId: string; content: string }) {
  console.log('[sendMessage] payload:', { dealId, senderId, content });
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
    console.error('[sendMessage] error:', error);
    throw error;
  }

  console.log('[sendMessage] result:', data);
  return data as SupabaseMessage;
}

export function subscribeToNewMessages(dealId: string, onNew: (msg: SupabaseMessage) => void) {
  console.log('[subscribeToNewMessages] subscribing to channel', { dealId });
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
        console.log('[subscribeToNewMessages] new payload:', payload);
        try {
          const { data, error } = await supabase
            .from('deal_messages')
            .select('*, profiles!deal_messages_sender_id_fkey(full_name, avatar_url)')
            .eq('id', payload.new.id)
            .single();

          if (error) {
            console.error('[subscribeToNewMessages] fetch error:', error);
            return;
          }

          if (data) {
            console.log('[subscribeToNewMessages] fetched full message:', data);
            onNew(data);
          }
        } catch (e) {
          console.error('[subscribeToNewMessages] processing failed:', e);
        }
      }
    )
    .subscribe();

  return channel;
}
