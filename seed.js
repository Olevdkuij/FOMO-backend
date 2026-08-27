require('dotenv').config();
const mongoose = require('mongoose');
const Venue = require('./src/models/Venue');

const venues = [
  {
    _id: 'v-momento', name: 'Momento', area: 'Marbella', type: 'Club', genres: ['House', 'Tech House'],
    rating: 4.8, image: '🪩', crowdStatus: 'packed', crowdUpdatedAt: new Date(),
    ratings: { music: 4.9, atmosphere: 4.8, crowd: 4.7, staff: 4.5, drinks: 4.4, venue: 4.9 },
    bestNights: [{ day: 'Friday', stars: 5 }, { day: 'Saturday', stars: 5 }, { day: 'Thursday', stars: 4 }, { day: 'Sunday', stars: 3 }],
    bestArrival: '00:30–01:30', closing: '04:00', verified: true,
  },
  {
    _id: 'v-playapadre', name: 'Playa Padre', area: 'La Siesta', type: 'Beach Club', genres: ['Tech House', 'Afro House'],
    rating: 4.6, image: '🏖️', crowdStatus: 'busy', crowdUpdatedAt: new Date(),
    ratings: { music: 4.6, atmosphere: 4.7, crowd: 4.5, staff: 4.4, drinks: 4.3, venue: 4.7 },
    bestNights: [{ day: 'Friday', stars: 4 }, { day: 'Saturday', stars: 5 }, { day: 'Sunday', stars: 4 }, { day: 'Thursday', stars: 3 }],
    bestArrival: '20:00–21:30', closing: '02:00', verified: true,
  },
  {
    _id: 'v-pacha', name: 'Pacha', area: 'Puerto Banús', type: 'Club', genres: ['House', 'EDM'],
    rating: 4.5, image: '🎶', crowdStatus: 'getting_busy', crowdUpdatedAt: new Date(),
    ratings: { music: 4.5, atmosphere: 4.6, crowd: 4.4, staff: 4.3, drinks: 4.2, venue: 4.6 },
    bestNights: [{ day: 'Saturday', stars: 5 }, { day: 'Friday', stars: 4 }, { day: 'Wednesday', stars: 3 }, { day: 'Sunday', stars: 3 }],
    bestArrival: '00:00–01:00', closing: '05:00', verified: true,
  },
  {
    _id: 'v-puenteromano', name: 'Puente Romano', area: 'Golden Mile', type: 'Beach Club', genres: ['Afro House', 'Reggaeton'],
    rating: 4.4, image: '🌴', crowdStatus: 'quiet', crowdUpdatedAt: new Date(),
    ratings: { music: 4.3, atmosphere: 4.5, crowd: 4.2, staff: 4.4, drinks: 4.1, venue: 4.6 },
    bestNights: [{ day: 'Sunday', stars: 5 }, { day: 'Friday', stars: 4 }, { day: 'Saturday', stars: 4 }, { day: 'Thursday', stars: 3 }],
    bestArrival: '19:00–20:30', closing: '01:00', verified: false,
  },
];

async function seed() {
  if (!process.env.MONGODB_URI) {
    console.error('No MONGODB_URI set in .env');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGODB_URI);
  for (const v of venues) {
    await Venue.findByIdAndUpdate(v._id, v, { upsert: true, new: true, setDefaultsOnInsert: true });
  }
  console.log(`Seeded ${venues.length} venues`);
  await mongoose.disconnect();
}

seed().catch((err) => { console.error(err); process.exit(1); });
