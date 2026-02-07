import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const envFile = readFileSync('.env', 'utf-8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length > 0) {
    env[key.trim()] = valueParts.join('=').trim();
  }
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

const CHRISTINE_EMAIL = 'christinetshiba@gmail.com';

// All communities from the static file
const communityDescriptions = {
  'Tpot': 'Twitter philosophers and deep thinkers exploring ideas together',
  'Vibecamp': 'Festival community bringing online connections to real life',
  'Fractal': 'NYC coliving community of builders and creators',
  'Feytopia': 'Whimsical community exploring creativity and play',
  'Interintellect': 'Global community hosting salons and intellectual discussions',
  'Miguels': 'Community gathering space in NYC',
  'Treeweek': 'Nature retreat and outdoor community gathering',
  'Yincubator': 'Incubator community for early-stage founders',
  'Vibegala': 'Celebration and event-focused community',
  'Cliffs of Id': 'Creative community exploring the subconscious',
  'Vital Williamsburg': 'Brooklyn wellness and community space',
  'Art of Accomplishment': 'Personal development and leadership community',
  'Futurecraft': 'Builders creating tools for the future',
  'Vital LES': 'Lower East Side wellness community',
  'OBNYC': 'NYC community of builders and organizers',
  'Outdoor climbing': 'Rock climbers and outdoor adventure seekers',
  'Caulicamp': 'Health-focused retreat community',
  'Substack': 'Independent writers and newsletter creators',
  'Edge Esmeralda': 'Experimental pop-up city and community builders',
  'Jesscamp': 'Intimate gathering and retreat community',
  'LessOnline': 'Rationalist conference and community',
  'SF Commons': 'San Francisco community space for curious minds',
  'Modern Love Club': 'Community exploring relationships and connection',
  'Embassy': 'San Francisco coliving and community house',
  "Merlin's Place": 'Creative gathering space and community',
  'Fractal Geneva': 'European extension of Fractal community',
  'Verci': 'Community house and gathering space',
  'Castle': 'Historic venue for community events',
  'Sleepawake': 'Consciousness and dream exploration community',
  'Dandelion': 'Community spreading seeds of connection',
  'Casa Tilo': 'Latin American coliving community',
  'VibeSeattle': 'Seattle branch of the Vibe community',
  'Church of Interbeing': 'Mindfulness and interconnection community',
  'Portal': 'Gateway community for new connections',
  'Lightning Society': 'Fast-moving builders and innovators',
  'Bookbear Express': 'Book lovers and literary community',
  'Love Mixer': 'Dating and connection events community',
  'Meeting House': 'Community gathering and discussion space',
  'Beehive': 'Collaborative workspace community',
  'Bebop House': 'Music and arts community house',
  'Casa Chironja': 'Caribbean-inspired community space',
  'small_world': 'Intimate community of close connections',
  'Less Wrong': 'Rationality and AI safety focused community',
  'Effective Altruism': 'Doing the most good through evidence and reason',
  'Word Hack': 'Language and wordplay enthusiast community',
  'Burning Man': 'Burners and radical self-expression enthusiasts',
  'GP81': 'Connect with others in the GP81 community',
  'UX Design': 'Connect with others in the UX Design community',
};

function generateSlug(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

async function run() {
  // Get Christine's ID
  const { data: christine } = await supabase
    .from('users')
    .select('id')
    .eq('email', CHRISTINE_EMAIL)
    .single();

  console.log('Christine ID:', christine.id);

  // Get existing communities
  const { data: existingCommunities } = await supabase
    .from('communities')
    .select('name, id');

  const existingNames = new Set(existingCommunities?.map(c => c.name) || []);
  console.log('\nExisting communities:', existingNames.size);

  // Find missing communities
  const allNames = Object.keys(communityDescriptions);
  const missingNames = allNames.filter(name => !existingNames.has(name));

  console.log('Missing communities:', missingNames.length);
  if (missingNames.length > 0) {
    console.log(missingNames);
  }

  // Create missing communities
  for (const name of missingNames) {
    const slug = generateSlug(name);
    const description = communityDescriptions[name];

    console.log('\nCreating:', name, '(slug:', slug + ')');

    const { data: newCommunity, error: createError } = await supabase
      .from('communities')
      .insert({
        name: name,
        slug: slug,
        description: description,
        is_private: false,
        created_by: christine.id,
      })
      .select()
      .single();

    if (createError) {
      console.error('  Error:', createError.message);
      continue;
    }

    console.log('  Created with ID:', newCommunity.id);

    // Add Christine as admin
    const { error: memberError } = await supabase
      .from('community_members')
      .insert({
        community_id: newCommunity.id,
        user_id: christine.id,
        role: 'admin',
      });

    if (memberError) {
      console.error('  Error adding as admin:', memberError.message);
    } else {
      console.log('  Added Christine as admin');
    }
  }

  // Also ensure Christine is admin of ALL existing communities
  console.log('\nEnsuring Christine is admin of all existing communities...');

  const { data: allCommunities } = await supabase
    .from('communities')
    .select('id, name');

  for (const community of allCommunities || []) {
    const { data: existing } = await supabase
      .from('community_members')
      .select('id, role')
      .eq('community_id', community.id)
      .eq('user_id', christine.id)
      .single();

    if (!existing) {
      // Insert
      await supabase
        .from('community_members')
        .insert({
          community_id: community.id,
          user_id: christine.id,
          role: 'admin'
        });
      console.log(community.name + ': Added as admin');
    } else if (existing.role !== 'admin') {
      // Update
      await supabase
        .from('community_members')
        .update({ role: 'admin' })
        .eq('community_id', community.id)
        .eq('user_id', christine.id);
      console.log(community.name + ': Updated to admin');
    }
  }

  // Final count
  const { data: finalCommunities } = await supabase
    .from('communities')
    .select('id');

  const { data: christineMemberships } = await supabase
    .from('community_members')
    .select('role')
    .eq('user_id', christine.id)
    .eq('role', 'admin');

  console.log('\n✅ Done!');
  console.log('Total communities:', finalCommunities?.length);
  console.log('Christine is admin of:', christineMemberships?.length, 'communities');
}

run();
