import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { fetchCommunityMemberCounts, fetchSampleUserAvatars, fetchTotalUserCount, fetchCreatedCommunities } from '../lib/supabase';
import CreateCommunityModal from '../components/CreateCommunityModal';
import './LandingPage.css';

// Helper to create slug from community name
const toSlug = (name) => name.toLowerCase().replace(/\s+/g, '-');

// Community descriptions - comprehensive list from database
const communityDescriptions = {
  // Core communities
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
  // Additional communities
  'Crypto': 'Web3 builders, traders, and decentralization enthusiasts',
  'Farcaster': 'Decentralized social network community',
  'Solarpunk': 'Optimistic futurists building sustainable communities',
  'Zuzalu': 'Pop-up city community exploring new ways of living',
  'Network State': 'Building digital-first communities and governance',
  'Tech': 'Builders, founders, and technologists shaping the future',
  'AI': 'Exploring artificial intelligence and its implications',
  'NYC': 'New York City community of ambitious builders',
  'SF': 'San Francisco Bay Area tech and startup community',
  'LA': 'Los Angeles creatives, founders, and dreamers',
  'Austin': 'Texas tech and creative community',
  'Berlin': 'European hub for artists, techies, and free spirits',
  'London': 'UK community of builders and thinkers',
  'Burning Man': 'Burners and radical self-expression enthusiasts',
  'Founders': 'Startup founders and entrepreneurs',
  'Coliving': 'Community living and intentional housing',
};

// Generate a default description for communities not in the list
const getDescription = (name) => {
  if (communityDescriptions[name]) return communityDescriptions[name];
  return `Connect with others in the ${name} community`;
};

