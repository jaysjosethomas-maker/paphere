# PAPHere

A clickable web app of PAPHere, the peer-to-peer parking and EV charging marketplace described in the PAPHere Product Requirements Document v1.0 (24 Oct 2026).

Everything runs in the browser on one shared, simulated backend, so a booking made in the driver app appears in the host app, guard mode and the consoles. Outside services (SMS, payment aggregator, KYC, DigiLocker, wallet issuer, WhatsApp, maps) are simulated. Maps are illustrative drawings, not a map provider.

## Run it

Open `index.html` in a browser, or serve the folder with any static server and visit it. No build step and no dependencies beyond Google Fonts.

To publish with GitHub Pages: Settings → Pages → deploy from the `main` branch, root folder.

## What's inside

Use the switcher in the top bar to change surface.

| Surface | Covers |
| --- | --- |
| Driver app | Sign-in, search, booking, payment, pass, arrival, session, space protection, passes, wallet, tools, account |
| Host app | Listing wizard, verification, Today with I'm out / I'm back, calendar and relay, listing, charger, earnings, performance |
| Guard mode | PIN, today's arrivals, scan or type a code, plate mismatch, offline check-in |
| Attendant app | Public-lot tickets, UPI or cash, shift close with cash variance |
| Pay at lot | QR-board web flow at government lots |
| WhatsApp booking | Book, pay, pass and extend in chat |
| Operations console | Health metrics, live ops, verification, bookings, cases, trust and safety, finance ledger, policies, growth, notifications, events, audit, staff roles |
| Business, association, authority, fleet and partner consoles | As specified in the PRD |
| Website | Landing pages, location page, legal pages |
| PRD coverage | Every section and all 222 requirements, decisions, risks and hypotheses, linked to where they live |

The clock in the top bar moves simulated time forward, which drives hold expiry, reminders, no-shows, overstay, auto-declines and payouts. "Reset demo" restores the sample data, which is otherwise kept in the browser's local storage.

## Code

| File | Contents |
| --- | --- |
| `app/core.js` | Data store, seed data, pricing, inventory, booking state machine, ledger, payouts, notifications, UI framework |
| `app/driver.js` | Driver app |
| `app/host.js` | Host app |
| `app/field.js` | Guard mode, attendant app, pay at lot, WhatsApp |
| `app/consoles.js` | Web consoles and website |
| `app/prd.js` | PRD coverage tracker |
| `app/app.css` | Styles, light and dark themes |

People, places and prices are sample data.
