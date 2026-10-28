# Palm Horizon Resort & Spa — Hotel & Resort Management System

A web-based hotel and resort management system. Guests browse rooms, create an account and request bookings online; front-desk staff manage the live room inventory, confirm requests, take walk-in bookings and check guests out from an admin dashboard.

Built with plain **HTML, CSS and JavaScript** (no framework, no build step) and **Firebase** for authentication and the database.

---

## Features

| Page | Who | What it does |
|---|---|---|
| `index.html` | Everyone | Home page: hero with quick-booking bar (dates, guests, room → booking page), rooms carousel, facilities, contact. Layout inspired by [TGI Hotels](https://www.tgihotels.com/) |
| `rooms.html` | Everyone | Room catalogue with search, category filter, price sort and live "rooms available now" badges |
| `login.html` | Everyone | Sign in, create account, reset password (Firebase Authentication) |
| `booking.html` | Signed-in guests | Book a stay with validation and price estimate (5% tax); see and cancel own reservations live |
| `admin.html` | Admins only | KPI cards, live room grid, online booking requests, room assignment, walk-in bookings, check-out, housekeeping, reservation search |

**Booking lifecycle**

```
Guest books online ──► Pending ──(admin assigns a room)──► Confirmed ──(check-out)──► CheckedOut
                         │                                     ▲                         room → cleaning
                         └──► Cancelled (guest or admin)       │                         (click tile → available)
Admin walk-in booking ─────────────────────────────────────────┘
```

**Security** — enforced in `firestore.rules`, not just in the browser:

- Guests can only read their own bookings and can only create `Pending` requests for themselves.
- Prices are checked server-side, so a guest can't change the amount they're charged.
- Nobody can make themselves an admin; roles are changed only in the Firebase Console.
- Only admins can change rooms, confirm or check out bookings, or see other guests' data.
- Room assignment uses Firestore transactions, so the same room can never be given to two guests.

---

## Project structure

```
├── index.html              Home page (public)
├── rooms.html              Room catalogue (public)
├── login.html              Sign in / create account
├── booking.html            Guest booking page (sign-in required)
├── admin.html              Executive operations dashboard (admin role required)
├── css/
│   ├── site.css            Shared design system: colours, fonts, header, footer, buttons, fields
│   ├── home.css
│   ├── rooms.css
│   ├── auth.css
│   ├── booking.css
│   └── admin.css
├── js/
│   ├── site.js             Shared header/menu/footer behaviour (every guest page)
│   ├── firebase-config.js  ← your Firebase project keys go here
│   ├── firebase.js         Firebase initialisation (app, auth, db)
│   ├── auth.js             Sign in/up/out, user roles, page guards, nav widget
│   ├── db.js               All Firestore reads/writes (rooms, bookings)
│   ├── data.js             Shared room catalogue, prices, room inventory, helpers
│   ├── home.js
│   ├── rooms.js
│   ├── login.js
│   ├── booking.js
│   └── admin.js
├── images/                 Room photos
├── firestore.rules         Database security rules
├── firebase.json           Firebase Hosting / emulator config
└── package.json            npm scripts (start, emulators, deploy)
```

### Database (Cloud Firestore)

| Collection | Document ID | Fields |
|---|---|---|
| `users` | Auth UID | `name`, `email`, `role` (`guest` \| `admin`), `createdAt` |
| `rooms` | Room number (`"101"`) | `roomNo`, `typeId`, `status` (`available` \| `occupied` \| `cleaning`) |
| `bookings` | auto ID | `code` (e.g. `RES-4F2A9C`), `uid`, `guestName`, `email`, `phone`, `typeId`, `roomNo`, `checkIn`, `checkOut`, `guests`, `nights`, `rate`, `subtotal`, `tax`, `total`, `status`, `payment`, `source` (`online` \| `walk-in`), `specialRequest`, `createdAt` |

The `rooms` collection fills itself with 12 default units (from `DEFAULT_INVENTORY` in `js/data.js`) the first time an admin opens the dashboard.

---

## Getting started

### Requirements

- [Node.js](https://nodejs.org) 18 or newer (used only to run a local web server and the Firebase tools)
- A Google account for Firebase, **or** Java 11+ to use the local emulators instead (see below)

> The pages use JavaScript modules, so they **must be opened through a web server**. Double-clicking an `.html` file (`file://`) will not work. VS Code's *Live Server* extension also works.

### Option A — Connect to a real Firebase project

1. **Create the project.** Go to [console.firebase.google.com](https://console.firebase.google.com), click **Add project** and follow the steps (Analytics is optional).
2. **Turn on login.** Go to **Build → Authentication → Get started → Sign-in method** and enable **Email/Password**.
3. **Create the database.** Go to **Build → Firestore Database → Create database**, choose a location and start in **production mode**.
4. **Add the security rules.** In **Firestore → Rules**, replace the contents with [`firestore.rules`](firestore.rules) and click **Publish**.
5. **Get the web config.** In **Project settings → General → Your apps**, click the **Web (`</>`)** icon, register the app and copy the `firebaseConfig` values into [`js/firebase-config.js`](js/firebase-config.js).
6. **Run the site:**
   ```bash
   npm start
   ```
   Then open <http://localhost:5000>.

### Option B — Local emulators (no Firebase account needed)

Good for development and demos. All data is local and is wiped when the emulators stop.

1. In `js/firebase-config.js` set `export const useEmulators = true;`
2. In one terminal run `npm run emulators` (needs Java 11+). The emulator UI is at <http://localhost:4000>.
3. In a second terminal run `npm start`, then open <http://localhost:5000>.

> Set `useEmulators` back to `false` before committing.

### Creating the first admin account

Every new account is a **guest**. To make a staff member an admin:

1. Sign up on `login.html` with the staff email.
2. In the Firebase Console (or emulator UI at <http://localhost:4000/firestore>), open **Firestore → `users` → that user's document**.
3. Change the `role` field from `guest` to `admin`.
4. Sign in again. Admins are sent to `admin.html`.

---

## Deploying (Firebase Hosting)

```bash
npx firebase-tools login
npx firebase-tools use --add      # pick your project
npm run deploy                    # uploads the site + firestore.rules
```

The site will be live at `https://<your-project-id>.web.app`.

---

## Design system

All guest pages (`index`, `rooms`, `booking`, `login`) load **`css/site.css`** first, then their own page stylesheet. It defines the colour and font tokens (Cormorant Garamond for headings, Manrope for text, brass gold `#b8913f`), buttons, form fields, messages, the header and the footer. The header and footer markup is identical on every page, so change it everywhere at once. The admin dashboard keeps its dark staff layout but uses the same fonts and gold.

## Changing rooms or prices

Room types, prices, capacities and the room inventory all live in **`js/data.js`**. If you change a price, also update the matching `roomRates()` map in **`firestore.rules`**. The rules check prices on the server, and guest bookings at the new price will be rejected until both files match.

---

## Team

| Module | Contributor | Original branch |
|---|---|---|
| Admin dashboard | Krishna201i, Aman Mudgal, annanya1606 | `feature/admin` |
| Rooms & suites | Aman Saraswat | `feature/rooms` |
| Customer booking | Amit Kumar | `feature/booking` |
| Authentication, database & integration | annanya1606 | `integration/firebase-auth` |

## Tech stack

- HTML5, CSS3, vanilla JavaScript (ES modules)
- Firebase Authentication (email + password)
- Cloud Firestore (real-time listeners, transactions, security rules)
- Firebase Hosting (optional)
