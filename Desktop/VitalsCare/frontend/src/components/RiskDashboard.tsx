import React, { useState, useEffect } from "react";
import {
  Heart,
  Activity,
  MapPin,
  ChevronRight,
  Check,
  Sparkles,
  ArrowRight,
  X,
  Smartphone,
  Droplet,
  Shuffle,
  Search,
  Calendar,
  Clock,
  TrendingUp,
  AlertTriangle,
  HeartCrack,
  ShieldAlert,
  BookOpen,
  CheckSquare,
  Download
} from "lucide-react";
import { AssessmentData, ViewType, Clinic, Article } from "../types";
import { downloadPDFReport } from "../utils/pdfGenerator";

interface HistoricalAssessment {
  date: string;
  hypertensionRisk: number;
  diabetesRisk: number;
  overallRisk: number;
  systolic: number;
  diastolic: number;
  weight: number;
}

interface RiskDashboardProps {
  lang: "EN" | "BN";
  assessmentData: AssessmentData;
  riskResults: any;
  onNavigate: (view: ViewType) => void;
  assessmentHistory: HistoricalAssessment[];
  setAssessmentHistory: React.Dispatch<React.SetStateAction<HistoricalAssessment[]>>;
  profileName: string;
  activeEmail: string;
}

export default function RiskDashboard({
  lang,
  assessmentData,
  riskResults,
  onNavigate,
  assessmentHistory,
  setAssessmentHistory,
  profileName,
  activeEmail,
}: RiskDashboardProps) {

  // Dynamic state for checklists in today's lifestyle plan
  const [actions, setActions] = useState([
    { id: "walk", nameEN: "Daily Brisk Walking (30 min)", nameBN: "দৈনিক ৩০ মিনিট দ্রুত হাঁটা", progressEN: "4,200 / 6,000 steps", progressBN: "৪,২০০ / ৬,০০০ কদম", completed: false, icon: "walk" },
    { id: "water", nameEN: "Optimal Multi-hydration Intake", nameBN: "পর্যাপ্ত পানি পানের স্বাস্থ্যকর লক্ষ্য", progressEN: "1.5L / 2.5L", progressBN: "১.৫ লিটার / ২.৫ লিটার", completed: false, icon: "water" },
    { id: "salt", nameEN: "Eliminate Plateside Table Salt", nameBN: "খাবারের সাথে কাঁচা লবণ বর্জন", progressEN: "Avoid added table salt", progressBN: "পােতে কাঁচা লবণ খাওয়া পরিহার করুন", completed: false, icon: "salt" },
    { id: "sugar", nameEN: "Sugar & Soft Drink Cessation", nameBN: "চিনি ও কোমল পানীয় পরিহার করা", progressEN: "No refined sugar today", progressBN: "আজ কোনো পরিশোধিত চিনি খাবেন না", completed: false, icon: "sugar" }
  ]);

  const toggleAction = (id: string) => {
    setActions(actions.map(a => a.id === id ? { ...a, completed: !a.completed } : a));
  };

  const completedCount = actions.filter(a => a.completed).length;
  const progressPercent = Math.round((completedCount / actions.length) * 100);

  // ── OpenStreetMap / Overpass API Integration ──────────────────────────────
  // Haversine formula to compute distance in km between two lat/lng pairs
  const haversine = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  // Fallback centre if geolocation is denied / unavailable (Set to Cumilla for testing)
  const FALLBACK_CENTER = { lat: 23.4607, lng: 91.1809 }; // Cumilla

  // User's real GPS position (null until resolved)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  // 'pending' | 'granted' | 'denied'
  const [geoStatus, setGeoStatus] = useState<"pending" | "granted" | "denied">("pending");

  // Fallback curated clinic list (shown while loading or if API fails)
  const fallbackClinics: Clinic[] = [];

  // Raw OSM clinic data (coordinates only, distances added after location resolves)
  const [rawOsmClinics, setRawOsmClinics] = useState<Clinic[]>([]);
  const [osmClinics, setOsmClinics] = useState<Clinic[]>(fallbackClinics);
  const [isLoadingClinics, setIsLoadingClinics] = useState(true);
  const [osmError, setOsmError] = useState(false);
  const [isOsmData, setIsOsmData] = useState(false);

  // Helper: attach real distances from a given origin and re-sort
  const applyDistances = (
    clinics: Clinic[],
    origin: { lat: number; lng: number }
  ): Clinic[] =>
    clinics
      .map((c) => ({
        ...c,
        distance: `${haversine(origin.lat, origin.lng, c.coordinates.lat, c.coordinates.lng).toFixed(1)} km`,
      }))
      .sort(
        (a, b) =>
          haversine(origin.lat, origin.lng, a.coordinates.lat, a.coordinates.lng) -
          haversine(origin.lat, origin.lng, b.coordinates.lat, b.coordinates.lng)
      );

  // Step 1 — request GPS on mount
  useEffect(() => {
    let resolved = false;

    if (!navigator.geolocation) {
      setGeoStatus("denied");
      return;
    }

    // Force fallback if user ignores the browser prompt or it silently fails
    const fallbackTimer = setTimeout(() => {
      if (!resolved) {
        setGeoStatus("denied");
        resolved = true;
      }
    }, 15000);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (resolved) return;
        resolved = true;
        clearTimeout(fallbackTimer);
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(loc);
        setGeoStatus("granted");
      },
      () => {
        // Permission denied or unavailable — fall back
        if (resolved) return;
        resolved = true;
        clearTimeout(fallbackTimer);
        setGeoStatus("denied");
      },
      { timeout: 8000, maximumAge: 60000 }
    );

    return () => clearTimeout(fallbackTimer);
  }, []);

  // Step 2 — fetch OSM clinics whenever geoStatus updates (so we have location if granted)
  useEffect(() => {
    if (geoStatus === "pending") return;

    const fetchOsmClinics = async () => {
      setIsLoadingClinics(true);
      setOsmError(false);

      const lat = userLocation?.lat ?? FALLBACK_CENTER.lat;
      const lng = userLocation?.lng ?? FALLBACK_CENTER.lng;

      // Use a 15km radius (around:15000) for faster/leaner query
      const query = `[out:json][timeout:15];
(
  node["amenity"~"hospital|clinic|doctors"]["name"](around:15000,${lat},${lng});
  way["amenity"~"hospital|clinic|doctors"]["name"](around:15000,${lat},${lng});
);
out center 40;`;

      try {
        // Use our dedicated Vercel Edge Function to proxy the request server-side
        // This guarantees we bypass any strict browser CORS or Overpass WAF restrictions on Vercel
        const res = await fetch("/api/overpass", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query })
        });

        if (!res.ok) throw new Error("Overpass API error");
        const json = await res.json();

        const parsed: Clinic[] = (json.elements || [])
          .filter((el: any) => {
            const t = el.tags || {};
            return t.name && t.name.trim().length > 2;
          })
          .map((el: any) => {
            const t = el.tags || {};
            const cLat: number = el.lat ?? el.center?.lat ?? lat;
            const cLng: number = el.lon ?? el.center?.lon ?? lng;

            const addrParts: string[] = [];
            if (t["addr:housenumber"]) addrParts.push(t["addr:housenumber"]);
            if (t["addr:street"]) addrParts.push(t["addr:street"]);
            if (t["addr:suburb"]) addrParts.push(t["addr:suburb"]);
            if (t["addr:city"]) addrParts.push(t["addr:city"]);
            else if (t["addr:district"]) addrParts.push(t["addr:district"]);
            const address =
              addrParts.length > 0
                ? addrParts.join(", ")
                : t["is_in"] || t["addr:postcode"] || "Bangladesh";

            const phone: string =
              t["contact:phone"] || t["phone"] || t["contact:mobile"] || "N/A";

            const rawHours: string = t["opening_hours"] || "";
            let hours = "Hours not listed";
            if (rawHours.toLowerCase().includes("24/7") || rawHours === "24/7") {
              hours = "Open 24 Hours";
            } else if (rawHours) {
              hours = rawHours.length > 30 ? rawHours.slice(0, 30) + "…" : rawHours;
            }

            return {
              name: t.name,
              address,
              phone,
              hours,
              distance: "— km",
              coordinates: { lat: cLat, lng: cLng },
            } as Clinic;
          })
          .filter((c: Clinic, i: number, arr: Clinic[]) =>
            arr.findIndex((x: Clinic) => x.name === c.name) === i
          );

        if (parsed.length > 0) {
          setRawOsmClinics(parsed);
          setIsOsmData(true);
        } else {
          setOsmError(true);
        }
      } catch (err) {
        console.error("Failed to fetch clinics", err);
        setOsmError(true);
      } finally {
        setIsLoadingClinics(false);
      }
    };

    fetchOsmClinics();
  }, [geoStatus, userLocation]);

  // Step 3 — whenever EITHER the raw clinics OR the user location changes,
  //           recompute distances from the best available origin.
  useEffect(() => {
    const origin = userLocation ?? FALLBACK_CENTER;
    const listToProcess = rawOsmClinics.length > 0 ? rawOsmClinics : fallbackClinics;
    setOsmClinics(applyDistances(listToProcess, origin));
  }, [rawOsmClinics, userLocation]);

  // The active clinic list — real OSM data or fallback
  const clinicList = osmClinics;

  // Clinic searching and filtration system
  const [clinicSearch, setClinicSearch] = useState("");
  const [activeClinicIdx, setActiveClinicIdx] = useState(0);

  const filteredClinics = clinicList.filter(clinic =>
    clinic.name.toLowerCase().includes(clinicSearch.toLowerCase()) ||
    clinic.address.toLowerCase().includes(clinicSearch.toLowerCase())
  );

  const defaultClinic: Clinic = { name: "No Clinic Found", distance: "0 km", hours: "-", phone: "-", address: "-", coordinates: { lat: 0, lng: 0 } };
  const activeClinic = filteredClinics[activeClinicIdx] || clinicList[0] || defaultClinic;

  // Interactive Online Appointment Booking State
  const [selectedService, setSelectedService] = useState("CVD");
  const getTomorrowDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };
  const [bookingDate, setBookingDate] = useState(getTomorrowDate());
  const [bookingTime, setBookingTime] = useState("09:00 AM - 11:30 AM");
  const [isBookingConfirmed, setIsBookingConfirmed] = useState(false);
  const [referralTicketCode, setReferralTicketCode] = useState("");

  const handleBookReferral = (e: React.FormEvent) => {
    e.preventDefault();
    const referenceId = Math.floor(10000 + Math.random() * 90000);
    setReferralTicketCode(`VT-REF-${referenceId}`);
    setIsBookingConfirmed(true);
  };

  // Keep state for selected historic timeline compare node
  const [selectedHistoryIdx, setSelectedHistoryIdx] = useState(assessmentHistory.length - 1);

  // Health Feed news guidelines (preserved content)
  const articles: Article[] = [
    {
      id: "art1",
      type: "ARTICLE",
      time: "2h ago",
      title: "How Seasonal Temperature Drops Affect Cardio BP",
      summary: "Recent multi-center diagnostic research suggests immediate relationships between ambient winter temperature drops and spikes in systolic arterial tension...",
      content: "As temperatures drop during cold seasons, peripheral blood vessels undergo vasoconstriction to preserve core body heat. For patients suffering from mild or essential hypertension, this increase in arterial resistance can trigger sudden spikes in systolic blood pressure. WHO Guidelines advise wearing warm layers, limiting outdoor exertion during drafty early mornings, and monitoring blood metrics weekly."
    },
    {
      id: "art2",
      type: "COMMUNITY",
      time: "5h ago",
      title: "Join the 'Morning Miles' Preventative Challenge",
      summary: "Our Bangladesh preventative community is logging walking targets together to trigger high insulin sensitivity indexes. Hit five thousand steps today!",
      content: "Regular physical activity of at least 150 minutes per week (about 30 minutes daily for 5 days) improves cardiovascular health and lowers HbA1c levels. The 'Morning Miles' challenge encourages members to walk briskly for 30 minutes in the morning. Over 1,200 active users are logging their steps today!"
    },
    {
      id: "art3",
      type: "ARTICLE",
      time: "1d ago",
      title: "Sodium Intake Standards For Safe Hydration",
      summary: "Understanding the balance between salt and water to maintain proper vascular volume and decrease chronic fatigue scores.",
      content: "Consuming more than 5 grams of salt (about 2 grams of sodium) daily is linked to hypertension. Reducing sodium intake relaxes arterial walls, helping reduce diastolic volume. Always pair low-sodium meals with 2 to 3 liters of fresh water intake to maintain steady cell hydration."
    }
  ];

  const [openedArticle, setOpenedArticle] = useState<Article | null>(null);

  // Dynamic Risk results evaluation parameters
  const currentHtRisk = riskResults?.hypertensionRisk ?? 35;
  const currentDbRisk = riskResults?.diabetesRisk ?? 32;
  const overallProb = riskResults?.overallRisk ?? 34;

  // Horizontal range indicators for current risks
  const getRiskLabel = (pct: number) => {
    if (pct < 35) return { text: lang === "EN" ? "Low Risk" : "কম ঝুঁকি", bg: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/45 dark:text-emerald-400", hex: "#10b981" };
    if (pct < 70) return { text: lang === "EN" ? "Medium Risk" : "মাঝারি ঝুঁকি", bg: "bg-amber-100 text-amber-800 dark:bg-amber-950/45 dark:text-amber-400", hex: "#f59e0b" };
    return { text: lang === "EN" ? "High Risk" : "উচ্চ ঝুঁকি", bg: "bg-rose-100 text-rose-800 dark:bg-rose-950/45 dark:text-rose-400", hex: "#ef4444" };
  };

  const sys = assessmentData.systolic || 120;
  const dia = assessmentData.diastolic || 80;

  // Real patient vitals classification
  let htnClinicalStageEN = "Normal Intravascular Pressure";
  let htnClinicalStageBN = "স্বাভাবিক রক্তচাপ স্তর";
  let htnClinicalColor = "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20";

  if (sys >= 160 || dia >= 100) {
    htnClinicalStageEN = "Stage 2 Hypertension (Severity Suspected)";
    htnClinicalStageBN = "২য় স্তরের উচ্চ রক্তচাপ (সতর্কতা প্রয়োজন)";
    htnClinicalColor = "text-red-500 bg-red-100/10";
  } else if (sys >= 140 || dia >= 90) {
    htnClinicalStageEN = "Stage 2 Hypertension Profile";
    htnClinicalStageBN = "২য় স্তরের রক্তচাপের লক্ষণ সমূহ";
    htnClinicalColor = "text-red-500 bg-red-100/10";
  } else if (sys >= 130 || dia >= 80) {
    htnClinicalStageEN = "Stage 1 Essential Hypertension";
    htnClinicalStageBN = "১ম স্তরের প্রাক-উচ্চ রক্তচাপ লক্ষণ";
    htnClinicalColor = "text-amber-500 bg-amber-100/10";
  } else if (sys >= 120) {
    htnClinicalStageEN = "Pre-Elevated Arterial Pressure";
    htnClinicalStageBN = "রক্তচাপের মাত্রা কিছুটা বেশী";
    htnClinicalColor = "text-amber-500 bg-amber-100/10";
  }

  // Metabolic tier diagnosis
  const hM = (assessmentData.height || 175) / 100;
  const bmiCurrent = (assessmentData.weight || 70) / (hM * hM);
  let dbClinicalStageEN = "Normal insulin responsiveness";
  let dbClinicalStageBN = "স্বাভাবিক বিপাকীয় সূচক";
  let dbClinicalColor = "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20";

  if (bmiCurrent >= 30 || assessmentData.familyHistory.diabetes) {
    dbClinicalStageEN = "Pre-diabetic metabolic flags active";
    dbClinicalStageBN = "প্রাক-ডায়াবেটিক বিপাকীয় ঝুঁকি সংকেত";
    dbClinicalColor = "text-amber-500 bg-amber-100/10";
  } else if (bmiCurrent >= 25) {
    dbClinicalStageEN = "Overweight threshold metabolic stress";
    dbClinicalStageBN = "ওজন বৃদ্ধির কারণে বিপাকীয় ধীর গতিপ্রক্রিয়া";
    dbClinicalColor = "text-amber-500 bg-amber-100/10";
  }

  // Mathematics for the interactive SVG comparative chart
  const points = assessmentHistory.map((hist, idx) => {
    const L = assessmentHistory.length;
    const x = L > 1 ? 55 + (idx * (390 / (L - 1))) : 250;
    // vertical range maps 0% to 100% into SVG y values [170 to 30]
    const yH = 170 - (hist.hypertensionRisk * 1.3);
    const yD = 170 - (hist.diabetesRisk * 1.3);
    return { ...hist, x, yH, yD };
  });

  // Calculate dynamic delta stats comparing highlighted history node vs first node
  const activePoint = points[selectedHistoryIdx] || points[points.length - 1];
  const baselinePoint = points[0];

  const sysChange = activePoint ? activePoint.systolic - baselinePoint.systolic : 0;
  const wtChange = activePoint ? activePoint.weight - baselinePoint.weight : 0;
  const riskChange = activePoint ? activePoint.overallRisk - baselinePoint.overallRisk : 0;

  // Language translation packages
  const t = {
    EN: {
      dashboardTitle: "Health Risk Registry",
      compareHeader: "Previous Health Assessments Contrast",
      compareSub: "Select any data node to inspect historical trend indicators and metrics change indices over time.",
      comparisonTelemetry: "Milestone Details",
      compareDate: "Date Record",
      noTimelineData: "Submit more than one assessment to review progress telemetry lines.",
      htnTitle: "Arterial Hypertension & CVD Risk",
      dbTitle: "Type 2 Diabetes & Metabolic Risk",
      clinicalClass: "Clinical Evaluation Status",
      recsHeader: "Precise Preventive Recommendations",
      clinicFinderTitle: "Bangladesh NCD Screening Centers & Referral Portal",
      clinicSearchPlaceholder: "Search clinics by name, district, Cantonment etc...",
      clinicBookBtn: "Schedule Screening Checkup",
      servicesLabel: "Required Screening Board",
      appointmentDate: "Booking Date",
      appointmentTime: "Booking Window Slot",
      recomLabel: "Recommended Preventative Actions",
      overallTitle: "Overall Non-Communicable Disease (NCD) Risk Meter",
      findingsPanel: "Current Diagnostics Summarization",
      bpValText: "Arterial Vitals",
      wtValText: "Body Weight",
      stageLabel: "Metabolic Status Category",
      voucherTitle: "E-Screening Referral Voucher",
      voucherClinic: "Target Medical Institution",
      voucherService: "Screening Service Concern",
      voucherCode: "Referral Serial ID",
      voucherTime: "Confirmed Checkup Slot",
      prepNotes: "Physical Preparation Protocol",
      prepInstructionsHT: "1. Avoid caffeinated drinks, sodium or smoking 2 hours before BP profiling. 2. Sit calmly for 5 minutes prior to screening.",
      prepInstructionsDB: "1. Complete strict dietary fasting for 10-12 hours prior to insulin checkout. Water intake is allowed.",
      prepInstructionsGen: "1. Maintain normal cell hydration. Bring family historic reports for chronic background checks.",
      printBtn: "Cancel or Book New Slot",
      successAlert: "Voucher Confirmed Successfully!"
    },
    BN: {
      dashboardTitle: "স্বাস্থ্যঝুঁকি রেজিস্ট্রি ও বিশ্লেষণ",
      compareHeader: "পূর্ববর্তী স্বাস্থ্য স্ক্রীনিং তুলনা গতিপথ",
      compareSub: "ঐতিহাসিক পরিবর্তন ও বিভিন্ন সূচকের অগ্রগতি বিশ্লেষণ করতে চার্টের যেকোনো নোড-এ ক্লিক করুন।",
      comparisonTelemetry: "নির্দিষ্ট সময়ের বিশ্লেষণ সূচক",
      compareDate: "পরীক্ষার তারিখ",
      noTimelineData: "ভবিষ্যত প্রগতি ট্র্যাক করতে একাধিক প্রতিরোধমূলক পরীক্ষা সম্পন্ন করুন।",
      htnTitle: "উচ্চ রক্তচাপ ও কার্ডিওভাসকুলার (CVD) ঝুঁকি কার্ড",
      dbTitle: "টাইপ ২ ডায়াবেটিস ও বিপাকীয় (T2D) ঝুঁকি কার্ড",
      clinicalClass: "ক্লিনিক্যাল শারীরিক মূল্যায়ন স্থিতি",
      recsHeader: "কার্যকরী প্রতিরোধমূলক সুনির্দিষ্ট গাইডলাইন",
      clinicFinderTitle: "বাংলাদেশে এনসিডি স্ক্রীনিং সেন্টার ও বুকিং পোর্টাল",
      clinicSearchPlaceholder: "নাম, জেলা বা ক্যান্টনমেন্ট অনুযায়ী সেন্টার খুঁজুন...",
      clinicBookBtn: "স্ক্রীনিং অ্যাপয়েন্টমেন্ট বুক করুন",
      servicesLabel: "প্রয়োজনীয় স্ক্রীনিং বোর্ড",
      appointmentDate: "নির্ধারিত তারিখ",
      appointmentTime: "পছন্দনীয় সময় সল্ট",
      recomLabel: "আজকের প্রতিরোধমূলক পরিকল্পনা",
      overallTitle: "সামগ্রিক অসংক্রামক রোগ (NCD) ঝুঁকি রেটিং",
      findingsPanel: "ডিজিটাল সনাক্ত বিশ্লেষণ ও অনুসন্ধান সমূহ",
      bpValText: "রক্তচাপ পরিমাপ",
      wtValText: "শারীরিক ওজন",
      stageLabel: "দীর্ঘস্থায়ী শারীরিক অবস্থা",
      voucherTitle: "ই-স্ক্রীনিং রেফারেল স্লিপ",
      voucherClinic: "নির্ধারিত স্বাস্থ্য প্রতিষ্ঠান",
      voucherService: "পরীক্ষার নির্দিষ্ট বিষয়",
      voucherCode: "রেফারেল বুকিং আইডি",
      voucherTime: "নির্ধারিত সময় স্লট",
      prepNotes: "পরীক্ষার পূর্ব প্রস্তুতি নির্দেশিকা",
      prepInstructionsHT: "১. রক্তচাপ পরিমাপের অন্তত ২ ঘণ্টা আগে ধূমপান, চা-কফি পরিহার করুন। ২. পরীক্ষার আগে ৫ মিনিট নিরিবিলি বিশ্রাম নিন।",
      prepInstructionsDB: "১. ইনসুলিন বা সুগার পরীক্ষার জন্য ১০-১২ ঘণ্টা সম্পূর্ণ খালি পেটে (ফাস্টিং) থাকুন। তবে পর্যাপ্ত পানি পান করা যাবে।",
      prepInstructionsGen: "১. স্বাভাবিক পানি পান বজায় রাখুন। পূর্ববর্তী কোনো প্রেসক্রিপশন বা রিপোর্ট থাকলে সাথে আনুন।",
      printBtn: "বাতিল করুন বা নতুন স্লট বুক করুন",
      successAlert: "আপনার রেফারেল বুকিং স্লিপ সফলভাবে তৈরি হয়েছে!"
    }
  };

  const currentT = t[lang];

  return (
    <div className="min-h-screen text-on-surface bg-background py-8 font-sans transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 md:px-8 space-y-8">

        {/* Dynamic Patient Status Top Bar */}
        <section className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-surface-container border border-outline-variant/30 rounded-3xl p-6 shadow-xs">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-on-surface">
                {lang === "EN" ? `Welcome, ${profileName || "Guest Patient"}` : `স্বাগতম, ${profileName || "অতিথি রোগী"}`}
              </h1>
              <span className="w-2.5 h-2.5 rounded-full bg-secondary animate-pulse shrink-0"></span>
            </div>
            <p className="text-xs md:text-sm text-on-surface-variant leading-relaxed mt-1">
              {lang === "EN"
                ? <>Your calculated NCD risk level is currently <span className="text-secondary font-bold font-mono">{(overallProb).toFixed(0)}%</span>. You have pending lifestyle actions.</>
                : <>আপনার নির্ণীত স্বাস্থ্যঝুঁকি সূচক বর্তমানে <span className="text-secondary font-bold font-mono">{(overallProb).toFixed(0)}%</span>। স্বাস্থ্য প্রগতি বজায় রাখতে নির্দেশিত পরিকল্পনা মেনে চলুন।</>
              }
            </p>
            {riskResults?.personalization?.message && (
              <div className="mt-3 bg-secondary/10 border border-secondary/30 rounded-xl p-3 flex gap-2 items-start max-w-xl">
                <Sparkles className="w-5 h-5 text-secondary shrink-0 mt-0.5" />
                <p className="text-xs text-on-surface font-semibold leading-relaxed">
                  {riskResults.personalization.message}
                </p>
              </div>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <button
              onClick={() => {
                downloadPDFReport(
                  lang,
                  profileName || (lang === "EN" ? "Guest Patient" : "অতিথি রোগী"),
                  activeEmail,
                  assessmentData,
                  riskResults,
                  isBookingConfirmed ? {
                    clinicName: activeClinic.name,
                    service: selectedService,
                    date: bookingDate,
                    time: bookingTime,
                    voucherCode: referralTicketCode
                  } : undefined
                );
              }}
              className="bg-surface-container-high text-on-surface hover:bg-surface-container-highest border border-outline-variant/30 font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              title="Download clinical risk analysis PDF report"
            >
              <Download className="w-4 h-4 text-primary" />
              <span>{lang === "EN" ? "Download Report (PDF)" : "রিপোর্ট ডাউনলোড করুন (PDF)"}</span>
            </button>
            <button
              onClick={() => onNavigate("assess")}
              className="bg-primary text-on-primary hover:bg-opacity-90 font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-sm active:scale-95 w-full sm:w-auto cursor-pointer"
            >
              {lang === "EN" ? "Retake Health Assessment" : "নতুন স্ক্রীনিং শুরু করুন"}
            </button>
          </div>
        </section>

        {/* SECTION 1: Graphical Representation of Previous Assessments */}
        <section id="compare-visualizer" className="bg-surface-container-lowest border border-outline-variant/40 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-outline-variant/20 pb-4">
            <div>
              <h3 className="text-lg md:text-xl font-extrabold text-on-surface flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                {currentT.compareHeader}
              </h3>
              <p className="text-xs text-on-surface-variant max-w-2xl mt-1">
                {currentT.compareSub}
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-bold text-on-surface">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-1 bg-red-500 rounded-full"></span>
                {lang === "EN" ? "Hypertension Risk" : "উচ্চ রক্তচাপ ঝুঁকি"}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-1 bg-amber-500 rounded-full style-dotted"></span>
                {lang === "EN" ? "Diabetes Risk" : "ডায়াবেটিস ঝুঁকি"}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">

            {/* Vector Plot Canvas (7 Columns on large screens) */}
            <div className="lg:col-span-8 bg-background/40 border border-outline-variant/20 rounded-2xl p-4 md:p-6 overflow-x-auto">
              <div className="min-w-[480px]">
                <svg className="w-full h-56" viewBox="0 0 500 200">
                  {/* Grid Lines */}
                  {[0, 25, 50, 75, 100].map((val) => {
                    const y = 170 - (val * 1.3);
                    return (
                      <g key={val} className="opacity-40">
                        <line x1="50" y1={y} x2="470" y2={y} stroke="gray" strokeWidth="0.5" strokeDasharray="2" />
                        <text x="15" y={y + 4} className="font-mono text-[9px] fill-on-surface-variant font-semibold">
                          {val}%
                        </text>
                      </g>
                    );
                  })}

                  {/* Hypertension Risk Line */}
                  {points.length > 1 && (
                    <path
                      d={`M ${points.map(p => `${p.x} ${p.yH}`).join(" L ")}`}
                      fill="none"
                      stroke="#ef4444"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                  )}

                  {/* Diabetes Risk Line */}
                  {points.length > 1 && (
                    <path
                      d={`M ${points.map(p => `${p.x} ${p.yD}`).join(" L ")}`}
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="2"
                      strokeDasharray="4 4"
                      strokeLinecap="round"
                    />
                  )}

                  {/* Empty State Message */}
                  {points.length < 2 && (
                    <text x="250" y="100" textAnchor="middle" className="font-semibold text-xs fill-on-surface-variant/70">
                      {currentT.noTimelineData}
                    </text>
                  )}

                  {/* Draw Nodes */}
                  {points.map((p, idx) => (
                    <g key={idx} className="cursor-pointer group" onClick={() => setSelectedHistoryIdx(idx)}>
                      {/* Interactive background pulse */}
                      <circle
                        cx={p.x}
                        cy={p.yH}
                        r="12"
                        fill="transparent"
                        className={`hover:fill-red-500/10 transition-colors ${selectedHistoryIdx === idx ? "fill-red-500/5" : ""}`}
                      />
                      <circle
                        cx={p.x}
                        cy={p.yD}
                        r="12"
                        fill="transparent"
                        className={`hover:fill-amber-500/10 transition-colors ${selectedHistoryIdx === idx ? "fill-amber-500/5" : ""}`}
                      />

                      {/* HT Points */}
                      <circle
                        cx={p.x}
                        cy={p.yH}
                        r={selectedHistoryIdx === idx ? "6.5" : "4.5"}
                        fill="#ef4444"
                        stroke="#ffffff"
                        strokeWidth="1.5"
                        className="transition-all duration-300 shadow"
                      />
                      {/* DB Points */}
                      <circle
                        cx={p.x}
                        cy={p.yD}
                        r={selectedHistoryIdx === idx ? "6.5" : "4.5"}
                        fill="#f59e0b"
                        stroke="#ffffff"
                        strokeWidth="1.5"
                        className="transition-all duration-300 shadow"
                      />

                      {/* X Axis Date labels */}
                      <text x={p.x} y="194" textAnchor="middle" className="font-bold text-[10px] fill-on-surface select-none">
                        {p.date}
                      </text>
                    </g>
                  ))}
                </svg>
              </div>
            </div>

            {/* Sidebar Selected Node Metrics delta comparison */}
            <div className="lg:col-span-4 bg-surface-container border border-outline-variant/35 rounded-2xl p-5 space-y-4">
              <div className="border-b border-outline-variant/20 pb-3 flex justify-between items-center">
                <span className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider">
                  {currentT.comparisonTelemetry}
                </span>
                <span className="text-xs bg-primary-container text-on-primary-container font-mono font-bold px-2.5 py-0.5 rounded">
                  {currentT.compareDate}: {activePoint?.date}
                </span>
              </div>

              <div className="space-y-3.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-on-surface font-semibold">{currentT.bpValText}</span>
                  <span className="font-mono font-extrabold text-on-surface bg-background/80 px-2 py-1 rounded">
                    {activePoint?.systolic}/{activePoint?.diastolic} mmHg
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-on-surface font-semibold">{currentT.wtValText}</span>
                  <span className="font-mono font-extrabold text-on-surface bg-background/80 px-2 py-1 rounded">
                    {activePoint?.weight} kg
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-on-surface font-semibold">{lang === "EN" ? "HTN Risk Level" : "উচ্চ রক্তচাপ ঝুঁকি সূচক"}</span>
                  <span className="font-mono font-extrabold text-red-500 bg-red-500/10 px-2 py-0.5 rounded">
                    {activePoint?.hypertensionRisk}%
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-on-surface font-semibold">{lang === "EN" ? "Diabetic Risk Level" : "ডায়াবেটিস ঝুঁকি সূচক"}</span>
                  <span className="font-mono font-extrabold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded">
                    {activePoint?.diabetesRisk}%
                  </span>
                </div>
              </div>

              {/* Progress and delta trajectory report */}
              {selectedHistoryIdx > 0 && (
                <div className="text-[11px] leading-relaxed p-3 bg-primary/5 border border-primary/20 rounded-xl text-primary font-semibold">
                  {lang === "EN" ? (
                    <>
                      {sysChange < 0 ? `✓ Systolic BP reduced by ${Math.abs(sysChange)} mmHg ` : ""}
                      {wtChange < 0 ? `✓ Weight reduced by ${Math.abs(wtChange)} kg ` : ""}
                      {riskChange < 0 ? `✓ Overall diagnostic risk dropped by ${Math.abs(riskChange)}% ` : ""}
                      since baseline levels.
                    </>
                  ) : (
                    <>
                      {sysChange < 0 ? `✓ পূর্বের তুলনায় সিস্টোলিক রক্তচাপ ${Math.abs(sysChange)} mmHg কমেছে ` : ""}
                      {wtChange < 0 ? `✓ শারীরিক ওজন ${Math.abs(wtChange)} কেজি হ্রাস পেয়েছে ` : ""}
                      {riskChange < 0 ? `✓ সামগ্রিক শারীরিক ঝুঁকি ${Math.abs(riskChange)}% উন্নীত হয়েছে ` : ""}।
                    </>
                  )}
                </div>
              )}
            </div>

          </div>
        </section>

        {/* SECTION 2: Individual Risk Evaluation Status Cards (with direct recommendations) */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">

          {/* Risk Card A: Cardiovascular & Hypertension */}
          <div className="bg-surface-container-lowest border border-outline-variant/40 rounded-3xl p-6 shadow-sm flex flex-col justify-between space-y-6 relative overflow-hidden">
            <span className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full filter blur-xl select-none pointer-events-none"></span>

            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2.5">
                  <span className="p-2 rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400">
                    <HeartCrack className="w-5 h-5 animate-pulse" />
                  </span>
                  <div>
                    <h4 className="font-extrabold text-on-surface text-base md:text-lg">{currentT.htnTitle}</h4>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${htnClinicalColor} mt-1 inline-block border border-outline-variant/20`}>
                      {lang === "EN" ? htnClinicalStageEN : htnClinicalStageBN}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-2xl md:text-3xl font-black text-on-surface font-mono">{currentHtRisk}%</span>
                  <span className={`text-[9px] block font-extrabold uppercase tracking-wide px-2 py-0.5 rounded-md mt-1 ${getRiskLabel(currentHtRisk).bg}`}>
                    {getRiskLabel(currentHtRisk).text}
                  </span>
                </div>
              </div>

              {/* Progress Slider Display */}
              <div className="w-full bg-surface-container h-1.5 rounded-full overflow-hidden relative">
                <div
                  className="h-full bg-rose-500 rounded-full transition-all duration-700"
                  style={{ width: `${currentHtRisk}%` }}
                />
              </div>

              {/* Direct clinical action guidelines checklists */}
              <div className="space-y-3.5 pt-2">
                <h5 className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
                  {currentT.recsHeader} ({lang === "EN" ? "Hypertension" : "রক্তচাপ প্রতিরোধমূলক"})
                </h5>
                <ul className="space-y-2.5">
                  {[
                    { en: "Strict daily sodium restriction. Limit overall table salt intake under 5 grams (1 flat teaspoon).", bn: "প্রতিদিন সোডিয়াম গ্রহণ সীমাবদ্ধ করুন। অতিরিক্ত কাঁচা লবণ একেবারেই পরিহার করুন (সর্বোচ্চ ১ চা চামচ)।" },
                    { en: "Maintain 150 minutes of weekly cardiovascular workloads (aerobic exercises, brisk walking).", bn: "সাপ্তাহিক অন্তত ১৫০ মিনিট মাঝারি ব্যায়াম বা দ্রুত হাঁটার অভ্যাস গড়ে তুলুন।" },
                    { en: "Schedule a professional clinical brachial BP evaluation panel at the nearest health center.", bn: "নিকটস্থ স্ক্রীনিং সেন্টারে গিয়ে রক্তচাপের একটি নিখুঁত ক্লিনিক্যাল চেকআপ সম্পন্ন করুন।" },
                    { en: "Increase potassium dense diet (leafy vegetables, coconut water, bananas) to support vessels elasticity.", bn: "পটাশিয়াম যুক্ত প্রাকৃতিক খাবার (শাকসবজি, ডাব, কলা) খাদ্য তালিকায় সংযোজন করুন।" }
                  ].map((guide, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-xs text-on-surface leading-relaxed">
                      <span className="bg-primary/10 text-primary w-4.5 h-4.5 rounded-full flex items-center justify-center shrink-0 mt-0.5 font-bold font-mono">
                        {idx + 1}
                      </span>
                      <span>{lang === "EN" ? guide.en : guide.bn}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <button
              onClick={() => onNavigate("chat")}
              className="w-full bg-surface-container hover:bg-surface-container-high text-primary font-bold text-xs py-3 rounded-xl transition-all flex items-center justify-center gap-1.5"
            >
              {lang === "EN" ? "Inquire AI on Hypertension Foods" : "রক্তচাপ নিয়ন্ত্রণ খাবার নিয়ে এআই কে জিজ্ঞাসা করুন"}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Risk Card B: Metabolic & Type 2 Diabetes */}
          <div className="bg-surface-container-lowest border border-outline-variant/40 rounded-3xl p-6 shadow-sm flex flex-col justify-between space-y-6 relative overflow-hidden">
            <span className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full filter blur-xl select-none pointer-events-none"></span>

            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2.5">
                  <span className="p-2 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400">
                    <ShieldAlert className="w-5 h-5" />
                  </span>
                  <div>
                    <h4 className="font-extrabold text-on-surface text-base md:text-lg">{currentT.dbTitle}</h4>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${dbClinicalColor} mt-1 inline-block border border-outline-variant/20`}>
                      {lang === "EN" ? dbClinicalStageEN : dbClinicalStageBN}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-2xl md:text-3xl font-black text-on-surface font-mono">{currentDbRisk}%</span>
                  <span className={`text-[9px] block font-extrabold uppercase tracking-wide px-2 py-0.5 rounded-md mt-1 ${getRiskLabel(currentDbRisk).bg}`}>
                    {getRiskLabel(currentDbRisk).text}
                  </span>
                </div>
              </div>

              {/* Progress Slider Display */}
              <div className="w-full bg-surface-container h-1.5 rounded-full overflow-hidden relative">
                <div
                  className="h-full bg-amber-500 rounded-full transition-all duration-700"
                  style={{ width: `${currentDbRisk}%` }}
                />
              </div>

              {/* Direct diabetic preventive actions */}
              <div className="space-y-3.5 pt-2">
                <h5 className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
                  {currentT.recsHeader} ({lang === "EN" ? "Diabetes" : "ডায়াবেটিস প্রতিরোধমূলক"})
                </h5>
                <ul className="space-y-2.5">
                  {[
                    { en: "Strict starchy carbohydrate restriction. Swap white rice with red rice or oats.", bn: " পরিশোধিত শর্করা (সাদা ভাত, শ্বেত ময়দা) বর্জন বা নিয়ন্ত্রণ করুন। লাল চাল বা ওটস খাওয়ার চেষ্টা করুন।" },
                    { en: "Eliminate artificial sweeteners, sodas and sweetened drinks entirely.", bn: "কৃত্রিম চিনিযুক্ত মিষ্টি পানীয়, কার্বনেটেড ড্রিংকস বা সফট ড্রিংকস গ্রহণ একেবারেই বন্ধ করুন।" },
                    { en: "Book a clinic-level Oral Glucose Tolerance Test (OGTT) and HbA1c screening setup.", bn: "রক্তে সুগারের গড় মাত্রা জানতে ক্লিনিক থেকে HbA1c এবং ফাস্টিং গ্লুকোজ পরীক্ষা সম্পন্ন করুন।" },
                    { en: "Perform strength workouts or light calisthenics 15 mins daily to trigger insulin receptors.", bn: "কোষের ইনসুলিন সংবেদনশীলতা বাড়াতে দৈনিক ১৫ মিনিট হালকা ফ্রি-হ্যান্ড ব্যায়াম করুন।" }
                  ].map((guide, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-xs text-on-surface leading-relaxed">
                      <span className="bg-primary/10 text-primary w-4.5 h-4.5 rounded-full flex items-center justify-center shrink-0 mt-0.5 font-bold font-mono">
                        {idx + 1}
                      </span>
                      <span>{lang === "EN" ? guide.en : guide.bn}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <button
              onClick={() => onNavigate("chat")}
              className="w-full bg-surface-container hover:bg-surface-container-high text-primary font-bold text-xs py-3 rounded-xl transition-all flex items-center justify-center gap-1.5"
            >
              {lang === "EN" ? "Ask AI Assistant for Diabetic Diet Chart" : "ডায়াবেটিস খাদ্যতালিকা নিয়ে এআই অ্যাসিস্ট্যান্টের পরামর্শ নিন"}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

        </section>

        {/* SECTION 3: Dedicated Bangladesh Clinic Locator, Booking list & Referral engine (Clinic Logic) */}
        <section id="clinic-and-referral-portal" className="bg-surface-container-lowest border border-outline-variant/40 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
          <div className="border-b border-outline-variant/20 pb-4">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
              <h3 className="text-lg md:text-xl font-bold tracking-tight text-on-surface flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                {currentT.clinicFinderTitle}
              </h3>
              {/* Data source + location badges */}
              <div className="flex flex-wrap items-center gap-1.5 shrink-0">

                {/* Loading state */}
                {isLoadingClinics && (
                  <span className="text-[10px] text-on-surface-variant font-semibold flex items-center gap-1 animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block"></span>
                    {lang === "EN" ? "Fetching live clinic data…" : "লাইভ ক্লিনিক তথ্য লোড হচ্ছে…"}
                  </span>
                )}

                {/* GPS status badge — shown once clinics have loaded */}
                {!isLoadingClinics && isOsmData && (
                  <>
                    {geoStatus === "pending" && (
                      <span className="text-[9px] text-on-surface-variant font-semibold border border-outline-variant/30 rounded px-2 py-0.5 bg-surface-container flex items-center gap-1 animate-pulse">
                        📡 {lang === "EN" ? "Locating you…" : "আপনার অবস্থান নির্ধারণ হচ্ছে…"}
                      </span>
                    )}
                    {geoStatus === "granted" && (
                      <span className="text-[9px] text-emerald-700 dark:text-emerald-400 font-semibold border border-emerald-400/40 rounded px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/20 flex items-center gap-1">
                        📍 {lang === "EN" ? "Distances from your location" : "আপনার অবস্থান থেকে দূরত্ব"}
                      </span>
                    )}
                    {geoStatus === "denied" && (
                      <span className="text-[9px] text-on-surface-variant/60 font-semibold border border-outline-variant/30 rounded px-2 py-0.5 bg-surface-container flex items-center gap-1"
                        title="Location permission denied — showing distances from Cumilla center">
                        🏙 {lang === "EN" ? "From Cumilla" : "কুমিল্লা থেকে"}
                      </span>
                    )}
                    <a
                      href="https://www.openstreetmap.org/copyright"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[9px] text-on-surface-variant/60 hover:text-primary font-semibold border border-outline-variant/30 rounded px-2 py-0.5 bg-surface-container flex items-center gap-1 transition-colors"
                      title="Map data © OpenStreetMap contributors"
                    >
                      🗺 OSM
                    </a>
                  </>
                )}

                {/* API error fallback notice */}
                {!isLoadingClinics && osmError && (
                  <span className="text-[9px] text-amber-600 font-semibold border border-amber-400/30 rounded px-2 py-0.5 bg-amber-50 dark:bg-amber-950/20 flex items-center gap-1">
                    ⚠ {lang === "EN" ? "Using curated data (live unavailable)" : "সংরক্ষিত তথ্য ব্যবহার হচ্ছে"}
                  </span>
                )}
              </div>
            </div>
            <p className="text-xs text-on-surface-variant leading-relaxed mt-1">
              {lang === "EN"
                ? "Locate specialized preventative non-communicable screening clinics in your capital or divisional area. Lock an appointment to generate a digital referral code."
                : "আপনার নিকটবর্তী থানা বা বিভাগীয় সরকারি/বেসরকারি স্ক্রীনিং সেন্টার খুঁজে বের করুন এবং একটি সংরক্ষিত স্লিপ রেফারেল স্লিপ জেনারেট করুন।"
              }
            </p>
          </div>

          {/* Conditional Layout: Normal Interface vs Digital Referral Voucher Card */}
          {isBookingConfirmed ? (
            <div className="bg-primary/5 border border-primary/30 rounded-3xl p-6 md:p-8 space-y-6 border-dashed relative">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-3">
                  <span className="h-10 w-10 bg-primary/10 text-primary rounded-full flex items-center justify-center font-bold">
                    ✓
                  </span>
                  <div>
                    <h4 className="font-extrabold text-primary text-base md:text-lg">{currentT.successAlert}</h4>
                    <p className="text-xs text-on-surface-variant font-medium">Please save or present this referral card at the screening center counter.</p>
                  </div>
                </div>
                <button
                  onClick={() => { setIsBookingConfirmed(false); }}
                  className="text-xs font-bold bg-primary text-on-primary hover:bg-primary-container px-4 py-2 rounded-xl transition-all"
                >
                  {currentT.printBtn}
                </button>
              </div>

              {/* Printable Referral Card Layout */}
              <div className="bg-surface border border-outline-variant/40 rounded-2xl p-6 grid grid-cols-1 md:grid-cols-2 gap-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-bl-full pointer-events-none select-none"></div>

                <div className="space-y-4">
                  <span className="text-[10px] font-extrabold text-primary tracking-widest uppercase border border-primary/30 px-2 py-0.5 rounded-md bg-primary-container/10">
                    {currentT.voucherTitle}
                  </span>

                  <div className="space-y-3">
                    <div>
                      <span className="text-[9px] block uppercase font-bold text-on-surface-variant">{currentT.voucherClinic}</span>
                      <span className="text-sm font-extrabold text-on-surface">{activeClinic.name}</span>
                      <span className="text-xs block text-on-surface-variant font-semibold mt-0.5">{activeClinic.address}</span>
                    </div>

                    <div>
                      <span className="text-[9px] block uppercase font-bold text-on-surface-variant">{currentT.voucherService}</span>
                      <span className="text-xs font-extrabold text-on-surface bg-primary/5 px-2.5 py-1 rounded inline-block text-primary mt-1 border border-primary/20">
                        {selectedService === "CVD"
                          ? (lang === "EN" ? "Cardio-Arterial Blood Pressure Mapping Panel" : "কার্ডিও-ধমনী রক্তচাপ পরীক্ষা ও হৃদরোগ প্রোফাইল")
                          : selectedService === "DIAB"
                            ? (lang === "EN" ? "HbA1c & Oral Glucose Intake Profile" : "ডায়াবেটিস ও গড় সুগার (HbA1c) পরীক্ষা সূচি")
                            : (lang === "EN" ? "Combined Non-Communicable Multi-marker Screening Board" : "সম্মিলিত উচ্চ অসংক্রামক রোগ (NCD) স্ক্রীনিং বোর্ড")
                        }
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 flex flex-col justify-between items-start md:items-end md:text-right">
                  <div className="space-y-2">
                    <div>
                      <span className="text-[9px] block uppercase font-bold text-on-surface-variant">{currentT.voucherCode}</span>
                      <span className="text-lg font-black font-mono tracking-widest text-secondary">{referralTicketCode}</span>
                    </div>
                    <div>
                      <span className="text-[9px] block uppercase font-bold text-on-surface-variant">{currentT.voucherTime}</span>
                      <span className="text-xs font-black text-on-surface font-mono">{bookingDate} @ {bookingTime}</span>
                    </div>
                  </div>

                  {/* Pseudo Barcode Representation */}
                  <div className="flex flex-col items-start md:items-end gap-1.5">
                    <div className="flex gap-0.5 bg-on-surface h-10 w-44 rounded-sm px-1 py-1">
                      {[1, 3, 1, 2, 4, 1, 2, 1, 3, 2, 1, 4, 1, 2, 3, 1, 2, 1].map((bar, i) => (
                        <div key={i} className="bg-background h-full" style={{ width: `${bar * 2}px` }} />
                      ))}
                    </div>
                    <span className="text-[8px] font-mono tracking-extrawide text-on-surface-variant select-none">SCAN_AT_REGISTRATION_COUNTER</span>
                  </div>
                </div>

                {/* Patient Vitals Prep note */}
                <div className="col-span-1 md:col-span-2 pt-4 border-t border-outline-variant/30 text-xs">
                  <span className="font-bold text-rose-500 block mb-1.5 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {currentT.prepNotes}:
                  </span>
                  <p className="text-on-surface-variant leading-relaxed">
                    {selectedService === "CVD"
                      ? currentT.prepInstructionsHT
                      : selectedService === "DIAB"
                        ? currentT.prepInstructionsDB
                        : `${currentT.prepInstructionsHT} | ${currentT.prepInstructionsDB}`
                    }
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">

              {/* Left clinic list chooser (5 Columns) */}
              <div className="lg:col-span-5 flex flex-col justify-between space-y-4">

                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-3.5 w-4 h-4 text-on-surface-variant" />
                  <input
                    type="text"
                    placeholder={currentT.clinicSearchPlaceholder}
                    value={clinicSearch}
                    onChange={(e) => { setClinicSearch(e.target.value); setActiveClinicIdx(0); }}
                    className="w-full bg-background border border-outline-variant/50 focus:border-primary rounded-xl pl-9 pr-4 py-3 text-xs md:text-sm font-bold tracking-tight text-on-surface outline-none"
                  />
                  {clinicSearch && (
                    <button onClick={() => setClinicSearch("")} className="absolute right-3 top-3.5 text-on-surface-variant">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Clinics Loop list — real OSM data or fallback */}
                <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
                  {isLoadingClinics ? (
                    // Loading skeleton
                    Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="p-3.5 border border-outline-variant/20 rounded-xl animate-pulse bg-surface-container">
                        <div className="flex justify-between items-center">
                          <div className="h-3 w-2/3 bg-outline-variant/40 rounded"></div>
                          <div className="h-3 w-12 bg-outline-variant/30 rounded"></div>
                        </div>
                        <div className="h-2.5 w-1/2 bg-outline-variant/25 rounded mt-2"></div>
                      </div>
                    ))
                  ) : filteredClinics.length > 0 ? (
                    filteredClinics.map((clinic, idx) => (
                      <div
                        key={`${clinic.name}-${idx}`}
                        onClick={() => setActiveClinicIdx(idx)}
                        className={`p-3.5 border rounded-xl text-left cursor-pointer transition-all ${activeClinic.name === clinic.name
                            ? "bg-primary-container/10 border-primary shadow-sm"
                            : "bg-surface-container-lowest border-outline-variant/35 hover:bg-surface-container-low"
                          }`}
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-on-surface tracking-tight leading-snug truncate pr-2">{clinic.name}</span>
                          <span className="text-[10px] bg-background text-on-surface-variant px-2 py-0.5 rounded border border-outline-variant/30 font-semibold shrink-0">
                            {clinic.distance}
                          </span>
                        </div>
                        <p className="text-[10px] text-on-surface-variant mt-1 leading-normal truncate">{clinic.address}</p>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-xs text-on-surface-variant font-medium">
                      {lang === "EN" ? "No screening center matches your query." : "কোনো স্ক্রীনিং সেন্টার পাওয়া যায়নি।"}
                    </div>
                  )}
                </div>

                {/* Shuffling mini control option */}
                <div className="bg-surface-container border border-outline-variant/30 rounded-2xl p-4 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider block">Featured screening Center</span>
                    <span className="text-xs font-bold text-on-surface truncate mt-0.5 inline-block max-w-[200px]">{activeClinic.name}</span>
                  </div>
                  <button
                    onClick={() => {
                      const next = (clinicList.findIndex(c => c.name === activeClinic.name) + 1) % clinicList.length;
                      setActiveClinicIdx(clinicList.findIndex(c => c.name === clinicList[next].name));
                    }}
                    className="flex items-center gap-1 bg-primary text-on-primary px-3 py-1.5 rounded-lg text-xs font-bold active:scale-95 transition-transform"
                  >
                    <Shuffle className="w-3.5 h-3.5" />
                    {lang === "EN" ? "Randomize" : "অন্যান্য"}
                  </button>
                </div>

              </div>

              {/* Right appointment scheduler booking panel (7 Columns) */}
              <form onSubmit={handleBookReferral} className="lg:col-span-7 bg-surface-container border border-outline-variant/40 rounded-3xl p-6 md:p-8 flex flex-col justify-between space-y-5">

                <div className="space-y-4">
                  <div className="flex items-center gap-2.5">
                    <span className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs select-none">
                      📌
                    </span>
                    <div>
                      <h4 className="font-extrabold text-on-surface text-sm">{activeClinic.name}</h4>
                      <p className="text-[10px] text-on-surface-variant leading-none mt-1">{activeClinic.hours} • Phone: {activeClinic.phone}</p>
                    </div>
                  </div>

                  {/* Form inputs */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                    {/* Choose service */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-wider">{currentT.servicesLabel}</label>
                      <select
                        value={selectedService}
                        onChange={(e) => setSelectedService(e.target.value)}
                        className="bg-surface-container-lowest border border-outline-variant/50 focus:border-primary rounded-xl px-4 py-2.5 text-xs font-bold outline-none"
                      >
                        <option value="CVD">Hypertension Cardio Profile</option>
                        <option value="DIAB">HbA1c & Glucose Screen Board</option>
                        <option value="COMB">Combined Multi-marker NCD Index</option>
                      </select>
                    </div>

                    {/* Booking Date */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-wider">{currentT.appointmentDate}</label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-3 w-4 h-4 text-on-surface-variant" />
                        <input
                          type="date"
                          required
                          value={bookingDate}
                          onChange={(e) => setBookingDate(e.target.value)}
                          min={getTomorrowDate()}
                          className="w-full bg-surface-container-lowest border border-outline-variant/50 focus:border-primary rounded-xl pl-9 pr-3 py-2.5 text-xs font-bold font-mono text-on-surface outline-none"
                        />
                      </div>
                    </div>

                    {/* Booking Hour */}
                    <div className="flex flex-col gap-1.5 sm:col-span-2">
                      <label className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-wider">{currentT.appointmentTime}</label>
                      <div className="relative">
                        <Clock className="absolute left-3 top-3 w-4 h-4 text-on-surface-variant" />
                        <select
                          value={bookingTime}
                          onChange={(e) => setBookingTime(e.target.value)}
                          className="w-full bg-surface-container-lowest border border-outline-variant/50 focus:border-primary rounded-xl pl-9 pr-3 py-2.5 text-xs font-bold text-on-surface outline-none"
                        >
                          <option value="09:00 AM - 11:30 AM">09:00 AM - 11:30 AM (Vitals slot)</option>
                          <option value="12:00 PM - 02:30 PM">12:00 PM - 02:30 PM (Midday shift)</option>
                          <option value="03:00 PM - 05:30 PM">03:00 PM - 05:30 PM (Evening shift)</option>
                        </select>
                      </div>
                    </div>

                  </div>
                </div>

                {/* Confirm Referral voucher command */}
                <button
                  type="submit"
                  className="w-full bg-primary text-on-primary hover:bg-opacity-95 font-bold text-xs py-3.5 rounded-xl transition-all shadow-sm active:scale-95"
                >
                  {currentT.clinicBookBtn}
                </button>

              </form>

            </div>
          )}

        </section>

        {/* SECTION 4: Today's preventative lifestyle plan Checklist (Preserved workflow) */}
        <section className="bg-surface-container-lowest border border-outline-variant/40 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="flex justify-between items-center border-b border-outline-variant/20 pb-3">
            <h3 className="text-lg font-bold text-on-surface">{currentT.recomLabel}</h3>
            <span className="font-extrabold text-[10px] px-3 py-1 bg-primary-container text-on-primary-container rounded-full uppercase tracking-wider animate-pulse">
              {progressPercent}% {lang === "EN" ? "Achieved" : "সম্পূর্ণ"}
            </span>
          </div>

          <div className="w-full bg-surface h-2 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {actions.map((act) => (
              <div
                key={act.id}
                onClick={() => toggleAction(act.id)}
                className={`p-4 bg-background border rounded-2xl group transition-all cursor-pointer hover:bg-surface flex flex-col justify-between h-32 ${act.completed
                    ? "border-primary/45 bg-primary-container/10"
                    : "border-outline-variant/30"
                  }`}
              >
                <div className="flex justify-between items-start">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${act.completed
                      ? "bg-primary text-on-primary"
                      : "bg-surface-container text-on-surface-variant"
                    }`}>
                    {act.completed ? <Check className="w-4 h-4 stroke-[3]" /> : <Droplet className="w-4 h-4" />}
                  </div>

                  <div className={`w-5 h-5 border rounded-full flex items-center justify-center transition-colors ${act.completed
                      ? "bg-primary border-primary text-on-primary"
                      : "border-outline-variant/60 group-hover:border-primary"
                    }`}>
                    {act.completed && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </div>

                <div>
                  <p className={`text-xs font-bold leading-none ${act.completed ? "line-through text-on-surface-variant font-medium" : "text-on-surface"}`}>
                    {lang === "EN" ? act.nameEN : act.nameBN}
                  </p>
                  <p className="text-[10px] text-on-surface-variant mt-1.5 font-bold">
                    {lang === "EN" ? act.progressEN : act.progressBN}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Preserved Health Feed & Articles section */}
        <section className="space-y-4">
          <h3 className="text-xl font-bold tracking-tight text-on-surface flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            {lang === "EN" ? "Health Guideline Feed" : "সহজ স্বাস্থ্য ও প্রতিরোধমূলক ফিড"}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {articles.map((art) => (
              <div
                key={art.id}
                onClick={() => setOpenedArticle(art)}
                className="bg-surface-container-lowest border border-outline-variant/40 rounded-2xl p-5 hover:border-primary/50 transition-all duration-200 cursor-pointer flex flex-col justify-between shadow-xs relative"
              >
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`text-[9px] font-extrabold tracking-widest px-2 py-0.5 rounded-md ${art.type === "ARTICLE"
                        ? "bg-red-100 text-red-700 dark:bg-red-950/20 dark:text-red-400"
                        : "bg-teal-100 text-teal-700 dark:bg-teal-950/20 dark:text-teal-400"
                      }`}>
                      {art.type}
                    </span>
                    <span className="text-[10px] text-on-surface-variant font-semibold select-none">• {art.time}</span>
                  </div>
                  <h4 className="font-bold text-sm tracking-tight text-on-surface leading-snug mb-2 line-clamp-2">{art.title}</h4>
                  <p className="text-[11px] text-on-surface-variant leading-relaxed line-clamp-2">{art.summary}</p>
                </div>

                <span className="text-[10px] text-primary font-bold mt-4 flex items-center gap-0.5 hover:underline">
                  {lang === "EN" ? "Read full article" : "সম্পূর্ণ পড়ুন"} <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            ))}
          </div>
        </section>

      </div>

      {/* Article Detail dialog modal popup overlay */}
      {openedArticle && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest border border-outline-variant/40 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative">
            <button
              onClick={() => setOpenedArticle(null)}
              className="absolute top-4 right-4 p-1 rounded-full hover:bg-surface-container transition-colors"
            >
              <X className="w-5 h-5 text-on-surface-variant" />
            </button>

            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-extrabold tracking-widest px-2.5 py-0.5 rounded ${openedArticle.type === "ARTICLE"
                  ? "bg-red-100 text-red-700 dark:bg-red-950/20 dark:text-red-400"
                  : "bg-teal-100 text-teal-700 dark:bg-teal-950/20 dark:text-teal-400"
                }`}>
                {openedArticle.type}
              </span>
              <span className="text-xs text-on-surface-variant font-semibold">• {openedArticle.time}</span>
            </div>

            <h3 className="text-lg font-bold text-on-surface leading-tight pr-6">{openedArticle.title}</h3>

            <p className="text-xs md:text-sm text-on-surface-variant leading-relaxed py-2 whitespace-pro-wrap">
              {openedArticle.content}
            </p>

            <div className="border-t border-outline-variant/30 pt-4 flex justify-end">
              <button
                onClick={() => setOpenedArticle(null)}
                className="bg-primary text-on-primary px-5 py-2 rounded-xl text-xs font-bold shadow active:scale-95"
              >
                {lang === "EN" ? "Close" : "বন্ধ করুন"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
