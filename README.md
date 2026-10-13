# Capitalflow: Remote Asset Inspections

An interactive demo for **Capitalflow Commercial Finance**, prepared by DMC Consultancy Ltd.

The earlier supplier-app demo is at capitalflowdemo-production.up.railway.app. Capitalflow
then saw a competing platform that works from a link rather than an app, supports several
users, and produces a detailed inspection report. They sent a sample report from it.
This version rebuilds the flow around those three points:

1. **A link, not an app.** Capitalflow sends the inspector (the customer, supplying dealer or
   introducing broker) an SMS or email link. It opens in any phone browser, with no install and no login.
2. **Multi-user.** The office side is a shared team workspace. Each colleague has their own login and
   a role (Admin / Reviewer / Requester), and there's a team activity feed, comments on reports and an
   audit trail.
3. **The report.** It follows the same structure as the sample the client sent: a header card, quick-status
   flags, a location-mismatch alert, red / amber / spoof counts, a map of the expected vs actual location,
   positive-impact figures, then every section with time- and GPS-stamped photos.

## Designed for the phone

Everything, both the Capitalflow staff side and the inspector link, is laid out as a phone app: an app bar,
a bottom tab bar (Inspections · **+ New** · Activity · Team), card lists and single-column forms and report.
On a real phone it fills the screen. On a laptop it is shown inside a phone frame (like the earlier
supplier-app demo), with a Reset demo data button underneath.

## The flow

| Who | Screen | What works |
| --- | --- | --- |
| Staff | **Sign in** | Email + password, or one-click "sign in as" for the four demo colleagues. Login is per browser tab, so two tabs can be two different people |
| Staff | **Inspections** | Swipeable status tiles (ready for review, in progress, awaiting inspector, query raised, approved) that filter the list, search, Team / Mine, a card per inspection with status, progress and flags |
| Staff | **Activity** | Everything the team and the inspectors have done, newest first (dot on the tab when there's something new) |
| Staff | **New request** | Proposal ref, customer, asset type (car, van, HGV, plant, agri), make / model / reg / VIN on file, expected address, who inspects (customer / dealer / broker), SMS / email, bolt-on checks, reviewer, link expiry |
| Staff | **Request tracking** | The link, a QR code to open it on a phone, a preview of the SMS, and a live progress timeline (opened → step x of y → submitted). Send reminder / cancel |
| Inspector | **Link flow** (`/i/<token>`) | Welcome, then location, asset details, VIN, odometer (hour meter for plant), five condition photos, documents, storage & security, then any bolt-ons. Review & declaration, then submit. Progress saves after every step and the link resumes where it left off |
| Staff | **Report** | The veri.fi-style report described above, plus Approve / Raise a query / Request re-inspection, team comments, an audit trail and Download PDF (print) |
| Staff | **Team** | Colleagues, roles, invite / remove (Admin only) |

### Checks the report runs

- **Location:** compares the address the inspector confirmed (geocoded) with the phone's GPS. More than 1.5 km
  apart is an amber flag, and more than 50 km is red. If no location is shared, that's a red flag.
- **VIN / serial** that doesn't match the record on file is red. A **registration** mismatch is amber.
- **VIN tampering** reported is red. Poor / damaged condition, not working, and VRC owner mismatch are amber.
- **Spoof alerts:** a photo whose file was created before the inspection started (i.e. picked from the
  gallery, not taken live), or one taken more than 1 km from the inspection location.
- The **IP addresses** of the inspector's device are recorded server-side.

On a phone the photo button opens the rear camera. Each step also has a **Use sample photo (demo)** link,
so the demo can be completed on a laptop.

## Shared data

`server.js` keeps a small in-memory API (`/api/inspections`, `/api/kv/team`). This means a link
completed on a phone shows up live on the office dashboard on another computer. The data is shared by
everyone viewing the demo and **resets on every redeploy**. **Reset demo data** in the user menu
clears it on demand. The six seeded inspections are always present.

## Running it locally

This machine has no Node, so `dev_server.py` mirrors `server.js` (same routes and API):

```bash
python3 dev_server.py 8795
```

Then open http://localhost:8795

## Deploying to Railway

New Project → Deploy from GitHub repo → this repository. Railway reads `railway.json` and runs
`npm start`. The server binds to `process.env.PORT`, and the health check is at `/healthz`.
Map tiles come from OpenStreetMap and address lookup from Nominatim, so the deployed demo needs internet access.

## Demo data

The team members, customers, addresses, registrations, VINs and IPs are all placeholders. The sample
photos are drawn in the browser. Nothing is sent by SMS or email.
