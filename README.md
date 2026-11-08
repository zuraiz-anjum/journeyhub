# JourneyHub

JourneyHub is a travel community and trip planner. Members can browse destinations, write travel stories,
rate and save places, plan trips day by day and send (simulated) accommodation requests. An admin account
looks after the destination catalogue, accommodation listings, booking requests and reported content.

Built for our Web Programming course project with React, Node.js/Express and MongoDB.

## Features

- **Accounts:** sign up, log in, log out, edit profile (name, home city, bio). One seeded admin account.
- **Destinations:** admin adds, edits and archives destinations (city, description, places to visit,
  estimated budget, image URL). Everyone can search by city/country and filter by budget.
- **Travel stories:** members write, edit and delete their own stories linked to a destination. The story
  feed has search, a destination filter and pagination.
- **Reviews and favourites:** one review (1 to 5 stars) per member per destination, which the author can edit
  or delete. The average rating is calculated from the stored reviews. Members can save destinations to
  their favourites.
- **Trip plans:** title, start and end date, destinations and a day by day activity list. Plans are private
  to their owner.
- **Moderation:** members report a story or review with a reason. The admin dismisses the report or hides
  the content. Members have a dashboard with their story, saved place, trip plan, review and pending
  booking counts.
- **Accommodation requests:** the admin manages sample listings for each destination. Members request a stay
  with dates and guest count, can see their booking history and cancel requests that are still Pending.
  The admin confirms or rejects requests. No payments are involved.

## Tech stack

| Part     | Used                                                                         |
| -------- | ---------------------------------------------------------------------------- |
| Frontend | React 19 + Vite, TypeScript, React Router, Redux Toolkit (login state), axios, Bootstrap 5 |
| Backend  | Node.js, Express 5, JWT in an httpOnly cookie, bcryptjs for password hashing |
| Database | MongoDB with Mongoose                                                        |

## Project structure

```
journeyhub/
  server/
    src/
      app.js              express app, middleware and routes
      index.js            connects to MongoDB and starts the server
      config/db.js
      middleware/         auth.js (requireAuth, requireRole), errorHandler.js
      models/             User, Destination, Story, Review, TripPlan, Report, Accommodation, BookingRequest
      routes/             one router per resource
      utils/              validation helpers, rating averages, HttpError
    scripts/
      seed.js             demo data
      smoke.js            end to end API check
  client/
    src/
      api/client.ts       axios instance + error message helper
      store/              Redux store and auth slice
      hooks/useApi.ts     small hook for GET requests with loading/error state
      components/         NavBar, ProtectedRoute, cards, forms, status messages...
      pages/              one file per page, admin pages in pages/admin
      utils/              date/money formatting and form validation
      types.ts            TypeScript types for the data models
```

## Setup

You need **Node.js 18 or newer** and **MongoDB** (version 6 or 7).

### 1. Start MongoDB

Either install MongoDB Community Server locally, or run it with Docker:

```bash
docker run -d --name journeyhub-mongo -p 27017:27017 mongo:7
```

(Next time just run `docker start journeyhub-mongo`.)

### 2. Server

```bash
cd server
npm install
cp .env.example .env        # on Windows cmd: copy .env.example .env
npm run seed                # creates the demo accounts and sample data
npm run dev                 # or: npm start
```

The API runs on http://localhost:5000. Change `JWT_SECRET` in `.env` to any long random string.

| Variable         | Meaning                                    | Default                                  |
| ---------------- | ------------------------------------------ | ---------------------------------------- |
| `PORT`           | API port                                   | `5000`                                   |
| `MONGO_URI`      | MongoDB connection string                  | `mongodb://127.0.0.1:27017/journeyhub`   |
| `JWT_SECRET`     | secret used to sign the login token        | (set your own)                           |
| `JWT_EXPIRES_IN` | how long a login lasts                     | `7d`                                     |
| `CLIENT_URL`     | origin allowed by CORS                     | `http://localhost:5173`                  |

### 3. Client

In a second terminal:

```bash
cd client
npm install
npm run dev
```

Open http://localhost:5173. The Vite dev server forwards every `/api` request to the Express server, so
the login cookie works without any extra CORS setup.

To make a production build run `npm run build` (this also type checks the project).

### 4. Smoke test (optional)

With the server running on freshly seeded data:

```bash
cd server
npm run seed
npm run smoke
```

It logs in as the demo users and checks the main rules: ownership (403), login required (401), bad
ratings and dates (400), booking cancel and confirm, report and hide. After restarting the server,
`npm run smoke -- --after-restart` checks that the data from the first run is still in the database.

## Demo accounts

All accounts are made up and are created by `npm run seed`.

| Role   | Email                  | Password     |
| ------ | ---------------------- | ------------ |
| Admin  | admin@journeyhub.test  | `Admin123!`  |
| Member | maya@journeyhub.test   | `Member123!` |
| Member | omar@journeyhub.test   | `Member123!` |

The seed also adds 7 destinations (one of them archived), 8 stories, 6 reviews, a trip plan, 6 accommodation
listings, 3 booking requests and one open report.

## How a request flows from the React form to the database

Example: a member posts a review on a destination page.

1. **Form (React).** `ReviewSection.tsx` keeps the rating and comment in `useState`. On submit it runs
   `validateRating()` from `utils/validation.ts`, so a missing rating is caught before anything is sent.
2. **Request.** The component calls `api.post('/reviews', { destination, rating, comment })`. `api` is the
   axios instance in `api/client.ts` with `withCredentials: true`, so the browser sends the httpOnly
   `token` cookie that was set at login. In development Vite proxies `/api` to `localhost:5000`.
