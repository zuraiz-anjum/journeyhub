// Quick end-to-end check of the API against a running server.
//
//   1. npm run seed
//   2. npm start            (in another terminal)
//   3. npm run smoke
//
// After restarting the server you can run `npm run smoke -- --after-restart`
// to check that the data written by the first run is still there.
//
// The checks expect fresh demo data, so seed again before each full run.
// Needs Node 18+ (uses the built-in fetch).

const BASE = process.env.API_URL || 'http://localhost:5000/api';
const afterRestart = process.argv.includes('--after-restart');

let passed = 0;
let failed = 0;

// very small cookie jar: one per logged in user
function client() {
  let cookie = '';
  return async function request(method, path, body) {
    const res = await fetch(BASE + path, {
      method,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(cookie ? { Cookie: cookie } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const setCookie = res.headers.get('set-cookie');
    if (setCookie) cookie = setCookie.split(';')[0];
    let data = null;
    try {
      data = await res.json();
    } catch {
      // empty body
    }
    return { status: res.status, data };
  };
}

function check(label, condition, detail = '') {
  if (condition) {
    passed++;
    console.log(`PASS  ${label}`);
  } else {
    failed++;
    console.log(`FAIL  ${label} ${detail}`);
  }
}

function expectStatus(label, res, status) {
  const msg = res.data && res.data.message ? ` "${res.data.message}"` : '';
  check(`${label} -> ${res.status}${msg}`, res.status === status, `(expected ${status})`);
}

function dateFromToday(days) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

async function login(email, password) {
  const request = client();
  const res = await request('POST', '/auth/login', { email, password });
  return { request, res };
}

async function mainChecks() {
  const guest = client();

  // auth
  const admin = await login('admin@journeyhub.test', 'Admin123!');
  expectStatus('admin login', admin.res, 200);
  check('admin has admin role', admin.res.data?.user?.role === 'admin');
  const maya = await login('maya@journeyhub.test', 'Member123!');
  expectStatus('member login (maya)', maya.res, 200);
  const omar = await login('omar@journeyhub.test', 'Member123!');
  expectStatus('member login (omar)', omar.res, 200);
  expectStatus('wrong password', (await login('maya@journeyhub.test', 'nope')).res, 401);

  expectStatus('guest GET /trips (protected)', await guest('GET', '/trips'), 401);
  expectStatus('guest POST /stories (protected)', await guest('POST', '/stories', { title: 'x' }), 401);
  expectStatus('guest GET /bookings (protected)', await guest('GET', '/bookings'), 401);

  // look up some ids
  const { data } = await guest('GET', '/destinations');
  const city = Object.fromEntries(data.destinations.map((d) => [d.city, d]));
  check('destination list loads for guests', data.destinations.length > 0);
  check('archived destination hidden from guests', !city.Marrakesh);

  expectStatus(
    'member tries to create a destination (admin only)',
    await maya.request('POST', '/destinations', { city: 'X', description: 'y', estimatedBudget: 1 }),
    403
  );
  const newDest = await admin.request('POST', '/destinations', {
    city: 'Smoke Town',
    description: 'Created by the smoke test',
    estimatedBudget: 100,
  });
  expectStatus('admin creates a destination', newDest, 201);
  expectStatus(
    'admin archives it',
    await admin.request('PATCH', `/destinations/${newDest.data.destination._id}/archive`, { archived: true }),
    200
  );

  // stories
  const story = await maya.request('POST', '/stories', {
    destination: city.Lisbon._id,
    title: 'Smoke test story',
    travelDate: dateFromToday(-10),
    text: 'First version of the text.',
  });
  expectStatus('maya creates a story', story, 201);
  const storyId = story.data.story._id;

  const edited = await maya.request('PUT', `/stories/${storyId}`, { text: 'Edited text.' });
  expectStatus('maya edits her story', edited, 200);
  check('story text was updated', edited.data?.story?.text === 'Edited text.');
  expectStatus("omar edits maya's story", await omar.request('PUT', `/stories/${storyId}`, { title: 'hacked' }), 403);
  expectStatus("omar deletes maya's story", await omar.request('DELETE', `/stories/${storyId}`), 403);
  expectStatus('story with future travel date', await maya.request('POST', '/stories', {
    destination: city.Lisbon._id,
    title: 'Future',
    travelDate: dateFromToday(30),
    text: 'x',
  }), 400);
  expectStatus('maya deletes her story', await maya.request('DELETE', `/stories/${storyId}`), 200);
  expectStatus('deleted story is gone', await guest('GET', `/stories/${storyId}`), 404);

  const feed = await guest('GET', '/stories?page=2&limit=6');
  check(`story feed page 2 (total ${feed.data?.total}, pages ${feed.data?.totalPages})`, feed.status === 200 && feed.data.page === 2);
  const search = await guest('GET', '/stories?q=bamboo');
  check(`story search "bamboo" finds ${search.data?.total} story`, search.data?.total === 1);

  // reviews
  const mayaKyoto = await maya.request('GET', `/reviews/mine?destination=${city.Kyoto._id}`);
  const reviewId = mayaKyoto.data.review._id;
  expectStatus("omar edits maya's review", await omar.request('PUT', `/reviews/${reviewId}`, { rating: 1 }), 403);
  expectStatus("omar deletes maya's review", await omar.request('DELETE', `/reviews/${reviewId}`), 403);
  expectStatus('maya sets rating 7 on her review', await maya.request('PUT', `/reviews/${reviewId}`, { rating: 7 }), 400);
  expectStatus('omar posts rating 0', await omar.request('POST', '/reviews', { destination: city.Reykjavik._id, rating: 0 }), 400);
  expectStatus('omar posts rating 4.5', await omar.request('POST', '/reviews', { destination: city.Reykjavik._id, rating: 4.5 }), 400);
  expectStatus('omar reviews Hunza a second time', await omar.request('POST', '/reviews', { destination: city.Hunza._id, rating: 2 }), 409);
  expectStatus('maya updates her own review', await maya.request('PUT', `/reviews/${reviewId}`, { rating: 4 }), 200);
  check(`Hunza average rating is 4.5 (got ${city.Hunza.averageRating})`, city.Hunza.averageRating === 4.5);

  expectStatus('omar saves Kyoto to favourites', await omar.request('POST', `/users/me/favourites/${city.Kyoto._id}`), 201);
  const dash = await omar.request('GET', '/users/me/dashboard');
  check(`omar dashboard counts ${JSON.stringify(dash.data?.counts)}`, dash.data?.counts?.savedPlaces === 2);

  // trip plans
  expectStatus('trip with end date before start date', await maya.request('POST', '/trips', {
    title: 'Backwards trip',
    startDate: dateFromToday(10),
    endDate: dateFromToday(5),
  }), 400);
  const trip = await maya.request('POST', '/trips', {
    title: 'Smoke persistence trip',
    startDate: dateFromToday(10),
    endDate: dateFromToday(12),
    destinations: [city.Kyoto._id],
    days: [{ dayNumber: 1, activities: ['Arrive', 'Nishiki Market'] }],
  });
  expectStatus('maya creates a trip plan', trip, 201);
  const tripId = trip.data.trip._id;
  expectStatus('day number outside the trip', await maya.request('PUT', `/trips/${tripId}`, {
    days: [{ dayNumber: 9, activities: ['x'] }],
  }), 400);
  expectStatus("omar opens maya's private trip", await omar.request('GET', `/trips/${tripId}`), 403);
  expectStatus("omar deletes maya's trip", await omar.request('DELETE', `/trips/${tripId}`), 403);

  // bookings
  const kyotoStays = await guest('GET', `/accommodations?destination=${city.Kyoto._id}`);
  const stay = kyotoStays.data.accommodations[0];
  expectStatus('booking with check-out before check-in', await maya.request('POST', '/bookings', {
    accommodation: stay._id,
    checkIn: dateFromToday(20),
    checkOut: dateFromToday(18),
    guests: 2,
  }), 400);
  expectStatus('booking with too many guests', await maya.request('POST', '/bookings', {
    accommodation: stay._id,
    checkIn: dateFromToday(20),
    checkOut: dateFromToday(22),
    guests: stay.maxGuests + 1,
  }), 400);
  const booking = await maya.request('POST', '/bookings', {
    accommodation: stay._id,
    checkIn: dateFromToday(20),
    checkOut: dateFromToday(22),
    guests: 2,
  });
  expectStatus('maya creates a booking request', booking, 201);
  check('new booking is Pending', booking.data?.booking?.status === 'Pending');
  const bookingId = booking.data.booking._id;
  expectStatus("omar cancels maya's booking", await omar.request('PATCH', `/bookings/${bookingId}/cancel`), 403);
  const cancelled = await maya.request('PATCH', `/bookings/${bookingId}/cancel`);
  expectStatus('maya cancels her Pending booking', cancelled, 200);
  check('booking is now Cancelled', cancelled.data?.booking?.status === 'Cancelled');
  expectStatus('cancel it again (not Pending any more)', await maya.request('PATCH', `/bookings/${bookingId}/cancel`), 409);

  const omarBookings = await omar.request('GET', '/bookings?status=Pending');
  const omarPending = omarBookings.data.bookings[0];
  expectStatus('member tries to confirm a booking', await omar.request('PATCH', `/bookings/${omarPending._id}/status`, { status: 'Confirmed' }), 403);
  const confirmed = await admin.request('PATCH', `/bookings/${omarPending._id}/status`, { status: 'Confirmed' });
  expectStatus("admin confirms omar's booking", confirmed, 200);
  check('booking is now Confirmed', confirmed.data?.booking?.status === 'Confirmed');
  expectStatus('omar cancels a Confirmed booking', await omar.request('PATCH', `/bookings/${omarPending._id}/cancel`), 409);
  const mayaOnly = await maya.request('GET', '/bookings');
  check('members only see their own bookings', mayaOnly.data.bookings.every((b) => b.member._id === maya.res.data.user._id));

  // reports and moderation
  const mayaStories = await maya.request('GET', '/stories?mine=true');
  const target = mayaStories.data.stories.find((s) => s.title === 'Apricot season in Hunza');
  expectStatus('maya reports her own story', await maya.request('POST', '/reports', { targetType: 'story', targetId: target._id, reason: 'test' }), 400);
  const report = await omar.request('POST', '/reports', {
    targetType: 'story',
    targetId: target._id,
    reason: 'Smoke test report, please hide',
  });
  expectStatus("omar reports maya's story", report, 201);
  expectStatus('member opens the report list', await omar.request('GET', '/reports'), 403);
  const open = await admin.request('GET', '/reports?status=open');
  check(`admin sees ${open.data?.reports?.length} open reports`, open.data?.reports?.some((r) => r._id === report.data.report._id));
  const hidden = await admin.request('PATCH', `/reports/${report.data.report._id}`, { action: 'hide' });
  expectStatus('admin hides the reported story', hidden, 200);
  expectStatus('hidden story for guests', await guest('GET', `/stories/${target._id}`), 404);
  const ownerView = await maya.request('GET', `/stories/${target._id}`);
  check('owner can still open her hidden story', ownerView.status === 200 && ownerView.data.story.hidden === true);
  const reviewReport = open.data.reports.find((r) => r.targetType === 'review');
  expectStatus('admin dismisses the seeded review report', await admin.request('PATCH', `/reports/${reviewReport._id}`, { action: 'dismiss' }), 200);
  expectStatus('handle the same report twice', await admin.request('PATCH', `/reports/${reviewReport._id}`, { action: 'hide' }), 409);

  // bad input
  expectStatus('invalid id in url', await guest('GET', '/stories/not-an-id'), 400);
  expectStatus('unknown route', await guest('GET', '/nothing-here'), 404);

  expectStatus('logout', await maya.request('POST', '/auth/logout'), 200);
}

// Run after restarting the server: data from the first run must still be there.
async function persistenceChecks() {
  const maya = await login('maya@journeyhub.test', 'Member123!');
  const omar = await login('omar@journeyhub.test', 'Member123!');
  expectStatus('maya can still log in after restart', maya.res, 200);

  const trips = await maya.request('GET', '/trips');
  const trip = trips.data.trips.find((t) => t.title === 'Smoke persistence trip');
  check('trip plan from the first run is still there', !!trip);

  const bookings = await omar.request('GET', '/bookings?status=Confirmed');
  check(`omar has ${bookings.data.bookings.length} confirmed bookings (seed 1 + smoke 1)`, bookings.data.bookings.length === 2);

  const mayaBookings = await maya.request('GET', '/bookings?status=Cancelled');
  check('cancelled booking still cancelled', mayaBookings.data.bookings.length === 1);

  const feed = await client()('GET', '/stories?q=Apricot');
  check('hidden story still hidden from the feed', feed.data.total === 0);

  const dash = await omar.request('GET', '/users/me/dashboard');
  check(`omar dashboard after restart ${JSON.stringify(dash.data.counts)}`, dash.data.counts.savedPlaces === 2);
}

(afterRestart ? persistenceChecks() : mainChecks())
  .catch((err) => {
    failed++;
    console.error('Smoke test crashed:', err.message);
    console.error('(the checks expect fresh demo data, run `npm run seed` and try again)');
  })
  .finally(() => {
    console.log(`\n${passed} passed, ${failed} failed`);
    process.exitCode = failed > 0 ? 1 : 0;
  });
