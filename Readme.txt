================================================================================
SANASA GENERAL INSURANCE - MOTOR CLAIM & POLICY MANAGEMENT PLATFORM
SCLAIM GO: ENTERPRISE ECOSYSTEM
================================================================================

PROJECT LINKS & LIVE DEPLOYMENTS:
--------------------------------------------------------------------------------
* Official Web Application : https://sanasa-insurance-vehicle-damage-cla.vercel.app/
* Mobile App (Android APK) : https://expo.dev/accounts/gayathra45/projects/sclaim-go/builds/9159f4c0-c72a-47eb-8221-48521d8c8de5
* Source Code Repository   : https://github.com/gayathra45/SanasaInsuarance
* API Backend Host         : Deployed on Render Cloud Server
* Cloud Database           : MongoDB Atlas Cloud Cluster


================================================================================
1. EXECUTIVE PLATFORM OVERVIEW
================================================================================

SANASA SClaim Go is a full-stack, enterprise-grade motor vehicle insurance
management platform engineered for SANASA General Insurance PLC (Sri Lanka).

The ecosystem connects four key stakeholder domains into a synchronized,
real-time environment:
  1. Policyholders (Insured Vehicle Owners)
  2. Field Insurance Agents (On-site Assessment & Inspection Officers)
  3. Regional Branch Office Staff (Claim Adjudicators & Underwriters)
  4. Executive Administrators (Operations & Regional Analytics)


================================================================================
2. KEY MODULES & CAPABILITIES
================================================================================

[Policyholder Web & Mobile Portal]
  - Vehicle & Policy Hub:
      * View registered vehicles with authentic Sri Lankan plate identification.
      * Instant cover note generation and PDF policy download.
      * Flexible policy renewal (One-time and multi-installment via Stripe).
  - Rapid Accident Claim Filing:
      * Step-by-step guided filing wizard with GPS coordinate capture.
      * Reverse-geocoding powered by OpenStreetMap / Photon for precise locations.
      * Multi-photo vehicle damage uploads with smart client-side compression.
  - Live Claim Step Tracking:
      * Real-time progress bar from Filing -> Assessment -> Approval -> Settlement.
      * Downloadable official PDF Claim Dossier (/api/claims/:claimNumber/report).
  - Third-Party Driver Authorization:
      * Authorize external drivers under existing policy coverage (LKR 300 fee).
      * Secure tokenized digital passes for web and mobile pass access.
      * Official branch-reviewed driver termination workflow: policyholder
        submits termination request with reason; upon branch approval, access
        across all web and mobile portals is permanently revoked.
  - Sanasa AI Assistant:
      * Conversational natural language assistant capable of retrieving live
        claims status, vehicle specifications, branch contact directories, and
        policy guidelines.

[Field Insurance Agent Portal]
  - On-site accident inspections and damage assessment reporting.
  - Real-time map location routing to accident scenes.
  - Direct Claim Chat with policyholders and branch claims officers.

[Branch Office Staff Portal]
  - Multi-stage claim investigation, damage estimation, and settlement approval.
  - Third-party driver approval & termination review desk with automated SMS.
  - Island-wide directory routing across 27 regional Sri Lankan branches.

[System Administrator Portal]
  - Multi-branch staff management, role-based access control (RBAC), and KPI metrics.


================================================================================
3. TECHNOLOGY ARCHITECTURE
================================================================================

  - Frontend Web    : Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS
  - Mobile App      : React Native, Expo SDK 57, Expo Router, EAS Cloud Build
  - Backend API     : Node.js, Express.js, Socket.io Real-Time Engine
  - Database        : MongoDB Atlas (Mongoose ODM)
  - Payment Gateway : Stripe API (Credit/Debit Card Processing)
  - SMS Service     : TextBee SMS Gateway (Corporate Automated Dispatch)
  - Geocoding       : OpenStreetMap, Photon API & Nominatim
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
  (Scan QR code with Expo Go or run on Android emulator)


================================================================================
6. SECURITY & DATA PRIVACY
================================================================================

  - Passwords are encrypted using bcrypt hashing prior to persistence.
  - Role-based token authorization for Policyholders, Agents, Staff, and Admins.
  - Single-use, revocable authentication tokens for third-party driver access.
  - No sensitive credentials, passwords, or production secrets stored in repo.

================================================================================
Client : SANASA General Insurance PLC (Sri Lanka)
System : SClaim Go Motor Claim & Policy Management Platform
Author : Gayathra Samuditha (https://github.com/gayathra45)
================================================================================
