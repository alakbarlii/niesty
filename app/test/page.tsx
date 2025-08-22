'use client';

import { supabase } from '@/lib/supabase';

export default function TestPage() {
  async function runQuery() {
    const { data, error } = await supabase.from('profiles').select('*').limit(5);
    console.log("Profiles:", data, error);
  }

  return (
    <div className="text-white p-10">
      <button onClick={runQuery} className="px-4 py-2 bg-blue-600 rounded">
        Test Supabase
      </button>
    </div>
  );
}
