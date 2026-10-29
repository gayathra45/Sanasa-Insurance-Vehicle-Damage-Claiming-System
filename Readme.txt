================================================================================
SANASA GENERAL INSURANCE - MOTOR CLAIM, POLICY RENEWAL & FLEET MANAGEMENT
SCLAIM GO: ENTERPRISE ECOSYSTEM
================================================================================

PROJECT LINKS & LIVE DEPLOYMENTS:
--------------------------------------------------------------------------------
* Official Web Application : https://sanasa-insurance-vehicle-damage-cla.vercel.app/
* Mobile App (Android APK) : https://expo.dev/accounts/gayathra45/projects/sclaim-go/builds/9159f4c0-c72a-47eb-8221-48521d8c8de5
* Source Code Repository   : https://github.com/gayathra45/SanasaInsuarance
* API Backend Host         : Deployed on Render Cloud Server
* Cloud Database           : MongoDB Atlas Cloud Cluster
* 24/7 Island-Wide Hotline : 0725 575 575


================================================================================
1. EXECUTIVE PLATFORM OVERVIEW
================================================================================

SANASA SClaim Go is an enterprise-grade digital motor insurance claims, policy
underwriting, and driver fleet governance platform engineered for SANASA
General Insurance PLC (Sri Lanka).

The ecosystem connects four key stakeholder domains into a synchronized,
real-time environment:
  1. Policyholders (Insured Vehicle Owners)
  2. Field Insurance Agents (On-site Assessment & Inspection Officers)
  3. Regional Branch Office Staff (Claim Adjudicators & Underwriters)
  4. Executive Administrators (Operations & Regional Analytics)
  5. Authorized Secondary / Third-Party Drivers (Zero-install Mobile Pass)


================================================================================
2. COMPREHENSIVE MODULES & NEW FUNCTIONS
================================================================================

[1. Policyholder Web & SClaim Go Mobile App]
  - Vehicle Vault & Digital Certificate Management:
      * View registered vehicles with authentic Sri Lankan plate identification
        (e.g., WP LK, CP LK, SP LK) with province code & blue flag emblem.
      * Instant cover note generation and PDF policy certificate download.
      * Specification modal displaying engine capacity, fuel type, chassis/engine
        number, sum insured, and policy expiry countdown.
      * Responsive Grid and List view toggle with live search and status filters.

  - Third-Party Driver Authorization & Branch Termination Engine:
      * Authorize external drivers under existing policy coverage with NIC &
        Driving License KYC document verification.
      * Flat processing fee of LKR 300 covering all selected vehicles via Stripe.
      * Generates a secure tokenized digital pass (/driver-access/[token]) with
        one-click "Copy Link" clipboard utility.
      * Interactive "Manage Driver" modal displaying full profile, contact info,
        covered vehicles list, approval date, and active pass token.
      * Official branch-reviewed driver termination workflow: policyholder
        submits termination request with reason (Resigned, Vehicle Sold,
        Misconduct, Owner Revocation, Custom). Enters "Pending Termination Approval".
        Once branch approves, pass status updates to "Terminated", token is revoked,
        and driver is 100% blocked from all web and mobile endpoints with HTTP 403,
        accompanied by automated SMS dispatches to both owner and driver.

  - Rapid Scene-of-Accident Claim Reporting:
      * Multi-step guided wizard: vehicle selection, incident time/date, driver-at-wheel,
        and damage categorization (Front Collision, Rear Impact, Windscreen, etc.).
      * Live Geolocation with GPS auto-pinning & OpenStreetMap / Photon reverse-
        geocoding (Town, District, Landmark autocomplete).
      * Client-side forensic image compression and duplicate-detection engine.
      * Immediate Claim Reference Number generation (e.g., CLM-2026-0042).

  - 8-Stage Interactive Claim Stepper:
      * Live status tracking: Reported -> Branch Acknowledged -> Assessor Dispatched ->
        Scene Inspection -> Damage Estimation -> Approval -> Settlement -> Closed.
      * Instant vector-accurate Official Claim Dossier PDF download
        (/api/claims/:claimNumber/report).

  - Stripe Multi-Installment Premium Renewal Engine:
      * Automated valuation based on vehicle age, market value, and engine CC.
      * Flexible payment tiers:
          - 1-Time Full Annual Payment (100% upfront)
          - 2-Installment Plan (50% down payment + 50% mid-term installment)
          - 4-Installment Plan (25% down payment + 3 quarterly installments)
      * Stripe Webhook listener for zero-latency policy validity extension and
        digital receipt delivery.

  - Live Claim Communication Hub (Socket.io Chat):
      * Dedicated bidirectional chat channel per claim reference number.
      * Unread badges, read receipts, image attachment uploads.
      * Seamless messaging between Vehicle Owner, Field Assessor, and Branch Officer.

  - Sanasa AI Assistant:
      * Built-in conversational AI assistant accessible on all portal pages.
      * Understands queries on claim progress, policy guidelines, nearest branch
        locations, and roadside assistance.
      * Embeds interactive buttons and direct deep-links in chat responses.


