
import { Battery, Wifi, Signal } from "lucide-react";
import { BellIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";

interface PhoneFrameProps {
  children: React.ReactNode;
  background?: string;
  className?: string;
}

export function PhoneFrame({ 
  children, 
  background = "bg-[#f9fafb]", 
  className 
}: PhoneFrameProps) {
  return (
    <div className={cn(
      "relative mx-auto w-[280px] sm:w-[320px] group isolate",
      className
    )}>
      {/* Ambient Glow - Smoother, more subtle */}
      <div className="absolute -inset-16 bg-gradient-to-b from-primary/5 to-transparent blur-[100px] rounded-[4rem] opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none -z-10"></div>

      {/* 
        Physically-based Layered Shadows for the Frame:
        1. AO (Ambient Occlusion): Sharp, dark contact shadow
        2. Soft Drop: Broad, diffused light occlusion
      */}
      <div className="relative rounded-[3.2rem] p-[4px] bg-gradient-to-br from-[#e0e2e8] via-[#f4f5f7] to-[#d3d5dc] 
        shadow-[0_2px_4px_rgba(0,0,0,0.05),0_12px_24px_rgba(0,0,0,0.05),0_32px_64px_-12px_rgba(0,0,0,0.1)] 
        box-border">
        
        {/* Metallic Bezel Glint - Sharp highlight on the very edge */}
        <div className="absolute inset-[1px] rounded-[3.15rem] border border-white/40 pointer-events-none z-50"></div>
        
        {/* Inner shadow highlighting the curved metallic edge */}
        <div className="absolute inset-[4px] rounded-[3rem] ring-1 ring-black/5 shadow-[inset_0_2px_4px_rgba(255,255,255,0.8),inset_0_-1px_2px_rgba(0,0,0,0.03)] pointer-events-none z-50"></div>
        
        {/* Hardware Bezel Layer 2 - The Black Glass Border */}
        <div className="relative rounded-[3rem] bg-black p-[7px] shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]">
          
          {/* Hardware Buttons - Refined glints */}
          <div className="absolute right-[-6px] top-[100px] w-[3px] h-[30px] bg-gradient-to-r from-gray-600 via-gray-400 to-gray-600 rounded-r-md shadow-sm"></div>
          <div className="absolute left-[-6px] top-[90px] w-[3px] h-[20px] bg-gradient-to-l from-gray-600 via-gray-400 to-gray-600 rounded-l-md shadow-sm"></div>
          <div className="absolute left-[-6px] top-[130px] w-[3px] h-[40px] bg-gradient-to-l from-gray-600 via-gray-400 to-gray-600 rounded-l-md shadow-sm"></div>
          <div className="absolute left-[-6px] top-[185px] w-[3px] h-[40px] bg-gradient-to-l from-gray-600 via-gray-400 to-gray-600 rounded-l-md shadow-sm"></div>

          {/* Inner Screen Panel */}
          <div className={cn(
            "relative w-full aspect-[9/19.5] rounded-[2.6rem] overflow-hidden flex flex-col items-center justify-start shadow-[inset_0_0_12px_rgba(0,0,0,0.2)] ring-1 ring-white/5",
            background
          )}>
            
            {/* Screen Lighting Specular Highlight - Top down consistent light */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-transparent opacity-40 pointer-events-none z-50"></div>

            {/* Status Bar */}
            <div className="w-full h-12 flex items-center justify-between px-6 pt-3 z-40 font-medium font-sans isolate">
              <span className="text-[13px] font-semibold tracking-tight text-gray-900 drop-shadow-sm ml-1 w-[40px]">9:41</span>
              
              {/* Dynamic Island */}
              <div className="absolute top-[10px] left-1/2 -translate-x-1/2 w-[110px] h-[28px] bg-black rounded-full shadow-[inset_0_-1px_3px_rgba(255,255,255,0.1),0_2px_8px_rgba(0,0,0,0.3)] border border-white/5 flex items-center justify-between px-2.5 overflow-hidden">
                {/* Island Camera & Sensors */}
                <div className="w-2.5 h-2.5 rounded-full bg-indigo-500/10 flex items-center justify-center">
                   <div className="w-1 h-1 rounded-full bg-indigo-500/60 shadow-[0_0_4px_rgba(99,102,241,0.5)] animate-pulse"></div>
                </div>
                <div className="w-2.5 h-2.5 rounded-full bg-zinc-900 border-[0.5px] border-zinc-700/50 shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)]">
                  <div className="w-1 h-1 rounded-full bg-blue-900/30 absolute top-[1px] right-[1px]"></div>
                </div>
              </div>
              
              <div className="flex items-center gap-1.5 text-gray-900 drop-shadow-sm pr-1">
                <Signal className="w-3.5 h-3.5 fill-current" />
                <Wifi className="w-4 h-4" />
                <Battery className="w-[20px] h-[20px] fill-current" />
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 w-full overflow-hidden relative pt-3 px-3.5 pb-8 z-10 flex flex-col">
              {children}
            </div>

            {/* Home Indicator */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-[120px] h-1 bg-gray-900/60 backdrop-blur-md rounded-full z-40"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface NotificationPreviewProps {
  appName?: string;
  time?: string;
  title?: string;
  body: string;
  imageUrl?: string;
  delay?: number;
}

export function NotificationPreview({ 
  appName = "Your App", 
  time = "now",
  title,
  body,
  imageUrl,
  delay = 0.1
}: NotificationPreviewProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: -16, scale: 0.98, filter: "blur(4px)" }}
      animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
      transition={{ 
        type: "spring", 
        stiffness: 400, 
        damping: 30,
        delay: delay
      }}
      whileHover={{ y: -1, scale: 1.005 }}
      className="w-full relative group mb-2 last:mb-0"
    >
      <div className="relative w-full bg-white/60 backdrop-blur-[20px] rounded-[1.4rem] p-3.5 
        shadow-[0_2px_4px_rgba(0,0,0,0.02),0_10px_20px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.5)] 
        ring-1 ring-black/[0.03]">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-[22px] h-[22px] bg-gradient-to-b from-primary to-primary/80 rounded-[0.4rem] shadow-[0_1px_2px_rgba(0,0,0,0.1)] flex items-center justify-center ring-1 ring-black/5">
              <BellIcon className="w-3 h-3 text-white" weight="fill" />
            </div>
            <span className="text-[12.5px] font-semibold text-gray-800 tracking-tight">{appName}</span>
          </div>
          <span className="text-[11px] font-medium text-gray-400 tracking-wide pr-1">{time}</span>
        </div>
        
        {/* Body */}
        <div className={cn("pl-[30px]", imageUrl && "flex gap-3")}>
          <div className="flex-1 min-w-0">
            {title && (
              <h4 className="text-[14px] font-[650] text-gray-900 leading-snug tracking-tight mb-[2px] pr-2">
                {title}
              </h4>
            )}
            <p className="text-[13px] text-gray-500 leading-[1.35] font-medium line-clamp-3">
              {body}
            </p>
          </div>
          {imageUrl && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: delay + 0.1, type: "spring", stiffness: 300 }}
              className="w-[44px] h-[44px] rounded-xl bg-gray-100 flex-shrink-0 overflow-hidden ring-1 ring-black/[0.05] shadow-sm"
            >
              <img 
                src={imageUrl} 
                alt="" 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

interface SMSPreviewProps {
  body: string;
  timestamp?: string;
  delay?: number;
}

export function SMSPreview({ 
  body,
  timestamp = "9:41 AM",
  delay = 0.1
}: SMSPreviewProps) {
  return (
    <div className="flex flex-col h-full bg-[#f9fafb] absolute inset-0 z-0">
      {/* Messages App Header */}
      <div className="bg-white/80 backdrop-blur-xl px-4 py-3 pb-3.5 flex items-center gap-3 border-b border-gray-100 shadow-[0_1px_2px_rgba(0,0,0,0.01)] z-20 pt-[52px]">
        <div className="relative">
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-100 to-indigo-50 flex items-center justify-center ring-1 ring-indigo-100/50 shadow-sm">
            <span className="text-[13px] font-bold text-indigo-600 tracking-tight">YA</span>
          </div>
          <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-white"></div>
        </div>
        <div className="flex-1">
          <p className="text-[14px] font-semibold text-gray-900 tracking-tight leading-none mb-1.5 pt-0.5">Your App</p>
          <p className="text-[11px] font-medium text-gray-400 leading-none flex items-center gap-1.5">
            iMessage <span className="w-1 h-1 rounded-full bg-gray-300"></span> {timestamp}
          </p>
        </div>
      </div>

      {/* Message Bubble Area */}
      <div className="flex-1 px-4 py-5 flex flex-col justify-end min-h-[200px] z-10 w-full">
        <div className="flex justify-end mb-1 w-full">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, transformOrigin: "bottom right", y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 450, damping: 30, delay }}
            className="group relative max-w-[85%] pr-1 w-fit ml-auto"
          >
            {/* The tail of the iMessage bubble */}
            <svg viewBox="0 0 8 13" className="absolute -bottom-[1px] right-0 w-[9px] h-[13px] text-[#007aff] z-0">
                <path d="M5.00035 0.5C5.00035 0.5 5.50035 5.5 8.00035 7C8.00035 7 2.00035 8.5 0.000351052 13C-0.000574925 12.836 -0.000348568 12.6667 0.000351052 12.5C0.000351052 7.50001 2.00035 4.5 5.00035 0.5Z" fill="currentColor" />
            </svg>

            {/* Bubble */}
            <div className="relative bg-[#007aff] text-white rounded-[1.3rem] rounded-br-[4px] px-[16px] py-[10px] shadow-[0_1px_2px_rgba(0,122,255,0.2),inset_0_1px_0_rgba(255,255,255,0.2)] z-10 w-fit">
              <p className="text-[15px] leading-[1.35] whitespace-pre-wrap font-medium tracking-tight text-white">{body}</p>
            </div>
          </motion.div>
        </div>
        
        {/* Delivered Status */}
         <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: delay + 0.4, duration: 0.4 }}
            className="flex justify-end pr-3"
         >
           <span className="text-[10px] font-semibold text-gray-400/80 tracking-wide">Delivered</span>
         </motion.div>
      </div>

      {/* iMessage Input Bar */}
      <div className="px-3 pb-[34px] pt-3 bg-white/60 backdrop-blur-xl border-t border-gray-100 z-20">
        <div className="bg-white rounded-full px-[14px] py-[7px] flex items-center gap-3 border border-gray-200/50 shadow-sm">
          <div className="w-7 h-7 rounded-full bg-[#e9eaed]/50 flex items-center justify-center flex-shrink-0 text-gray-500">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="M12 5v14"></path></svg>
          </div>
          <span className="text-[15px] font-medium text-gray-300 flex-1 tracking-tight translate-y-[1px]">iMessage</span>
          <div className="w-[30px] h-[30px] rounded-full bg-[#007aff] flex items-center justify-center flex-shrink-0 text-white shadow-sm transition-transform active:scale-95">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="translate-x-[1px] translate-y-[1px]"><path d="M12 19V5"></path><path d="M5 12l7-7 7 7"></path></svg>
          </div>
        </div>
      </div>
    </div>
  );
}


