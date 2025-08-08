'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';

interface PersonalNotesProps {
  dealId: string;
}

export default function PersonalNotes({ dealId }: PersonalNotesProps) {
  const [user, setUser] = useState<User | null>(null);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    
    const fetchUserAndNote = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      setUser(user);

      const { data } = await supabase
        .from('personal_notes')
        .select('content')
        .eq('user_id', user.id)
        .eq('deal_id', dealId)
        .single();

      if (data?.content) setNote(data.content);
      setLoading(false);
    };

    fetchUserAndNote();
  }, [dealId]);

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
    <div className="mt-6 bg-white/5 border border-white/10 rounded-xl p-4 shadow-[0_0_20px_rgba(255,255,255,0.03)]">
      <h3 className="text-sm font-medium text-white/70 mb-2">Your Private Notes</h3>
      <textarea
        className="w-full min-h-[100px] px-4 py-3 text-white bg-white/10 border border-white/20 rounded-xl outline-none placeholder-white/50 focus:ring-2 focus:ring-yellow-400 transition resize-none"
        value={note}
        disabled={loading}
        onChange={(e) => saveNote(e.target.value)}
        placeholder="Type..."
      />
    </div>
  );
}
