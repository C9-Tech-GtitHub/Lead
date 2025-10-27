import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLead() {
  const leadId = 'f9cbedd4-8613-42e4-849f-f84ef7993a69';
  const userId = 'bdbda432-63f2-4326-b2c2-09d8c95d080b';

  console.log('Checking lead:', leadId);
  console.log('For user:', userId);

  const { data, error } = await supabase
    .from('leads')
    .select('id, name, website, user_id')
    .eq('id', leadId)
    .single();

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('\nLead data:', JSON.stringify(data, null, 2));
    console.log('\nUser match:', data.user_id === userId ? 'YES ✅' : 'NO ❌');
    console.log('Lead user_id:', data.user_id);
    console.log('Expected user_id:', userId);
  }
}

checkLead();