[2. Field Insurance Agent / Assessor Mobility Hub]
  - Real-Time Claim Dispatch: Instant push and SMS notifications on claim assignment.
  - Turn-by-Turn GPS Navigation (MapRoute): Built-in map view with route direction
    from agent's current location straight to accident scene GPS coordinates.
  - On-Site Forensic Damage Assessment: Digital checklist for structural bodywork,
    glass, mechanical, and third-party liabilities with photo capture and damage tagging.
  - Preliminary Cost Estimation: On-site labor rate and parts replacement calculation.
  - Tri-Party Claim Chat: Direct messaging with claimant and branch claims officers.


[3. Regional Branch Office Staff Portal]
  - Branch Claims Dispatch & Inbox: Geographic routing covering all 27 branches
    across Sri Lanka's 9 provinces with smart assessor dispatching.
  - Third-Party Driver Verification & Termination Governance: Dedicated drawer for
    reviewing driver KYC documents, approving/rejecting driver applications, and
    processing termination requests with automated SMS notifications.
  - Policyholder Registrations & Vehicle Verification: Review incoming policyholder
    sign-ups, vehicle documentation, and chassis numbers.
  - Claim Adjudication & Settlement Finalization: Review agent estimates, adjust
    approved labor/parts costs, and finalize settlement payout amounts.
  - Operational Reporting: Branch performance summaries, monthly claim volume, and
    payout distribution metrics.


[4. System Administrator Executive Portal]
  - Global Multi-Tenant User Management: Role-based access control (RBAC) across
    Policyholders, Agents, Branch Staff, and Admins.
  - Live System Analytics & Financial Metrics: Island-wide claim heatmaps,
    settlement totals, and renewal retention rates.
  - Branch & Province Configuration: Maintain branch metadata and hotline assignments.
  - Database Backups & System Health: Automated MongoDB backup procedures and audit logs.


[5. Dedicated Tokenized Driver Web Pass (/driver-access/[token])]
  - Zero-install, responsive web application for authorized third-party drivers.
  - Cryptographic token verification on session load.
  - Displays policyholder name, insured vehicle details, and digital insurance pass.
  - One-click accident reporting on behalf of the vehicle owner with direct GPS capture.
  - Instant hard-lock (403 Forbidden) if driver authorization has been terminated.


================================================================================
3. TECHNOLOGY ARCHITECTURE
================================================================================

  - Frontend Web    : Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4
  - Mobile App      : React Native 0.86, Expo SDK 57, Expo Router, EAS Cloud Build
  - Backend API     : Node.js, Express.js REST API
  - Real-Time Engine: Socket.io Bi-directional WebSocket Channels
  - Database        : MongoDB Atlas (Mongoose ODM, GeoJSON Spatial Indexes)
  - Payment Gateway : Stripe API (Credit/Debit Card Processing & Webhooks)
  - SMS Service     : TextBee SMS Gateway (Corporate Automated Dispatch)
  - Geocoding       : OpenStreetMap, Photon API & Nominatim
  - Document Engine : PDFKit / Vector Canvas Claim Dossiers
  - Web Analytics   : Vercel Analytics


================================================================================
4. REGIONAL BRANCH NETWORK (27 BRANCHES ISLAND-WIDE)
================================================================================

  * Western Province      : Colombo Head Office, Negombo, Kalutara, Gampaha
  * Southern Province     : Galle, Matara, Hambantota, Ambalangoda, Sooriyawewa
  * Central Province      : Kandy, Matale, Nuwara Eliya
  * North Western Province: Kurunegala, Puttalam
  * North Central Province: Anuradhapura, Polonnaruwa
  * Northern Province     : Jaffna, Kilinochchi, Mannar, Vavuniya, Mullaitivu
  * Eastern Province      : Batticaloa, Trincomalee, Ampara
  * Sabaragamuwa Province : Ratnapura, Kegalle
  * Uva Province          : Badulla, Moneragala


================================================================================
5. LOCAL DEVELOPMENT & SETUP
================================================================================

[Step 1: Clone Repository]
  git clone https://github.com/gayathra45/SanasaInsuarance.git
  cd SanasaInsuarance

[Step 2: Start Backend Server]
  cd .\backend\
  npm install
  npm run dev
  (Runs on http://localhost:5000 and 0.0.0.0:5000)

[Step 3: Start Frontend Web Application]
  cd .\frontend\
  npm install
  npm run dev
  (Runs on http://localhost:3000)

[Step 4: Launch Mobile Application]
  cd .\mobile_app\
  npm install
  npx expo start -c
  (Automated IP synchronizer connects workstation IP; scan QR code with Expo Go)


================================================================================
6. SECURITY & DATA PRIVACY
================================================================================

  - Passwords are encrypted using bcrypt hashing prior to persistence.
  - Stateless JSON Web Tokens (JWT) scoped with RBAC role claims.
  - Single-use, revocable authentication tokens for third-party driver access.
  - Zero sensitive credentials, passwords, or production secrets stored in repository.

================================================================================
Client  : SANASA General Insurance PLC (Sri Lanka)
System  : SClaim Go Motor Claim, Policy Renewal & Fleet Management Platform
Author  : Gayathra Samuditha (https://github.com/gayathra45)
License : MIT License (Refer to LICENSE file)
================================================================================
