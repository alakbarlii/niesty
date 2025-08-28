import { supabase } from '@/lib/supabase';

export interface SupabaseMessage {
  id: string;            // ← added id
  user_id: string;
  deal_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  is_seen?: boolean;
  profiles?: {
    full_name: string;
    avatar_url: string;
  };
}

// FETCH ALL MESSAGES
export async function fetchAllMessages(dealId: string): Promise<SupabaseMessage[]> {
  const { data, error } = await supabase
    .from('deal_messages')
    .select('*')
    .eq('deal_id', dealId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[fetchAllMessages] ERROR:', error);
    return [];
  }
  return (data as SupabaseMessage[]) || [];
}

// MARK AS SEEN
export async function markMessagesAsSeen(dealId: string, userId: string) {
  const { error } = await supabase
    .from('deal_messages')
    .update({ is_seen: true })
    .eq('deal_id', dealId)
    .neq('sender_id', userId)
    .is('is_seen', false);

  if (error) console.error('[markMessagesAsSeen] ERROR:', error);
}

// SEND MESSAGE
export async function sendMessage({
  dealId,
  senderId,
  content,
}: { dealId: string; senderId: string; content: string }) {
  const { data, error } = await supabase
    .from('deal_messages')
    .insert({ deal_id: dealId, sender_id: senderId, content })
    .select()
    .single();

  if (error) {
    console.error('[sendMessage] ERROR:', error);
    throw error;
  }

  return data as SupabaseMessage;
}

// SUBSCRIBE TO NEW MESSAGES
export function subscribeToNewMessages(dealId: string, onNew: (msg: SupabaseMessage) => void) {
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
      async (payload: { new: { id: string } }) => {
        try {
          const { data, error } = await supabase
            .from('deal_messages')
            .select('*')
            .eq('id', payload.new.id)
            .single();

          if (error) {
            console.error('[subscribeToNewMessages] FETCH ERROR:', error);
            return;
          }

          if (data) onNew(data as SupabaseMessage);
        } catch (err) {
          console.error('[subscribeToNewMessages] PROCESSING FAILED:', err);
        }
      }
    )
    .subscribe();

  return channel;
}