// Fills the database with demo data. Run with: npm run seed
// WARNING: this deletes everything in the JourneyHub database first.
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('../src/models/User');
const Destination = require('../src/models/Destination');
const Story = require('../src/models/Story');
const Review = require('../src/models/Review');
const TripPlan = require('../src/models/TripPlan');
const Report = require('../src/models/Report');
const Accommodation = require('../src/models/Accommodation');
const BookingRequest = require('../src/models/BookingRequest');

const DAY = 24 * 60 * 60 * 1000;

// dates relative to today so the demo always has past stories and future trips
function daysFromToday(n) {
  const today = new Date(new Date().toISOString().slice(0, 10));
  return new Date(today.getTime() + n * DAY);
}

function image(city) {
  return `https://placehold.co/800x500/0d6efd/white?text=${encodeURIComponent(city)}`;
}

const destinationData = [
  {
    city: 'Lisbon',
    country: 'Portugal',
    description:
      'Hilly city on the Tagus river with yellow trams, tiled buildings and great seafood. Easy to walk around if you do not mind the slopes.',
    places: ['Alfama district', 'Belem Tower', 'LX Factory', 'Miradouro da Senhora do Monte'],
    estimatedBudget: 900,
  },
  {
    city: 'Kyoto',
    country: 'Japan',
    description:
      'Old capital of Japan with hundreds of temples, quiet gardens and traditional wooden streets. Best in spring or autumn.',
    places: ['Fushimi Inari Shrine', 'Arashiyama Bamboo Grove', 'Kinkaku-ji', 'Nishiki Market'],
    estimatedBudget: 1800,
  },
  {
    city: 'Istanbul',
    country: 'Turkey',
    description:
      'A city on two continents with bazaars, mosques, ferries on the Bosphorus and a lot of very good food for the price.',
    places: ['Hagia Sophia', 'Grand Bazaar', 'Galata Tower', 'Bosphorus ferry'],
    estimatedBudget: 700,
  },
  {
    city: 'Cape Town',
    country: 'South Africa',
    description:
      'Mountains, beaches and vineyards all close to each other. Good for hiking and road trips along the coast.',
    places: ['Table Mountain', 'Boulders Beach', 'Cape Point', 'V&A Waterfront'],
    estimatedBudget: 1300,
  },
  {
    city: 'Hunza',
    country: 'Pakistan',
    description:
      'Mountain valley in Gilgit-Baltistan with apricot orchards, old forts and views of Rakaposhi. Roads are long but worth it.',
    places: ['Baltit Fort', 'Attabad Lake', 'Eagle\'s Nest viewpoint', 'Passu Cones'],
    estimatedBudget: 500,
  },
  {
    city: 'Reykjavik',
    country: 'Iceland',
    description:
      'Small colourful capital and the starting point for the Golden Circle, hot springs and northern lights tours. Expensive, plan ahead.',
    places: ['Hallgrimskirkja', 'Sky Lagoon', 'Golden Circle', 'Harpa concert hall'],
    estimatedBudget: 2400,
  },
  {
    city: 'Marrakesh',
    country: 'Morocco',
    description: 'Busy medina full of souks and riads. Archived for now while the listing is being updated.',
    places: ['Jemaa el-Fnaa', 'Majorelle Garden'],
    estimatedBudget: 650,
    archived: true,
  },
];