3. **Express.** `app.js` parses the JSON body and the cookies, then hands the request to
   `routes/reviews.js`.
4. **Middleware.** `requireAuth` verifies the JWT and loads the user from MongoDB (401 if it is missing or
   invalid). `requireRole('member')` makes sure it is a member and not the admin (403 otherwise).
5. **Route handler.** It checks the rating is a whole number from 1 to 5, the destination id is valid and
   the destination exists, and that this member has not reviewed it before (409). Any problem is thrown as
   an `HttpError`.
6. **Mongoose and MongoDB.** `Review.create()` validates the document against the schema again (rating
   min/max, required fields) and saves it. A unique index on `{ author, destination }` stops duplicates
   even if two requests arrive at the same time.
7. **Response.** The server answers `201` with the saved review. If anything failed, `errorHandler.js`
   turns it into a JSON `{ message }` with the right status code.
8. **Back in React.** On success the component shows a success message and reloads the review list and the
   destination, whose average rating is computed from the stored reviews with an aggregation
   (`utils/ratings.js`). On error, `getErrorMessage()` reads the server message and it is shown in an
   `ErrorAlert`.

The login state itself lives in Redux (`store/authSlice.ts`). When the app loads it calls `GET /api/auth/me`
to restore the session from the cookie; `ProtectedRoute` and the navbar read the user from the store.
Hiding a button is only for the UI: every protected route checks the cookie, role and ownership on the
server.

## API routes

All routes start with `/api`. "Owner" means the logged in member who created the record.

| Method | Route | Access | Description |
| ------ | ----- | ------ | ----------- |
| GET | `/health` | public | server check |
| POST | `/auth/register` | public | create a member account and log in |
| POST | `/auth/login` | public | log in, sets the `token` cookie |
| POST | `/auth/logout` | public | clears the cookie |
| GET | `/auth/me` | logged in | current user |
| GET | `/users/me` | logged in | profile |
| PUT | `/users/me` | logged in | update name, home city, bio |
| GET | `/users/me/dashboard` | member | counts for the dashboard |
| GET | `/users/me/favourites` | member | saved destinations |
| POST | `/users/me/favourites/:destinationId` | member | save a destination |
| DELETE | `/users/me/favourites/:destinationId` | member | remove from favourites |
| GET | `/destinations?city=&minBudget=&maxBudget=` | public | list with average rating (admin can add `includeArchived=true`) |
| GET | `/destinations/:id` | public | details, average rating, saved or not |
| POST | `/destinations` | admin | add a destination |
| PUT | `/destinations/:id` | admin | edit a destination |
| PATCH | `/destinations/:id/archive` | admin | archive or restore (`{ archived: true/false }`) |
| GET | `/stories?q=&destination=&mine=true&page=&limit=` | public | paginated story feed |
| GET | `/stories/:id` | public | one story (hidden stories only for the owner and admin) |
| POST | `/stories` | member | create a story |
| PUT | `/stories/:id` | owner | edit a story |
| DELETE | `/stories/:id` | owner | delete a story |
| GET | `/reviews?destination=` | public | reviews of a destination |
| GET | `/reviews/mine?destination=` | logged in | the member's own review for a destination |
| POST | `/reviews` | member | add a review (one per destination) |
| PUT | `/reviews/:id` | owner | edit own review |
| DELETE | `/reviews/:id` | owner | delete own review |
| GET | `/trips` | member | own trip plans |
| GET | `/trips/:id` | owner | one trip plan |
| POST | `/trips` | member | create a trip plan |
| PUT | `/trips/:id` | owner | edit details, destinations or day activities |
| DELETE | `/trips/:id` | owner | delete a trip plan |
| POST | `/reports` | member | report a story or review |
| GET | `/reports?status=open` | admin | list reports with a preview of the content |
| PATCH | `/reports/:id` | admin | `{ action: 'dismiss' }` or `{ action: 'hide' }` |
| GET | `/accommodations?destination=` | public | active listings (admin can add `includeInactive=true`) |
| GET | `/accommodations/:id` | public | one listing |
| POST | `/accommodations` | admin | add a listing |
| PUT | `/accommodations/:id` | admin | edit a listing or set it inactive |
| DELETE | `/accommodations/:id` | admin | delete a listing that has no booking requests |
| GET | `/bookings?status=` | logged in | members see their own history, the admin sees all |
| POST | `/bookings` | member | request a stay (dates, guests, note) |
| PATCH | `/bookings/:id/cancel` | owner | cancel a Pending request |
| PATCH | `/bookings/:id/status` | admin | `{ status: 'Confirmed' }` or `{ status: 'Rejected' }` for Pending requests |

Status codes used: `200/201` success, `400` invalid input, `401` not logged in, `403` wrong role or not the
owner, `404` not found, `409` conflict (duplicate review, already handled, not Pending any more).

## Validation rules

The same rules are checked in the React forms and again on the server:

- required fields on every form; image URLs must start with `http://` or `https://`
- ratings are whole numbers from 1 to 5
- trip end date cannot be before the start date (trips are at most 60 days); day numbers must fall inside the trip
- booking check-in cannot be in the past, check-out must be after check-in, guests between 1 and the listing's maximum
- story travel dates cannot be in the future
- members can only change their own stories, reviews, trip plans and booking requests

## Contributions

| Member | Name | Work done |
| ------ | ---- | --------- |
| Member 1 | ______________ | ______________________________ |
| Member 2 | ______________ | ______________________________ |
