'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useUser } from '@supabase/auth-helpers-react';

interface PersonalNotesProps {
  dealId: string;
}

export default function PersonalNotes({ dealId }: PersonalNotesProps) {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const user = useUser();
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNote = async () => {
      if (!user) return;

      const { data } = await supabase
        .from('personal_notes')
        .select('content')
        .eq('user_id', user.id)
        .eq('deal_id', dealId)
        .single();

      if (data?.content) setNote(data.content);
      setLoading(false);
    };

    fetchNote();
  }, [user, dealId, supabase]);

  const saveNote = async (content: string) => {
    if (!user) return;

    setNote(content);

    const { data: existing } = await supabase
      .from('personal_notes')
      .select('id')
      .eq('user_id', user.id)
      .eq('deal_id', dealId)
      .single();

    if (existing) {
      await supabase
        .from('personal_notes')
        .update({ content })
        .eq('id', existing.id);
    } else {
      await supabase.from('personal_notes').insert({
        user_id: user.id,
        deal_id: dealId,
        content,
      });
    }
  };

  return (
    <div className="mt-6 bg-gray-800 border border-gray-700 rounded-xl p-4">
      <h3 className="text-sm font-medium text-gray-300 mb-2">Your Private Notes</h3>
      <textarea
        className="w-full h-32 bg-gray-900 text-gray-200 border border-gray-600 rounded-md p-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
        value={note}
        disabled={loading}
        onChange={(e) => saveNote(e.target.value)}
        placeholder="You can type notes for this deal only you can see..."
      />
    </div>
  );
}
