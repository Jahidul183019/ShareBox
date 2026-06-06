import React, { useState, useEffect, useRef } from "react";
import { 
  Send, 
  ChevronLeft, 
  HelpCircle, 
  User, 
  PlusCircle, 
  X,
  MessageSquare,
  Sparkles
} from "lucide-react";
import { ChatMessage, ViewType } from "../types";

interface ChatbotPanelProps {
  lang: "EN" | "BN";
  onNavigate: (view: ViewType) => void;
}

export default function ChatbotPanel({
  lang,
  onNavigate,
}: ChatbotPanelProps) {

  // Conversation state initialized with a friendly assistant introduction matching Figma mockup
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "msg1",
      sender: "assistant",
      text: lang === "EN" 
        ? "Hello! I am your VitalCare Assistant. How can I help you manage your health today? You can ask me about your recent vitals, risk factors, or general health inquiries."
        : "হ্যালো! আমি আপনার ভাইটালকেয়ার সহকারী। আজ কীভাবে আমি আপনাকে আপনার স্বাস্থ্য পরিচালনায় সাহায্য করতে পারি? আপনি আমাকে আপনার রক্তচাপ, বিএমআই বা সাধারণ স্বাস্থ্য জিজ্ঞাসা করতে পারেন।",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat to the bottom on new message additions
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const t = {
    EN: {
      assistantHeader: "VitalCare Assistant",
      status: "Online & Ready",
      disclaimer: "Informational only. Not a medical diagnosis. Consult a licensed healthcare professional.",
      placeholder: "Type your health question...",
      suggestedHeader: "Suggested Queries",
      chip1: "What does high BP mean?",
      chip2: "Is my BMI dangerous?",
      chip3: "How can I reduce risk?",
      chip4: "What should I tell my doctor?",
      doctorBtn: "Speak With A Doctor",
      doctorAlert: "Doctor session launching soon! This is a demo trigger linking telehealth partners.",
    },
    BN: {
      assistantHeader: "ভাইটালকেয়ার এআই সহকারী",
      status: "অনলাইন এবং প্রস্তুত",
      disclaimer: "কেবলমাত্র তথ্যের উদ্দেশ্যে। কোনো ক্লিনিকাল মেডিকেল ডায়াগনসিস নয়। চিকিৎসকের পরামর্শ নিন।",
      placeholder: "আপনার স্বাস্থ্য বিষয়ক প্রশ্ন টাইপ করুন...",
      suggestedHeader: "পরামর্শমূলক প্রশ্নাবলী",
      chip1: "উচ্চ রক্তচাপ (High BP) বলতে কী বোঝায়?",
      chip2: "আমার বিএমআই (BMI) কি ঝুঁকিপূর্ণ?",
      chip3: "আমি কীভাবে দীর্ঘমেয়াদী রোগঝুঁকি কমাব?",
      chip4: "আমার ডাক্তারকে কী বলা উচিত?",
      doctorBtn: "ডাক্তারের সাথে সরাসরি কথা বলুন",
      doctorAlert: "টেলিমেডিসিন ডাক্তার সেশন শুরু হচ্ছে! অংশীদার নেটওয়ার্কের সংযোগ লিঙ্ক তৈরি করা হচ্ছে।",
    }
  };

  const currentT = t[lang];

  // Send content query payload to Express Gemini controller
  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim()) return;

    const userMsg: ChatMessage = {
      id: "user-" + Date.now(),
      sender: "user",
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText("");
    setIsTyping(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg].map(m => ({
            sender: m.sender,
            text: m.text
          })),
          lang: lang === "EN" ? "en" : "bn"
        })
      });

      if (!response.ok) {
        throw new Error("Chat api request issue");
      }

      const reply = await response.json();
      
      setMessages(prev => [...prev, {
        id: "assistant-" + Date.now(),
        sender: "assistant",
        text: reply.text || "Hello! (Response unavailable). Please check key configurations.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    } catch (err) {
      console.error("Assistant API call failed, using local offline help response:", err);
      // Fallback response and explanation
      setMessages(prev => [...prev, {
        id: "assistant-fallback-" + Date.now(),
        sender: "assistant",
        text: lang === "EN"
          ? "I am currently running in Offline mode as the server has not fully loaded. To see a dynamic response, you can launch the Screening Assessment program! If you require clinical medication advice, please contact the City Health Center clinic."
          : "আমি বর্তমানে অফলাইন মুডে চলছি কারণ স্বাস্থ্য ফোরামের সার্ভার সম্পূর্ণ লোড হচ্ছে। একটি সক্রিয় এআই উত্তর পেতে আপনি আমাদের 'Assess' স্ক্রীনিং প্রোগ্রামটি চালু করতে পারেন!",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const clickChip = (chipText: string) => {
    handleSendMessage(chipText);
  };

  return (
    <div className="min-h-screen text-on-surface bg-background flex flex-col justify-between">
      
      {/* Upper header */}
      <header className="bg-surface-container-lowest dark:bg-inverse-surface w-full py-4 border-b border-outline-variant/35 flex items-center justify-between px-4 md:px-8">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => onNavigate("dashboard")}
            className="p-1 px-3 rounded-full bg-surface-container text-on-surface-variant hover:text-primary transition-colors text-xs font-semibold flex items-center gap-1"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> {lang === "EN" ? "Dashboard" : "ড্যাশবোর্ড"}
          </button>
          <div className="flex items-center gap-2">
            <span className="text-sm md:text-base font-extrabold text-primary">CarePoint / AI Chat</span>
          </div>
        </div>
        <button 
          onClick={() => onNavigate("dashboard")}
          className="p-1 px-3 rounded-full border border-primary/20 text-xs text-primary font-bold hover:bg-primary-container/10 transition-colors"
        >
          {lang === "EN" ? "Explore Services" : "সারভিসসমূহ"}
        </button>
      </header>

      {/* Main Chat card Panel Grid */}
      <main className="flex-grow w-full max-w-4xl mx-auto px-4 py-6 flex flex-col items-center justify-center">
        <div className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-3xl overflow-hidden flex flex-col shadow-md h-[550px] md:h-[600px]">
          
          {/* Header element of Assistant card */}
          <div className="px-6 py-4 border-b border-outline-variant/30 bg-surface-container flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-on-primary">
                <MessageSquare className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div className="text-left">
                <h2 className="text-sm font-bold text-on-surface">{currentT.assistantHeader}</h2>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="w-2 h-2 bg-primary rounded-full animate-pulse"></span>
                  <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">{currentT.status}</span>
                </div>
              </div>
            </div>
            <button 
              onClick={() => onNavigate("dashboard")}
              className="p-2 hover:bg-surface-container-high rounded-full transition-colors active:scale-90"
              aria-label="Close Chat"
            >
              <X className="w-5 h-5 text-on-surface-variant" />
            </button>
          </div>

          {/* Disclaimer Banner as required by high stakes healthcare visual designs */}
          <div className="px-6 py-2.5 bg-red-100/10 dark:bg-red-950/20 border-b border-red-500/20 flex items-start gap-2 text-left">
            <HelpCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <p className="text-[10px] md:text-[11px] text-red-600 dark:text-red-400 leading-normal font-semibold">
              {currentT.disclaimer}
            </p>
          </div>

          {/* Messages window feed */}
          <div className="flex-grow overflow-y-auto p-6 space-y-6 bg-background/30 no-scrollbar">
            {messages.map((m) => (
              <div 
                key={m.id}
                className={`flex gap-3 max-w-[85%] ${
                  m.sender === "user" ? "self-end ml-auto flex-row-reverse" : "self-start Mr-auto"
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center mt-1 select-none text-xs font-bold ${
                  m.sender === "user" 
                    ? "bg-primary-container text-on-primary-container"
                    : "bg-secondary-container text-on-secondary-container"
                }`}>
                  {m.sender === "user" ? "U" : "AI"}
                </div>
                
                <div className={`p-4 rounded-2xl relative border ${
                  m.sender === "user"
                    ? "bg-primary text-on-primary rounded-tr-none border-primary/25"
                    : "bg-surface-container-low text-on-surface rounded-tl-none border-outline-variant/30"
                }`}>
                  <p className="text-xs md:text-sm leading-relaxed whitespace-pre-wrap">{m.text}</p>
                  <span className={`block text-[9px] mt-2 text-right ${
                    m.sender === "user" ? "text-on-primary/65" : "text-on-surface-variant"
                  }`}>
                    {m.timestamp}
                  </span>
                </div>
              </div>
            ))}

            {/* Is Typing indicator */}
            {isTyping && (
              <div className="flex gap-3 max-w-[85%] self-start text-left">
                <div className="w-8 h-8 rounded-full bg-secondary-container flex items-center justify-center text-xs font-bold select-none">
                  AI
                </div>
                <div className="bg-surface-container-low p-4 rounded-2xl rounded-tl-none border border-outline-variant/30 flex items-center gap-1 py-3">
                  <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
                  <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                  <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
                </div>
              </div>
            )}
            
            <div ref={chatBottomRef}></div>
          </div>

          {/* Action and text input section */}
          <div className="p-4 md:p-6 border-t border-outline-variant/30 bg-surface-container">
            
            {/* Suggested Question Chips */}
            <div className="flex flex-wrap gap-2 mb-4 select-none">
              {[currentT.chip1, currentT.chip2, currentT.chip3, currentT.chip4].map((chip, idx) => (
                <button 
                  key={idx}
                  onClick={() => clickChip(chip)}
                  className="px-3.5 py-1.5 bg-surface-container-lowest border border-outline-variant/40 hover:border-primary/45 rounded-full text-[10px] md:text-xs font-bold text-on-surface-variant hover:text-primary transition-all active:scale-95 shadow-2xs"
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* Text Input row */}
            <div className="flex items-center gap-3">
              <div className="relative flex-grow">
                <input 
                  type="text"
                  value={inputText}
                  placeholder={currentT.placeholder}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendMessage(inputText)}
                  className="w-full bg-surface-container-lowest border border-outline-variant/60 rounded-full py-3 px-5 pr-12 text-xs md:text-sm font-semibold focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-on-surface"
                />
                <button 
                  onClick={() => handleSendMessage(inputText)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-2 bg-primary text-on-primary rounded-full hover:bg-opacity-95 transition-colors cursor-pointer"
                  aria-label="Send Message"
                >
                  <Send className="w-3.5 h-3.5 stroke-[2.5]" />
                </button>
              </div>
            </div>

          </div>

        </div>
      </main>

    </div>
  );
}
