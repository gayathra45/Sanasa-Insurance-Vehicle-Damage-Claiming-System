import { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const translations = {
  en: {
    login: {
      title: "Login",
      nicOrEmail: "NIC or Email Address",
      nicEmailPlaceholder: "Enter your NIC or Email",
      password: "Password",
      passwordPlaceholder: "Enter your password",
      loginBtn: "Login",
      createAccount: "Create an Account",
      resetPassword: "Reset Password",
      validationError: "Validation Error",
      validationMsg: "Please fill out both NIC/Email and Password fields.",
      loginFailed: "Login Failed",
      networkError: "Network Error",
      connMsg: "Could not connect to server. Please check your connection.",
      accessDenied: "Access Denied",
      accessDeniedMsg: "Only Policy Holders and Agents can log in via this mobile app."
    },
    dashboard: {
      welcomeBack: "Welcome back,",
      compensationCallout: "An accident claim with Sanasa General Insurance Company Limited is a request for compensation after an accident.",
      newClaim: "New Claim",
      trackClaim: "Track Claim",
      totalClaims: "Total Claims",
      inProgress: "In Progress",
      approved: "Approved",
      myDocs: "My Documents",
      myDocsSub: "Policy files, NIC, License & more",
      notificationsHeader: "Notifications & Reminders",
      noNotifications: "No notifications or alerts.",
      policyActive: "Policy active.",
      pendingClaims: "pending claim",
      pendingClaimsPlural: "pending claims",
      awaitingAction: "documents awaiting action",
      upToDate: "Your policy is active and up to date. No pending actions.",
      upload: "Upload",
      view: "View",
      totalClaimsCard: "Total Claims",
      inProgressCard: "In Progress",
      approvedCard: "Approved"
    },
    myClaims: {
      title: "My Claims",
      searchPlaceholder: "Search claim plate or description...",
      noClaims: "No matching claim files found.",
      noClaimsSub: "Try modifying your search query.",
      claimNumber: "Claim Number",
      vehicleId: "Vehicle ID",
      damageType: "Damage Type",
      location: "Location",
      status: "Status",
      viewDetails: "View Details",
      detailsTitle: "Claim Details",
      incidentDate: "Incident Date",
      incidentTime: "Incident Time",
      description: "Description",
      branch: "Branch",
      assessment: "Assessment Amount",
      documentsNeeded: "Documents Needed",
      documentsNeededDesc: "Staff has requested the following files from you:",
      close: "Close",
      notAssessed: "Not Assessed"
    },
    trackClaims: {
      title: "Track Claims",
      noClaims: "No claim files to track.",
      noClaimsSub: "You haven't submitted any accident claims yet.",
      selectClaim: "Select a Claim to Track",
      step1Title: "Incident Registered",
      step1Desc: "Your accident report has been logged in our system.",
      step2Title: "Inspector Assigned",
      step2Desc: "Our regional agent has been assigned to inspect vehicle damages.",
      step3Title: "Estimate Review",
      step3Desc: "Repair estimates are being generated and reviewed by branch staff.",
      step4Title: "Resolution Finalized",
      step4Desc: "Your claim has been fully processed and resolved.",
      notAssessed: "Not Assessed",
      viewDetails: "View Details"
    },
    notifications: {
      title: "Notifications",
      noNotifications: "No new notifications.",
      noNotificationsSub: "All caught up! Check back later for updates."
    },
    contact: {
      title: "Help & Support",
      subtitle: "Contact Sanasa support lines or view frequently asked questions",
      faqHeader: "Frequently Asked Questions",
      hotlineTitle: "Sanasa Support Hotline",
      hotlineSub: "+94 112 003 000 | 24/7 Support",
      emailTitle: "Support Portal Email",
      emailSub: "support@sanasainsurance.lk",
      generalInquiries: "General Inquiries",
      officeHours: "Office Working Hours",
      weekdays: "Monday - Friday (8:30 AM - 5:00 PM)",
      saturday: "Saturday (8:30 AM - 1:30 PM)",
      holidays: "Sunday & Public Holidays (Closed)",
      sendEmail: "Send Support Request",
      subject: "Subject",
      message: "Message Details",
      sendMessage: "Send Message",
      sending: "Sending...",
      cancel: "Cancel",
      successMsg: "Support ticket submitted successfully!",
      errorMsg: "Failed to send support ticket. Please try again."
    },
    agentDashboard: {
      title: "Agent Portal",
      assignedClaims: "Assigned Claims",
      activeTasks: "Active Tasks",
      completedAssessments: "Completed Assessments",
      loadingDossier: "Loading claims dossier...",
      details: "Details"
    }
  },
  si: {
    login: {
      title: "ලොගින් වන්න",
      nicOrEmail: "ජාතික හැඳුනුම්පත් අංකය හෝ විද්‍යුත් තැපෑල",
      nicEmailPlaceholder: "හැඳුනුම්පත හෝ විද්‍යුත් තැපෑල ඇතුළත් කරන්න",
      password: "මුරපදය",
      passwordPlaceholder: "මුරපදය ඇතුළත් කරන්න",
      loginBtn: "ඇතුල් වන්න",
      createAccount: "ගිණුමක් සාදන්න",
      resetPassword: "මුරපදය අලුත් කරන්න",
      validationError: "සත්‍යාපන දෝෂයකි",
      validationMsg: "කරුණාකර ක්ෂේත්‍ර දෙකම පුරවන්න.",
      loginFailed: "ඇතුල් වීම අසාර්ථක විය",
      networkError: "ජාල දෝෂයකි",
      connMsg: "සේවාදායකයට සම්බන්ධ විය නොහැක. කරුණාකර ඔබගේ ජාලය පරීක්ෂා කරන්න.",
      accessDenied: "ප්‍රවේශය ප්‍රතික්ෂේප විය",
      accessDeniedMsg: "මෙම ජංගම යෙදුම හරහා ලොග් විය හැක්කේ රක්ෂණ හිමියන්ට සහ නියෝජිතයින්ට පමණි."
    },
    dashboard: {
      welcomeBack: "ආයුබෝවන්,",
      compensationCallout: "සනස සාමාන්‍ය රක්ෂණ සමාගම සමඟ සිදුකරන අනතුරු හිමිකම් පෑමක් යනු අනතුරකින් පසු වන්දි ලබා ගැනීම සඳහා කරන ඉල්ලීමකි.",
      newClaim: "නව හිමිකම් පෑමක්",
      trackClaim: "හිමිකම් සොයායන්න",
      totalClaims: "මුළු හිමිකම්",
      inProgress: "ක්‍රියාත්මක වෙමින්",
      approved: "අනුමතයි",
      myDocs: "මගේ ලේඛන",
      myDocsSub: "ප්‍රතිපත්ති ගොනු, හැඳුනුම්පත්, බලපත්‍ර සහ තවත් දේ",
      notificationsHeader: "දැනුම්දීම් සහ මතක් කිරීම්",
      noNotifications: "දැනුම්දීම් කිසිවක් නැත.",
      policyActive: "රක්ෂණ ඔප්පුව සක්‍රියයි.",
      pendingClaims: "හිමිකම් පෑමක් ඉතිරිව ඇත",
      pendingClaimsPlural: "හිමිකම් පෑම් ඉතිරිව ඇත",
      awaitingAction: "ලේඛන ක්‍රියාමාර්ග බලාපොරොත්තුවෙන් පවතී",
      upToDate: "ඔබේ රක්ෂණ ඔප්පුව සක්‍රියයි. කිසිදු ක්‍රියාවක් ඉතිරිව නැත.",
      upload: "උඩුගත කරන්න",
      view: "බලන්න",
      totalClaimsCard: "මුළු හිමිකම්",
      inProgressCard: "ක්‍රියාත්මක වෙමින්",
      approvedCard: "අනුමතයි"
    },
    myClaims: {
      title: "මගේ හිමිකම්",
      searchPlaceholder: "හිමිකම් තහඩුව හෝ විස්තර සොයන්න...",
      noClaims: "ගැලපෙන හිමිකම් ගොනු හමු නොවීය.",
      noClaimsSub: "කරුණාකර සෙවුම් විමසුම වෙනස් කර නැවත උත්සාහ කරන්න.",
      claimNumber: "හිමිකම් අංකය",
      vehicleId: "වාහන අංකය",
      damageType: "හානි වර්ගය",
      location: "ස්ථානය",
      status: "තත්ත්වය",
      viewDetails: "විස්තර බලන්න",
      detailsTitle: "හිමිකම් විස්තර",
      incidentDate: "අනතුර සිදු වූ දිනය",
      incidentTime: "අනතුර සිදු වූ වේලාව",
      description: "විස්තරය",
      branch: "ශාඛාව",
      assessment: "තක්සේරු මුදල",
      documentsNeeded: "අවශ්‍ය ලේඛන",
      documentsNeededDesc: "කාර්ය මණ්ඩලය විසින් පහත ලේඛන ඉල්ලා ඇත:",
      close: "වසා දමන්න",
      notAssessed: "තක්සේරු කර නැත"
    },
    trackClaims: {
      title: "හිමිකම් සොයායෑම",
      noClaims: "සොයා බැලීමට හිමිකම් නැත.",
      noClaimsSub: "ඔබ තවමත් කිසිදු අනතුරු හිමිකම් පෑමක් ඉදිරිපත් කර නැත.",
      selectClaim: "සොයා බැලීම සඳහා හිමිකම් පෑමක් තෝරන්න",
      step1Title: "අනතුර ලියාපදිංචි කිරීම",
      step1Desc: "ඔබගේ අනතුරු වාර්තාව අපගේ පද්ධතියට ඇතුළත් කර ඇත.",
      step2Title: "නියෝජිතයෙකු පත් කිරීම",
      step2Desc: "වාහනයේ හානි පරීක්ෂා කිරීම සඳහා අපගේ නියෝජිතයෙකු පත් කර ඇත.",
      step3Title: "තක්සේරු සමාලෝචනය",
      step3Desc: "අලුත්වැඩියා තක්සේරු වාර්තා ශාඛා කාර්ය මණ්ඩලය විසින් සමාලෝචනය කරනු ලැබේ.",
      step4Title: "හිමිකම් පෑම නිම කිරීම",
      step4Desc: "ඔබගේ හිමිකම් පෑම සම්පූර්ණයෙන්ම සකසා අවසන් කර ඇත.",
      notAssessed: "තක්සේරු කර නැත",
      viewDetails: "විස්තර බලන්න"
    },
    notifications: {
      title: "දැනුම්දීම්",
      noNotifications: "නව දැනුම්දීම් කිසිවක් නැත.",
      noNotificationsSub: "සියල්ල යාවත්කාලීනයි! පසුව නැවත පරීක්ෂා කරන්න."
    },
    contact: {
      title: "උදව් සහ සහාය",
      subtitle: "සනස සහාය සේවා අමතන්න හෝ නිතර අසන ප්‍රශ්න බලන්න",
      faqHeader: "නිතර අසන ප්‍රශ්න",
      hotlineTitle: "සනස සහාය ක්ෂණික ඇමතුම් අංකය",
      hotlineSub: "+94 112 003 000 | 24/7 සහාය",
      emailTitle: "විද්‍යුත් තැපෑල",
      emailSub: "support@sanasainsurance.lk",
      generalInquiries: "පොදු විමසීම්",
      officeHours: "කාර්යාලීය රාජකාරි වේලාවන්",
      weekdays: "සඳුදා - සිකුරාදා (පෙ.ව. 8:30 - ප.ව. 5:00)",
      saturday: "සෙනසුරාදා (පෙ.ව. 8:30 - ප.ව. 1:30)",
      holidays: "ඉරිදා සහ රජයේ නිවාඩු දින (වසා ඇත)",
      sendEmail: "සහාය ඉල්ලීමක් යවන්න",
      subject: "මාතෘකාව",
      message: "විස්තරය",
      sendMessage: "යවන්න",
      sending: "යවමින් පවතී...",
      cancel: "අවලංගු කරන්න",
      successMsg: "සහාය ඉල්ලීම සාර්ථකව ඉදිරිපත් කරන ලදී!",
      errorMsg: "ඉල්ලීම යැවීම අසාර්ථක විය. නැවත උත්සාහ කරන්න."
    },
    agentDashboard: {
      title: "නියෝජිත පෝටලය",
      assignedClaims: "පවරා ඇති හිමිකම්",
      activeTasks: "ක්‍රියාකාරී කාර්යයන්",
      completedAssessments: "නිමකළ තක්සේරු",
      loadingDossier: "හිමිකම් ගොනු පූරණය වෙමින් පවතී...",
      details: "විස්තර"
    }
  },
  ta: {
    login: {
      title: "உள்நுழைக",
      nicOrEmail: "அடையாள அட்டை அல்லது மின்னஞ்சல்",
      nicEmailPlaceholder: "உங்கள் அட்டை எண் அல்லது மின்னஞ்சலை உள்ளிடவும்",
      password: "கடவுச்சொல்",
      passwordPlaceholder: "உங்கள் கடவுச்சொல்லை உள்ளிடவும்",
      loginBtn: "உள்நுழைக",
      createAccount: "கணக்கை உருவாக்கு",
      resetPassword: "கடவுச்சொல்லை மீட்டமை",
      validationError: "சரிபார்ப்பு பிழை",
      validationMsg: "மின்னஞ்சல்/அடையாள அட்டை மற்றும் கடவுச்சொல் இரண்டையும் நிரப்பவும்.",
      loginFailed: "உள்நுழைவு தோல்வியடைந்தது",
      networkError: "பிணைய பிழை",
      connMsg: "சேவையகத்துடன் இணைக்க முடியவில்லை. உங்கள் பிணையத்தைச் சரிபார்க்கவும்.",
      accessDenied: "அணுகல் மறுக்கப்பட்டது",
      accessDeniedMsg: "இந்த மொபைல் செயலி மூலம் காப்பீட்டாளர்கள் மற்றும் முகவர்கள் மட்டுமே உள்நுழைய முடியும்."
    },
    dashboard: {
      welcomeBack: "வரவேற்கிறோம்,",
      compensationCallout: "சனச ஜெனரல் இன்சூரன்ஸ் நிறுவனத்துடனான விபத்து கோரிக்கை என்பது விபத்திற்குப் பிறகு இழப்பீடு கோருவதாகும்.",
      newClaim: "புதிய கோரிக்கை",
      trackClaim: "கோரிக்கையைத் தொடர்க",
      totalClaims: "மொத்த கோரிக்கைகள்",
      inProgress: "செயல்பாட்டில்",
      approved: "அங்கீகரிக்கப்பட்டது",
      myDocs: "எனது ஆவணங்கள்",
      myDocsSub: "பாலிசி கோப்புகள், அடையாள அட்டை, உரிமம் மற்றும் பல",
      notificationsHeader: "அறிவிப்புகள் & நினைவூட்டல்கள்",
      noNotifications: "அறிவிப்புகள் எதுவும் இல்லை.",
      policyActive: "பாலிசி செயல்பாட்டில் உள்ளது.",
      pendingClaims: "கோரிக்கை நிலுவையில் உள்ளது",
      pendingClaimsPlural: "கோரிக்கைகள் நிலுவையில் உள்ளன",
      awaitingAction: "ஆவணங்கள் நடவடிக்கைக்காக காத்திருக்கின்றன",
      upToDate: "உங்கள் பாலிசி செயல்பாட்டில் உள்ளது. நிலுவையில் உள்ள நடவடிக்கைகள் எதுவும் இல்லை.",
      upload: "பதிவேற்று",
      view: "பார்",
      totalClaimsCard: "மொத்த கோரிக்கைகள்",
      inProgressCard: "செயல்பாட்டில்",
      approvedCard: "அங்கீகரிக்கப்பட்டது"
    },
    myClaims: {
      title: "எனது கோரிக்கைகள்",
      searchPlaceholder: "கோரிக்கை வாகன எண் அல்லது விவரங்களைத் தேடுக...",
      noClaims: "பொருத்தமான கோப்புகள் எதுவும் இல்லை.",
      noClaimsSub: "தயவுசெய்து வேறு வினவலைத் தேடுக.",
      claimNumber: "கோரிக்கை எண்",
      vehicleId: "வாகன எண்",
      damageType: "சேத வகை",
      location: "இடம்",
      status: "நிலை",
      viewDetails: "விவரங்களைப் பார்க்க",
      detailsTitle: "கோரிக்கை விவரங்கள்",
      incidentDate: "விபத்து தேதி",
      incidentTime: "விபத்து நேரம்",
      description: "விவரம்",
      branch: "கிளை",
      assessment: "மதிப்பீட்டுத் தொகை",
      documentsNeeded: "தேவைப்படும் ஆவணங்கள்",
      documentsNeededDesc: "ஊழியர்கள் பின்வரும் கோப்புகளைக் கோரியுள்ளனர்:",
      close: "மூடுக",
      notAssessed: "மதிப்பிடப்படவில்லை"
    },
    trackClaims: {
      title: "கோரிக்கை கண்காணிப்பு",
      noClaims: "கண்காணிக்க கோரிக்கைகள் இல்லை.",
      noClaimsSub: "நீங்கள் இன்னும் விபத்து கோரிக்கைகள் எதையும் சமர்ப்பிக்கவில்லை.",
      selectClaim: "கண்காணிக்க ஒரு கோரிக்கையைத் தேர்ந்தெடுக்கவும்",
      step1Title: "விபத்து பதிவு செய்யப்பட்டது",
      step1Desc: "உங்கள் விபத்து அறிக்கை எங்கள் அமைப்பில் பதிவு செய்யப்பட்டுள்ளது.",
      step2Title: "ஆய்வாளர் நியமிக்கப்பட்டார்",
      step2Desc: "வாகன சேதங்களை ஆய்வு செய்ய எங்கள் முகவர் நியமிக்கப்பட்டுள்ளார்.",
      step3Title: "மதிப்பீட்டு மதிப்பாய்வு",
      step3Desc: "பழுதுபார்ப்பு மதிப்பீடுகள் கிளை ஊழியர்களால் மதிப்பாய்வு செய்யப்படுகின்றன.",
      step4Title: "கோரிக்கை இறுதி செய்யப்பட்டது",
      step4Desc: "உங்கள் கோரிக்கை முழுமையாகச் செயலாக்கப்பட்டு தீர்க்கப்பட்டது.",
      notAssessed: "மதிப்பிடப்படவில்லை",
      viewDetails: "விவரங்களைப் பார்க்க"
    },
    notifications: {
      title: "அறிவிப்புகள்",
      noNotifications: "புதிய அறிவிப்புகள் எதுவும் இல்லை.",
      noNotificationsSub: "அனைத்தும் புதுப்பித்த நிலையில் உள்ளது! பிறகு சரிபார்க்கவும்."
    },
    contact: {
      title: "உதவி & ஆதரவு",
      subtitle: "சனச ஆதரவு எண்களைத் தொடர்பு கொள்ளவும் அல்லது கேள்விகளைப் பார்க்கவும்",
      faqHeader: "அடிக்கடி கேட்கப்படும் கேள்விகள்",
      hotlineTitle: "சனச ஆதரவு உதவி எண்",
      hotlineSub: "+94 112 003 000 | 24/7 ஆதரவு",
      emailTitle: "மின்னஞ்சல் முகவரி",
      emailSub: "support@sanasainsurance.lk",
      generalInquiries: "பொதுவான விசாரணைகள்",
      officeHours: "அலுவலக வேலை நேரம்",
      weekdays: "திங்கள் - வெள்ளி (மு.ப. 8:30 - பி.ப. 5:00)",
      saturday: "சனிக்கிழமை (மு.ப. 8:30 - பி.ப. 1:30)",
      holidays: "ஞாயிறு & விடுமுறை நாட்கள் (மூடப்பட்டுள்ளது)",
      sendEmail: "ஆதரவு கோரிக்கையை அனுப்பவும்",
      subject: "பொருள்",
      message: "செய்தி விவரங்கள்",
      sendMessage: "செய்தியை அனுப்பு",
      sending: "அனுப்பப்படுகிறது...",
      cancel: "ரத்து செய்",
      successMsg: "ஆதரவு கோரிக்கை வெற்றிகரமாக அனுப்பப்பட்டது!",
      errorMsg: "அனுப்ப முடியவில்லை. மீண்டும் முயற்சிக்கவும்."
    },
    agentDashboard: {
      title: "முகவர் போர்டல்",
      assignedClaims: "ஒதுக்கப்பட்ட கோரிக்கைகள்",
      activeTasks: "செயலில் உள்ள பணிகள்",
      completedAssessments: "முடிக்கப்பட்ட மதிப்பீடுகள்",
      loadingDossier: "கோப்புகள் ஏற்றப்படுகின்றன...",
      details: "விவரங்கள்"
    }
  }
};

export function useLanguage() {
  const [lang, setLang] = useState<"en" | "si" | "ta">("en");
  const [loading, setLoading] = useState(true);

  const loadLang = async () => {
    try {
      const saved = await AsyncStorage.getItem("language");
      if (saved && ["en", "si", "ta"].includes(saved)) {
        setLang(saved as "en" | "si" | "ta");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLang();
  }, []);

  const changeLang = async (newLang: "en" | "si" | "ta") => {
    setLang(newLang);
    await AsyncStorage.setItem("language", newLang);
  };

  return { lang, changeLang, t: translations[lang], loading };
}
