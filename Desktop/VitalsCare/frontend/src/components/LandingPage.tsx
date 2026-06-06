import React from "react";
import { 
  HeartHandshake, 
  ChevronRight, 
  ArrowRight, 
  Check, 
  Activity, 
  Users, 
  FileText, 
  HelpCircle,
  HelpCircle as QuestionIcon,
  Shield, 
  PhoneCall, 
  Activity as MapIcon,
  Globe,
  Sun,
  Moon,
  MessageSquare
} from "lucide-react";
import { ViewType } from "../types";

interface LandingPageProps {
  lang: "EN" | "BN";
  setLang: (lang: "EN" | "BN") => void;
  theme: "light" | "dark";
  setTheme: (theme: "light" | "dark") => void;
  onNavigate: (view: ViewType) => void;
}

export default function LandingPage({
  lang,
  setLang,
  theme,
  setTheme,
  onNavigate,
}: LandingPageProps) {
  
  // High fidelity translations dictionary
  const t = {
    EN: {
      tag: "AI-POWERED PREVENTIVE CARE",
      heroTitle: "Identify Health Risks Before They Appear.",
      heroDesc: "Using advanced biometric analysis and regional data, VitalCare maps your health trajectory to provide actionable, clinical-grade risk assessments.",
      btnCheck: "Check Your Health Risk",
      btnRadar: "View Live Radar",
      trusted: "Trusted by 500+ Medical Specialists",
      diagTitle: "Precision Diagnostics",
      diagSubtitle: "Science-backed tools for proactive health management.",
      feat1Title: "Predictive Risk Modeling",
      feat1Desc: "Our algorithms analyze 150+ variables including genetics, lifestyle, and local environmental data to forecast potential metabolic and cardiovascular risks.",
      feat2Title: "Community Health",
      feat2Desc: "Engage with localized health trends and support groups monitored by certified clinicians.",
      feat2Count: "12 Active Threads Near You",
      feat3Title: "Custom Action Plans",
      feat3Desc: "Personalized nutrition and activity protocols designed to mitigate your specific high-risk factors.",
      feat4Title: "Real-time Clinic Integration",
      feat4Desc: "Directly sync your assessment results with partner clinics for seamless consultation.",
      feat4Action: "Find a clinic",
      stepsTitle: "3 Steps to Health Clarity",
      step1Name: "Data Intake",
      step1Desc: "Complete a 5-minute health profile and sync your wearable data.",
      step2Name: "AI Synthesis",
      step2Desc: "Our HIPAA-compliant engine cross-references clinical databases.",
      step3Name: "Risk Report",
      step3Desc: "Receive a prioritized dashboard with lifestyle interventions.",
      alertTitle: "Dengue Alert: High Risk Zone Detected",
      alertDesc: "Preventive measures updated for your current area. View latest guidelines.",
      alertAction: "Update Awareness",
      faqTitle: "Frequently Asked",
      faqQ1: "Is my health data secure?",
      faqA1: "We use AES-256 encryption and are fully HIPAA and GDPR compliant. Your data is yours; we never sell it to third parties.",
      faqQ2: "How accurate are the predictions?",
      faqA2: "Our models maintain a 92% sensitivity rate based on retrospective clinical trials. However, they are for awareness and do not replace professional medical advice.",
      faqQ3: "Can I sync with my Apple Watch?",
      faqA3: "Yes, VitalCare supports native integration with Apple Health, Google Fit, and Garmin devices.",
      ctaTitle: "Start Your Proactive Health Journey Today.",
      ctaDesc: "Join thousands of users taking control of their future health with VitalCare's Clinical Radar.",
      ctaBtn: "Create Free Health Profile",
      outcomes: "Patient Outcomes",
      quote1: "VitalCare flagged a potential hypertension risk three months before I felt any symptoms. The early intervention plan literally changed my life.",
      user1: "Ahmed Khan",
      user1Desc: "Active User, 42",
      quote2: "As a practitioner, having patients arrive with these risk data points makes our consultations 10x more efficient and data-driven.",
      user2: "Dr. Sarah Pervez",
      user2Desc: "Cardiologist",
    },
    BN: {
      tag: "এআই-চালিত প্রতিরোধমূলক যত্ন",
      heroTitle: "উদ্বেগ এড়াতে আগেই স্বাস্থ্যঝুঁকি জানুন।",
      heroDesc: "উন্নত বায়োমেট্রিক বিশ্লেষণ এবং আঞ্চলিক ডাটা ব্যবহার করে, ভাইটালকেয়ার আপনার স্বাস্থ্য গতিপথ নির্ধারণ করে এবং বাস্তবমুখী, ক্লিনিকাল-গ্রেড ঝুঁকি মূল্যায়ন প্রদান করে।",
      btnCheck: "স্বাস্থ্যঝুঁকি পরীক্ষা করুন",
      btnRadar: "লাইভ রাডার দেখুন",
      trusted: "৫০০+ চিকিৎসকদের দ্বারা বিশ্বস্ত",
      diagTitle: "নির্ভুল ডায়াগনস্টিকস",
      diagSubtitle: "সক্রিয় স্বাস্থ্য ব্যবস্থাপনার জন্য বিজ্ঞান সমর্থিত ডায়াগনস্টিকস টুলস।",
      feat1Title: "অনুমতিমূলক পূর্বাভাস মডেলিং",
      feat1Desc: "আমাদের গাণিতিক অ্যালগরিদম জেনেটিক্স, জীবনধারা এবং পরিবেশগত ডাটা সহ ১৫০টিরও বেশি ভেরিয়েবল বিশ্লেষণ করে সম্ভাব্য হৃদরোগের ঝুঁকি পূর্বাভাস দিতে সক্ষম।",
      feat2Title: "কমিউনিটি স্বাস্থ্য ফোরাম",
      feat2Desc: "প্রত্যয়িত চিকিৎসকদের দ্বারা স্থানীয় স্বাস্থ্য প্রবণতা এবং সহায়তা গোষ্ঠীগুলিতে যুক্ত হোন।",
      feat2Count: "আপনার পার্শ্ববর্তী ১২টি সক্রিয় আলোচনা ফোরাম",
      feat3Title: "ব্যক্তিগতকৃত জীবনধারা পরিকল্পনা",
      feat3Desc: "আপনার নির্দিষ্ট ঝুঁকি হ্রাস করার উদ্দেশ্যে কাস্টমাইজড পুষ্টি এবং ক্রিয়াকলাপের পরিকল্পনা।",
      feat4Title: "রিয়েল-টাইম ক্লিনিক ইন্টিগ্রেশন",
      feat4Desc: "সহজ পরামর্শের জন্য অংশীদার ক্লিনিকগুলোর সাথে সরাসরি আপনার স্বাস্থ্য পরীক্ষার ফল সিঙ্ক করুন।",
      feat4Action: "নিকটস্থ ক্লিনিক খুঁজুন",
      stepsTitle: "স্পষ্ট স্বাস্থ্য ধারণায় ৩টি সহজ ধাপ",
      step1Name: "ডাটা সংগ্রহ",
      step1Desc: "একটি ৫-মিনিটের স্বাস্থ্য প্রোফাইল পূরণ করুন এবং পরিধানযোগ্য ফিটনেস ব্যান্ড সিঙ্ক করুন।",
      step2Name: "এআই সংশ্লেষণ",
      step2Desc: "আমাদের সুরক্ষিত ইঞ্জিন ক্লিনিকাল ট্রায়ালের ডাটাবেসের সাথে তথ্য বিশ্লেষণ ও তুলনা করে।",
      step3Name: "ঝুঁকি প্রতিবেদন",
      step3Desc: "জীবনযাত্রার পরিবর্তন সংবলিত একটি অগ্রাধিকারমূলক ঝুঁকি পরিমাপ ড্যাশবোর্ড পান।",
      alertTitle: "ডেঙ্গু সতর্কতা: অতি ঝুঁকিপূর্ণ এলাকা চিহ্নিত",
      alertDesc: "আপনার বর্তমান এলাকার স্বাস্থ্য নির্দেশিকা আপডেট করা হয়েছে। সর্বশেষ গাইডলাইন দেখুন।",
      alertAction: "সচেতনতা আপডেট করুন",
      faqTitle: "সাধারণ প্রশ্নাবলী",
      faqQ1: "আমার স্বাস্থ্য সংক্রান্ত তথ্য কি নিরাপদ?",
      faqA1: "আমরা এইএস-২৫৬ এনক্রিপশন ব্যবহার করি এবং সম্পূর্ণ হিপা (HIPAA) ও জিডিপিআর কমপ্লায়েন্ট। আপনার তথ্য সম্পূর্ণ আপনার; আমরা কখনো তা বিক্রয় করি না।",
      faqQ2: "কতটা নির্ভুলভাবে পূর্বাভাস দেওয়া যায়?",
      faqA2: "আমাদের ক্লিনিক্যাল ট্রায়ালের ভিত্তিতে ৯২% পর্যন্ত সার্থকতা ধরে রাখা সম্ভব। তবে, এটি কেবল সচেতনতার জন্য এবং চিকিৎসকের সরাসরি প্রতিস্থাপন নয়।",
      faqQ3: "আমি কি অ্যাপল ওয়াচের সাথে সিঙ্ক করতে পারি?",
      faqA3: "হ্যাঁ, ভাইটালকেয়ার অ্যাপল হেলথ, গুগল ফিট এবং গারমিন ডিভাইসের সাথে সিঙ্ক করা সমর্থন করে।",
      ctaTitle: "আজই আপনার দীর্ঘমেয়াদী স্বাস্থ্যঝুঁকি মুক্ত যাত্রা শুরু করুন।",
      ctaDesc: "ভাইটালকেয়ার ক্লিনিকাল রাডার প্রযুক্তি ব্যবহার করে নিজের ভবিষ্যৎ সুস্থ জীবন নিয়ন্ত্রণকারী হাজারো মানুষের সাথে যোগ দিন।",
      ctaBtn: "ফ্রি হেলথ প্রোফাইল তৈরি করুন",
      outcomes: "রোগী ও বিশেষজ্ঞের অভিজ্ঞতা",
      quote1: "ভাইটালকেয়ার কোনো লক্ষণ প্রকাশের তিন মাস আগেই উচ্চ রক্তচাপের ঝুঁকি চিহ্নিত করেছিল। এই আগাম প্রতিরোধ পরিকল্পনা আমার জীবনকে সুস্থ রেখেছে।",
      user1: "আহমেদ খান",
      user1Desc: "সক্রিয় ব্যবহারকারী, ৪২",
      quote2: "একজন কার্ডিওলজিস্ট হিসেবে রোগীদের এই গুরুত্বপূর্ণ চার্ট এবং ঝুঁকি ডাটা হাতে নিয়ে আসতে দেখলে আমার রোগ নির্ণয় ১০ গুণ সহজ ও ডাটা-চালিত হয়ে যায়।",
      user2: "ডা. সারাহ পারভেজ",
      user2Desc: "হৃদরোগ বিশেষজ্ঞ",
    }
  };

  const currentT = t[lang];

  return (
    <div className="min-h-screen text-on-surface bg-background transition-colors duration-200">
      
      {/* Hero Section */}
      <section className="relative min-h-[700px] flex items-center pt-8 pb-16 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-r from-surface-container-low/50 via-transparent to-transparent"></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 md:px-8 relative z-10 w-full">
          <div className="max-w-3xl">
            <span className="inline-block px-3 py-1 bg-primary-container text-on-primary-container font-semibold rounded-full text-xs tracking-wider mb-6 uppercase">
              {currentT.tag}
            </span>
            <h2 className="text-4xl md:text-6xl font-bold tracking-tight text-on-surface mb-6 leading-tight">
              {currentT.heroTitle}
            </h2>
            <p className="text-lg md:text-xl text-on-surface-variant mb-8 max-w-xl leading-relaxed">
              {currentT.heroDesc}
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 mb-12">
              <button 
                id="btn-landing-assess"
                onClick={() => onNavigate("assess")}
                className="bg-primary text-on-primary hover:bg-opacity-90 px-8 py-4 rounded-xl font-bold transition-all shadow-lg active:scale-95 text-center flex items-center justify-center gap-2"
              >
                {currentT.btnCheck} <ArrowRight className="w-5 h-5" />
              </button>
              <button 
                id="btn-landing-dashboard"
                onClick={() => onNavigate("dashboard")}
                className="border border-primary text-primary hover:bg-primary-container/10 px-8 py-4 rounded-xl font-bold transition-all active:scale-95 text-center"
              >
                {currentT.btnRadar}
              </button>
            </div>
            
            <div className="flex items-center gap-4 text-on-surface-variant">
              <div className="flex -space-x-3">
                <div className="w-10 h-10 rounded-full border-2 border-surface bg-surface-dim overflow-hidden">
                  <img 
                    alt="Doctor 1" 
                    className="w-full h-full object-cover"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuBvaxSPCVyuVl8lerLZWuxIg_RSYgpye24-jH1ZACp7IaGlRHpKsz7H39vTtrW4GFT9cO6qFOlk2G57Tlk6q_gqAh1_E5hTEPvvHQRp92LPyvFbXJwb12O8CgNm2ufOJ9ZVgkV6x0ipaEHElM4Pd-2K2qqUYwqIbjsRNKIL87REtXGgAfgWNsfBxXvZrEdVYHioPvzvk_u767LTt8yqJkP1YvqNzAUVp0nSuaKlNPK9oO1q0T2pKwnzLoEsNkdKzdiUysz3Q-pR4Q-Y"
                  />
                </div>
                <div className="w-10 h-10 rounded-full border-2 border-surface bg-surface-dim overflow-hidden">
                  <img 
                    alt="Doctor 2" 
                    className="w-full h-full object-cover"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuA8-Sv9_CeD_K2wqSA8cQ4Br56ETwYV9PbuYqFHejEYkWbSLxGXCC-e6P6riE0PWnBhh6PveQe0FeLMlNSJbpCPToYIyRIPWrHrKPgz4bXmZ44GRIl7IQj0Zb7UMMdUN4aC7RzIfRiEASavo4LOgnNkOno11ysmpRvIAdgcMajbojbppJiu2fQQQzNAlxZrBxOD0X4qcOYxdKJRrkIEYyBcVEQXDxjBCJm0fUtUqpTHJBz13juHnt1EMoIoj4Z6ylgghUi0QRSaJpyN"
                  />
                </div>
              </div>
              <p className="text-sm font-semibold">{currentT.trusted}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Precision Diagnostics Features Section */}
      <section className="py-16 bg-surface-container-low border-y border-outline-variant/30">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold tracking-tight mb-2 text-on-surface">
              {currentT.diagTitle}
            </h3>
            <p className="text-on-surface-variant">{currentT.diagSubtitle}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Feature 1 */}
            <div className="md:col-span-2 bg-surface-container-lowest border border-outline-variant/40 hover:border-primary/50 p-8 rounded-2xl transition-all duration-300 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-100 dark:bg-orange-950/40 text-orange-600 mb-6">
                  <Activity className="w-6 h-6" />
                </div>
                <h4 className="text-xl font-bold mb-3 text-on-surface">{currentT.feat1Title}</h4>
                <p className="text-on-surface-variant max-w-xl leading-relaxed">{currentT.feat1Desc}</p>
              </div>
            </div>

            {/* Feature 2: High intensity block */}
            <div onClick={() => onNavigate("assess")} className="cursor-pointer bg-primary text-on-primary p-8 rounded-2xl flex flex-col justify-between hover:shadow-xl hover:scale-[1.01] transition-all duration-300">
              <div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-500/20 text-on-primary mb-6">
                  <Users className="w-6 h-6" />
                </div>
                <h4 className="text-xl font-bold mb-3">{currentT.feat2Title}</h4>
                <p className="opacity-90 text-sm leading-relaxed">{currentT.feat2Desc}</p>
              </div>
              <div className="mt-8 flex items-center justify-between border-t border-white/20 pt-4">
                <span className="text-xs font-semibold">{currentT.feat2Count}</span>
                <ChevronRight className="w-5 h-5" />
              </div>
            </div>

            {/* Feature 3 */}
            <div className="bg-surface-container-lowest border border-outline-variant/40 hover:border-primary/50 p-8 rounded-2xl flex flex-col justify-between shadow-sm">
              <div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 mb-6">
                  <FileText className="w-6 h-6" />
                </div>
                <h4 className="text-xl font-bold mb-3 text-on-surface">{currentT.feat3Title}</h4>
                <p className="text-on-surface-variant text-sm leading-relaxed">{currentT.feat3Desc}</p>
              </div>
            </div>

            {/* Feature 4 */}
            <div className="md:col-span-2 bg-surface-container-lowest border border-outline-variant/40 hover:border-primary/50 p-8 rounded-2xl grid grid-cols-1 md:grid-cols-2 gap-6 items-center shadow-sm">
              <div className="flex flex-col h-full justify-between py-2">
                <div>
                  <h4 className="text-xl font-bold mb-3 text-on-surface">{currentT.feat4Title}</h4>
                  <p className="text-on-surface-variant text-sm leading-relaxed mb-6">{currentT.feat4Desc}</p>
                </div>
                <button 
                  onClick={() => onNavigate("dashboard")}
                  className="text-primary font-bold text-sm flex items-center gap-1.5 hover:underline text-left"
                >
                  {currentT.feat4Action} <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              
              <div className="h-44 rounded-xl overflow-hidden border border-outline-variant bg-surface-dim relative">
                <img 
                  alt="Map location" 
                  className="w-full h-full object-cover brightness-95 opacity-80" 
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuCWk3kfwcViSbhlmzvY_FtLNpujo5ALT9G6NtHUCvzmTTW3T3Pi1qYUrK6ZDH76Medgj4a_JMgrXDfQT-hqht-wZYngD6ae5WxmkQs1iNTtARF1-uahTI5FClFj7H-G89hW1NMMhNIickExm3b8jWifXuGXcst5KxfbzgnuO3SVdiptgrM0YtrV21WmWsjMmoVkCrgVLsyUGtRRRezXXXw_2hFKNQSzBObXb-LQ-cbNfOhaFql2eDJ-zvppsTCBwE1SO6SXTXWg4j6e"
                />
                <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                  <span className="bg-surface text-primary px-4 py-2 rounded-full font-bold text-xs shadow hover:scale-105 duration-200">
                    {currentT.feat4Action}
                  </span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* How it Works section */}
      <section className="py-20 bg-secondary-container/30 text-on-secondary-container">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <h3 className="text-3xl font-bold text-center mb-16 text-on-secondary-container">
            {currentT.stepsTitle}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
            <div className="hidden md:block absolute top-8 left-16 right-16 h-[2px] bg-secondary/20 z-0"></div>
            
            <div className="relative z-10 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold text-2xl mb-6 shadow-md">
                1
              </div>
              <h4 className="text-xl font-bold mb-3">{currentT.step1Name}</h4>
              <p className="text-on-surface-variant max-w-xs">{currentT.step1Desc}</p>
            </div>

            <div className="relative z-10 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold text-2xl mb-6 shadow-md">
                2
              </div>
              <h4 className="text-xl font-bold mb-3">{currentT.step2Name}</h4>
              <p className="text-on-surface-variant max-w-xs">{currentT.step2Desc}</p>
            </div>

            <div className="relative z-10 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold text-2xl mb-6 shadow-md">
                3
              </div>
              <h4 className="text-xl font-bold mb-3">{currentT.step3Name}</h4>
              <p className="text-on-surface-variant max-w-xs">{currentT.step3Desc}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Awareness Emergency Danger Banner */}
      <section className="py-6 bg-error text-on-error relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 md:px-8 flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4 text-center md:text-left">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 text-on-error shrink-0 animate-pulse">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <p className="text-lg font-bold">{currentT.alertTitle}</p>
              <p className="opacity-95 text-sm mt-1">{currentT.alertDesc}</p>
            </div>
          </div>
          <button 
            onClick={() => onNavigate("assess")} 
            className="bg-white text-error font-bold px-6 py-3 rounded-full hover:bg-white/90 active:scale-95 transition-all text-sm shrink-0"
          >
            {currentT.alertAction}
          </button>
        </div>
      </section>

      {/* Patient Outcomes & Testimonials / FAQ Screen */}
      <section className="py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 md:px-8 grid grid-cols-1 lg:grid-cols-2 gap-12">
          
          {/* Patient outcomes testimonials */}
          <div className="flex flex-col gap-6">
            <h3 className="text-3xl font-bold text-on-surface mb-4">{currentT.outcomes}</h3>
            
            <div className="p-6 bg-surface-container border border-outline-variant/30 rounded-2xl relative flex flex-col justify-between min-h-[160px] shadow-sm">
              <p className="italic text-on-surface-variant mb-6 pl-4 border-l-2 border-primary">
                "{currentT.quote1}"
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center font-bold text-on-secondary-container">
                  AK
                </div>
                <div>
                  <p className="font-bold text-on-surface text-sm">{currentT.user1}</p>
                  <p className="text-xs text-on-surface-variant">{currentT.user1Desc}</p>
                </div>
              </div>
            </div>

            <div className="p-6 bg-surface-container border border-outline-variant/30 rounded-2xl relative flex flex-col justify-between min-h-[160px] shadow-sm">
              <p className="italic text-on-surface-variant mb-6 pl-4 border-l-2 border-primary">
                "{currentT.quote2}"
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center font-bold text-on-primary-container">
                  SP
                </div>
                <div>
                  <p className="font-bold text-on-surface text-sm">{currentT.user2}</p>
                  <p className="text-xs text-on-surface-variant">{currentT.user2Desc}</p>
                </div>
              </div>
            </div>
          </div>

          {/* FAQ panel toggle layout */}
          <div className="flex flex-col gap-6">
            <h3 className="text-3xl font-bold text-on-surface mb-4">{currentT.faqTitle}</h3>
            <div className="space-y-4">
              
              <details className="group bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-5 cursor-pointer hover:bg-surface-container transition-colors shadow-sm" open>
                <summary className="font-bold flex justify-between items-center list-none text-on-surface">
                  <span>{currentT.faqQ1}</span>
                  <HelpCircle className="w-5 h-5 text-primary group-open:rotate-180 duration-200 transition-transform" />
                </summary>
                <p className="mt-3 text-sm text-on-surface-variant leading-relaxed">
                  {currentT.faqA1}
                </p>
              </details>

              <details className="group bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-5 cursor-pointer hover:bg-surface-container transition-colors shadow-sm">
                <summary className="font-bold flex justify-between items-center list-none text-on-surface">
                  <span>{currentT.faqQ2}</span>
                  <HelpCircle className="w-5 h-5 text-primary group-open:rotate-180 duration-200 transition-transform" />
                </summary>
                <p className="mt-3 text-sm text-on-surface-variant leading-relaxed">
                  {currentT.faqA2}
                </p>
              </details>

              <details className="group bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-5 cursor-pointer hover:bg-surface-container transition-colors shadow-sm">
                <summary className="font-bold flex justify-between items-center list-none text-on-surface">
                  <span>{currentT.faqQ3}</span>
                  <HelpCircle className="w-5 h-5 text-primary group-open:rotate-180 duration-200 transition-transform" />
                </summary>
                <p className="mt-3 text-sm text-on-surface-variant leading-relaxed">
                  {currentT.faqA3}
                </p>
              </details>

            </div>
          </div>
        </div>
      </section>

      {/* Final Section CTAs */}
      <section className="py-24 bg-inverse-surface text-inverse-on-surface relative">
        <div className="max-w-4xl mx-auto px-4 md:px-8 text-center">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6 leading-tight">
            {currentT.ctaTitle}
          </h2>
          <p className="text-lg opacity-85 max-w-2xl mx-auto mb-10 leading-relaxed">
            {currentT.ctaDesc}
          </p>
          <button 
            id="btn-landing-profile"
            onClick={() => onNavigate("assess")}
            className="bg-primary hover:bg-opacity-95 text-on-primary px-10 py-5 rounded-full font-bold transition-all shadow-2xl hover:scale-105 active:scale-95 text-lg"
          >
            {currentT.ctaBtn}
          </button>
        </div>
      </section>

    </div>
  );
}
