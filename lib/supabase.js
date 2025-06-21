import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://kjoiummoobdqrsfkoqva.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtqb2l1bW1vb2JkcXJzZmtvcXZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc1MTc4NzEsImV4cCI6MjA2MzA5Mzg3MX0.N1T1mjFz77gZJ8HlV81g2DUWh7LoS9V9Ry8YextFZjU'

export const supabase = createClient(supabaseUrl, supabaseKey)
