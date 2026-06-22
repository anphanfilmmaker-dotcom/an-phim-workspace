import React, { useState } from "react";
import { GoogleSheetDB, CalendarEvent } from "../types";
import { Calendar as CalendarIcon, Clock, ChevronLeft, ChevronRight, Filter, Plus, ChevronDown, Check } from "lucide-react";

interface SchedulePageProps {
  db: GoogleSheetDB;
  lang: "en" | "vi";
}

export default function SchedulePage({ db, lang }: SchedulePageProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const [filters, setFilters] = useState({
    work: true,
    personal: true,
    meeting: true,
    ai_agent: true,
    other: true
  });

  const monthNamesEn = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const monthNamesVi = ["Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6", "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"];

  const handlePrevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const handleToday = () => setCurrentDate(new Date());

  const toggleFilter = (key: keyof typeof filters) => {
    setFilters(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const clearFilters = () => {
    setFilters({ work: false, personal: false, meeting: false, ai_agent: false, other: false });
  };

  const events = db.schedule || [];

  const getEventBlockStyle = (category: string) => {
    switch (category) {
      case 'work': return "bg-[#064e3b] border-l-2 border-[#10B981]"; 
      case 'personal': return "bg-[#164e63] border-l-2 border-[#06b6d4]"; 
      case 'meeting': return "bg-[#7c2d12] border-l-2 border-[#f97316]"; 
      case 'ai_agent': return "bg-[#4c1d95] border-l-2 border-[#a855f7]"; 
      default: return "bg-[#3f3f46] border-l-2 border-[#a1a1aa]"; 
    }
  };

  const actualToday = new Date();
  const todayStr = `${actualToday.getFullYear()}-${String(actualToday.getMonth() + 1).padStart(2, '0')}-${String(actualToday.getDate()).padStart(2, '0')}`;

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const startingDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1; 
  const prevMonthDays = new Date(year, month, 0).getDate();

  const calendarCells = [];
  
  for (let i = 0; i < startingDay; i++) {
    const day = prevMonthDays - startingDay + i + 1;
    calendarCells.push({ day, isCurrentMonth: false, dateStr: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}` });
  }
  
  for (let i = 1; i <= daysInMonth; i++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
    calendarCells.push({ day: i, isCurrentMonth: true, dateStr });
  }
  
  const remainingCells = (7 - (calendarCells.length % 7)) % 7;
  for (let i = 1; i <= remainingCells; i++) {
    calendarCells.push({ day: i, isCurrentMonth: false, dateStr: `${year}-${String(month + 2).padStart(2, '0')}-${String(i).padStart(2, '0')}` });
  }

  const filteredEvents = events.filter(e => filters[e.category as keyof typeof filters]);
  const totalEvents = filteredEvents.length;
  const completedEvents = filteredEvents.filter(e => e.status === 'done').length;

  return (
    <div className="w-full h-full flex flex-col font-sans bg-transparent text-[#F5F7FA] pt-2">
      <div className="flex flex-1 gap-3 pb-4 min-h-0">
        
        {/* Left Column (Sidebar Mini Calendar) */}
        <div className="w-[260px] shrink-0 flex flex-col gap-2.5">
          
          {/* Mini Calendar Card */}
          <div className="bg-[#0E1318] border border-[rgba(255,255,255,0.08)] rounded-[12px] px-3.5 py-2.5 relative shrink-0">
            <div className="flex items-center justify-between mb-2">
              <div className="h-[32px] flex items-center space-x-1.5 cursor-pointer group bg-[#161C24] border border-[rgba(255,255,255,0.05)] rounded-[6px] px-3 hover:bg-[#1f2937] transition">
                <h3 className="text-[12px] font-bold text-[#F5F7FA] whitespace-nowrap tracking-wide">
                  {lang === 'en' ? `${monthNamesEn[month]} ${year}` : `${monthNamesVi[month]}, ${year}`}
                </h3>
                <ChevronDown className="w-3.5 h-3.5 text-[#8B949E] group-hover:text-white transition" />
              </div>
              <div className="flex space-x-1 text-[#8B949E]">
                <button onClick={handlePrevMonth} className="hover:text-white transition w-[32px] h-[32px] flex items-center justify-center rounded-[6px] bg-[#161C24] border border-[rgba(255,255,255,0.05)] hover:bg-[#1f2937]">
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button onClick={handleNextMonth} className="hover:text-white transition w-[32px] h-[32px] flex items-center justify-center rounded-[6px] bg-[#161C24] border border-[rgba(255,255,255,0.05)] hover:bg-[#1f2937]">
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-7 text-center mb-2">
              {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(d => (
                <div key={d} className="text-[10px] font-mono text-[#8B949E] uppercase">{d}</div>
              ))}
            </div>
            
            <div className="grid grid-cols-7 gap-y-0.5 text-center">
              {calendarCells.slice(0, 42).map((c, idx) => {
                const dayEventsForCell = events.filter(e => e.date === c.dateStr);
                const firstEvent = dayEventsForCell.length > 0 ? dayEventsForCell[0] : null;
                
                let bgClass = "text-[#8B949E] hover:bg-[#1f2937] hover:text-white";
                if (c.dateStr === todayStr) {
                  bgClass = "bg-[#f97316] text-[#050809] font-bold";
                } else if (firstEvent) {
                  if (firstEvent.category === 'work') bgClass = "bg-[#10B981] text-[#050809] font-bold";
                  else if (firstEvent.category === 'personal') bgClass = "bg-[#06b6d4] text-[#050809] font-bold";
                  else if (firstEvent.category === 'meeting') bgClass = "bg-[#f97316] text-[#050809] font-bold";
                  else if (firstEvent.category === 'ai_agent') bgClass = "bg-[#a855f7] text-[#050809] font-bold";
                  else bgClass = "bg-[#8B949E] text-[#050809] font-bold";
                }
                
                return (
                  <div key={idx} className="flex flex-col items-center justify-start relative h-[28px] cursor-pointer group">
                    <div className={`w-[24px] h-[24px] mx-auto flex items-center justify-center rounded-full text-[12px] font-sans transition-all ${bgClass}`}>
                      {c.day}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Filters */}
          <div className="bg-[#0E1318] border border-[rgba(255,255,255,0.08)] rounded-[12px] p-2 shrink-0 flex flex-col gap-1">
            <h3 className="text-[9px] font-bold text-[#8B949E] uppercase tracking-widest mb-0.5">
              {lang === "en" ? "FILTERS" : "BỘ LỌC LỊCH"}
            </h3>
            
            {[
              { key: 'work', label: lang === 'en' ? 'Work' : 'Công việc' },
              { key: 'personal', label: lang === 'en' ? 'Personal' : 'Cá nhân' },
              { key: 'meeting', label: lang === 'en' ? 'Meeting' : 'Cuộc họp' },
              { key: 'ai_agent', label: lang === 'en' ? 'AI Agent' : 'AI Agent' }
            ].map(f => (
              <label key={f.key} onClick={() => toggleFilter(f.key as any)} className="flex items-center group cursor-pointer py-0.5">
                <div className={`w-3.5 h-3.5 rounded-[3px] flex items-center justify-center transition-colors ${
                  filters[f.key as keyof typeof filters] 
                    ? `bg-[#10B981] text-black` 
                    : 'border border-[rgba(255,255,255,0.2)] bg-transparent'
                }`}>
                  {filters[f.key as keyof typeof filters] && <Check className="w-2.5 h-2.5" strokeWidth={3} />}
                </div>
                <span className="ml-2 text-[11px] font-sans text-[#F5F7FA] group-hover:text-white transition-colors">
                  {f.label}
                </span>
              </label>
            ))}
          </div>

          {/* Categories */}
          <div className="bg-[#0E1318] border border-[rgba(255,255,255,0.08)] rounded-[12px] p-2 shrink-0 flex flex-col gap-1">
            <h3 className="text-[9px] font-bold text-[#8B949E] uppercase tracking-widest mb-0.5">
              {lang === "en" ? "CATEGORIES" : "DANH MỤC"}
            </h3>
            
            {[
              { key: 'work', label: lang === 'en' ? 'Work' : 'Công việc', color: 'bg-[#10B981]' },
              { key: 'personal', label: lang === 'en' ? 'Personal' : 'Cá nhân', color: 'bg-[#06b6d4]' },
              { key: 'meeting', label: lang === 'en' ? 'Meeting / Event' : 'Họp / Sự kiện', color: 'bg-[#f97316]' },
              { key: 'ai_agent', label: lang === 'en' ? 'AI Agent' : 'AI Agent', color: 'bg-[#a855f7]' },
              { key: 'other', label: lang === 'en' ? 'Other' : 'Khác', color: 'bg-[#8B949E]' }
            ].map(f => {
              const count = events.filter(e => e.category === f.key).length;
              return (
                <div key={f.key} className="flex items-center justify-between py-0.5">
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${f.color}`}></div>
                    <span className="text-[#F5F7FA] text-[11px]">{f.label}</span>
                  </div>
                  <span className="text-[#8B949E] text-[10px]">{count}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right Area (Main Calendar Grid) */}
        <div className="flex-1 flex flex-col bg-[#0E1318] border border-[rgba(255,255,255,0.08)] rounded-[12px] shadow-lg relative">
          
          {/* Main Grid Header */}
          <div className="flex items-center justify-between px-5 py-2 border-b border-[rgba(255,255,255,0.08)] bg-[#0E1318]">
            <h2 className="text-[15px] font-bold text-[#F5F7FA] tracking-wide whitespace-nowrap">
              {lang === 'en' ? `${monthNamesEn[month]} ${year}` : `${monthNamesVi[month]}, ${year}`}
            </h2>
            
            <div className="flex items-center gap-2">
              <button onClick={handleToday} className="h-[32px] px-3 border border-[rgba(255,255,255,0.08)] bg-[#161C24] hover:bg-[#1f2937] rounded-[6px] text-[12px] font-medium text-[#F5F7FA] transition flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#8B949E]" />
                {lang === "en" ? "Today" : "Hôm nay"}
              </button>
              
              <div className="flex items-center gap-1 ml-1 mr-1">
                <button onClick={handlePrevMonth} className="w-[32px] h-[32px] border border-[rgba(255,255,255,0.08)] bg-[#161C24] hover:bg-[#1f2937] rounded-[6px] transition flex items-center justify-center shrink-0">
                  <ChevronLeft className="w-3.5 h-3.5 text-[#8B949E]" />
                </button>
                <button onClick={handleNextMonth} className="w-[32px] h-[32px] border border-[rgba(255,255,255,0.08)] bg-[#161C24] hover:bg-[#1f2937] rounded-[6px] transition flex items-center justify-center shrink-0">
                  <ChevronRight className="w-3.5 h-3.5 text-[#8B949E]" />
                </button>
              </div>

              <button className="h-[32px] px-4 bg-[#10B981] hover:bg-[#0ea5e9] text-[#050809] font-bold text-[12px] rounded-[6px] transition flex items-center gap-1.5 shrink-0 shadow-sm ml-2">
                <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
                {lang === "en" ? "New Event" : "Tạo lịch mới"}
              </button>
            </div>
          </div>

          {/* Grid Layout Header */}
          <div className="grid grid-cols-7 border-b border-[rgba(255,255,255,0.08)] bg-[#0E1318]">
            {['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ Nhật'].map((d, i) => (
              <div key={i} className="py-1 text-center text-[10px] font-sans font-medium text-[#8B949E] uppercase tracking-wider border-r border-[rgba(255,255,255,0.08)] last:border-0">
                {lang === 'en' ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i] : d}
              </div>
            ))}
          </div>

          {/* Grid Cells */}
          <div className="flex-1 grid grid-cols-7 grid-rows-[repeat(5,1fr)] min-h-0 bg-[#050809]">
            {calendarCells.slice(0, 35).map((cell, idx) => {
              const dayEvents = filteredEvents.filter(e => e.date === cell.dateStr);
              
              return (
                <div key={idx} className={`border-b border-r border-[rgba(255,255,255,0.08)] flex flex-col transition-colors p-1 overflow-hidden ${
                  cell.dateStr === todayStr ? 'bg-[#f97316]/15' : 'hover:bg-white/[0.02]'
                }`}>
                  <div className={`text-center py-0.5 text-[11px] font-bold ${
                    cell.dateStr === todayStr
                      ? 'text-[#f97316]'
                      : !cell.isCurrentMonth 
                        ? 'text-[#8B949E] opacity-50' 
                        : 'text-[#F5F7FA]'
                  }`}>
                    {cell.dateStr === todayStr ? (lang === 'en' ? 'Today' : 'Hôm nay') : cell.day}
                  </div>
                  
                  <div className="flex-1 flex flex-col gap-[2px] overflow-hidden">
                    {dayEvents.slice(0, 3).map((ev, i) => (
                      <div 
                        key={ev.id} 
                        className={`w-full px-1.5 py-0.5 text-left cursor-pointer rounded-[4px] flex flex-col justify-center min-h-[22px] ${getEventBlockStyle(ev.category)}`}
                        title={ev.title}
                      >
                        <div className="font-semibold text-[9px] text-[#F5F7FA] truncate leading-tight">{ev.title}</div>
                        <div className="hidden"></div>
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="text-[11px] text-[#8B949E] text-center py-0.5 cursor-pointer hover:text-white transition">
                        +{dayEvents.length - 3} {lang === 'en' ? 'more' : 'thêm'}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Footer Legend */}
          <div className="px-6 py-3.5 bg-[#0E1318] border-t border-[rgba(255,255,255,0.08)] flex justify-between items-center shrink-0">
            <div className="flex items-center space-x-6 text-[12px] font-sans text-[#8B949E]">
              <div className="flex items-center space-x-2">
                <div className="w-2.5 h-2.5 rounded-full bg-[#10B981]"></div>
                <span>{lang === 'en' ? 'Work' : 'Công việc'}</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2.5 h-2.5 rounded-full bg-[#06b6d4]"></div>
                <span>{lang === 'en' ? 'Personal' : 'Cá nhân'}</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2.5 h-2.5 rounded-full bg-[#f97316]"></div>
                <span>{lang === 'en' ? 'Meeting / Event' : 'Họp / Sự kiện'}</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2.5 h-2.5 rounded-full bg-[#a855f7]"></div>
                <span>AI Agent</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2.5 h-2.5 rounded-full bg-[#8B949E]"></div>
                <span>{lang === 'en' ? 'Other' : 'Khác'}</span>
              </div>
            </div>

            <div className="flex items-center space-x-8 text-[12px] font-sans">
              <div className="flex items-center space-x-2.5">
                <span className="text-[#8B949E]">{lang === 'en' ? 'Total Events' : 'Tổng sự kiện'}</span>
                <span className="text-[#10B981] font-bold text-[14px]">{totalEvents}</span>
              </div>
              <div className="flex items-center space-x-2.5">
                <span className="text-[#8B949E]">{lang === 'en' ? 'Completed' : 'Đã hoàn thành'}</span>
                <span className="text-[#10B981] font-bold text-[14px]">{completedEvents}</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