// App testimonials
const testimonials = [
  { id: 1, text: "i'm so pleased with your twitter social experiment", author: "@ewu_wtf" },
  { id: 2, text: "i did [join the app]! it works!", author: "@puheenix" },
  { id: 3, text: "to anyone who's reading this, please try christine's dating app, it's amazing", author: "@keshavchan" },
  { id: 4, text: "I'm so glad this app lets you lurk. I never made a profile but saw a crush on there and reached out and we've had a few dates and I'm happy :)", author: "anonymous" },
  { id: 5, text: "I'm on it. It's pretty cool.", author: "@MaryZoso" },
  { id: 6, text: "gm. i outed myself crushing on someone on @christineist's damn dating app. have a great day everyone be better than me", author: "@s0ulDirect0r" },
  { id: 7, text: "I'm going on two (maybe 3!) dates in NYC this week because of twitter dating app. :) you've created something super impactful!", author: "anonymous" },
  { id: 8, text: "Cuties app is very good! big fan! have met cool people, yay", author: "anonymous" },
  { id: 9, text: "some updates on my experience using Cuties app! (in case you like goss!)\n\nthe first boy i started dating from Cuties didn't work out romantically, but became one of my best friends in SF :) we hang out every week and he has been monumental in introducing me into SF communities!!\n\nand Noooooow, my current bf is someone who i first saw on Cuties 👀 when we met irl on happenstance, he recognized me from the interwebs\n\nty for making !", author: "anonymous" },
  { id: 10, text: "I've met 4 ppl already thanks to Cuties! app :)\n5 if I count you!", author: "@Romy_Holland" },
  { id: 11, text: "i just scheduled TWO dates with someone off the app 🔥\nlike we have never met, but in the span of one text convo, we got so excited that we planned TWO things to do ❤️ eep!", author: "anonymous" },
  { id: 12, text: "I heard from one of my friends he ran into u at a cafe 🔥 we also met through ur app!! Haha", author: "anonymous" },
  { id: 13, text: "i think dating this hard is killing me but at least im gonna die doing what i love. also i blame @christineist and twitter dating app <3 what a curated bunch of cuties", author: "anonymous" },
  { id: 14, text: "Christine's Cuties app works!! I met two really great friends off her platform, and I'm not sure I'd have met nor maintained my friendship with them without her community. Twitter is a big space, and I'm so grateful to have her well curated network to meet my people on the Internet irl <3.", author: "anonymous" },
  { id: 15, text: "I'm so glad for this app! I'm a girl in LA and previously I made a lot of girl friends through partying (which is still cool and I love them all! Don't get me wrong) but I struggled to find like-minded people to connect with over ideas, meaningful conversations, and a more introspective take on life. The people on this app who I've connected with, however, have all been thoughtful, self-inquisitive and curious about others, inspired, and adventurous! Grateful for the little (but growing!) LA friend community we have going from this app :)", author: "anonymous" },
  { id: 16, text: "One of my simple joys in life is meeting likeminded people from twitter. Because of the app, I saw someone new in my city who was also in \"meeting people\" mode. We had an exceptionally good convo and wouldn't have met her otherwise!", author: "@nopranablem" },
  { id: 17, text: "By making a container for us to meet others around these parts, you've indirectly made some very interesting interactions happen for me, which have generally led to good things!!", author: "@00arti" },
  { id: 18, text: "I've met two really cool people from the app! Thanks for creating a cool place!", author: "@neutralusage" },
  { id: 19, text: "I used your app to set up a friend on a date, and AFAIK they are still going!!", author: "@ilomilotica" },
  { id: 20, text: "i went on a date because of your app. it wasn't a great fit but it was pretty cool anyways, to use a novel dating app\n\nshe was active enough on twitter that i felt like i had a good sense of who she was before seeing her. far better than any other app.", author: "anonymous" },
  { id: 21, text: "Through Cuties I matched with a Twitter crush I've had for a year! We hit it off in person and have begun a wonderful situationship.", author: "anonymous" },
  { id: 22, text: "Nothing super serious rn, but we've been talking and calling constantly and we'll both be at [redacted] so, ya know. It's not a big thing but it's a thing. We talked a bit before matching, but matching def accelerated things sooooo thanks for the site lol", author: "anonymous" },
  { id: 23, text: ">get on cuties app\n>send one 'like'\n>she 'likes' back\n>I haven't logged back on in weeks\n\nsimply decide things are easy, bro", author: "anonymous" },
  { id: 24, text: "had a fun travel fling that started from cuties!!", author: "anon" },
  { id: 25, text: "I am dating a Twitter mutual because of cuties!", author: "anon" },
  { id: 26, text: "aww man, this is the first time i've seen gay/bi men at least decently represented. so exciting", author: "anon" },
  { id: 27, text: "i succumbed to the cutiespoasting", author: "anon" },
  { id: 28, text: "met my first nyc friend and now one of my really good friends on cuties!! :) i think you took a pic of us at the picnic you hosted in fall of last year :)", author: "anonymous" },
  { id: 29, text: "Thank you for making cuties! I am still single but I am mutuals on twitter and instagram with someone I found on cuties app and would never have found otherwise. Thanks for connecting us :)", author: "anon" },
  { id: 30, text: "I think me messaging you on cuties and you responding is what led to us having phone calls that deepened our friendship beyond where it was, and in the direction that I was hoping for. It literally lowered the barrier to exploring a relationship and that feels so crucial. I also interacted with someone who matched with me in person at an event in SF, but I wouldn't have initiated some interaction unless we matched and caught eyes earlier through this low stakes mean of indicating interest", author: "anonymous" },
  { id: 31, text: "My best experience on cuties was clicking on my very good friend's profile and clicking \"vouch\". She wants a husband and it was a great way to contribute to it. Feeling good about creating some community social proof etc etc. And also really great seeing so many known faces and their yearning for love", author: "anonymous" },
  { id: 32, text: "far better than any other app", author: "anon" },
  { id: 33, text: "I am a huge fan of Cuties! app because it selects for a high group of people that have a lot of shared context...The features of the app around recommendations and plus ones make it have a sense of safety and a sense of trust. Like, oh yeah, cool. These people are like real legit people, and you can click into their social media and see all the stuff they do, so you get a sense of who they are in community, which is something that you don't really get much in dating apps.", author: "anon" },
  { id: 34, text: "cuties is great - was super handy to find new friends from fey.", author: "anon" },
  { id: 35, text: "I was able to use your Cuties app to set up my friend!", author: "anon" },
  { id: 36, text: "thank you for making something good", author: "anon" },
  { id: 37, text: "i honestly liked it more than any other app i have been on", author: "anon" },
  { id: 38, text: "Thank you @christine we met on cuties app hehe", author: "anon" },
  { id: 39, text: "Forever indebted to @christineist and cuties.app ☺️", author: "@lozareeno" },
  { id: 40, text: "wild times for me! haven't been on a dating app for a long time and the nicheness of cuties is quite the experience as i'm sure you're aware!!", author: "anon" },
];


