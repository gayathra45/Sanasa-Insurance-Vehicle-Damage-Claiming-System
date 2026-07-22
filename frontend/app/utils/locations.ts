export interface LocationData {
  [province: string]: {
    [district: string]: string[];
  };
}

export const sriLankaLocations: LocationData = {
  Western: {
    Colombo: [
      "Colombo",
      "Kolonnawa",
      "Kaduwela",
      "Homagama",
      "Hanwella",
      "Padukka",
      "Maharagama",
      "Sri Jayawardenepura Kotte",
      "Thimbirigasyaya",
      "Dehiwala",
      "Ratmalana",
      "Moratuwa",
      "Kesbewa"
    ],
    Gampaha: [
      "Gampaha",
      "Attanagalla",
      "Biyagama",
      "Divulapitiya",
      "Dompe",
      "Ja-Ela",
      "Katana",
      "Kelaniya",
      "Mahara",
      "Minuwangoda",
      "Mirigama",
      "Wattala"
    ],
    Kalutara: [
      "Kalutara",
      "Beruwala",
      "Aluthgama",
      "Panadura",
      "Horana",
      "Ingiriya",
      "Bulathsinhala",
      "Madurawela",
      "Matugama",
      "Walallawita",
      "Agalawatta",
      "Palindanuwara"
    ]
  },
  Southern: {
    Galle: [
      "Galle Four Gravets",
      "Habaraduwa",
      "Ambalangoda",
      "Hikkaduwa",
      "Baddegama",
      "Bope-Poddala",
      "Welivitiya-Divithura",
      "Karandeniya",
      "Elpitiya",
      "Niyagama",
      "Thawalama",
      "Neluwa",
      "Yakkalamulla",
      "Imaduwa",
      "Balapitiya",
      "Bentota",
      "Gonapinuwala",
      "Nagoda"
    ],
    Matara: [
      "Matara Four Gravets",
      "Devinuwara",
      "Dickwella",
      "Weligama",
      "Akuressa",
      "Kamburupitiya",
      "Thihagoda",
      "Malimbada",
      "Mulatiyana",
      "Hakmana",
      "Kotapola",
      "Pasgoda",
      "Pitabeddara",
      "Athuraliya",
      "Kirinda Puhulwella"
    ],
    Hambantota: [
      "Hambantota",
      "Ambalantota",
      "Angunakolapelessa",
      "Beliatta",
      "Katuwana",
      "Lunugamvehera",
      "Okewela",
      "Suriyawewa",
      "Tangalle",
      "Tissamaharama",
      "Walasmulla",
      "Weeraketiya"
    ]
  },
  "North Western": {
    Kurunegala: [
      "Kurunegala",
      "Wariyapola",
      "Mawathagama",
      "Kuliyapitiya West",
      "Kuliyapitiya East",
      "Ibbagamuwa",
      "Panduwasnuwara",
      "Bingiriya",
      "Galgamuwa",
      "Polgahawela",
      "Alawwa",
      "Pannala",
      "Ridigama"
    ],
    Puttalam: [
      "Puttalam",
      "Chilaw",
      "Anamaduwa",
      "Arachchikattuwa",
      "Kalpitiya",
      "Karuwalagaswewa",
      "Madampe",
      "Mahawewa",
      "Mundalama",
      "Nattandiya",
      "Pallama",
      "Vanathavilluwa",
      "Wennappuwa"
    ]
  },
  "North Central": {
    Anuradhapura: [
      "Anuradhapura Town",
      "Mihintale",
      "Kekirawa",
      "Galenbindunuwewa",
      "Galnewa",
      "Horowpothana",
      "Kahatagasdigiliya",
      "Medawachchiya",
      "Nochchiyagama",
      "Padaviya",
      "Palagala",
      "Rambewa",
      "Talawa",
      "Thambuththegama",
      "Tirappane"
    ],
    Polonnaruwa: [
      "Polonnaruwa Town",
      "Kaduruwela",
      "Medirigiriya",
      "Dimbulagala",
      "Elahera",
      "Lankapura",
      "Thamankaduwa",
      "Welikanda"
    ]
  },
  Uva: {
    Badulla: [
      "Badulla Town",
      "Bandarawela",
      "Hali-Ela",
      "Ella",
      "Haputale",
      "Mahiyangana",
      "Passara",
      "Welimada",
      "Diyatalawa",
      "Uva Paranagama"
    ],
    Monaragala: [
      "Monaragala Town",
      "Wellawaya",
      "Buttala",
      "Bibile",
      "Badalkumbura",
      "Katharagama",
      "Madulla",
      "Medagama",
      "Siyambalanduwa",
      "Thanamalwila"
    ]
  },
  Central: {
    Kandy: [
      "Kandy Four Gravets",
      "Gangawata Korale",
      "Harispattuwa",
      "Kundasale",
      "Minipe",
      "Panwila",
      "Pathadumbara",
      "Pathahewaheta",
      "Poojapitiya",
      "Udapalatha",
      "Udunuwara",
      "Yatinuwara"
    ],
    Matale: [
      "Matale Town",
      "Dambulla",
      "Galewela",
      "Naula",
      "Pallepola",
      "Rattota",
      "Ukuwela",
      "Yatawatta"
    ],
    "Nuwara Eliya": [
      "Nuwara Eliya Town",
      "Ambagamuwa",
      "Kotmale",
      "Hanguranketha",
      "Walapane"
    ]
  },
  Sabaragamuwa: {
    Ratnapura: [
      "Ratnapura Town",
      "Balangoda",
      "Embilipitiya",
      "Ayagama",
      "Eheliyagoda",
      "Elapatha",
      "Kahawatta",
      "Kiriella",
      "Kolonne",
      "Kuruvita",
      "Nivitigala",
      "Pelmadulla"
    ],
    Kegalle: [
      "Kegalle Town",
      "Mawanella",
      "Rambukkana",
      "Aranayaka",
      "Bulathkohupitiya",
      "Dehiowita",
      "Deraniyagala",
      "Galigamuwa",
      "Ruwanwella",
      "Yatiyantota"
    ]
  },
  Northern: {
    Jaffna: [
      "Jaffna Town",
      "Nallur",
      "Chavakachcheri",
      "Karainegar",
      "Kayts",
      "Point Pedro",
      "Sandilipay",
      "Valikamam"
    ],
    Vavuniya: [
      "Vavuniya Town",
      "Nedunkeni",
      "Vavuniya North",
      "Vavuniya South"
    ]
  },
  Eastern: {
    Trincomalee: [
      "Trincomalee Town and Gravets",
      "Kuchchaveli",
      "Gomarankadawala",
      "Kantale",
      "Kinniya",
      "Mutur",
      "Padavi Sri Pura",
      "Seruvila",
      "Verugal"
    ],
    Batticaloa: [
      "Batticaloa Town",
      "Kattankudy",
      "Eravur Pattu",
      "Koralai Pattu",
      "Manmunai Pattu"
    ],
    Ampara: [
      "Ampara Town",
      "Kalmunai",
      "Dehiattakandiya",
      "Damana",
      "Lahugala",
      "Mahaoya",
      "Padiyathalawa",
      "Uhana"
    ]
  }
};
