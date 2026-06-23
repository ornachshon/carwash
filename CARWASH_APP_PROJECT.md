# Mobile Car Wash App — Project Spec & Cursor Kickoff

## 1. Concept

Two-sided marketplace app, Android-first.

- **Car Owners** — request a mobile car wash at their current location.
- **Washers** — see nearby job requests, accept, drive to the owner, complete the wash.

Model: washer comes to the owner (like Uber/DoorDash), not a fixed wash station.

---

## 2. Stack

| Layer | Choice | Why |
|---|---|---|
| App | React Native (Expo) | Fastest path to a real Android build, EAS handles signing/builds, reuses your existing React patterns |
| Backend | Supabase (Postgres + Auth + Realtime + Storage) | Same stack as Travel Agent project — Realtime for live job/location updates, PostGIS for "nearby washers" queries, Row Level Security for two-sided data isolation |
| Payments | Stripe Connect | Needed because the app pays OUT to washers, not just charges owners. Authorize on booking, capture on completion |
| Maps/Location | react-native-maps (Google Maps SDK) | Live washer location, job location pins |
| Push Notifications | Expo Notifications | Job assigned, washer en route, payment captured |
| Hosting/Deploy | EAS Build + Vercel (if a web/admin dashboard is added later) | Consistent with existing toolchain |

**Not chosen:** Native Kotlin (new language, no payoff yet at MVP stage), Flutter (Dart is a fresh context switch with no code reuse from other projects).

---

## 3. Core Data Model (Supabase / Postgres)

```
users (extends Supabase auth.users)
  - id
  - role: 'owner' | 'washer'
  - full_name
  - phone
  - created_at

washer_profiles
  - user_id (FK -> users)
  - rating (avg)
  - vehicle_description
  - service_radius_km
  - current_location (geography point, PostGIS)
  - is_available (bool)
  - stripe_connect_account_id

vehicles
  - id
  - owner_id (FK -> users)
  - make, model, color, license_plate
  - size_category (affects pricing)

wash_jobs
  - id
  - owner_id (FK -> users)
  - washer_id (FK -> users, nullable until accepted)
  - vehicle_id (FK -> vehicles)
  - location (geography point)
  - address_text
  - status: 'requested' | 'accepted' | 'en_route' | 'in_progress' | 'completed' | 'cancelled' | 'paid'
  - price
  - stripe_payment_intent_id
  - requested_at, accepted_at, completed_at

job_status_history
  - id
  - job_id (FK -> wash_jobs)
  - status
  - changed_at

ratings
  - id
  - job_id (FK -> wash_jobs)
  - rated_by (owner or washer)
  - rated_user_id
  - score (1-5)
  - comment
```

Row Level Security: owners only see their own jobs/vehicles; washers only see jobs in their radius (when status='requested') or jobs assigned to them.

---

## 4. MVP Scope (build in this order)

1. **Auth + role selection** — sign up as Owner or Washer
2. **Owner flow:** add vehicle → request wash (pick location, time) → see status live
3. **Washer flow:** toggle "available" → see nearby requested jobs on a map → accept one
4. **Live status sync** — both sides see status update in real time (Supabase Realtime)
5. **Stripe Connect payment** — authorize on request, capture on completion, payout to washer
6. **Post-job rating** — simple 1-5 stars + comment, both directions

**Explicitly out of scope for MVP:** scheduling/recurring washes, in-app chat, multiple service tiers/pricing, washer onboarding/background checks, admin dashboard, iOS build.

---

## 5. Cursor Kickoff Prompt

Paste this into Cursor (in an empty project folder) to start scaffolding:

```
I'm building a two-sided mobile marketplace app called "CarWash" — Android-first, using
React Native (Expo) and Supabase as the backend.

CONCEPT:
Two user roles: Car Owners (request a mobile car wash at their location) and Washers
(accept nearby wash requests and complete them on-site). This is a location-based
on-demand marketplace, similar in structure to Uber/DoorDash, but for mobile car washing.

STACK:
- React Native with Expo (managed workflow), TypeScript
- Supabase: Postgres + Auth + Realtime + Storage, with PostGIS enabled for geo queries
- Stripe Connect for payments (authorize on booking, capture on completion, payout to washer)
- react-native-maps for map views and location
- Expo Notifications for push

TASK — set up the initial project:
1. Initialize an Expo + TypeScript project structured for scale (not a single-file app):
   /app or /src with clear folders: screens, components, hooks, services, types, navigation
2. Set up React Navigation with two flows based on user role (Owner stack, Washer stack),
   gated behind an Auth stack (sign up, log in, role selection on first sign up)
3. Set up the Supabase client (supabase-js) with environment-based config (.env, not
   hardcoded keys), and a typed client using generated types from the schema below
4. Create the initial Postgres schema as a Supabase migration, including:
   - users (role: owner/washer), washer_profiles (with PostGIS location column),
     vehicles, wash_jobs (with status enum and PostGIS location column),
     job_status_history, ratings
   - Row Level Security policies: owners see only their own data; washers see
     'requested' jobs within their service radius, plus jobs assigned to them
5. Scaffold (empty/placeholder screens are fine for now) the MVP screens:
   - Auth: SignUp, Login, RoleSelect
   - Owner: AddVehicle, RequestWash, JobStatus (live)
   - Washer: AvailabilityToggle, NearbyJobsMap, JobDetail, JobStatusUpdate
   - Shared: RateUser
6. Set up a basic theme/design system file (colors, spacing, typography) so screens
   are visually consistent from the start

Don't implement Stripe yet — just scaffold the structure so payment logic has a clear
place to live (e.g. /src/services/payments.ts) once we're ready for it.

Ask me before making assumptions about navigation library version or folder structure
naming if anything is ambiguous — otherwise use sensible, common React Native/Expo
conventions.
```

---

## 6. Open Decisions for Later

- Pricing model: flat fee vs. distance-based vs. service tiers (basic/premium wash)
- Washer vetting/onboarding (background checks, insurance)
- Cancellation policy and refund rules
- Service radius default and whether owners see washer ETA