async function seed() {
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 });
  console.log('Connected, clearing old data...');

  const models = [User, Destination, Story, Review, TripPlan, Report, Accommodation, BookingRequest];
  await Promise.all(models.map((m) => m.deleteMany({})));
  // make sure indexes (unique email, one review per destination) exist
  await Promise.all(models.map((m) => m.syncIndexes()));

  // ---- users (all fictional) ----
  const [adminHash, memberHash] = await Promise.all([bcrypt.hash('Admin123!', 10), bcrypt.hash('Member123!', 10)]);
  await User.create({ name: 'Site Admin', email: 'admin@journeyhub.test', passwordHash: adminHash, role: 'admin' });
  const maya = await User.create({
    name: 'Maya Rahman',
    email: 'maya@journeyhub.test',
    passwordHash: memberHash,
    homeCity: 'Lahore',
    bio: 'Weekend hiker, slow traveller, always hunting for the best street food.',
  });
  const omar = await User.create({
    name: 'Omar Siddiqui',
    email: 'omar@journeyhub.test',
    passwordHash: memberHash,
    homeCity: 'Karachi',
    bio: 'Photography and long train rides.',
  });

  // ---- destinations ----
  const destinations = await Destination.insertMany(destinationData.map((d) => ({ ...d, imageUrl: image(d.city) })));
  const byCity = Object.fromEntries(destinations.map((d) => [d.city, d]));

  maya.favourites = [byCity.Kyoto._id, byCity.Hunza._id];
  omar.favourites = [byCity.Lisbon._id];
  await Promise.all([maya.save(), omar.save()]);

  // ---- stories (8 so the feed has two pages) ----
  const stories = await Story.insertMany([
    {
      author: maya._id,
      destination: byCity.Hunza._id,
      title: 'Apricot season in Hunza',
      travelDate: daysFromToday(-120),
      text: 'We took the Karakoram Highway up from Islamabad. Two long days on the road but the views after Chilas made up for it.\n\nBaltit Fort in the morning light was the highlight, and the apricot cake in Karimabad is something I still think about.',
    },
    {
      author: maya._id,
      destination: byCity.Kyoto._id,
      title: 'Five days of temples and tofu',
      travelDate: daysFromToday(-300),
      text: 'Got to Fushimi Inari at 6am and had the gates almost to myself. Rented a bike for the rest of the trip, which is the best way to get around Kyoto.',
    },
    {
      author: omar._id,
      destination: byCity.Lisbon._id,
      title: 'Lisbon on a student budget',
      travelDate: daysFromToday(-60),
      text: 'Stayed in a hostel in Bairro Alto, ate bifanas for lunch and walked everywhere. Tram 28 is fun once, after that just walk.',
    },
    {
      author: omar._id,
      destination: byCity.Istanbul._id,
      title: 'Ferries, simit and the Grand Bazaar',
      travelDate: daysFromToday(-200),
      text: 'The public ferry between Eminonu and Kadikoy costs almost nothing and is better than any boat tour. Bargaining in the bazaar is expected, start at half.',
    },
    {
      author: maya._id,
      destination: byCity['Cape Town']._id,
      title: 'Hiking up Table Mountain',
      travelDate: daysFromToday(-400),
      text: 'We went up Platteklip Gorge, about two and a half hours with stops. Take more water than you think and check the wind before going, the cable car closes often.',
    },
    {
      author: omar._id,
      destination: byCity.Reykjavik._id,
      title: 'Chasing the northern lights',
      travelDate: daysFromToday(-90),
      text: 'Three nights of cloud and then on the last night the sky turned green for almost an hour. Rent a car if you can, the tours are expensive.',
    },
    {
      author: omar._id,
      destination: byCity.Kyoto._id,
      title: 'Rainy day in Arashiyama',
      travelDate: daysFromToday(-30),
      text: 'Rain kept the crowds away from the bamboo grove. Finished the day at a small onsen near the station.',
    },
    {
      author: maya._id,
      destination: byCity.Istanbul._id,
      title: 'Sunset from Galata',
      travelDate: daysFromToday(-15),
      text: 'Skipped the queue for the tower and watched the sunset from the street below instead. Same view, no ticket.',
    },
  ]);

  // ---- reviews ----
  const reviews = await Review.insertMany([
    { author: maya._id, destination: byCity.Hunza._id, rating: 5, comment: 'Most beautiful place I have been to.' },
    { author: omar._id, destination: byCity.Hunza._id, rating: 4, comment: 'Amazing, but the road is tiring.' },
    { author: maya._id, destination: byCity.Kyoto._id, rating: 5, comment: 'Go early, everything is calmer.' },
    { author: omar._id, destination: byCity.Lisbon._id, rating: 4, comment: 'Great food, lots of hills.' },
    { author: maya._id, destination: byCity.Istanbul._id, rating: 4, comment: '' },
    { author: omar._id, destination: byCity.Istanbul._id, rating: 3, comment: 'Too crowded in summer, go in spring.' },
  ]);

  // ---- trip plan for Maya ----
  await TripPlan.create({
    owner: maya._id,
    title: 'Spring in Lisbon',
    startDate: daysFromToday(40),
    endDate: daysFromToday(43),
    destinations: [byCity.Lisbon._id],
    notes: 'Book the Sintra train tickets online the day before.',
    days: [
      { dayNumber: 1, activities: ['Check in', 'Walk around Alfama', 'Dinner with fado'] },
      { dayNumber: 2, activities: ['Belem Tower', 'Pasteis de Belem'] },
      { dayNumber: 3, activities: ['Day trip to Sintra'] },
    ],
  });

  // ---- accommodations ----
  const stays = await Accommodation.insertMany([
    { destination: byCity.Lisbon._id, name: 'Alfama Rooftop Guesthouse', type: 'guesthouse', pricePerNight: 70, maxGuests: 2, description: 'Small rooms, big terrace.' },
    { destination: byCity.Lisbon._id, name: 'Tagus River Hostel', type: 'hostel', pricePerNight: 25, maxGuests: 1, description: 'Dorm beds, free breakfast.' },
    { destination: byCity.Kyoto._id, name: 'Gion Machiya House', type: 'apartment', pricePerNight: 140, maxGuests: 4, description: 'Restored wooden townhouse.' },
    { destination: byCity.Hunza._id, name: 'Karimabad View Hotel', type: 'hotel', pricePerNight: 45, maxGuests: 3, description: 'Rooms facing Rakaposhi.' },
    { destination: byCity.Istanbul._id, name: 'Sultanahmet Courtyard Hotel', type: 'hotel', pricePerNight: 85, maxGuests: 2, description: 'Five minutes from Hagia Sophia.' },
    { destination: byCity['Cape Town']._id, name: 'Sea Point Apartment', type: 'apartment', pricePerNight: 95, maxGuests: 4, description: 'Walk to the promenade.' },
  ]);

  // ---- booking requests ----
  await BookingRequest.insertMany([
    { member: maya._id, accommodation: stays[0]._id, checkIn: daysFromToday(40), checkOut: daysFromToday(43), guests: 2, status: 'Pending', note: 'Late check-in please' },
    { member: omar._id, accommodation: stays[3]._id, checkIn: daysFromToday(20), checkOut: daysFromToday(24), guests: 1, status: 'Confirmed' },
    { member: omar._id, accommodation: stays[2]._id, checkIn: daysFromToday(70), checkOut: daysFromToday(75), guests: 3, status: 'Pending' },
  ]);

  // ---- one open report so the admin page is not empty ----
  await Report.create({
    reporter: maya._id,
    targetType: 'review',
    targetId: reviews[5]._id,
    reason: 'Not really a review of the city, just about the weather.',
  });

  console.log(`Seeded: 3 users, ${destinations.length} destinations, ${stories.length} stories, ${reviews.length} reviews,`);
  console.log(`        1 trip plan, ${stays.length} accommodations, 3 booking requests, 1 report`);
  console.log('Admin:   admin@journeyhub.test / Admin123!');
  console.log('Members: maya@journeyhub.test / Member123!   omar@journeyhub.test / Member123!');
}

seed()
  .catch((err) => {
    console.error('Seeding failed:', err.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
