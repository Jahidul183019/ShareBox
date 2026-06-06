import React, { useState, useEffect } from "react";
import { 
  Heart, 
  Activity, 
  ChevronLeft, 
  FileText, 
  Sparkles, 
  Scale, 
  AlertCircle,
  HelpCircle,
  Apple,
  BrainCircuit,
  Settings,
  ChevronRight,
  Check
} from "lucide-react";
import { AssessmentData, ViewType } from "../types";

interface AssessmentFormProps {
  lang: "EN" | "BN";
  data: AssessmentData;
  setData: (data: AssessmentData) => void;
  onNavigate: (view: ViewType) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

export default function AssessmentForm({
  lang,
  data,
  setData,
  onNavigate,
  onSubmit,
  isSubmitting,
}: AssessmentFormProps) {
  
  // BMI classification state helper
  const [bmi, setBmi] = useState<number>(22.9);
  const [bmiClass, setBmiClass] = useState<string>("Normal");

  useEffect(() => {
    const w = Number(data.weight);
    const h = Number(data.height);
    if (w > 0 && h > 0) {
      const hM = h / 100;
      const calculatedBmi = w / (hM * hM);
      setBmi(calculatedBmi);
      
      if (calculatedBmi < 18.5) {
        setBmiClass(lang === "EN" ? "Underweight" : "আন্ডারওয়েট");
      } else if (calculatedBmi < 25) {
        setBmiClass(lang === "EN" ? "Normal" : "স্বাভাবিক");
      } else if (calculatedBmi < 30) {
        setBmiClass(lang === "EN" ? "Overweight" : "ওভারওয়েট");
      } else {
        setBmiClass(lang === "EN" ? "Obese" : "স্থূলতা");
      }
    }
  }, [data.weight, data.height, lang]);

  // Transliterations dictionary
  const t = {
    EN: {
      title: "Comprehensive Health Screening",
      desc: "Complete the guided assessment parameters to generate a highly detailed and explainable cardiovascular & Type 2 diabetes risk report.",
      step1: "1. Vitals & Metrics",
      step1Desc: "Age, weight, and blood pressure indicators",
      ageLabel: "Age Profile",
      bpLabel: "Blood Pressure (mmHg)",
      sysPlace: "Sys (e.g. 120)",
      diaPlace: "Dia (e.g. 80)",
      heightLabel: "Height (cm)",
      weightLabel: "Weight (kg)",
      bmiNotice: "BMI Auto-Calculated",
      step2: "2. Lifestyle & Habits",
      step2Desc: "Exercise, diet quality, stress levels, and smoking",
      actLabel: "Physical Activity Workloads",
      actLow: "Low workload (couch / minimal walk)",
      actMed: "Moderate (light activity / walks)",
      actHigh: "Highly active (runs / cardiorespiratory workouts)",
      dietTitle: "Dietary Choices",
      dietPoor: "Poor (high-salt/high-starch, processed foods)",
      dietAvg: "Average (balanced simple meals, medium sodium)",
      dietGood: "Good (low-salt, fibrous, nutrient-dense whole foods)",
      saltTitle: "Daily Salt Intake",
      saltLabel: "Salt Preference Level",
      stressTitle: "Mental Stress Index",
      smokingTitle: "Smoking History",
      smokingY: "Active Smoker / Tobacco Consumer",
      smokingN: "Do not consume tobacco",
      step3: "3. Heredary Medical History",
      step3Desc: "Select any chronic diseases present in primary ancestors",
      fhTitle: "Hereditary Family Risks",
      fhDb: "Type 2 Diabetes mellitus",
      fhHt: "Essential Hypertension",
      fhSt: "Arterial Stroke / TIA",
      fhHd: "Ischemic Coronary Disease",
      btnSubmit: "Analyze Health Trajectory",
      submitting: "Synthesizing Screening Parameters...",
      cancel: "Cancel & Exit",
      genderLabel: "Biological Gender",
      genderM: "Male",
      genderF: "Female",
      genderO: "Other",
      fbsLabel: "Fasting Blood Sugar (Glucose)",
      fbsNormal: "Normal (<100 mg/dL)",
      fbsBorderline: "Borderline Pre-diabetic (100 - 125 mg/dL)",
      fbsHigh: "High / Diabetic Profile (>=126 mg/dL)",
      cholLabel: "Total Cholesterol Level",
      cholNormal: "Desirable / Normal (<200 mg/dL)",
      cholHigh: "High / Hypercholesterolemia (>=200 mg/dL)",
      cholUnsure: "Unsure / Undefaulted",
      sleepLabel: "Average Nightly Sleep Duration",
      sleepOptimal: "Optimal 7-9 hours (deep circadian repair)",
      sleepPoor: "Insufficient (<6 hours / poor rest)",
      alcoholLabel: "Alcohol Consumption Intake",
      alcoholNever: "Never / Teetotaler",
      alcoholOcc: "Occasionally (social / low frequency)",
      alcoholReg: "Regular (constant exposure)",
    },
    BN: {
      title: "বিস্তৃত প্রতিরোধমূলক স্বাস্থ্য পরীক্ষা",
      desc: "কার্ডিওভাসকুলার এবং টাইপ ২ ডায়াবেটিস রোগের ঝুঁকি গণনা ও প্রতিরোধ পরিকল্পনা পেতে নির্দেশিত তথ্যগুলি পূরণ করুন।",
      step1: "১. ভাইটাল ও শারীরিক তথ্য",
      step1Desc: "বয়স, ওজন এবং রক্তচাপ পরিমাপক নির্দেশক",
      ageLabel: "বয়সের তথ্য",
      bpLabel: "রক্তচাপ (mmHg)",
      sysPlace: "সিস্টোলিক (উদাঃ ১২০)",
      diaPlace: "ডায়াস্টোলিক (উদাঃ ৮০)",
      heightLabel: "উচ্চতা (সেমি)",
      weightLabel: "ওজন (কেজি)",
      bmiNotice: "নির্ণীত বিএমআই (BMI)",
      step2: "২. জীবনযাত্রা ও দৈনন্দিন অভ্যাস",
      step2Desc: "ব্যায়াম, খাদ্যাভ্যাসের গুণমান এবং ধূমপান",
      actLabel: "শারীরিক পরিশ্রমের মাত্রা",
      actLow: "অলস জীবনযাপন (ব্যায়ামহীন বা নূন্যতম হাঁটা)",
      actMed: "মাঝারি পরিশ্রম (হালকা ব্যায়াম / হাঁটাচলা)",
      actHigh: "ধীরগতির দৌড় / কঠিন কার্ডিও কসরত",
      dietTitle: "খাদ্যতালিকাগত পুষ্টি স্তর",
      dietPoor: "ত্রুটিপূর্ণ (অতিরিক্ত লবণ, চিনি ও প্রক্রিয়াজাত খাবার)",
      dietAvg: "মাঝারি (ভারসাম্যপূর্ণ সাধারণ খাদ্য ও লবণ)",
      dietGood: "পুষ্টিসমৃদ্ধ (স্বল্প সোডিয়াম, ফাইবার ও সম্পূর্ণ খাবার)",
      saltTitle: "দৈনিক লবণ গ্রহণের মাত্রা",
      saltLabel: "লবণ চাহিদার স্তর",
      stressTitle: "মানসিক চাপের সূচক",
      smokingTitle: "ধূমপান বা তামাক সেবনের অভ্যাস",
      smokingY: "সক্রিয় ধূমপায়ী / তামাক সেবনকারী গোষ্ঠী",
      smokingN: "তামাক বা ধূমপান মুক্ত",
      step3: "৩. বংশগত বা পারিবারিক রোগের ইতিহাস",
      step3Desc: "আপনার বাবা-মা বা বংশে থাকা দীর্ঘস্থায়ী রোগগুলি নির্বাচন করুন",
      fhTitle: "পারিবারিক বংশগত রোগের ঝুঁকি",
      fhDb: "টাইপ ২ ডায়াবেটিস মেলিটাস",
      fhHt: "গুরুতর উচ্চ রক্তচাপ (Hypertension)",
      fhSt: "মস্তিষ্কে রক্তক্ষরণ / স্ট্রোক",
      fhHd: "হৃদরোগ (Coronary Disease)",
      btnSubmit: "স্বাস্থ্য গতিপথ বিশ্লেষণ করুন",
      submitting: "তথ্য এআই দ্বারা বিশ্লেষণ করা হচ্ছে...",
      cancel: "বাতিল করুন",
      genderLabel: "বায়োলজিক্যাল লিঙ্গ (Gender)",
      genderM: "পুরুষ",
      genderF: "মহিলা",
      genderO: "অন্যান্য",
      fbsLabel: "খালি পেটে রক্তের শর্করা (Fasting Blood Sugar)",
      fbsNormal: "স্বাভাবিক (<১০০ mg/dL - সুস্থ বিপাক)",
      fbsBorderline: "সীমান্তবর্তী বা প্রি-ডায়াবেটিক (১০০ - ১২৫ mg/dL)",
      fbsHigh: "উচ্চ বা ডায়াবেটিক মাত্রা (>=১২৬ mg/dL)",
      cholLabel: "রক্তের কোলেস্টেরল স্তর (Cholesterol)",
      cholNormal: "আকাঙ্ক্ষিত মাত্রা (<২০০ mg/dL)",
      cholHigh: "উচ্চ ঝুঁকি কোলেস্টেরল (>=২০০ mg/dL)",
      cholUnsure: "অনিশ্চিত বা জানা নেই",
      sleepLabel: "দৈনিক ঘুমের গড় সময়কাল (Sleep)",
      sleepOptimal: "পর্যাপ্ত ৭-৯ ঘণ্টা (সুস্থ শারীরিক মেরামত)",
      sleepPoor: "অপর্যাপ্ত (<৬ ঘণ্টা / রক্তনালীতে অতিরিক্ত ধকল)",
      alcoholLabel: "অ অ্যালকোহল বা মদ্যপানের অভ্যাস",
      alcoholNever: "কখনোই নয় (সম্পূর্ণ ধূমপান/মদ্যপান মুক্ত)",
      alcoholOcc: "সামান্য বা মাঝে মাঝে (সামাজিক)",
      alcoholReg: "নিয়মিত বা অতিরিক্ত গ্রহণ",
    }
  };

  const currentT = t[lang];

  const handleCheckbox = (key: keyof AssessmentData["familyHistory"]) => {
    setData({
      ...data,
      familyHistory: {
        ...data.familyHistory,
        [key]: !data.familyHistory[key]
      }
    });
  };

  return (
    <div className="min-h-screen text-on-surface bg-background py-8">
      <main className="max-w-4xl mx-auto px-4">
        
        {/* Navigation back bar */}
        <div className="flex items-center justify-between mb-8">
          <button 
            onClick={() => onNavigate("landing")}
            className="flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline bg-surface-container/50 px-4 py-2 rounded-full duration-150"
          >
            <ChevronLeft className="w-4 h-4" /> {lang === "EN" ? "Back to Portal" : "পোর্টাল হোম"}
          </button>
          
          <div className="text-xs font-bold text-on-surface-variant flex items-center gap-1 bg-surface-container rounded-full px-3 py-1">
            <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse"></span>
            {lang === "EN" ? "Preventive Program Active" : "প্রতিরোধমূলক স্ক্রীনিং সক্রিয়"}
          </div>
        </div>

        {/* Title Block */}
        <div className="mb-10 text-center md:text-left">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-on-surface mb-3">
            {currentT.title}
          </h2>
          <p className="text-on-surface-variant text-sm md:text-base leading-relaxed max-w-2xl">
            {currentT.desc}
          </p>
        </div>

        {/* Grid-based Bento Form parameters */}
        <form 
          onSubmit={(e) => { e.preventDefault(); onSubmit(); }} 
          className="space-y-8"
        >
          
          {/* Section 1: Physical Parameters Vitals */}
          <div className="bg-surface-container-lowest border border-outline-variant/40 rounded-3xl p-6 md:p-8 shadow-sm">
            <div className="flex items-center gap-3 border-b border-outline-variant/30 pb-4 mb-6">
              <Activity className="w-6 h-6 text-primary" />
              <div>
                <h3 className="font-bold text-lg text-on-surface">{currentT.step1}</h3>
                <p className="text-xs text-on-surface-variant">{currentT.step1Desc}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Age select slider */}
              <div className="flex flex-col gap-2 bg-background/50 border border-outline-variant/30 rounded-2xl p-4">
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider flex justify-between">
                  <span>{currentT.ageLabel}</span>
                  <span className="text-primary text-sm font-extrabold">{data.age} {lang === "EN" ? "Years" : "বছর"}</span>
                </label>
                <input 
                  type="range"
                  min="18"
                  max="100"
                  value={data.age}
                  onChange={(e) => setData({ ...data, age: Number(e.target.value) })}
                  className="w-full accent-primary mt-2 cursor-col-resize"
                />
              </div>

              {/* Biological Gender Selector */}
              <div className="flex flex-col gap-2 bg-background/50 border border-outline-variant/30 rounded-2xl p-4">
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                  {currentT.genderLabel}
                </label>
                <select 
                  value={data.gender || "female"}
                  onChange={(e) => setData({ ...data, gender: e.target.value as any })}
                  className="bg-surface-container-lowest border border-outline-variant/50 rounded-xl px-4 py-2.5 focus:outline-none focus:border-primary text-xs font-bold text-on-surface mt-1"
                >
                  <option value="female">{currentT.genderF}</option>
                  <option value="male">{currentT.genderM}</option>
                  <option value="other">{currentT.genderO}</option>
                </select>
              </div>

              {/* BP Indicators */}
              <div className="flex flex-col gap-2 bg-background/50 border border-outline-variant/30 rounded-2xl p-4">
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider block mb-1">
                  {currentT.bpLabel}
                </label>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-grow flex items-center bg-surface-container-lowest border border-outline-variant/50 rounded-xl px-3 py-2 focus-within:border-primary">
                    <span className="text-[10px] font-bold text-on-surface-variant mr-1.5 uppercase select-none">SYS</span>
                    <input 
                      type="number"
                      min="60"
                      max="250"
                      required
                      placeholder={currentT.sysPlace}
                      value={data.systolic || ""}
                      onChange={(e) => setData({ ...data, systolic: Number(e.target.value) })}
                      className="w-full bg-transparent focus:outline-none text-sm font-bold text-on-surface"
                    />
                  </div>
                  <span className="text-outline text-lg select-none">/</span>
                  <div className="flex-grow flex items-center bg-surface-container-lowest border border-outline-variant/50 rounded-xl px-3 py-2 focus-within:border-primary">
                    <span className="text-[10px] font-bold text-on-surface-variant mr-1.5 uppercase select-none">DIA</span>
                    <input 
                      type="number"
                      min="40"
                      max="150"
                      required
                      placeholder={currentT.diaPlace}
                      value={data.diastolic || ""}
                      onChange={(e) => setData({ ...data, diastolic: Number(e.target.value) })}
                      className="w-full bg-transparent focus:outline-none text-sm font-bold text-on-surface"
                    />
                  </div>
                </div>
              </div>

              {/* Body Metrics: Height / Weight / BMI */}
              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4 bg-background/50 border border-outline-variant/30 rounded-2xl p-4">
                
                {/* Height */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-wider">
                    {currentT.heightLabel}
                  </label>
                  <input 
                    type="number"
                    min="100"
                    max="250"
                    required
                    placeholder="175"
                    value={data.height || ""}
                    onChange={(e) => setData({ ...data, height: Number(e.target.value) })}
                    className="bg-surface-container-lowest border border-outline-variant/50 rounded-xl px-4 py-2.5 focus:outline-none focus:border-primary text-sm font-bold text-on-surface"
                  />
                </div>

                {/* Weight */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-wider">
                    {currentT.weightLabel}
                  </label>
                  <input 
                    type="number"
                    min="30"
                    max="220"
                    required
                    placeholder="70"
                    value={data.weight || ""}
                    onChange={(e) => setData({ ...data, weight: Number(e.target.value) })}
                    className="bg-surface-container-lowest border border-outline-variant/50 rounded-xl px-4 py-2.5 focus:outline-none focus:border-primary text-sm font-bold text-on-surface"
                  />
                </div>

                {/* Calculated BMI indicator */}
                <div className="flex items-center gap-3 bg-primary/5 border border-primary/20 rounded-xl px-4 py-2">
                  <Scale className="w-8 h-8 text-primary shrink-0" />
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-primary/70 uppercase">
                      {currentT.bmiNotice}
                    </span>
                    <span className="text-sm font-extrabold text-primary">
                      {bmi.toFixed(1)} kg/m²
                    </span>
                    <span className="text-[10px] bg-primary-container text-on-primary-container px-2 py-0.5 rounded-full mt-0.5 font-bold w-fit">
                      {bmiClass}
                    </span>
                  </div>
                </div>

              </div>

            </div>
          </div>

          {/* Section 2: Lifestyle Habits & Social Indices */}
          <div className="bg-surface-container-lowest border border-outline-variant/40 rounded-3xl p-6 md:p-8 shadow-sm">
            <div className="flex items-center gap-3 border-b border-outline-variant/30 pb-4 mb-6">
              <Sparkles className="w-6 h-6 text-primary" />
              <div>
                <h3 className="font-bold text-lg text-on-surface">{currentT.step2}</h3>
                <p className="text-xs text-on-surface-variant">{currentT.step2Desc}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Physical activity selector */}
              <div className="flex flex-col gap-2.5">
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                  {currentT.actLabel}
                </label>
                <div className="flex flex-col gap-2.5">
                  {[
                    { val: "low", label: lang === "EN" ? "Low Activity" : "কম সক্রিয়", desc: currentT.actLow },
                    { val: "medium", label: lang === "EN" ? "Moderate Activity" : "মাঝারি সক্রিয়", desc: currentT.actMed },
                    { val: "high", label: lang === "EN" ? "High Activity" : "উচ্চ সক্রিয়", desc: currentT.actHigh }
                  ].map((opts) => (
                    <label key={opts.val} className="cursor-pointer">
                      <input 
                        type="radio" 
                        name="activityLevel"
                        value={opts.val}
                        checked={data.activityLevel === opts.val}
                        onChange={() => setData({ ...data, activityLevel: opts.val as any })}
                        className="sr-only"
                      />
                      <div className={`p-3.5 rounded-xl border text-left transition-all ${
                        data.activityLevel === opts.val
                          ? "bg-primary-container/10 border-primary text-primary font-bold shadow-sm"
                          : "bg-background/20 border-outline-variant/50 hover:bg-background/45 text-on-surface-variant"
                      }`}>
                        <div className="text-xs font-bold font-sans">{opts.label}</div>
                        <div className="text-[11px] opacity-80 mt-0.5 font-normal">{opts.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Diet Quality & Salt Prefs */}
              <div className="flex flex-col gap-6">
                
                {/* Diet Quality dropdown or picker */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                    {currentT.dietTitle}
                  </label>
                  <div className="flex flex-col gap-2">
                    {[
                      { val: "poor", label: lang === "EN" ? "Poor Diet" : "ত্রুটিপূর্ণ খাদ্যতালিকাগত পুষ্টি", desc: currentT.dietPoor },
                      { val: "average", label: lang === "EN" ? "Average Diet" : "মাঝারি ভারসাম্যপূর্ণ খাদ্য", desc: currentT.dietAvg },
                      { val: "good", label: lang === "EN" ? "Good Diet" : "পুষ্টিসমৃদ্ধ কাস্টম খাদ্য", desc: currentT.dietGood }
                    ].map((opts) => (
                      <label key={opts.val} className="cursor-pointer">
                        <input 
                          type="radio"
                          name="dietQuality"
                          value={opts.val}
                          checked={data.dietQuality === opts.val}
                          onChange={() => setData({ ...data, dietQuality: opts.val as any })}
                          className="sr-only"
                        />
                        <div className={`p-3.5 rounded-xl border text-left transition-all ${
                          data.dietQuality === opts.val
                            ? "bg-primary-container/10 border-primary text-primary font-bold shadow-sm"
                            : "bg-background/20 border-outline-variant/50 hover:bg-background/45 text-on-surface-variant"
                        }`}>
                          <div className="text-xs font-bold">{opts.label}</div>
                          <div className="text-[11px] opacity-80 mt-0.5 font-normal">{opts.desc}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

              </div>

              {/* Micro-Parameters: Salt / Stress / Smoking / FBS / Cholesterol / Sleep / Alcohol */}
              <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 pt-4 border-t border-outline-variant/30">
                
                {/* Salt Intake Preference */}
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-wider">
                    {currentT.saltLabel}
                  </label>
                  <select 
                    value={data.saltIntake}
                    onChange={(e) => setData({ ...data, saltIntake: e.target.value as any })}
                    className="bg-surface-container-lowest border border-outline-variant/50 rounded-xl px-4 py-2.5 focus:outline-none focus:border-primary text-xs font-bold text-on-surface"
                  >
                    <option value="low">{lang === "EN" ? "Low Sodium" : "স্বল্প সোডিয়াম (কম লবণ)"}</option>
                    <option value="medium">{lang === "EN" ? "Medium Sodium" : "সাধারণ লবণের মাত্রা"}</option>
                    <option value="high">{lang === "EN" ? "High Sodium" : "অতিরিক্ত লবণ পছন্দ"}</option>
                  </select>
                </div>

                {/* Fasting Blood Sugar */}
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-wider">
                    {currentT.fbsLabel}
                  </label>
                  <select 
                    value={data.fastingBloodSugar || "normal"}
                    onChange={(e) => setData({ ...data, fastingBloodSugar: e.target.value as any })}
                    className="bg-surface-container-lowest border border-outline-variant/50 rounded-xl px-4 py-2.5 focus:outline-none focus:border-primary text-xs font-bold text-on-surface"
                  >
                    <option value="normal">{currentT.fbsNormal}</option>
                    <option value="borderline">{currentT.fbsBorderline}</option>
                    <option value="high">{currentT.fbsHigh}</option>
                  </select>
                </div>

                {/* Cholesterol Level */}
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-wider">
                    {currentT.cholLabel}
                  </label>
                  <select 
                    value={data.cholesterol || "normal"}
                    onChange={(e) => setData({ ...data, cholesterol: e.target.value as any })}
                    className="bg-surface-container-lowest border border-outline-variant/50 rounded-xl px-4 py-2.5 focus:outline-none focus:border-primary text-xs font-bold text-on-surface"
                  >
                    <option value="normal">{currentT.cholNormal}</option>
                    <option value="high">{currentT.cholHigh}</option>
                    <option value="unsure">{currentT.cholUnsure}</option>
                  </select>
                </div>

                {/* Sleep Duration */}
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-wider">
                    {currentT.sleepLabel}
                  </label>
                  <select 
                    value={data.sleepDuration || "optimal"}
                    onChange={(e) => setData({ ...data, sleepDuration: e.target.value as any })}
                    className="bg-surface-container-lowest border border-outline-variant/50 rounded-xl px-4 py-2.5 focus:outline-none focus:border-primary text-xs font-bold text-on-surface"
                  >
                    <option value="optimal">{currentT.sleepOptimal}</option>
                    <option value="insufficient">{currentT.sleepPoor}</option>
                  </select>
                </div>

                {/* Alcohol Consumption */}
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-wider">
                    {currentT.alcoholLabel}
                  </label>
                  <select 
                    value={data.alcohol || "never"}
                    onChange={(e) => setData({ ...data, alcohol: e.target.value as any })}
                    className="bg-surface-container-lowest border border-outline-variant/50 rounded-xl px-4 py-2.5 focus:outline-none focus:border-primary text-xs font-bold text-on-surface"
                  >
                    <option value="never">{currentT.alcoholNever}</option>
                    <option value="occasional">{currentT.alcoholOcc}</option>
                    <option value="regular">{currentT.alcoholReg}</option>
                  </select>
                </div>

                {/* stress indices */}
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-wider">
                    {currentT.stressTitle}
                  </label>
                  <select 
                    value={data.stressLevel}
                    onChange={(e) => setData({ ...data, stressLevel: e.target.value as any })}
                    className="bg-surface-container-lowest border border-outline-variant/50 rounded-xl px-4 py-2.5 focus:outline-none focus:border-primary text-xs font-bold text-on-surface"
                  >
                    <option value="low">{lang === "EN" ? "Low Stress" : "কম মানসিক চাপ"}</option>
                    <option value="medium">{lang === "EN" ? "Moderate Stress" : "মাঝারি মানসিক চাপ"}</option>
                    <option value="high">{lang === "EN" ? "High / Constant Strain" : "অতিরিক্ত মানসিক চাপ"}</option>
                  </select>
                </div>

                {/* smoking */}
                <div className="flex flex-col gap-2 justify-center">
                  <label className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-wider">
                    {currentT.smokingTitle}
                  </label>
                  <div className="flex items-center gap-4 mt-2">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input 
                        type="checkbox"
                        checked={data.smoking}
                        onChange={(e) => setData({ ...data, smoking: e.target.checked })}
                        className="rounded border-outline-variant text-primary focus:ring-primary w-4.5 h-4.5"
                      />
                      <span className="text-xs font-bold text-on-surface-variant">
                        {data.smoking ? currentT.smokingY : currentT.smokingN}
                      </span>
                    </label>
                  </div>
                </div>

              </div>

            </div>
          </div>

          {/* Section 3: Hereditary Ancestor Chronic risks checklist */}
          <div className="bg-surface-container-lowest border border-outline-variant/40 rounded-3xl p-6 md:p-8 shadow-sm">
            <div className="flex items-center gap-3 border-b border-outline-variant/30 pb-4 mb-6">
              <BrainCircuit className="w-6 h-6 text-primary" />
              <div>
                <h3 className="font-bold text-lg text-on-surface">{currentT.step3}</h3>
                <p className="text-xs text-on-surface-variant">{currentT.step3Desc}</p>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider block">
                {currentT.fhTitle}
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { key: "diabetes", label: currentT.fhDb },
                  { key: "hypertension", label: currentT.fhHt },
                  { key: "stroke", label: currentT.fhSt },
                  { key: "heartDisease", label: currentT.fhHd }
                ].map((item) => (
                  <div 
                    key={item.key}
                    onClick={() => handleCheckbox(item.key as any)}
                    className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer select-none transition-all ${
                      data.familyHistory[item.key as keyof AssessmentData["familyHistory"]]
                        ? "bg-primary-container/15 border-primary text-primary font-bold shadow-sm"
                        : "bg-background/25 border-outline-variant/50 hover:bg-background/45 text-on-surface-variant"
                    }`}
                  >
                    <div className={`w-5 h-5 rounded border flex items-center justify-center ${
                      data.familyHistory[item.key as keyof AssessmentData["familyHistory"]]
                        ? "bg-primary border-primary text-on-primary"
                        : "border-outline-variant bg-surface"
                    }`}>
                      {data.familyHistory[item.key as keyof AssessmentData["familyHistory"]] && (
                        <Check className="w-3.5 h-3.5 stroke-[4]" />
                      )}
                    </div>
                    <span className="text-xs tracking-tight">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Action Trigger Buttons */}
          <div className="flex gap-4 items-center justify-end mt-8">
            <button 
              type="button"
              onClick={() => onNavigate("landing")}
              className="bg-surface-container hover:bg-surface-container-high text-on-surface-variant px-6 py-3 rounded-full font-bold text-sm tracking-tight transition-all active:scale-95"
            >
              {currentT.cancel}
            </button>
            <button 
              type="submit"
              disabled={isSubmitting}
              id="submit-screening-assessment-flow"
              className="bg-primary text-on-primary hover:bg-opacity-95 px-8 py-3.5 rounded-full font-bold text-sm tracking-tight shadow-md flex items-center gap-2 transform active:scale-95 transition-all disabled:opacity-75 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-on-primary border-t-transparent rounded-full animate-spin"></span>
                  {currentT.submitting}
                </>
              ) : (
                <>
                  {currentT.btnSubmit}
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

        </form>

      </main>
    </div>
  );
}
