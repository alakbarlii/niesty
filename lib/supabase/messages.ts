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

interface SendMessagePayload {
  dealId: string;
  senderId: string;
  content: string;
}

export async function fetchRecentMessages(dealId: string, limit = 20): Promise<SupabaseMessage[]> {
  const { data, error } = await supabase
    .from('deal_messages')
    .select('*, profiles!deal_messages_sender_id_fkey(full_name, avatar_url)')
    .eq('deal_id', dealId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data.reverse();
}

export async function fetchMoreMessages(
  dealId: string,
  beforeDate: string,
  limit = 20
): Promise<SupabaseMessage[]> {
  const { data, error } = await supabase
    .from('deal_messages')
    .select('*, profiles!deal_messages_sender_id_fkey(full_name, avatar_url)')
    .eq('deal_id', dealId)
    .lt('created_at', beforeDate)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data.reverse();
}

export async function sendMessage({ dealId, senderId, content }: SendMessagePayload) {
  const { error } = await supabase.from('deal_messages').insert({
    deal_id: dealId,
    sender_id: senderId,
    content,
  });

  if (error) throw error;
}

interface RealtimePayload {
  new: SupabaseMessage;
}

export function subscribeToNewMessages(
  dealId: string,
  onNew: (msg: SupabaseMessage) => void
) {
  const channel = supabase
    .channel(`chat-${dealId}-${Date.now()}`) // force fresh channel for each sub
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'deal_messages',
        filter: `deal_id=eq.${dealId}`,
      },
      async (payload: RealtimePayload) => {
        try {
          const { data, error } = await supabase
            .from('deal_messages')
            .select('*, profiles!deal_messages_sender_id_fkey(full_name, avatar_url)')
            .eq('id', payload.new.id)
            .single();

          if (error) {
            console.error('Realtime fetch error:', error);
            return;
          }

          if (data) {
            onNew(data);
          }
        } catch (e) {
          console.error('Realtime processing failure:', e);
        }
      }
    )
    .subscribe();

  return channel;
}
