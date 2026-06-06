import React, { useState } from "react";
import { User, ChevronLeft, Mail, Lock, AlertCircle, Check, Info } from "lucide-react";
import { ViewType } from "../types";

interface AuthPanelProps {
  lang: "EN" | "BN";
  onNavigate: (view: ViewType) => void;
  onLogin: (email: string, pass: string) => Promise<boolean | string> | boolean | string;
  onSignUp: (email: string, pass: string, name: string) => Promise<boolean | string> | boolean | string;
}

export default function AuthPanel({ lang, onNavigate, onLogin, onSignUp }: AuthPanelProps) {
  const [activeTab, setActiveTab] = useState<"login" | "signup">("login");
  const [emailText, setEmailText] = useState("");
  const [passwordText, setPasswordText] = useState("");
  const [nameText, setNameText] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [authSuccess, setAuthSuccess] = useState("");

  const handleAuthAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setAuthSuccess("");

    if (activeTab === "login") {
      const res = await onLogin(emailText, passwordText);
      if (typeof res === "string") {
        setErrorMessage(res);
      } else if (res === true) {
        setAuthSuccess(lang === "EN" ? "Welcome back!" : "স্বাগতম!");
        setEmailText("");
        setPasswordText("");
      }
    } else {
      const res = await onSignUp(emailText, passwordText, nameText);
      if (typeof res === "string") {
        setErrorMessage(res);
      } else if (res === true) {
        setAuthSuccess(lang === "EN" ? "Account created successfully!" : "অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে!");
        setEmailText("");
        setPasswordText("");
        setNameText("");
      }
    }
  };

  const t = {
    EN: {
      header: "Patient Space & Registries",
      desc: "Authenticate to manage separate clinic records, or customize your local patient identity and historic biomarkers.",
      authCardTitle: "Secure Patient Registry Access",
      emailPh: "E.g. abc@domain.com",
      passPh: "Security Password",
      namePh: "Patient Display Name",
      loginTab: "Sign In",
      registerTab: "Sign Up",
      guestNotice: "Browsing in Guest Mode. Connect or register an account to isolate screening logs and view trends over sessions."
    },
    BN: {
      header: "রোগী অঞ্চল এবং নিবন্ধন",
      desc: "নিবন্ধন পৃথক ক্লিনিক রেকর্ড করতে সাহায্য করে, অথবা আপনার বর্তমান প্রোফাইলের নাম এবং স্ক্রীনড বায়োমার্কার কাস্টমাইজ করুন।",
      authCardTitle: "সুরক্ষিত রোগী রেকর্ড অ্যাক্সেস",
      emailPh: "উদাহরণ: patient@care.com",
      passPh: "নিরাপত্তা পাসওয়ার্ড",
      namePh: "রোগী প্রদর্শিত নাম",
      loginTab: "লগ ইন",
      registerTab: "নিবন্ধন করুন",
      guestNotice: "অতিথি মোডে ব্রাউজ করছেন। পৃথক স্বাস্থ্য রেকর্ড ট্র্যাক করতে এবং ড্যাশবোর্ড সেশন হিস্ট্রি ধরে রাখতে লগইন বা অ্যাকাউন্ট তৈরি করুন।"
    }
  };

  const currentT = t[lang];

  return (
    <div className="min-h-screen text-on-surface bg-background py-8 font-sans">
      <main className="max-w-4xl mx-auto px-4 space-y-8">
        <div className="flex items-center justify-between">
          <button 
            onClick={() => onNavigate("dashboard")}
            className="flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline bg-surface-container/50 px-4 py-2 rounded-full duration-150 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" /> {lang === "EN" ? "Back to Dashboard" : "ড্যাশবোর্ডে ফিরে যান"}
          </button>
        </div>

        <div className="mb-8 text-center md:text-left">
          <h2 className="text-3xl font-extrabold tracking-tight text-on-surface flex items-center gap-2 justify-center md:justify-start">
            <User className="w-8 h-8 text-primary" /> {currentT.header}
          </h2>
          <p className="text-on-surface-variant text-sm leading-relaxed max-w-2xl mt-2">
            {currentT.desc}
          </p>
        </div>

        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex gap-3 text-xs text-primary max-w-4xl">
          <Info className="w-5 h-5 shrink-0" />
          <p>{currentT.guestNotice}</p>
        </div>

        <div className="max-w-md mx-auto md:mx-0">
          <div className="bg-surface-container-lowest border border-outline-variant/40 rounded-3xl p-6 shadow-sm flex flex-col gap-4 font-sans text-left">
            <div>
              <h3 className="text-sm font-bold text-on-surface-variant uppercase tracking-wider border-b border-outline-variant/20 pb-3">
                {currentT.authCardTitle}
              </h3>

              <div className="flex bg-surface-container/50 border border-outline-variant/20 p-1.5 rounded-xl gap-2 mt-4">
                <button 
                  onClick={() => { setActiveTab("login"); setErrorMessage(""); setAuthSuccess(""); }}
                  className={`flex-1 text-center py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    activeTab === "login" 
                      ? "bg-primary text-on-primary shadow-sm" 
                      : "text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  {currentT.loginTab}
                </button>
                <button 
                  onClick={() => { setActiveTab("signup"); setErrorMessage(""); setAuthSuccess(""); }}
                  className={`flex-1 text-center py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    activeTab === "signup" 
                      ? "bg-primary text-on-primary shadow-sm" 
                      : "text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  {currentT.registerTab}
                </button>
              </div>

              <form onSubmit={handleAuthAction} className="space-y-4 mt-5">
                {errorMessage && (
                  <div className="bg-red-500/10 border border-red-500/35 text-red-600 dark:text-red-400 p-3 rounded-xl flex gap-2 text-xs font-bold animate-fadeIn">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {authSuccess && (
                  <div className="bg-emerald-500/10 border border-emerald-500/35 text-emerald-600 p-3 rounded-xl flex gap-1.5 text-xs font-bold animate-fadeIn">
                    <Check className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{authSuccess}</span>
                  </div>
                )}

                {activeTab === "signup" && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wide">
                      {currentT.namePh}
                    </label>
                    <input 
                      type="text"
                      required
                      value={nameText}
                      onChange={(e) => setNameText(e.target.value)}
                      className="bg-background border border-outline-variant/50 focus:border-primary rounded-xl px-3.5 py-2.5 text-xs font-bold tracking-tight text-on-surface outline-none"
                      placeholder="E.g. abc"
                    />
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wide">
                    Email Address
                  </label>
                  <div className="relative flex items-center">
                    <Mail className="w-4 h-4 text-on-surface-variant/70 absolute left-3" />
                    <input 
                      type="email"
                      required
                      value={emailText}
                      onChange={(e) => setEmailText(e.target.value)}
                      className="bg-background border border-outline-variant/50 focus:border-primary rounded-xl pl-9 pr-3.5 py-2.5 text-xs font-bold tracking-tight text-on-surface outline-none w-full"
                      placeholder={currentT.emailPh}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wide">
                    {currentT.passPh}
                  </label>
                  <div className="relative flex items-center">
                    <Lock className="w-4 h-4 text-on-surface-variant/70 absolute left-3" />
                    <input 
                      type="password"
                      required
                      value={passwordText}
                      onChange={(e) => setPasswordText(e.target.value)}
                      className="bg-background border border-outline-variant/50 focus:border-primary rounded-xl pl-9 pr-3.5 py-2.5 text-xs font-bold tracking-tight text-on-surface outline-none w-full"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <button 
                  type="submit"
                  className="w-full bg-primary text-on-primary hover:bg-opacity-95 py-3 rounded-xl font-bold text-xs tracking-tight transition-all active:scale-95 flex items-center justify-center gap-1.5 shadow-sm mt-6 cursor-pointer"
                >
                  {activeTab === "login" ? currentT.loginTab : currentT.registerTab}
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}