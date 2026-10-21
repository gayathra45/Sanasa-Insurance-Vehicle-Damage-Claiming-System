================================================================================
SANASA GENERAL INSURANCE - MOTOR CLAIM & POLICY MANAGEMENT SYSTEM
================================================================================

================================================================================
1. PROJECT STARTUP COMMANDS
================================================================================

[Backend Server]
  cd .\backend\
  npm run dev
  (Runs Express API server on http://localhost:5000 and network 0.0.0.0:5000)

[Frontend Web Portal]
  cd .\frontend\
  npm run dev
  (Runs Next.js portal on http://localhost:3000)

[Mobile Application (Expo)]
  cd .\mobile_app\
  npx expo start -c
  (Runs React Native Expo with automated IP synchronization and ADB port reverse)

[Git Branch Commands]
  git branch
  git checkout [branch name]


================================================================================
2. ALL BRANCHES LOGIN CREDENTIALS (OFFICE STAFF)
   *** ALL BRANCHES DEFAULT PASSWORD: branch123 ***
================================================================================

No. | Branch Name         | District     | Province      | Branch Email             | Phone / Mobile | Password
----+---------------------+--------------+---------------+--------------------------+----------------+-----------
 1. | Ambalangoda Branch  | Galle        | Southern      | ambalangoda@gmail.com    | 0778901127     | branch123
 2. | Ampara Branch       | Ampara       | Eastern       | ampara@gmail.com         | 0757788896     | branch123
 3. | Anuradhapura Branch | Anuradhapura | North Central | anuradhapura@gmail.com   | 0712127330     | branch123
 4. | Badulla Branch      | Badulla      | Uva           | badulla@gmail.com        | 0754344552     | branch123
 5. | Batticaloa Branch   | Batticaloa   | Eastern       | batticaloa@ymail.com     | 0766677885     | branch123
 6. | Colombo Branch      | Colombo      | Western       | colombo@gmail.com        | 0771234501     | branch123
 7. | Galle Branch        | Galle        | Southern      | galle@gmail.com          | 0768088176     | branch123
 8. | Hambantota Branch   | Hambantota   | Southern      | hambantota@gmail.com     | 0769012349     | branch123
 9. | Jaffna Branch       | Jaffna       | Northern      | jaffna@gmail.com         | 0751122350     | branch123
10. | Kalutara Branch     | Kalutara     | Western       | kalutara@gmail.com       | 0763456703     | branch123
11. | Kandy Branch        | Kandy        | Central       | kandy@gmail.com          | 0714567804     | branch123
12. | Kegalle Branch      | Kegalle      | Sabaragamuwa  | kegalle@gmail.com        | 0777677885     | branch123
13. | Kilinochchi Branch  | Kilinochchi  | Northern      | kilinochchi@gmail.com    | 0732233461     | branch123
14. | Kurunegala Branch   | Kurunegala   | North Western | kurunegala@gmail.com     | 0729900118     | branch123
15. | Mannar Branch       | Mannar       | Northern      | mannar@gmail.com         | 0723344562     | branch123
16. | Matale Branch       | Matale       | Central       | matale@gmail.com         | 0785678905     | branch123
17. | Matara Branch       | Matara       | Southern      | matara@gmail.com         | 0718901238     | branch123
18. | Moneragala Branch   | Moneragala   | Uva           | moneragala@gmail.com     | 0785455663     | branch123
19. | Mullaitivu Branch   | Mullaitivu   | Northern      | mullaitivu@gmail.com     | 0774455663     | branch123
20. | Negombo Branch      | Gampaha      | Western       | negombo@gmail.com        | 0712345602     | branch123
21. | Nuwara Eliya Branch | Nuwara Eliya | Central       | nuwaraeliya@gmail.com    | 0726789016     | branch123
22. | Polonnaruwa Branch  | Polonnaruwa  | North Central | polonnaruwa@gmail.com    | 0763233441     | branch123
23. | Puttalam Branch     | Puttalam     | North Western | puttalam@gmail.com       | 0740011229     | branch123
24. | Ratnapura Branch    | Ratnapura    | Sabaragamuwa  | ratnapura@ymail.com      | 0726566774     | branch123
25. | Sooriyawewa Branch  | Hambantota   | Southern      | pmvihaga@gmail.com       | 0417547895     | branch123
26. | Trincomalee Branch  | Trincomalee  | Eastern       | trincomalee@gmail.com    | 0788899007     | branch123
27. | Vavuniya Branch     | Vavuniya     | Northern      | vavuniya@gmail.com       | 0715566774     | branch123


================================================================================
3. POLICY HOLDER (USER) CREDENTIALS
================================================================================

Account 1 (Primary Test):
  Full Name : Gayathra Samuditha
  NIC       : 200415901825
  Email     : gayathrasamuditha45@gmail.com
  Password  : gayathra45
  Mobile    : 0771974163
  Vehicles  : 5 registered vehicles (CBH-3202, VN-7645, WP-KT-8899, BJE 3287, CPD-8756)

Account 2:
  Full Name : Bhavindu Subasinghe
  NIC       : 200430800399
  Email     : bavindusubasinghe812@gmail.com
  Password  : bhavindu123


================================================================================
4. FIELD INSURANCE AGENT CREDENTIALS
================================================================================

Agent 1 (Galle Branch):
  Name     : Oshitha Imarshana
  Email    : oshitha@gmail.com
  Password : oshitha123
  Branch   : Galle

Agent 2 (Matara Branch):
  Name     : B Dewmini
  Email    : bhagyadewmini11@gmail.com
  Password : gayathra123
  Branch   : Matara

Agent 3:
  Email    : cartlanka097@gmail.com
  Password : gayathra123


================================================================================
5. SYSTEM ADMINISTRATOR CREDENTIALS
================================================================================

Admin 1 (Primary System Admin):
  Name     : Gayathra Samuditha
  Email    : admin@gmail.com
  Password : admin123

Admin 2:
  Email    : toituu2003ttr@gmail.com
  Password : admin123


================================================================================
6. KEY SYSTEM FEATURES & ENDPOINTS
================================================================================

- Sanasa AI Assistant:
  * Inquire any Claim ID (e.g., CLM-0000-0014) to view full status, vehicle, assessment, and officer details.
  * Inquire "What are my claims?" or "What are my vehicles?" to fetch live policyholder records.
  * Direct clickable Official PDF Claim Dossier link:
    GET /api/claims/:claimNumber/report

- Claim Summary PDF Download Option:
  * Available on Web and Mobile:
    - Policy Holder My Claims list & details popup modal
    - Policy Holder Track Claims search results card
    - Sanasa AI Chatbot reply message badge
    - Agent Dashboard & Claims Directory popups

- Real-time IP Synchronizer:
  * Automatically detects local machine network IPv4 (e.g. 192.168.42.36).
  * Automatically applies "adb reverse tcp:5000 tcp:5000" for Android emulators.
================================================================================