const LandingPage = () => {
  const { isAuthenticated, currentUser } = useApp();
  const navigate = useNavigate();
  const [memberCounts, setMemberCounts] = useState({});
  const [createdCommunities, setCreatedCommunities] = useState([]);
  const [sampleAvatars, setSampleAvatars] = useState([]);
  const [totalUsers, setTotalUsers] = useState(0);
    const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      if (isAuthenticated) {
        // Load both legacy member counts and created communities
        const [counts, created] = await Promise.all([
          fetchCommunityMemberCounts(),
          fetchCreatedCommunities()
        ]);
        setMemberCounts(counts);
        setCreatedCommunities(created);
      } else {
        // Load social proof data for non-authenticated users
        const [avatars, count] = await Promise.all([
          fetchSampleUserAvatars(8),
          fetchTotalUserCount()
        ]);
        setSampleAvatars(avatars);
        setTotalUsers(count);
      }
    };
    loadData();
  }, [isAuthenticated]);

  // Combine legacy communities (from user profiles) with created communities
  const getAllCommunities = () => {
    const communities = [];

    // Add legacy communities from member counts
    Object.entries(memberCounts).forEach(([name, count]) => {
      communities.push({
        name,
        slug: toSlug(name),
        description: getDescription(name),
        memberCount: count,
        isCreated: false,
      });
    });

    // Add created communities (avoid duplicates by slug)
    const existingSlugs = new Set(communities.map(c => c.slug));
    createdCommunities.forEach(c => {
      if (!existingSlugs.has(c.slug)) {
        communities.push({
          name: c.name,
          slug: c.slug,
          description: c.description || getDescription(c.name),
          memberCount: c.memberCount || 0,
          isCreated: true,
        });
      }
    });

    // Sort: user-created first, then by member count descending
    return communities.sort((a, b) => {
      if (a.isCreated !== b.isCreated) {
        return a.isCreated ? -1 : 1;
      }
      return b.memberCount - a.memberCount;
    });
  };

  const handleCommunityClick = (slug) => {
    navigate(`/community/${slug}`);
  };

  return (
    <div className="landing-page">
      <section className="hero-simple">
        <h1 className="main-title">cuties!</h1>
        <p className="main-subtitle">
          A directory of interesting and open minded people.
        </p>
        <div className="hero-buttons">
          <Link
            to={isAuthenticated ? "/directory" : "/signup"}
            className="browse-button"
          >
            Browse Directory
          </Link>
          {isAuthenticated && (
            <button
              className="btn-secondary"
              onClick={() => setShowCreateModal(true)}
            >
              Create Community
            </button>
          )}
        </div>
      </section>

      {!isAuthenticated && (
        <>
          {/* Social Proof Section for non-authenticated users */}
          <section className="social-proof">
            <div className="social-proof-avatars">
              {sampleAvatars.map((avatar, idx) => (
                <img
                  key={avatar.id}
                  src={avatar.photo}
                  alt=""
                  className="social-proof-avatar"
                  style={{ zIndex: sampleAvatars.length - idx }}
                  onError={(e) => {
                    e.target.src = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22%3E%3Crect fill=%22%23e0e0e0%22 width=%22100%22 height=%22100%22/%3E%3C/svg%3E';
                  }}
                />
              ))}
            </div>
          </section>

          {/* Testimonials for non-authenticated users */}
          <section className="testimonials">
            <div className="testimonials-masonry">
              {testimonials.map((testimonial) => (
                <div key={testimonial.id} className="testimonial-card">
                  <p className="testimonial-text">{testimonial.text}</p>
                  <p className="testimonial-author">— {testimonial.author}</p>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      {isAuthenticated && (Object.keys(memberCounts).length > 0 || createdCommunities.length > 0) && (
        /* Community Cards for authenticated users */
        <section className="communities-section">
          <h2 className="communities-title">Explore Communities</h2>
          <div className="communities-grid">
            {getAllCommunities()
              .slice(0, 12)
              .map((community, index) => (
                <div
                  key={community.slug}
                  className="community-card"
                  onClick={() => handleCommunityClick(community.slug)}
                >
                  <div className="community-card-content">
                    <div className={`community-card-avatar gradient-${(index % 6) + 1}`} />
                    <div className="community-card-info">
                      <h3 className="community-name">{community.name}</h3>
                      <p className="community-description">{community.description}</p>
                      <div className="community-meta">
                        <span className="community-member-count">
                          {community.memberCount} {community.memberCount === 1 ? 'member' : 'members'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
          </div>
          <div className="communities-see-all">
            <Link to="/communities" className="see-all-link">
              See all communities
            </Link>
          </div>
        </section>
      )}

      {/* Create Community Modal */}
      <CreateCommunityModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        userId={currentUser?.id}
      />
    </div>
  );
};

export default LandingPage;
