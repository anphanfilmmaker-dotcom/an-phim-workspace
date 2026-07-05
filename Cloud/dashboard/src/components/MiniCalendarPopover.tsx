import React, { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, MoveRight } from "lucide-react";
import { CalendarEvent } from "../types";

interface MiniCalendarPopoverProps {
  events: CalendarEvent[];
  onNavigateToSchedule: () => void;
  lang: "en" | "vi";
  globalCurrentDate: Date;
  setGlobalCurrentDate: (d: Date) => void;
  globalSelectedDateStr: string;
  setGlobalSelectedDateStr: (s: string) => void;
}

export default function MiniCalendarPopover({ events, onNavigateToSchedule, lang, globalCurrentDate, setGlobalCurrentDate, globalSelectedDateStr, setGlobalSelectedDateStr }: MiniCalendarPopoverProps) {
  const currentDate = globalCurrentDate;
  const setCurrentDate = setGlobalCurrentDate;
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  // Adjust to start on Monday
  const startingDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

  const monthNamesEn = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const monthNamesVi = ["Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6", "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"];

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const getEventsForDate = (day: number) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.filter(e => e.date === dateStr);
  };

  const selectedEvents = events.filter(e => e.date === globalSelectedDateStr);

  const getEventDotColor = (event: CalendarEvent) => {
    if (event.category === 'meeting' || event.priority === 'high') return 'bg-orange-500';
    if (event.category === 'ai_agent') return 'bg-purple-500';
    if (event.category === 'personal') return 'bg-cyan-500';
    return 'bg-emerald-500';
  };

  return (
    <div className="relative" ref={popoverRef}>
      {/* Trigger Button */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center space-x-2 border px-3 py-1.5 rounded-lg text-[10px] font-mono cursor-pointer transition-all ${
          isOpen
            ? "bg-orange-950/20 border-orange-500/50 text-orange-400"
            : "bg-neutral-900 border-neutral-800 text-neutral-300 hover:bg-neutral-800"
        }`}
        title={lang === "en" ? "View Work Schedule" : "Lịch làm việc"}
      >
        <CalendarIcon className={`w-3.5 h-3.5 ${isOpen ? "text-orange-400" : "text-orange-400/80"}`} />
        <span>{lang === "en" ? "Work Schedule" : "Lịch làm việc"}</span>
      </div>

      {/* Popover Content */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-1.5 w-64 bg-[#111820] border border-orange-500/50 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] shadow-orange-900/20 z-50 overflow-hidden animate-fade-in-up">
          <div className="p-3 border-b border-white/5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2 ml-[12px]">
                <CalendarIcon className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-sans font-bold text-white">
                  {lang === 'en' ? `${monthNamesEn[currentDate.getMonth()]} ${currentDate.getFullYear()}` : `${monthNamesVi[currentDate.getMonth()]}, ${currentDate.getFullYear()}`}
                </h3>
              </div>
              <button 
                onClick={() => {
                  setIsOpen(false);
                  onNavigateToSchedule();
                }}
                className="text-[10px] text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
              >
                {lang === 'en' ? 'View details' : 'Xem chi tiết'}
              </button>
            </div>

            {/* Days of week */}
            <div className="grid grid-cols-7 gap-[2px] mb-1.5 text-center">
              {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(day => (
                <div key={day} className="text-[10px] font-mono text-neutral-500 font-bold">{day}</div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-x-[2px] gap-y-1.5">
              {/* Empty slots */}
              {Array.from({ length: startingDay }).map((_, i) => (
                <div key={`empty-${i}`} className="h-[24px]"></div>
              ))}
              
              {/* Days */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const isSelected = dateStr === globalSelectedDateStr;
                const dayEvents = getEventsForDate(day);
                const firstEvent = dayEvents.length > 0 ? dayEvents[0] : null;

                const actualToday = new Date();
                const isToday = actualToday.getDate() === day && actualToday.getMonth() === currentDate.getMonth() && actualToday.getFullYear() === currentDate.getFullYear();

                let bgClass = "text-[#F5F7FA] hover:bg-white/10";
                if (isToday) {
                  bgClass = "bg-[#f97316] text-[#050809] font-bold";
                } else if (firstEvent) {
                  if (firstEvent.category === 'work') bgClass = "bg-[#10B981] text-[#050809] font-bold";
                  else if (firstEvent.category === 'personal') bgClass = "bg-[#06b6d4] text-[#050809] font-bold";
                  else if (firstEvent.category === 'meeting') bgClass = "bg-[#f97316] text-[#050809] font-bold";
                  else if (firstEvent.category === 'ai_agent') bgClass = "bg-[#a855f7] text-[#050809] font-bold";
                  else bgClass = "bg-[#8B949E] text-[#050809] font-bold";
                }

                if (isSelected) {
                   bgClass += " ring-[1.5px] ring-white ring-offset-1 ring-offset-[#111820]";
                }

                return (
                  <div key={day} className="flex flex-col items-center justify-start relative h-[24px] cursor-pointer group" onClick={() => setGlobalSelectedDateStr(dateStr)}>
                    <div className={`w-[20px] h-[20px] mx-auto flex items-center justify-center rounded-full text-[11px] font-sans transition-all ${bgClass}`}>
                      {day}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Tasks View */}
          <div className="p-3 bg-[#0a0d11]">
            <h4 className="text-[10px] font-mono font-bold text-neutral-400 uppercase tracking-wider mb-2.5 ml-[12px]">
              {lang === 'en' ? 'Tasks for selected date' : 'Nhiệm vụ trong ngày'}
            </h4>
            <div className="space-y-1.5 mb-1 ml-[12px]">
              {selectedEvents.length === 0 ? (
                <p className="text-[11px] text-neutral-600 font-mono italic">
                  {lang === 'en' ? 'No events scheduled.' : 'Không có sự kiện nào.'}
                </p>
              ) : (
                selectedEvents.slice(0, 3).map(ev => (
                  <div key={ev.id} className="flex items-center space-x-2 py-0.5">
                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${getEventDotColor(ev)}`}></div>
                    <div className="min-w-0 flex-1 flex items-center justify-between">
                      <p className="text-[11px] font-sans text-neutral-200 truncate pr-2">{ev.title}</p>
                      <p className="text-[10px] font-mono text-neutral-500 shrink-0">
                        {ev.startTime}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
}
