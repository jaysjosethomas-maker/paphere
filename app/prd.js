'use strict';
/* PRD coverage: every section, requirement, decision, risk and hypothesis, mapped to where it lives in the app. */
(function(){
// [id, priority, release, requirement, link, status?, note?]  status: B built (default), S built with simulated outside service, P partial, F future (not built: hardware or R4 integration), D respected by design
const R=`ACC-01|P0|R0|Sign in with mobile number and a 6-digit OTP.|J:driver:ACC-01|S|SMS provider simulated; 123456 works, 5 wrong attempts lock
ACC-02|P0|R0|Minimal profile: name and phone; email and language optional.|driver:profile
ACC-03|P0|R0|One account can hold several roles; the app switches between driver and host modes.|driver:role
ACC-04|P0|R0|Users must declare they are 18 or older.|driver:profile
ACC-05|P0|R1|Active sessions list with "sign out everywhere"; alert on sign-in from a new device.|driver:devices
ACC-06|P0|R1|Sensitive changes (phone number, bank account) need a fresh OTP, notify the old contact, and hold payouts for 24 hours.|J:host:ACC-06
ACC-07|P0|R1|Consent records: privacy notice at sign-up in the chosen language; separate opt-in for marketing; consent can be withdrawn in settings.|driver:privacy
ACC-08|P0|R1|Account deletion from the app.|driver:privacy
ACC-09|P1|R3|Organisation accounts with admins, invitations and roles.|fleet:fleet
VEH-01|P0|R0|Add vehicles: type (two-wheeler, hatchback, sedan, SUV or MUV), registration number, nickname.|J:driver:VEH-01/04
VEH-02|P0|R0|Size class and height determine fit.|J:driver:8.1||Search hides units smaller or lower than the vehicle
VEH-03|P0|R1|The plate appears on the pass and in guard mode; it can be edited until check-in.|J:driver:ACS-03
VEH-04|P1|R2|EV attributes: connectors, maximum AC rate in kW, and whether the driver carries a portable charger.|J:driver:VEH-01/04
VEH-05|P2|R4|Plate ownership checks only through an authorised data source.|driver:vehicles|D|No ownership check and no scraping
VEH-06|P0|R0|One-time vehicle setup: each vehicle is added once and preselected for every booking, pass and public-lot payment.|driver:vehicles
SRC-01|P0|R0|Search by destination (place autocomplete) or by current location; map and list stay in sync.|driver:home
SRC-02|P0|R0|Filters: vehicle, time window or Park now, duration, maximum price, covered, 24×7, guard present, accessible space, monthly, EV (R2).|J:driver:8.1
SRC-03|P0|R0|Each result shows the total price, walking time, fit and a one-line cancellation summary.|J:driver:8.1
SRC-04|P0|R1|Default sort "Best match"; a "How we rank" page explains the factors; any paid placement is labelled.|J:driver:8.1
SRC-05|P0|R0|Availability in results comes from the inventory engine.|J:driver:8.1
SRC-06|P1|R1|When nothing matches, show the nearest options outside the radius and a "notify me" option, and log the unmet demand.|J:driver:SRC-06
SRC-07|P0|R0|Residential spaces show an approximate pin until booked.|J:driver:8.1
SRC-08|P1|R1|Saved places and recent searches.|driver:home
SRC-09|P2|R2|Event pages with event-day inventory.|J:driver:SRC-09
LST-01|P0|R0|Facility record: type, address, pin, entrance pins, hours, access method, rules, amenities, and at least 4 photos.|J:host:8.4
LST-02|P0|R0|Inventory is either numbered spaces or a capacity pool per vehicle class; each carries size class, height clearance, covered and accessibility flags.|business:overview
LST-03|P0|R0|Listing status: draft, submitted, in verification, active, paused by host, suspended by platform, archived.|J:host:VER-04
LST-04|P0|R0|Material edits return the listing to verification; existing bookings stay valid. Price within band and hours apply at once.|J:host:HAC-03
LST-05|P0|R0|Prohibited listings; hosts attest at submission.|J:host:8.4
LST-06|P1|R1|Listing quality score with improvement tips.|J:host:HAC-03
VER-01|P0|R0|Host identity: PAN with name match, bank account by penny drop. Aadhaar never stored.|J:host:8.4|S|KYC vendor simulated
VER-02|P0|R0|Authority-to-list evidence by facility type (section 10.6).|J:host:8.4
VER-03|P0|R0|Site visit by a field agent with a checklist.|ops:verif
VER-04|P0|R0|Decision with reason codes within 72 hours; status visible to the host.|ops:verif
VER-05|P0|R1|Re-verification every 12 months, after a material edit, or after 2 upheld space-protection cases in 30 days.|J:host:HAC-03|P|Material-edit path built; 12-month timer not simulated
VER-06|P1|R1|Verified-driver badge through a consented driving-licence check.|driver:dlcheck|S|DigiLocker simulated
VER-07|P0|R0|Verification documents live in restricted storage; every access is logged.|ops:verif
INV-01|P0|R0|Availability rules: weekly windows, exceptions, blocks, min/max length, buffer, notice, horizon.|J:host:INV-04
INV-02|P0|R0|No over-allocation, buffer included; pools never exceed capacity.|ops:dash||Invariant checked live on the health page
INV-03|P0|R0|Checkout places a 7-minute hold; expired holds release automatically.|J:driver:8.1
INV-04|P0|R1|A host block never silently cancels a confirmed booking.|J:host:INV-04
INV-05|P0|R1|Commercial pools can hold back a safety margin for walk-ins (default 10%).|business:overview
INV-06|P1|R1|Calendar export and a walk-in occupancy counter for operators.|business:overview
INV-07|P2|R4|Occupancy feeds from gates or sensors.|business:overview|F|Hardware; R4
PRC-01|P0|R0|Price models: hourly (first and later hours), flat, daily cap, overnight, monthly.|J:host:HAC-03
PRC-02|P0|R0|Zone bands: minimum and maximum hourly price per zone and vehicle class.|J:host:HAC-03
PRC-03|P0|R0|The total, with an expandable breakdown, is shown before checkout and never grows.|J:driver:8.1
PRC-04|P0|R0|Each booking stores a snapshot of rates, fees, taxes and policy version.|ops:bookings
PRC-05|P1|R1|Promotions and credits apply before payment, on their own line.|J:driver:8.1
PRC-06|P1|R1|Suggested price for hosts from zone data.|J:host:HAC-03
PRC-07|P0|R1|Tax calculation per configuration and invoice data stored per booking.|ops:finance|P|GST treatment waits on OD-06
PRC-08|P2|R2|Event pricing within an event band, labelled.|J:driver:SRC-09
BKG-01|P0|R0|Pre-book: facility, start, end, vehicle; system assigns a unit at confirmation.|J:driver:8.1
BKG-02|P0|R0|At confirmation the server re-checks availability, price and policy.|J:driver:8.1
BKG-03|P0|R0|Confirmation shows reference, address, window, vehicle, total, payment, cancellation rule, access steps and pass.|J:driver:ACS-03
BKG-04|P0|R1|Park-now: open session with a maximum; billed on actual time; free cancellation within 20 min.|J:driver:8.2
BKG-05|P0|R1|Monthly pass: band, start, vehicle, auto-renewal, 7-day notice, pro-rata refund, one swap a month.|driver:monthlybuy
BKG-06|P1|R1|Book for someone else; the pass goes to the driver.|J:driver:8.1
BKG-07|P1|R1|Recurring bookings for up to 4 weeks; each occurrence cancellable alone.|J:driver:8.1
BKG-08|P0|R1|Request-to-book for residential hosts; auto-declined after 15 minutes.|J:driver:BKG-08
BKG-09|P0|R0|Booking status follows the state machine; invalid transitions are refused.|ops:bookings
BKG-10|P0|R0|Booking creation is idempotent on a client-supplied key.|ops:bookings
ACS-01|P0|R0|Pass: signed QR code plus 6-digit code, cached on the phone.|J:driver:ACS-03
ACS-02|P0|R1|Guard mode: per-facility web link with PIN, today's arrivals, scan or type, offline.|J:guard:ACS-02
ACS-03|P0|R0|Check-in by guard, host confirmation, or self check-in inside a 200 m geofence with a photo.|J:driver:ACS-03
ACS-04|P0|R1|Check-out by driver, guard or automatically at end time.|J:guard:ACS-02
ACS-05|P0|R0|Exact address, codes and entrance photo visible until 2 hours after end.|J:driver:ACS-03
ACS-06|P1|R1|Arrival mode within 200 m.|J:driver:8.7
ACS-07|P2|R4|Gate, boom barrier, plate recognition or FASTag-based entry.|guard:pin|F|Hardware; R4
CHG-01|P0|R1|Extend from the app; the longest possible extension is shown.|J:driver:CHG-01/03
CHG-02|P0|R1|Changing a booking is cancel and rebook; only the difference moves.|J:driver:CHG-02/04
CHG-03|P0|R1|Overstay warnings, auto-extension in 15-min steps, overstay fee if the next booking is affected.|J:driver:CHG-01/03||Move the clock past the end time
CHG-04|P0|R0|Driver cancellation with automatic refund calculation and a reason.|J:driver:CHG-02/04
CHG-05|P0|R1|Host cancellation: driver refunded and offered re-accommodation; host penalty.|J:host:INV-04
CHG-06|P0|R1|No-show: no check-in by start plus grace applies the matrix.|J:driver:ACS-03||Move the clock 40 min without checking in
CHG-07|P0|R0|Refunds go to the original payment method; driver sees status and timing.|J:driver:CHG-02/04
EVC-01|P1|R2|A charger is an attribute of a space: connectors, kW, phase, AC/DC, cable, hours.|J:host:EVC-07
EVC-02|P1|R2|Compatibility table; unknown combinations show "Check compatibility".|J:driver:8.6
EVC-03|P1|R2|Priced by time, with "Price is for time connected, not energy delivered".|J:driver:8.6
EVC-04|P1|R2|Estimated energy and range, labelled as an estimate.|J:driver:8.6
EVC-05|P1|R2|Session events (plugged in, charging, stopped, fault) record actor and time.|J:driver:8.6||Book, check in, then use the charging controls
EVC-06|P1|R2|If charging fails, convert to parking-only and refund the charging part.|J:driver:8.6
EVC-07|P1|R2|Safety declarations with photos; any safety report suspends the charger.|J:host:EVC-07
EVC-08|P2|R4|Metered billing from OCPP chargers.|J:host:EVC-07|F|R4 integration
EVC-09|P2|R4|Live charger status from OCPP or partner APIs.|J:host:EVC-07|F|R4 integration
PAY-01|P0|R0|Collect by UPI, cards, netbanking, or the PAPHere wallet.|J:driver:8.1|S|Payment aggregator simulated; toggle a failure in the panel
PAY-02|P0|R0|Payment status reconciles through signed webhooks, with polling fallback.|J:driver:8.1|S|"Payment confirms late" toggle
PAY-03|P0|R1|Split settlement to the host's linked account, after a 24-hour dispute window.|ops:finance|S
PAY-04|P0|R1|Double-entry ledger for every movement.|ops:finance
PAY-05|P0|R1|Weekly host payouts; minimum ₹100; negatives carried forward.|J:host:PAY-05/06
PAY-06|P0|R1|TDS under 194-O, higher rate without PAN; quarterly certificates.|J:host:PAY-05/06
PAY-07|P0|R1|Tax invoices for the platform fee, and the host's supply where registered.|ops:finance|P|Invoice view on the receipt; GST per OD-06
PAY-08|P0|R0|Automatic refunds; manual refunds within role limits.|ops:bookings
PAY-09|P0|R1|Daily reconciliation against settlement files; mismatches become tasks.|ops:finance|S
PAY-10|P0|R1|Chargebacks with an evidence pack; host share recovered only if at fault.|ops:finance
PAY-11|P1|R1|Promotional credits: non-transferable, no cash value, expire after 90 days.|driver:credits
PAY-12|P0|R1|Monthly renewal by UPI mandate or card e-mandate with pre-debit notice.|driver:passes
PAY-13|P1|R3|Corporate and fleet invoicing on credit terms.|fleet:reports
RAT-01|P0|R1|Both sides rate 1–5 with tags; private in R1.|J:host:10.5
RAT-02|P1|R2|Public double-blind reviews, one host reply, moderation.|driver:detail#f3|P|Star history shown; written reviews arrive in R2
RAT-03|P0|R1|Host reliability score shown as a badge.|J:host:10.5
RAT-04|P1|R1|Driver standing: repeated no-shows, overstays or damage lead to restrictions.|ops:tns
MSG-01|P0|R1|Masked calls from confirmation until 2 hours after end.|J:driver:CHG-01/03|S|Virtual number simulated
MSG-02|P0|R1|In-app messages with templates; numbers, UPI IDs and links hidden.|J:driver:CHG-01/03
MSG-03|P2|R3|Call recording, only with notice.|ops:notifs|F|R3
NTF-01|P0|R0|Channels: push, SMS, WhatsApp, email.|ops:notifs|S
NTF-02|P0|R0|Notification catalogue (Appendix C).|ops:notifs
NTF-03|P0|R1|Time-critical messages fall back to SMS in 60 s.|ops:notifs||Turn on "No signal" to see SMS fallback on sends
NTF-04|P1|R1|Marketing opt-in per channel; quiet hours 22:00–07:00.|driver:prefs
NTF-05|P0|R1|Messages in the user's language where a template exists.|J:host:ACC-06|P|Kannada on WhatsApp and host app; more templates later
SUP-01|P0|R0|Help from every booking screen: chat, call-back, WhatsApp.|driver:help
SUP-02|P0|R1|Case management with reference, priority, timer, owner, resolution, satisfaction.|ops:cases
SUP-03|P0|R1|Priority targets: safety immediate; active booking 2 min; payments 4 h; general 1 day.|ops:cases
SUP-04|P0|R0|Grievance officer named; acknowledge in 48 h, resolve in a month.|driver:help
SUP-05|P0|R1|Damage claims within 24 h with photos; 48 h response; T&S decides.|ops:cases
SUP-06|P0|R1|Support powers are bounded: limits; no bank details or documents.|ops:staff
SUP-07|P0|R1|Safety button: 112, share live location, priority case, page on-call.|J:driver:CHG-01/03
SUP-08|P1|R1|Self-serve help centre in supported languages.|driver:help|P|Article list; content to write
SPP-01|P0|R1|Problem with my space: category, in-app photo, alert host and support.|J:driver:8.7
SPP-02|P0|R1|Re-accommodation: up to 3 comparable spaces within 500 m, or refund plus credit.|J:driver:8.7
SPP-03|P0|R1|Root cause recorded; only host-attributable cases affect the score.|ops:cases
SPP-04|P0|R1|Hosts report overstaying PAPHere vehicles; others are pointed to authorities.|J:host:8.11
SPP-05|P0|R1|Evidence kept 90 days; faces and unrelated plates blurred.|ops:cases
CIV-01|P0|R1|Hand-off screen to the official channel; nothing stored.|J:driver:CIV
CIV-02|P1|R4|Structured report in an agreed city: category, in-app capture, time, location, note.|agree:driver:civic
CIV-03|P1|R4|Automatic blurring before any human sees the report.|agree:authority:civic
CIV-04|P1|R4|Pre-screening for completeness, duplicates and jurisdiction.|agree:authority:civic
CIV-05|P1|R4|Routed to the authority's queue; reporter sees only the status.|agree:authority:civic
CIV-06|P1|R4|Abuse controls: verified accounts, 5 a day, targeting detection, reporter hidden.|agree:driver:civic
CIV-07|P1|R4|No rewards unless the authority runs the scheme.|agree:driver:civic
CIV-08|P1|R4|Evidence retained as the agreement says; default 90 days after closure.|agree:authority:civic
HST-01|P0|R0|Today view: arrivals, active, departures; confirm arrival in one tap.|J:host:HST-01
HST-02|P0|R0|Calendar with windows, blocks and bookings; block dates in two taps.|J:host:INV-04
HST-03|P0|R0|Earnings: per booking, pending, paid, deductions; statements.|J:host:PAY-05/06
HST-04|P0|R1|Listing management within LST-04.|J:host:HAC-03
HST-05|P0|R1|Create and rotate the guard-mode link and PIN.|J:host:HAC-03
HST-06|P1|R1|Performance: reliability score, ratings and tips.|J:host:10.5
HST-07|P1|R1|Host app in the first regional language.|J:host:ACC-06|P|Key host screens in Kannada
BIZ-01|P1|R1|Web console for a single commercial site.|business:overview
BIZ-02|P1|R3|Multiple sites with staff roles scoped by site.|business:staff
BIZ-03|P1|R3|Bulk inventory, price and holiday management.|business:pricing
BIZ-04|P2|R3|Operator API.|business:api|P|Key management and endpoint docs
FLT-01|P1|R3|Fleet account: vehicles, drivers by phone, spend limits, approved locations.|fleet:fleet
FLT-02|P1|R3|Corporate parking benefit with one consolidated invoice.|fleet:corp
FLT-03|P1|R3|Spend reports by driver, vehicle and location.|fleet:reports
AUT-01|P1|R2|Authority organisation with jurisdiction polygons and officer roles; MFA.|authority:officers
AUT-02|P1|R2|Authority-run lots: official tariffs, hours, capacity; changes logged.|authority:lots
AUT-03|P1|R4|Report queue with evidence viewer and outcome recording.|agree:authority:civic
AUT-04|P1|R4|Aggregated analytics with a minimum group size of 10.|authority:analytics
AUT-05|P1|R4|Data shared only as agreed; exports watermarked.|authority:analytics
ADM-01|P0|R0|Verification queue with documents, site visit and reason codes.|ops:verif
ADM-02|P0|R0|Booking lookup by reference, phone or plate with full timeline.|ops:bookings
ADM-03|P0|R0|Refund, credit and re-accommodation tools with limits per role.|ops:bookings
ADM-04|P0|R0|Pause, suspend and reinstate listings and accounts with reason codes.|ops:tns
ADM-05|P0|R0|Append-only audit log.|ops:audit
ADM-06|P0|R1|Versioned policy configuration; money changes need two approvers.|ops:policies
ADM-07|P0|R1|Fraud flag queue.|ops:tns
ADM-08|P0|R0|MFA for all staff, least privilege, time-limited elevation.|ops:staff
ADM-09|P1|R1|Service broadcasts to hosts or drivers in a zone.|ops:broadcast
GRO-01|P1|R1|Referrals: both sides credited after the first completed booking.|driver:credits
GRO-02|P1|R1|Promo codes with rules and a budget cap.|ops:growth
GRO-03|P1|R2|Host referral bonus after the 5th completed booking.|ops:growth
GRO-04|P0|R0|No dark patterns.|J:driver:8.1||Hold shows a real expiry time; cancel is two taps
WEB-01|P0|R0|Landing pages for drivers, hosts and businesses; enquiry forms.|website:home
WEB-02|P0|R0|Legal pages.|website:terms
WEB-03|P1|R2|Web booking and location pages.|website:loc
WEB-04|P0|R1|Guard mode as an installable web app.|guard:pin
ANL-01|P0|R0|Event tracking to the Appendix D taxonomy.|ops:events
ANL-02|P0|R0|Dashboards: north star, funnel, supply, reliability, finance.|ops:dash
ANL-03|P1|R1|Feature flags and A/B tests with guardrails.|ops:growth
ANL-04|P0|R0|Analytics data is pseudonymised.|ops:events
PAS-01|P1|R2|Flex Pass purchase; balance and expiry on home and before booking.|J:driver:8.12
PAS-02|P1|R2|Flex hours deducted on actual time at Flex spaces.|J:driver:8.1
PAS-03|P1|R2|Rollover and expiry shown before purchase and beside the balance.|J:driver:8.12
PAS-04|P1|R2|Night pass for a relay space's night window, verified drivers.|J:driver:8.10
PAS-05|P1|R2|Relay windows with a changeover buffer.|J:host:PAS-05
PAS-06|P2|R2|Relay matching: estimated demand and earnings; relay spaces first in night searches.|J:host:PAS-05
PAS-07|P1|R1|Monthly pass: pause up to 14 days a quarter; second vehicle.|J:driver:PAS-07
PAS-08|P1|R2|Association programme: consent record, spaces, guard link, statements, payout.|association:home
HAC-01|P1|R1|Manual "I'm out" / "I'm back".|J:host:8.11
HAC-02|P1|R2|Automatic availability with 2-minute undo.|J:host:HAC-02|S|Phone sensors simulated
HAC-03|P0|R1|"You receive ₹X" wherever a price is shown; daily card; monthly forecast.|J:host:HAC-03
HAC-04|P1|R1|Neighbour-friendly controls.|host:neighbour
HAC-05|P1|R1|Signage kit request.|J:host:HAC-03
HAC-06|P1|R2|Host fallback space when returning during a booking.|J:host:8.11
HAC-07|P0|R1|Set-and-forget defaults.|J:host:8.4
PTN-01|P1|R1|Tracked partner links pre-filled with destination and time.|partner:links
PTN-02|P1|R2|Embeddable booking widget.|partner:widget
PTN-03|P2|R2|Partner API with user consent.|partner:api|P|Endpoint docs and keys
PTN-04|P2|R3|Partner-paid parking invoiced monthly.|partner:paid
UTL-01|P1|R1|Find my vehicle, stored on device unless synced.|driver:tools
UTL-02|P1|R1|Parking timer and reminders.|driver:tools
UTL-03|P2|R2|Routine suggestions; opt-in, dismissible, deletable.|driver:home
UTL-04|P2|R2|Local parking alerts for saved areas.|driver:tools
UTL-05|P1|R2|WhatsApp booking, pay, pass, extend, in supported languages.|J:whatsapp:UTL-05|S
UTL-06|P2|R4|"Can I park here?"|driver:canpark
UTL-07|P1|R1|Last-50-metre guidance in arrival mode.|J:driver:8.7
SUI-01|P1|R1|Verified attributes with the date verified.|driver:detail#f3
SUI-02|P1|R1|Filters for verified attributes, incl. "late-night safe".|J:driver:8.1
SUI-03|P1|R1|Flood-prone listings paused by zone during rain alerts.|ops:broadcast
SUI-04|P0|R1|Two-wheeler bays and price bands with a covered flag.|driver:detail#f4
SUI-05|P2|R2|Helmet lockers and rain covers as amenities.|driver:detail#f4
SUI-06|P1|R2|Two-wheeler charging: 15 A socket or LECCS, priced by time.|J:driver:8.6
DAT-01|P2|R4|Aggregated unmet-demand and occupancy heatmaps.|authority:analytics
GOV-01|P1|R2|Authority onboarding: lots, tariff schedules, operator, settlement account; approved changes.|authority:lots
GOV-02|P1|R2|Public lot listing with official badge, tariff and live occupancy.|driver:detail#p1
GOV-03|P1|R2|Pay-at-lot: QR boards, plate once, pay on exit, no account.|J:paylot:GOV-03
GOV-04|P1|R2|Attendant app: entries, exits, digital or cash tickets, shift close.|J:attendant:GOV-04
GOV-05|P1|R2|₹1 per paid transaction, shown before payment and on its own line.|J:paylot:GOV-03
GOV-06|P1|R2|Settlement next banking day with a ticket-level statement.|authority:settle|S
GOV-07|P1|R2|Authority revenue dashboard.|authority:rev
GOV-08|P1|R2|When a lot is full, offer nearby lots and peer-to-peer spaces.|J:driver:GOV-08
GOV-09|P2|R3|Reserved public bays; the Space Guarantee covers only these.|authority:reserved
GOV-10|P2|R3|Contractor console for tendered lots.|authority:shifts
GOV-11|P2|R4|Gate, barrier, plate-recognition or FASTag entry at public lots.|attendant:shift|F|Hardware; R4
WAL-01|P0|R1|Wallet co-branded with an RBI-authorised issuer; PAPHere never holds funds.|driver:wallet|S|Issuer simulated
WAL-02|P1|R1|Top up within the KYC limit.|driver:wallet
WAL-03|P1|R1|One-tap payment from the wallet.|J:driver:8.1|S
WAL-04|P2|R2|Automatic top-up by mandate.|driver:wallet|P|Setting only
WAL-05|P1|R1|Refunds to wallet instantly; closing returns balance to source.|driver:wallet
WAL-06|P1|R1|Wallet statement linked to booking references.|driver:wallet
WAL-07|P1|R1|KYC upgrade through the issuer's flow; no Aadhaar stored.|driver:wallet|S`.split('\n').map(l=>{const [id,p,r,t,link,st,note]=l.split('|');return {id,p,r,t,link,st:st||'B',note:note||''}});
const MOD={ACC:'Identity and accounts',VEH:'Vehicles',SRC:'Search',LST:'Listings',VER:'Verification',INV:'Inventory',PRC:'Pricing',BKG:'Booking',ACS:'Access and check-in',CHG:'Changes and overstay',EVC:'EV charging',PAY:'Payments',RAT:'Ratings',MSG:'Messaging',NTF:'Notifications',SUP:'Support',SPP:'Space protection',CIV:'Civic reporting',HST:'Host app',BIZ:'Business console',FLT:'Fleet',AUT:'Authority',ADM:'Operations',GRO:'Growth',WEB:'Website',ANL:'Analytics',PAS:'Passes and relay',HAC:'Host automation',PTN:'Partners',UTL:'Daily utilities',SUI:'Suitability and 2W',DAT:'Data products',GOV:'Public parking',WAL:'Wallet'};
const STX={B:['Built','b-ok'],S:['Built · simulated service','b-sign'],P:['Partial','b-mari'],F:['Future · not built','b-mute'],D:['By design','b-night']};

const PD=[['PD-01','Parking first; EV charging in R2 as an attribute of a space.'],['PD-02','Cars and two-wheelers from R0.'],['PD-03','Three booking types in R1: pre-book, park-now, monthly pass.'],['PD-04','Instant booking default; request-to-book only for residential hosts, 15 min.'],['PD-05','One cancellation matrix for every host of a booking type.'],['PD-06','A single 30% platform fee from the host share; drivers pay one all-in price.'],['PD-07','Approximate location before booking; exact address and codes only in the booking window.'],['PD-08','Space protection in R1; civic reporting only with an authority agreement.'],['PD-09','Payments through an RBI-authorised aggregator marketplace; hosts onboarded as sellers.'],['PD-10','PAPHere is a marketplace; the host supplies parking.'],['PD-11','One mobile app with driver and host modes; consoles are web.'],['PD-12','Every pass works offline; guard mode is a web link.'],['PD-13','Space Guarantee on every booking.'],['PD-14','Host protection through an insurer; goodwill fund until then.'],['PD-15','Apartment spaces only with association consent (R2).'],['PD-16','Host prices within zone bands; no algorithmic pricing before R4.'],['PD-17','Peer-to-peer first; operator lots as reserve until R3; public lots separate.'],['PD-18','Passes are the habit engine.'],['PD-19','Day–night relay with a 30-minute changeover.'],['PD-20','Availability can follow the host\'s vehicle; only out/back events leave the phone.'],['PD-21','Associations get a share of the platform fee, never added to the price.'],['PD-22','A host who returns early never evicts a driver; gets a fallback space.'],['PD-23','Government pay-and-park at official tariffs for ₹1 a transaction.'],['PD-24','Official tariff plus ₹1 shown as one total before payment.'],['PD-25','At public lots the Space Guarantee covers only reserved bays.'],['PD-26','Driver wallet co-branded with an RBI-authorised issuer.'],['PD-27','Set-and-forget hosting is the default.']];
const PDLINK={'PD-01':'J:driver:8.6','PD-02':'J:driver:8.6','PD-03':'J:driver:8.2','PD-04':'J:driver:BKG-08','PD-05':'J:driver:CHG-02/04','PD-06':'J:driver:8.1','PD-07':'J:driver:8.1','PD-08':'J:driver:CIV','PD-09':'ops:finance','PD-10':'website:hostterms','PD-11':'driver:account','PD-12':'J:guard:11.6','PD-13':'J:driver:8.7','PD-14':'J:host:ACC-06','PD-15':'J:host:8.4','PD-16':'J:host:HAC-03','PD-17':'driver:home','PD-18':'driver:passes','PD-19':'J:host:PAS-05','PD-20':'J:host:HAC-02','PD-21':'association:home','PD-22':'J:host:8.11','PD-23':'authority:rev','PD-24':'J:paylot:GOV-03','PD-25':'authority:reserved','PD-26':'driver:wallet','PD-27':'J:host:8.4'};
const OD=[['OD-01','Which micro-market hosts the pilot?','Founder with city operations','20 Nov 2026'],['OD-02','Which payment aggregator; split settlement for small hosts and government payees?','Head of Engineering with Finance','30 Nov 2026'],['OD-03','Does the 30% fee keep host retention on target?','Founder','15 Dec 2026'],['OD-04','Insurance partner and cover limits','Founder with Legal','15 Jan 2027'],['OD-05','Can a home host charge for charging on a domestic connection?','Legal counsel','26 Feb 2027'],['OD-06','GST treatment; TCS and TDS obligations','Tax counsel','15 Dec 2026'],['OD-07','Which regional language ships first','Product manager','20 Nov 2026'],['OD-08','Mobile framework (Flutter or React Native)','Head of Engineering','13 Nov 2026'],['OD-09','Size of the re-accommodation credit','Product manager','29 Jan 2027'],['OD-10','Retention period for each data category','Legal with data protection lead','31 Dec 2026'],['OD-11','Which authority first, and the agreement route','Founder','31 Mar 2027'],['OD-12','How park-now secures payment','Product manager with Engineering','1 Dec 2026'],['OD-13','Flex Pass plan sizes, price and rollover','Product manager with Finance','14 May 2027'],['OD-14','Association revenue share rate','Founder','14 May 2027'],['OD-15','Signals for automatic availability; default return buffer','Head of Engineering','14 May 2027'],['OD-16','Night-access standard for commercial relay hosts','Head of Operations with Legal','14 May 2027'],['OD-17','Public parking pilot design','Founder with Head of Operations','30 Apr 2027'],['OD-18','How the ₹1 fee applies to cash tickets','Founder with Legal','31 Mar 2027'],['OD-19','Which issuer co-brands the wallet; KYC, authentication, fees','Head of Engineering with Finance','29 Jan 2027']];
const ODAPP={'OD-01':'Demo uses HAL 2nd Stage / Indiranagar, Bengaluru','OD-02':'Aggregator simulated behind one adapter','OD-03':'Fee is configuration in Policies','OD-04':'Goodwill fund shown in host protection','OD-05':'Charger screen shows the open question','OD-06':'Invoice view notes it','OD-07':'Kannada used as the example','OD-08':'Not applicable to this web build','OD-09':'Credit is a policy value; a pending change raises it to ₹150','OD-10':'Retention defaults shown in section 12.5 view','OD-11':'Authority console uses "City Corporation"','OD-12':'Park-now secures up to 4 h; method simulated','OD-13':'Hypothesis plans used in Flex purchase','OD-14':'5% used in the association console','OD-15':'Phone location + Bluetooth, 30-min buffer','OD-16':'Night access listed per space','OD-17':'Two demo lots, one departmental, one tendered','OD-18':'Cash tickets not charged ₹1 for now','OD-19':'Issuer simulated'};
const RK=[['RK-01','Thin liquidity','High','High'],['RK-02','Unit economics do not close (support, re-accommodation)','High','High'],['RK-03','Scope creep delays a reliable parking MVP','High','High'],['RK-04','False availability and host cancellations','Medium','High'],['RK-05','Monthly parking moves off-platform','High','High'],['RK-06','Aggregator can\'t onboard small hosts quickly','Medium','High'],['RK-07','Home charging fees legally unfavourable','Medium','High (R2)'],['RK-08','Safety incident at a residential space','Low','Very high'],['RK-09','Breach of addresses, plates or documents','Low','Very high'],['RK-10','Neighbours or associations object','Medium','Medium'],['RK-11','Gate staff refuse PAPHere drivers','Medium','Medium'],['RK-12','Drivers can\'t find entrances','Medium','Medium'],['RK-13','Monsoon flooding or event surges','Medium','Medium'],['RK-14','Civic reporting misused','Medium','High (R4)'],['RK-15','Regulatory change','Medium','Medium'],['RK-16','Incumbents add guaranteed destination parking','Medium','Medium'],['RK-17','Objections to location-based availability','Medium','High'],['RK-18','Safety incident during night access','Low','Very high'],['RK-19','Flex Pass loses money','Medium','Medium'],['RK-20','Associations refuse or withdraw consent','Medium','High'],['RK-21','Government agreement takes longer','High','Medium'],['RK-22','₹1 fee doesn\'t cover support at public lots','Medium','Medium'],['RK-23','Wallet issuer delay or KYC friction','Medium','Medium']];
const RKAPP={'RK-01':'ops:dash','RK-02':'ops:dash','RK-04':'J:host:10.5','RK-05':'J:driver:CHG-01/03','RK-08':'J:driver:CHG-01/03','RK-09':'ops:staff','RK-11':'J:guard:8.9','RK-12':'J:driver:8.7','RK-13':'ops:broadcast','RK-14':'agree:authority:civic','RK-17':'J:host:HAC-02','RK-18':'J:driver:8.10','RK-20':'association:home','RK-22':'authority:rev','RK-23':'driver:wallet'};
const HY=[['H-01','Hosts accept a 30% platform fee','≥ 70% of hosts active 90 days after first booking'],['H-02','House owners list once protections are explained','≥ 15% of owners approached list'],['H-03','Hosts keep their published hours','Kept hours ≥ 80%'],['H-04','Destination partners supply demand','≥ 30% of R0 bookings via partner links'],['H-05','2W commuters convert to monthly passes','≥ 20% of repeat 2W drivers buy in 60 days'],['H-06','Re-accommodation preserves trust','Repeat ≥ 80% of drivers with no failure'],['H-07','Support load can halve','≤ 4 contacts per 100 bookings'],['H-08','Verification at a sustainable cost','Cost recovered within 10 bookings'],['H-09','EV drivers prefer park-and-charge','≥ 40% choose it at a premium'],['H-10','Charger hosts exist at density','15 signed charger hosts'],['H-11','Operators pay for the console','3 paid pilots'],['H-12','An authority engages on pilot data','Agreement under negotiation'],['H-13','Residents pay for a night pass','40 night passes in 8 weeks of R2a'],['H-14','Hosts run day and night windows','≥ 20% of spaces relayed'],['H-15','Flex Pass becomes a habit','15% buy; 60% renew'],['H-16','Automatic availability is reliable','≥ 95% detection; overrides < 10%'],['H-17','Associations consent for a revenue share','2 associations signed'],['H-18','Public pay-and-park raises collections','+15% per bay'],['H-19','Drivers pay digitally at public lots','≥ 60% digital by month 3'],['H-20','Repeat drivers adopt the wallet','≥ 40% of their bookings'],['H-21','Hosts earn without acting','≥ 90% bookings need no host action']];
const SEC=[
 ['1','Document control','Reference','Programme page: status, approvers, priority and status tags','prd:program'],
 ['2','Executive summary','Built','The whole app; releases R0–R5 on the Releases page','prd:releases'],
 ['3','Problem, opportunity and market','Reference','P1–P8 problems, market, competitors, positioning and beachhead scoring','prd:market'],
 ['4','Vision, strategy and goals','Built','OKRs on Marketplace health; frequency ladder and SIG-01..08 on the Releases page','prd:releases'],
 ['5','Users, personas and jobs-to-be-done','Built','Every persona has a surface; roles and permissions matrix in Staff and access','prd:personas'],
 ['6','Scope and release strategy','Built','Release labels on every screen and requirement; module map below','prd:releases'],
 ['7','Product decisions','Built','PD-01..27 and OD-01..19 with where each shows up','prd:decisions'],
 ['8','User journeys and service blueprint','Built','8.1–8.16 are journeys in the phone panels','prd:journeys'],
 ['9','Functional requirements','Built','All 222 requirements mapped below','prd:reqs'],
 ['10','Business rules and policies','Built','Cancellation, no-show, overstay, host cancellation, reliability, evidence, pricing guardrails, Flex, relay, association, wallet: all enforced by the engine','ops:policies'],
 ['11','UX requirements','Built','IA per surface, five states (loading, populated, empty, error, offline), "₹X total", "You receive", 48 px targets, dates as "Thu, 29 Oct, 6:30 pm"','prd:ux'],
 ['12','Data model and state machines','Built','Booking state machine enforced (invalid transitions refused); ledger in paise; invariants checked live','prd:data'],
 ['13','Technical architecture and NFRs','Reference','Production targets; this build runs in the browser with the same module boundaries','prd:arch'],
 ['14','Integrations','Simulated','Each of the outside services is simulated behind one function','prd:arch'],
 ['15','Legal, regulatory, privacy and security','Built','Consent, deletion, grievance officer, legal pages, audit log, MFA, document access logging, no Aadhaar','prd:legal'],
 ['16','Trust and safety','Built','Fraud flags, enforcement ladder, safety button, masked contact','ops:tns'],
 ['17','Operations model','Built','Live operations, runbooks, reserve inventory, verification, cases','ops:live'],
 ['18','Go-to-market','Reference','Launch sequence, supply and demand acquisition, partnerships, expansion rule','prd:gtm'],
 ['19','Business model and unit economics','Built','Unit economics with an interactive contribution calculator; finance ledger','prd:money'],
 ['20','Metrics, analytics and pilot criteria','Built','North star, metric tree, guardrails, checkpoints, events','ops:dash'],
 ['21','QA, testing and release management','Reference','Critical scenarios you can run in this app, and the R1 checklist','prd:qa'],
 ['22','Delivery plan','Reference','Timeline, team, dependencies, budget lines','prd:delivery'],
 ['23','Risk register','Built','RK-01..23 with the screen that mitigates each','prd:risks'],
 ['24','Assumptions and hypotheses','Built','H-01..21 with test and threshold','prd:risks'],
 ['25','Governance, appendices and sources','Reference','Decision rights, change control, glossary, epics, notification catalogue, event taxonomy','prd:gov']];

function go2(spec){
  if(!spec)return;let s=spec,agree=false;
  if(s.startsWith('agree:')){agree=true;s=s.slice(6)}
  if(agree)S.agreement=true;
  if(s.startsWith('J:')){const [,sf,ref]=s.split(':');const j=(SURF[sf].journeys||[]).find(x=>Array.isArray(x)&&x[1]===ref);if(j){j[2]();save();return}setSurface(sf);return}
  const [sf,rest]=s.split(':');const [scr,id]=rest.split('#');
  if(sf==='prd'){if(S.surface!=='coverage')setSurface('coverage',scr);else reset(scr);window.scrollTo(0,0);return}
  if(sf==='host')S.hostId=S.hostId||'u2';
  setSurface(sf,scr,id?{id}:null);
}
ACT.cv_go=(t,d)=>go2(d.l);
const lnk=(l,txt)=>l?`<button class="btn ghost sm" data-act="cv_go" data-l="${esc(l)}">${txt||'Open'}</button>`:'';

const C={};
C.overview=()=>{const counts={};R.forEach(r=>counts[r.st]=(counts[r.st]||0)+1);
  return `${phead('PRD coverage','Every section of the PAPHere PRD v1.0 (24 Oct 2026) and where it lives in this app. "Reference" sections aren\'t software; they have their own pages here so nothing is left out.')}
  <div class="grid">${stat(25+' + 4','Sections and appendices','all mapped')}${stat(R.length,'Numbered requirements',`${counts.B||0} built · ${counts.S||0} simulated service · ${counts.P||0} partial · ${(counts.F||0)+(counts.D||0)} future or by design`)}${stat(PD.length+OD.length,'Decisions',`${PD.length} decided · ${OD.length} open`)}${stat(RK.length+HY.length,'Risks and hypotheses')}</div>
  ${table([['§'],['Section'],['Coverage'],['Where'],['']],SEC.map(s=>({cells:[`<b>${s[0]}</b>`,`<b>${s[1]}</b>`,badge(s[2],s[2]==='Built'?'b-ok':s[2]==='Simulated'?'b-sign':'b-night'),`<span class="sub">${s[3]}</span>`,lnk(s[4])]})))}
  <div class="card stack"><b>How to read the statuses</b>${kv([['Built','Works end to end in this app'],['Built · simulated service','Works, but the outside service (SMS, payments, KYC, issuer, WhatsApp, phone sensors) is simulated'],['Partial','The main path works; a named part is still to do'],['Future · not built','Hardware or R4 integrations the PRD defers (gates, sensors, OCPP, FASTag, call recording)'],['By design','A rule the app respects by not doing something']])}</div>`};
C.reqs=()=>{const q=String(F_('cv_q','')).toLowerCase(),m=F_('cv_mod','all'),rel=F_('cv_rel','all'),st=F_('cv_st','all');
  const list=R.filter(r=>(m==='all'||r.id.startsWith(m))&&(rel==='all'||r.r===rel)&&(st==='all'||r.st===st)&&(!q||(r.id+' '+r.t).toLowerCase().includes(q)));
  return `${phead('Functional requirements','Section 9: all '+R.length+' requirements with priority, release and where to see each one.')}
  <div class="toolbar"><div class="field" style="min-width:min(100%,260px)">${ic('search',18)}<input data-bind="cv_q" value="${esc(F_('cv_q',''))}" placeholder="Search ID or text" aria-label="Search requirements"></div>
  <div class="field" style="padding:6px 10px"><select data-bindc="cv_mod" aria-label="Module"><option value="all">All modules</option>${Object.entries(MOD).map(([k,v])=>`<option value="${k}" ${m===k?'selected':''}>${k} · ${v}</option>`).join('')}</select></div>
  <div class="field" style="padding:6px 10px"><select data-bindc="cv_rel" aria-label="Release"><option value="all">All releases</option>${['R0','R1','R2','R3','R4'].map(x=>`<option ${rel===x?'selected':''}>${x}</option>`).join('')}</select></div>
  <div class="field" style="padding:6px 10px"><select data-bindc="cv_st" aria-label="Status"><option value="all">All statuses</option>${Object.entries(STX).map(([k,v])=>`<option value="${k}" ${st===k?'selected':''}>${v[0]}</option>`).join('')}</select></div><span class="sub">${list.length} shown</span></div>
  ${table([['ID'],['Requirement'],['Priority'],['Release'],['Status'],['']],list.map(r=>({cells:[`<b class="mono">${r.id}</b>`,esc(r.t)+(r.note?`<br><span class="sub">${esc(r.note)}</span>`:''),r.p,relTag(r.r),badge(STX[r.st][0],STX[r.st][1]),lnk(r.link)]})))}`};
C.decisions=()=>`${phead('Product decisions','Section 7: the decision log and the open decisions, with how each shows up in this app.')}
  ${table([['ID'],['Decision'],['']],PD.map(p=>({cells:[`<b class="mono">${p[0]}</b>`,esc(p[1]),lnk(PDLINK[p[0]])]})))}
  <h2 class="h-l">Open decisions</h2>${table([['ID'],['Question'],['Owner'],['Decide by'],['Assumed in this app']],OD.map(o=>({cells:[`<b class="mono">${o[0]}</b>`,esc(o[1]),esc(o[2]),o[3],`<span class="sub">${esc(ODAPP[o[0]])}</span>`]})))}`;
C.journeys=()=>{const J=[['8.1','Pre-book (destination driver)','J:driver:8.1'],['8.2','Park-now','J:driver:8.2'],['8.3','Monthly pass','driver:monthlybuy'],['8.4','Host onboarding','J:host:8.4'],['8.5','Host day-to-day','J:host:8.11'],['8.6','Park-and-charge','J:driver:8.6'],['8.7','Space protection','J:driver:8.7'],['8.8','Civic violation reporting','J:driver:CIV'],['8.9','Edge cases at arrival','J:guard:8.9'],['8.10','Night pass','J:driver:8.10'],['8.11','Day relay for a host who drives to work','J:host:8.11'],['8.12','Flex Pass','J:driver:8.12'],['8.13','Booking from a partner','J:driver:8.13'],['8.14','Association day relay','association:home'],['8.15','Paying at a government lot','J:paylot:GOV-03'],['8.16','Attendants and the authority','J:attendant:GOV-04']];
  const E=[['Space occupied','Problem button → re-accommodation in 10 min','J:driver:8.7'],['Guard refuses entry','Guard-mode link, support calls guard and host','J:driver:8.7'],['Host unreachable','Request auto-declines after 15 min','J:driver:BKG-08'],['No signal in basement','Pass cached; check-in queued','J:guard:11.6'],['Driver late','20 min grace, then no-show','J:driver:ACS-03'],['Driver overstays','Warnings, auto-extend or 2× fee','J:driver:CHG-01/03'],['Extension clashes','Longest possible extension shown','J:driver:CHG-01/03'],['Vehicle too big','Problem → re-accommodation','J:driver:8.7'],['Different plate','Edit until check-in; guard flags mismatch','J:guard:8.9'],['Damage','Claim within 24 h','J:host:ACC-06'],['Driver feels unsafe','Safety button','J:driver:CHG-01/03'],['Payment confirmed late','"Confirming payment" up to 2 min','J:driver:8.1']];
  return `${phead('User journeys','Section 8: each journey opens at its first screen.')}${table([['§'],['Journey'],['']],J.map(j=>({cells:[j[0],`<b>${j[1]}</b>`,lnk(j[2],'Start')]})))}<h2 class="h-l">8.9 Edge cases</h2>${table([['Situation'],['What happens'],['']],E.map(e=>({cells:[`<b>${e[0]}</b>`,e[1],lnk(e[2],'Try')]})))}`};
C.personas=()=>{const P=[['D1','Destination driver (car)','J:driver:8.1'],['D2','Daily two-wheeler commuter','driver:passes'],['D3','Monthly parker','driver:monthlybuy'],['D4','Booker for someone else','J:driver:8.1'],['D5','EV driver without home charging','J:driver:8.6'],['D6','Event-goer','J:driver:SRC-09'],['D7','Resident without home parking','J:driver:8.10'],['S1','Independent-house host','J:host:8.11'],['S2','Small commercial building manager','business:overview'],['S3','Commercial operator or contractor (R3)','business:staff'],['S4','Apartment resident (R2)','association:home'],['S5','Charger host (R2)','J:host:EVC-07'],['S6','Residential association committee','association:home'],['I1','Municipal parking department','authority:rev'],['I2','Traffic police unit (R4)','agree:authority:civic'],['I3','Fleet manager (R3)','fleet:fleet'],['I4','Corporate HR or facilities (R3)','fleet:corp'],['I5','Pay-and-park contractor and attendants','J:attendant:GOV-04'],['A1','Field verification agent','ops:verif'],['A2','Support agent','ops:cases'],['A3','Trust and safety reviewer','ops:tns'],['A4','Finance operator','ops:finance'],['A5','City operations manager','ops:dash'],['A6','Platform administrator','ops:policies'],['A7','Gate attendant (host\'s staff)','J:guard:ACS-02']];
  return `${phead('Users and personas','Section 5: every persona and the surface built for them. The roles and permissions matrix (5.5) is enforced in the Operations console under Staff and access.')}${table([['ID'],['Persona'],['']],P.map(p=>({cells:[`<b class="mono">${p[0]}</b>`,p[1],lnk(p[2])]})))}`};
C.releases=()=>`${phead('Scope and releases','Sections 2, 4 and 6. Every screen and requirement carries its release tag.')}
  ${table([['Release'],['What the user gets'],['Gate to the next release']],[['R0 Concierge pilot','30–60 verified spaces in one micro-market, thin app, heavy human operations','Drivers pay and come back; hosts keep spaces available'],['R1 Parking MVP','Pre-book, park-now, monthly pass with pause, host app with out/back, payouts, wallet, Space Guarantee, 2W bays, partner links','Booking success ≥ 95%, repeat ≥ 30%, positive contribution'],['R2 EV and city launch','Park-and-charge, relay, Flex and night passes, association share, automatic availability, WhatsApp, public pay-and-park pilot','Charger success ≥ 90%, no unresolved safety incident'],['R3 Business and fleet','Multi-site console, staff roles, corporate and fleet billing','First paid enterprise contracts'],['R4 Authority and automation','Authority console, civic reporting where agreed, gate and charger integrations','Signed authority agreement'],['R5 Multi-city','Repeatable city launch playbook','City-level unit economics proven twice']].map(r=>({cells:r})))}
  <h2 class="h-l">Signature differentiators (4.5.2)</h2>${table([['ID'],['Differentiator'],['Release'],['']],[['SIG-01','Day–night relay','R2','J:host:PAS-05'],['SIG-02','Zero-effort hosting','R1 manual, R2 automatic','J:host:HAC-02'],['SIG-03','Flex Pass','R2','J:driver:8.12'],['SIG-04','Space Guarantee','R1','J:driver:8.7'],['SIG-05','Book where the trip begins','R1 links, R2 widget','partner:links'],['SIG-06','Two-wheeler first','R1, R2','driver:detail#f4'],['SIG-07','Society revenue share','R2','association:home'],['SIG-08','Public and private in one app','R2','J:driver:GOV-08']].map(r=>({cells:[`<b class="mono">${r[0]}</b>`,r[1],r[2],lnk(r[3])]})))}
  <h2 class="h-l">Frequency ladder (4.5.1)</h2>${table([['Rung'],['Who'],['What they use'],['Uses / month']],[['1 Destination trip','Destination driver','Pre-book with the Space Guarantee','2–4'],['2 Weekly routine','Errands, gym, school runs','Saved places, one-tap rebook, routine suggestions','4–8'],['3 Daily commute','2W and car commuters','Monthly pass, then Flex Pass','20–22'],['4 Home base','Residents without parking','Night pass through the relay','30'],['5 Host','Anyone with a space','Zero-effort hosting and a daily earnings card','Daily opens']].map(r=>({cells:r})))}
  <h2 class="h-l">What PAPHere won't do (4.4, 4.5.6)</h2><div class="card"><ul class="steps"><li>Issue fines, order towing or decide a law was broken.</li><li>Control chargers or gates before R4; bill per kWh before a certified meter.</li><li>List public road space; expand before the R1 gate.</li><li>Hold wallet money itself.</li><li>Unrelated super-app services; streaks, fake urgency or gamified pressure; sale of location data.</li></ul></div>`;
C.market=()=>`${phead('Problem and market','Section 3. Reference material; the app addresses each problem as listed.')}
  ${table([['#'],['Who'],['Problem'],['Evidence to collect in R0']],[['P1','Driver going to a known destination','Circles, parks illegally or abandons the trip','Minutes searching (n ≥ 200)'],['P2','Two-wheeler rider','2W parking is an afterthought','Willingness to pay for a covered 2W space'],['P3','Owner of an idle space','Empty 8–10 h a day; fears strangers','Owners willing to list after seeing protections'],['P4','Commercial operator','Off-peak capacity earns nothing; cash leaks','Off-peak occupancy; leakage'],['P5','EV driver away from home','Chargers occupied, broken or blocked','Share of unusable charging trips'],['P6','Booked driver or host','Space occupied or gate blocked, no one to call','Incidents per 100 sessions'],['P7','Monthly parker','Word of mouth, no contract or recourse','Size of informal monthly market'],['P8','Municipal body','Lots under-used; cash leaks; no live view','Collections and occupancy, 3 months']].map(r=>({cells:r})))}
  <div class="grid g2"><div class="card stack"><b>Market (3.2)</b><p class="sub">28.2 million new vehicles in 2025, 72% two-wheelers. EV passenger sales +77% to 176,817; car EV penetration about 4.0% (Kerala 7.9%). Electric 2W were 57% of EV sales; LECCS connector converging.</p></div>
  <div class="card stack"><b>Competitors (3.3)</b><p class="sub">Status quo; Park+; ParkIT (Bengaluru, Sep 2026); Bolt.Earth; Kazam; OEM networks; municipal pay-and-park; official traffic apps such as ASTraM.</p></div></div>
  <div class="card stack"><b>Beachhead scoring (3.5)</b>${table([['Criterion'],['Weight']],[['Predictable parking pain','25%'],['Supply within 500 m of demand','25%'],['Mix of destinations','15%'],['Two-wheeler and EV density','10%'],['Ops reachability','10%'],['Authority openness','10%'],['Competitive saturation (lower is better)','5%']].map(r=>({cells:r})))}${field('cv_score','Score a candidate (1–5 each, comma separated)',F_('cv_score','4,4,5,3,5,3,4'))}<b>Weighted score: ${(()=>{const w=[.25,.25,.15,.1,.1,.1,.05];const v=String(F_('cv_score','4,4,5,3,5,3,4')).split(',').map(Number);return w.reduce((a,x,i)=>a+x*(v[i]||0),0).toFixed(2)})()} / 5</b></div>`;
C.ux=()=>`${phead('UX requirements','Section 11, and how this build meets each standard.')}
  ${table([['Standard'],['In this app']],[['Information architecture (11.1)','Driver: Search · Bookings · Passes · Tools · Account. Host: Today · Calendar · Listing · Earnings · More. Guard: PIN → arrivals → scan/type → check in/out. Consoles as specified.'],['Five states per screen (11.2)','Loading (payment spinner), populated, empty ("No upcoming bookings"), error (payment failed, code not found), offline (banner, cached results)'],['Price display (11.3)','"₹X total" with a breakdown; "You receive ₹X" beside host prices; Flex shows hours'],['Pass screen','Large QR and code, plate in large type for the guard'],['Maps','Facility and entrance pins are distinct; walking route drawn with minutes; residential spaces show an approximate area'],['Trust signals','Each badge opens a plain explanation of what was checked'],['Dates and times','"Thu, 29 Oct, 6:30 pm"; durations as "2 h 15 min"'],['No dark patterns','Hold shows its real expiry; no fake timers; cancel within two taps'],['Accessibility (11.4)','48 px touch targets, labelled controls, status never by colour alone, light and dark themes'],['Localisation (11.5)','Kannada in the host app and WhatsApp; layouts tolerate longer strings'],['Offline (11.6)','Pass, code, address, photo and steps cached; check-ins queued; extend and pay need a connection; search shows dated results']].map(r=>({cells:[`<b>${r[0]}</b>`,r[1]]})))}`;
C.data=()=>`${phead('Data model and state machines','Section 12. The engine in this app follows the same states and invariants.')}
  <div class="card stack"><b>Booking state machine (12.3)</b><pre class="code">Held → Payment pending → Confirmed → Checked in → Completed
                       ↘ Requested → Confirmed / Declined (request-to-book)
Held → Expired · Payment pending → Failed
Confirmed → Cancelled / No-show · Checked in → Overstaying → Completed
Completed / Cancelled / No-show → Disputed → back to prior state</pre><p class="sub">Try an invalid move (for example cancelling a completed booking) and the engine refuses it.</p></div>
  ${table([['Object'],['States']],[['Payment','created → pending → captured → (partially) refunded; pending → failed'],['Refund','requested → processing → succeeded / failed → retried'],['Payout','scheduled → processing → paid / failed → retried; bank change holds 24 h'],['Listing','draft → submitted → in verification → active ↔ paused; active → suspended → active / archived'],['Monthly and night pass','pending → active ↔ paused → renewal due → active / lapsed'],['Flex Pass','pending → active → renewal due → active / lapsed; cancelling → ended'],['Association','proposed → consented → active ↔ paused; active → withdrawn'],['Case','open → assigned → waiting → resolved → closed; reopened within 7 days'],['Civic report','submitted → pre-screened → forwarded → acknowledged → closed; rejected'],['Public ticket','issued → paid → closed; unpaid → paid / written off'],['Wallet transaction','initiated → authenticated → completed / failed; refunded']].map(r=>({cells:[`<b>${r[0]}</b>`,r[1]]})))}
  ${table([['Data class'],['Default retention']],[['Financial and tax records','8 years'],['Booking records','3 years, then anonymised'],['Identity and KYC results','Account life + 1 year'],['Evidence photos','90 days or until dispute closes'],['Messages and call metadata','90 days'],['Location traces','Not stored beyond the check'],['Host presence events','30 days'],['Saved vehicle location','On device; 30 days if synced'],['System logs','180 days in India']].map(r=>({cells:r})))}`;
C.arch=()=>`${phead('Architecture and integrations','Sections 13 and 14. Production targets are listed; this build mirrors the module boundaries in the browser.')}
  ${table([['Area'],['Production decision']],[['Service shape','Modular monolith, TypeScript on Node.js'],['System of record','PostgreSQL with PostGIS; overlap rule as an exclusion constraint'],['Holds','Rows with expiry swept every 30 s'],['Events','Transactional outbox'],['Personal data','Separate schema, field-level encryption'],['Hosting','Cloud India region; all personal data and logs in India'],['APIs','REST + OpenAPI; idempotency keys on create and money endpoints'],['NFRs','99.9% booking APIs; search p95 800 ms; RPO 5 min, RTO 1 h; OWASP ASVS L2; crash-free ≥ 99.5%']].map(r=>({cells:[`<b>${r[0]}</b>`,r[1]]})))}
  <h2 class="h-l">Integrations (14)</h2>${table([['Service'],['Purpose'],['In this app'],['Fallback']],[['Payment aggregator','Collections, refunds, split settlement, mandates','Simulated; failure and late toggles','Pause bookings with a banner'],['PAN and bank verification','Name match, penny drop','Simulated','Manual review'],['DigiLocker','Licence check','Simulated','Manual upload'],['Maps','Search, walking times','Illustrative map','Cached geocodes'],['SMS','OTP, fallback alerts','Simulated (log)','Second provider, WhatsApp OTP'],['WhatsApp','Confirmations, booking','WhatsApp surface','Push and SMS'],['Push','Alerts','Inbox and log','SMS for time-critical'],['Masked calling','Driver, host, guard calls','Virtual number sheet','In-app messages'],['Email','Receipts, statements','Log','Downloads in app'],['Insurance','Host protection','Goodwill fund wording','Goodwill fund'],['Accounting','Journal export','Ledger view','Manual export'],['Wallet issuer','Wallet','Simulated','UPI or card'],['Authority finance','Settlement, tariffs','Authority console','Daily email statement'],['OCPP, gates, FASTag (R4)','Live charger and gate data','Not built','Guard mode, owner-managed']].map(r=>({cells:r})))}`;
C.legal=()=>`${phead('Legal, privacy and security','Section 15: where each obligation lands in the product.')}
  ${table([['Area'],['Framework'],['In this app'],['']],[['Personal data','DPDP Act 2023 and Rules 2025','Itemised notice, purpose consent, withdrawal, deletion, export','driver:privacy'],['Consumer e-commerce','E-Commerce Rules as amended 2026','Company details, grievance officer, 48 h / 1 month, dark-pattern rules','website:grievance'],['Intermediary duties','IT Act and 2021 rules','Published policies and grievance mechanism','website:terms'],['Cybersecurity','CERT-In 2022','6-hour incident runbook; logs in India','ops:live'],['Payments','RBI PA Directions 2025','Hosts onboarded as sellers before payout','J:host:8.4'],['Recurring payments','RBI e-mandate','Pre-debit notice, easy cancellation','driver:passes'],['Income tax','Section 194-O','0.1% TDS, 5% without PAN, certificates','J:host:PAY-05/06'],['GST','E-commerce operator rules','Invoice per booking; treatment per OD-06','ops:finance'],['EV charging','MoP guidelines 2024','Time-based pricing, safety declarations','J:host:EVC-07'],['Housing societies','Leases, bye-laws','Evidence by type; association consent','J:host:8.4'],['Parking enforcement','Motor vehicle law','Never fines, tows or clamps','J:driver:CIV'],['Commercial communications','TRAI','Registered templates; marketing opt-in','driver:prefs'],['Insurance distribution','IRDAI','Host protection as a platform benefit','J:host:ACC-06'],['Accessibility','RPwD Act; WCAG 2.1 AA','Accessible space flag, labelled controls','J:driver:8.1'],['Prepaid wallets','RBI PPI directions','Co-branded issuer, KYC limits','driver:wallet'],['Government contracting','Procurement, tariff notifications','Tariff approval by an authority user; receipts in its name','authority:lots']].map(r=>({cells:[`<b>${r[0]}</b>`,`<span class="sub">${r[1]}</span>`,r[2],lnk(r[3])]})))}
  <div class="card stack"><b>Security controls (15.3) shown in this app</b><ul class="steps"><li>New-device alert and sign-out everywhere; 24-hour payout hold on bank change.</li><li>Object-level access: exact address only inside the booking window.</li><li>Document links expire in 5 minutes; every access logged; staff least privilege with elevation.</li><li>Photos stripped of location before other users see them; approximate pins against scraping.</li></ul></div>`;
C.gtm=()=>`${phead('Go-to-market','Section 18. Not software; kept here so the plan sits beside the product.')}
  ${table([['Week'],['Focus'],['Exit criterion']],[['−8 to −4','Score areas; choose the micro-market; map supply','OD-01 decided'],['−4 to 0','Door-to-door supply; site visits; guard briefings','30 verified spaces within 500 m of top 5 destinations'],['0 to 4','Soft open to partners\' visitors and commuters','50 paid sessions; no unresolved arrival failure'],['4 to 10','Open to the public; monthly passes','R0 gate'],['R1 onward','Self-serve app; referrals; adjacent streets','R1 gate']].map(r=>({cells:r})))}
  <div class="grid g2"><div class="card stack"><b>Supply acquisition</b><p class="sub">Commercial buildings via managers; house hosts door-to-door with a one-page promise; contractors by direct sales; charger hosts via installers and dealers. No platform fee for the first 30 days.</p></div>
  <div class="card stack"><b>Demand acquisition</b><p class="sub">"Book parking" links in hospital and office messages; employers for 2W commuters; resident groups for monthly and night passes; event tickets; EV dealers. First two bookings get a platform-funded credit.</p></div></div>
  <div class="card stack"><b>Partnerships and expansion</b><p class="sub">Hospitals, employers, payment aggregator, insurer, charger installers, a municipal body (90-day MoU pilot, uplift report). A second micro-market opens only after the first holds the R1 gate for two months; a second city after two micro-markets do.</p>${lnk('partner:links','Open partner portal')}</div>`;
C.money=()=>{const v=+F_('cv_val',120),ops=+F_('cv_ops',550000);const fee=v*.3,varc=v*.13,contrib=fee-varc;
  return `${phead('Business model and unit economics','Section 19. Planning hypotheses; replace with R0 data.')}
  ${table([['Product'],['Value','r'],['Host receives','r'],['Platform','r'],['Variable cost','r'],['Contribution','r']],[['Car monthly pass','3,000','2,100','900','93','807 / month'],['Car night pass','2,000','1,400','600','63','537 / month'],['Car Flex Pass 40 h','1,400','1,120','280','69','211 / month'],['Car pre-book 3 h at ₹40','120','84','36','15.7','20.3'],['2W monthly pass','800','560','240','53','187 / month'],['2W pre-book 4 h at ₹10','40','28','12','9.6','2.4'],['Public lot ticket ₹20','21','20 (authority)','1','0.5','0.5']].map(r=>({cells:r.map((c,i)=>i?'₹'+c:c)})))}
  <div class="card stack"><b>Contribution calculator</b><div class="row wrap">${field('cv_val','Booking value (₹)',String(v),{attrs:'inputmode="numeric"'})}${field('cv_ops','City operations cost / month (₹)',String(ops),{attrs:'inputmode="numeric"'})}</div>
  ${kv([['Platform fee (30%)',rs2(fee)],['Variable cost (≈13%)',rs2(varc)],['Contribution per booking',rs2(contrib)],['Bookings a month to cover operations',Math.ceil(ops/Math.max(.01,contrib)).toLocaleString('en-IN')]])}<button class="btn ghost sm" data-act="cv_calc">Recalculate</button></div>
  <div class="card stack"><b>Reporting definitions (19.5)</b>${kv([['Gross booking value','Everything drivers pay, before refunds, excluding taxes'],['Net platform revenue','Fees and subscriptions after refunds and credits'],['Contribution margin','Net revenue minus variable costs per booking'],['City contribution','Contribution minus the city\'s operations cost']])}${lnk('ops:finance','Open the ledger')}</div>`};
C.qa=()=>{const chk=F_('cv_chk',{});const L=['Every P0 acceptance criterion passes','Zero double bookings across 10,000 contested attempts','Payment chaos suite passes; zero unexplained mismatches over 7 days','Penetration test closed with no critical or high findings','DPIA signed off; privacy notice in every language','Legal pages, company details and grievance officer published','Incident-response tabletop completed','Support staffed 24×7 for active bookings','Every space passed a scripted arrival test in 30 days','Reserve inventory contracted','Dashboards live, each metric with definition and owner','Dark-pattern self-check completed'];
  return `${phead('QA and release','Section 21. Critical scenarios you can exercise in this app, and the R1 launch checklist.')}
  ${table([['Area'],['Scenario'],['Try it']],[['Inventory','A held space can\'t be booked twice; hold expiry releases it','J:driver:8.1'],['Payments','Failure; late confirmation','J:driver:8.1'],['Policy','Cancel at 61, 60, 59 min before start','J:driver:CHG-02/04'],['Access','Pass in airplane mode; guard offline; wrong plate flagged','J:guard:8.9'],['Money and tax','TDS with and without PAN; payout hold after bank change','J:host:PAY-05/06'],['Security','Support refund above limit is refused','ops:staff'],['Notifications','SMS fallback when push fails','ops:notifs'],['EV','Charging failure converts to parking','J:driver:8.6'],['Civic','Duplicate detection; only officers record outcomes','agree:authority:civic']].map(r=>({cells:[`<b>${r[0]}</b>`,r[1],lnk(r[2],'Try')]})))}
  <div class="card stack"><b>R1 launch checklist</b>${L.map((l,i)=>`<button class="cbx" role="checkbox" aria-checked="${!!chk[i]}" data-act="cv_tick" data-i="${i}"><span class="box">${chk[i]?ic('check',16):''}</span><span>${l}</span></button>`).join('')}<p class="sub">${Object.values(chk).filter(Boolean).length} of ${L.length} ticked. R1 doesn't launch until all are.</p></div>
  <div class="card stack"><b>Definitions of ready and done (21.6)</b><p class="sub">Ready: story with acceptance criteria; designs for five states; events named; policy values known; privacy impact noted. Done: reviewed, server-side authorisation, tests pass, events validated, error and offline paths, runbooks updated, behind a flag, accepted.</p></div>`};
C.delivery=()=>`${phead('Delivery plan','Section 22. R0 opens January 2027; R1 launches May 2027; R2 runs as two trains (R2a, R2b).')}
  ${table([['Role'],['Headcount'],['Notes']],[['Product owner','1','Owns this document and acceptance'],['Product designer','1','Driver, host, guard and console flows'],['Mobile engineers','2','Cross-platform app (OD-08)'],['Backend engineers','3','Booking engine, payments, integrations'],['Web engineer','1','Website, guard mode, consoles'],['QA engineer','1','Automation, concurrency, payment chaos'],['Platform and data','1','Infrastructure, observability, analytics']].map(r=>({cells:r})))}
  ${table([['Dependency'],['Lead time'],['Needed for']],[['Aggregator marketplace onboarding','Several weeks; start week 1','First paid R0 booking'],['Sender ID and WhatsApp templates','1–2 weeks','OTP and confirmations'],['Legal opinions (OD-06)','4–6 weeks','R0 paid bookings'],['Home charging opinion (OD-05)','Before R2 build','R2'],['Insurer agreement (OD-04)','8–12 weeks','R1 host protection'],['App store accounts','1–2 weeks','R0 app']].map(r=>({cells:r})))}
  <div class="card stack"><b>Budget lines to cost (22.4)</b><p class="sub">People · cloud and tooling · variable services · security and legal · reserve inventory and host protection · growth · 15% contingency.</p></div>`;
C.risks=()=>`${phead('Risks and hypotheses','Sections 23 and 24, with the screen that mitigates or measures each.')}
  ${table([['ID'],['Risk'],['Likelihood'],['Impact'],['']],RK.map(r=>({cells:[`<b class="mono">${r[0]}</b>`,esc(r[1]),r[2],r[3],lnk(RKAPP[r[0]])]})))}
  <h2 class="h-l">Hypotheses</h2>${table([['ID'],['Hypothesis'],['Passes if']],HY.map(h=>({cells:[`<b class="mono">${h[0]}</b>`,esc(h[1]),esc(h[2])]})))}`;
C.gov=()=>`${phead('Governance and appendices','Section 25 and Appendices A–D.')}
  ${table([['Decision'],['Founder'],['Product owner'],['Head of Eng'],['Head of Ops'],['Legal'],['Finance']],[['Release scope and gates','A','R','C','C','C','I'],['Policy values','A','R','I','C','C','C'],['Architecture and stack','I','C','A, R','I','I','I'],['Security and privacy controls','I','C','A, R','C','C','I'],['Verification standards','I','C','I','A, R','C','I'],['Trust and safety policy','A','C','I','R','C','I'],['Pricing and commercial terms','A, R','C','I','C','C','C'],['Regulatory sign-off','A','C','C','C','R','C'],['Partner agreements','A, R','C','C','C','C','C'],['Launch go or no-go','A','R','C','C','C','C']].map(r=>({cells:r})))}
  <div class="card stack"><b>Change control (25.2)</b><p class="sub">Minor changes by the product owner in the change log. Material changes (P0, money policy, gates, data use, legal) need a change record. Versions 1.x for additions; 2.0 for scope changes. Reviewed every two weeks.</p></div>
  <div class="grid g2"><div class="card stack"><b>Appendix A · Glossary</b><p class="sub">Driver, host, facility, space, pool, hold, pre-book, park-now, monthly pass, session, successful session, re-accommodation, space protection, civic report, guard mode, reliability score, zone band, kept hours, micro-market, GBV, relay, night pass, Flex Pass, automatic availability, fallback space, Space Guarantee, association share, verified attribute, partner link, public pay-and-park, official tariff, attendant app, wallet, set-and-forget hosting. Each is used with this meaning across the app.</p></div>
  <div class="card stack"><b>Appendices B–D</b><p class="sub">B · Epics: the module filter on Requirements. C · Notification catalogue: Operations → Notifications. D · Event taxonomy: Operations → Analytics events.</p><div class="toolbar">${lnk('prd:reqs','Requirements')}${lnk('ops:notifs','Notifications')}${lnk('ops:events','Events')}</div></div></div>`;
C.program=()=>`${phead('Document control','Section 1.')}<div class="card">${kv([['Product','PAPHere: peer-to-peer parking and EV charging marketplace with compliance reporting'],['Document','PRD v1.0 (build baseline)'],['Status','Draft for founder review'],['Approvers','Founder/CEO · Head of Engineering · Head of Operations · Legal counsel'],['Review cadence','Every two weeks during build'],['Market','India; one pilot micro-market first']])}</div>
  ${table([['Priority'],['Meaning']],[['P0','Blocks the pilot launch'],['P1','Required before city-wide launch'],['P2','Planned for a later release'],['P3','Exploratory']].map(r=>({cells:r})))}<p class="sub">Status tags: DECIDED · PROPOSED · HYPOTHESIS · DEPENDENCY. Release labels R0–R5 appear beside features across the app.</p>`;
Object.assign(ACT,{cv_calc:()=>render(),cv_tick:(t,d)=>{const c=Object.assign({},F_('cv_chk',{}));c[d.i]=!c[d.i];S.f.cv_chk=c;render()}});
SURF.coverage={name:'PRD coverage',who:'Every section mapped',kind:'desk',start:'overview',screens:C,
  nav:[{s:'overview',l:'Section map'},{s:'reqs',l:'Requirements (222)'},{s:'journeys',l:'Journeys (8)'},{s:'personas',l:'Personas (5)'},{s:'decisions',l:'Decisions (7)'},{s:'releases',l:'Scope and releases (2, 4, 6)'},{g:'Reference'},{s:'program',l:'Document control (1)'},{s:'market',l:'Market (3)'},{s:'ux',l:'UX (11)'},{s:'data',l:'Data and states (12)'},{s:'arch',l:'Architecture (13, 14)'},{s:'legal',l:'Legal and privacy (15)'},{s:'gtm',l:'Go-to-market (18)'},{s:'money',l:'Unit economics (19)'},{s:'qa',l:'QA and release (21)'},{s:'delivery',l:'Delivery (22)'},{s:'risks',l:'Risks and hypotheses (23, 24)'},{s:'gov',l:'Governance (25, A–D)'}],
  onInput:(k)=>{if(k==='cv_q'){clearTimeout(window.__cvT);window.__cvT=setTimeout(()=>{render();const i=$('[data-bind="cv_q"]');if(i){i.focus();i.setSelectionRange(i.value.length,i.value.length)}},250)}}};
window.PRD_REQS=R;
})();
