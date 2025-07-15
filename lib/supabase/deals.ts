'use client';

import { createBrowserClient } from '@supabase/ssr';

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export const sendDealRequest = async ({
  senderId,
  receiverId,
  message,
}: {
  senderId: string;
  receiverId: string;
  message: string;
}) => {
  const { data, error } = await supabase.from('deals').insert({
    sender_id: senderId,
    receiver_id: receiverId,
    message,
    status: 'pending',
    deal_stage: 'Waiting for Response', // Ensure valid initial stage
  });

  return { data, error };
};


export const updateDealStage = async (dealId: string, newStage: string) => {
  const { data, error } = await supabase
    .from('deals')
    .update({ deal_stage: newStage })
    .eq('id', dealId);

  return { data, error };
};
