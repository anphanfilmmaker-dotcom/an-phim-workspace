import React, { useState } from "react";
import { GoogleSheetDB, CalendarEvent } from "../types";
import { Calendar as CalendarIcon, Clock, ChevronLeft, ChevronRight, Filter, Plus, ChevronDown, Check, Trash2, Pencil } from "lucide-react";
import NewEventModal from "./NewEventModal";

interface SchedulePageProps {
  db: GoogleSheetDB;
  lang: "en" | "vi";
  onAddEvent?: (event: CalendarEvent) => void;
  onDeleteEvent?: (eventId: string) => void;
  onEditEvent?: (event: CalendarEvent) => void;
  globalCurrentDate: Date;
  setGlobalCurrentDate: (d: Date) => void;
  globalSelectedDateStr: string;
  setGlobalSelectedDateStr: (s: string) => void;
}

export default function SchedulePage({ db, lang, onAddEvent, onDeleteEvent, onEditEvent, globalCurrentDate, setGlobalCurrentDate, globalSelectedDateStr, setGlobalSelectedDateStr }: SchedulePageProps) {
  const [isNewEventModalOpen, setIsNewEventModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const [filters, setFilters] = useState({
    work: true,
    personal: true,
    meeting: true,
    ai_agent: true,
    other: true
  });

  const monthNamesEn = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const monthNamesVi = ["Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6", "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"];

  const handlePrevMonth = () => setGlobalCurrentDate(new Date(globalCurrentDate.getFullYear(), globalCurrentDate.getMonth() - 1, 1));
  const handleNextMonth = () => setGlobalCurrentDate(new Date(globalCurrentDate.getFullYear(), globalCurrentDate.getMonth() + 1, 1));
  const handleToday = () => setGlobalCurrentDate(new Date());

  const handleDrop = (eventId: string, targetDateStr: string) => {
    if (!onEditEvent) return;
    const eventToMove = db.schedule.find(e => e.id === eventId);
    if (eventToMove && eventToMove.date !== targetDateStr) {
      onEditEvent({ ...eventToMove, date: targetDateStr });
      if (selectedEvent && selectedEvent.id === eventId) {
        setSelectedEvent({ ...eventToMove, date: targetDateStr });
      }
    }
  };

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

  const year = globalCurrentDate.getFullYear();
  const month = globalCurrentDate.getMonth();
  const daysInMonth = new Date(globalCurrentDate.getFullYear(), globalCurrentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(globalCurrentDate.getFullYear(), globalCurrentDate.getMonth(), 1).getDay();
  const startingDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
  const prevMonthDays = new Date(year, month, 0).getDate();

  const calendarCells = [];

  for (let i = 0; i < startingDay; i++) {
    const day = prevMonthDays - startingDay + i + 1;
    calendarCells.push({ day, isCurrentMonth: false, dateStr: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}` });
  }

  for (let i = 1; i <= daysInMonth; i++) {
    const dateStr = `${globalCurrentDate.getFullYear()}-${String(globalCurrentDate.getMonth() + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
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

        {/* Left Area (Main Calendar Grid) */}
        <div className="flex-1 flex flex-col bg-[#0E1318] border border-[rgba(255,255,255,0.08)] rounded-[12px] shadow-lg relative">

          {/* Main Grid Header */}
          <div className="flex items-center justify-between px-5 py-2 border-b border-[rgba(255,255,255,0.08)] bg-[#0E1318]">
            <h1 className="text-[20px] font-sans font-bold text-[#F5F7FA]">
              {lang === 'en' ? `${monthNamesEn[globalCurrentDate.getMonth()]} ${globalCurrentDate.getFullYear()}` : `${monthNamesVi[globalCurrentDate.getMonth()]}, ${globalCurrentDate.getFullYear()}`}
            </h1>

            <div className="flex items-center gap-2">
              <div className="relative">
                <button
                  onClick={() => setIsFilterOpen(!isFilterOpen)}
                  className="h-[32px] px-3 border border-[rgba(255,255,255,0.08)] bg-[#161C24] hover:bg-[#1f2937] rounded-[6px] text-[12px] font-medium text-[#F5F7FA] transition flex items-center gap-1.5"
                >
                  <Filter className="w-3.5 h-3.5 text-[#8B949E]" />
                  {lang === "en" ? "Filters" : "Bộ lọc"}
                </button>
                {isFilterOpen && (
                  <div className="absolute top-full right-0 mt-1.5 w-48 bg-[#161C24] border border-[rgba(255,255,255,0.08)] rounded-[8px] p-2 shadow-xl z-50 flex flex-col gap-1">
                    {[
                      { key: 'work', label: lang === 'en' ? 'Work' : 'Công việc' },
                      { key: 'personal', label: lang === 'en' ? 'Personal' : 'Cá nhân' },
                      { key: 'meeting', label: lang === 'en' ? 'Meeting' : 'Cuộc họp' },
                      { key: 'ai_agent', label: lang === 'en' ? 'AI Agent' : 'AI Agent' }
                    ].map(f => (
                      <label key={f.key} onClick={() => toggleFilter(f.key as any)} className="flex items-center group cursor-pointer py-1.5 px-2 hover:bg-[#1f2937] rounded-[4px] transition-colors">
                        <div className={`w-3.5 h-3.5 rounded-[3px] flex items-center justify-center transition-colors shrink-0 ${filters[f.key as keyof typeof filters]
                            ? `bg-[#10B981] text-black`
                            : 'border border-[rgba(255,255,255,0.2)] bg-transparent'
                          }`}>
                          {filters[f.key as keyof typeof filters] && <Check className="w-2.5 h-2.5" strokeWidth={3} />}
                        </div>
                        <span className="ml-2.5 text-[11px] font-sans text-[#F5F7FA] group-hover:text-white transition-colors">
                          {f.label}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

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

              <button
                onClick={() => {
                  setIsEditMode(false);
                  setIsNewEventModalOpen(true);
                }}
                className="h-[32px] px-3 bg-[#10B981] hover:bg-[#059669] rounded-[6px] text-[#050809] text-[12px] font-bold transition flex items-center gap-1 shadow-[0_4px_12px_rgba(16,185,129,0.3)]"
              >
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
            {calendarCells.slice(0, 35).map((cell, index) => {
              const dayEvents = filteredEvents.filter(e => e.date === cell.dateStr);
              const isSelected = cell.dateStr === globalSelectedDateStr;

              return (
                <div
                  key={index}
                  onClick={() => {
                    if (cell.day) setGlobalSelectedDateStr(cell.dateStr);
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const eventId = e.dataTransfer.getData('eventId');
                    if (eventId) handleDrop(eventId, cell.dateStr);
                  }}
                  className={`border-b border-r border-[rgba(255,255,255,0.08)] flex flex-col transition-colors p-1 overflow-hidden ${cell.dateStr === todayStr ? 'bg-[#f97316]/15' : 'hover:bg-white/[0.02]'
                    } ${isSelected ? 'ring-2 ring-inset ring-[#10B981]' : ''}`}
                >
                  <div className={`text-center py-0.5 text-[11px] font-bold ${cell.dateStr === todayStr
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
                        draggable={true}
                        onDragStart={(e) => e.dataTransfer.setData('eventId', ev.id)}
                        onClick={(e) => {
                          e.stopPropagation();
                          setGlobalSelectedDateStr(ev.date);
                          setSelectedEvent(ev);
                        }}
                        className={`w-full px-1.5 py-0.5 text-left cursor-pointer rounded-[4px] flex flex-col justify-center min-h-[22px] ${getEventBlockStyle(ev.category)} ${ev.status === 'done' ? 'opacity-40 hover:opacity-50 line-through' : 'hover:opacity-80'} transition-opacity active:cursor-grabbing cursor-grab`}
                        title={ev.title}
                      >
                        <div className="font-semibold text-[9px] text-[#F5F7FA] truncate leading-tight">{ev.title}</div>
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
          <div className="px-4 py-3 bg-[#0E1318] border-t border-[rgba(255,255,255,0.08)] flex justify-between items-center shrink-0 min-w-0 overflow-x-auto custom-thin-scroll">
            <div className="flex items-center space-x-4 text-[10px] font-sans text-[#8B949E] min-w-0 pr-4">
              {[
                { key: 'work', label: lang === 'en' ? 'Work' : 'Công việc', color: 'bg-[#10B981]' },
                { key: 'personal', label: lang === 'en' ? 'Personal' : 'Cá nhân', color: 'bg-[#06b6d4]' },
                { key: 'meeting', label: lang === 'en' ? 'Meeting' : 'Họp/Sự kiện', color: 'bg-[#f97316]' },
                { key: 'ai_agent', label: lang === 'en' ? 'AI Agent' : 'AI Agent', color: 'bg-[#a855f7]' },
                { key: 'other', label: lang === 'en' ? 'Other' : 'Khác', color: 'bg-[#8B949E]' }
              ].map(f => {
                const count = events.filter(e => e.category === f.key).length;
                return (
                  <div key={f.key} className="flex items-center space-x-1.5 whitespace-nowrap">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${f.color}`}></div>
                    <span>{f.label}</span>
                    <span className="text-[#F5F7FA] font-bold ml-0.5">{count}</span>
                  </div>
                )
              })}
            </div>

            <div className="flex items-center space-x-4 text-[10px] font-sans whitespace-nowrap shrink-0 border-l border-[rgba(255,255,255,0.08)] pl-4">
              <div className="flex items-center space-x-1.5">
                <span className="text-[#8B949E]">{lang === 'en' ? 'Total' : 'Tổng sự kiện'}</span>
                <span className="text-[#10B981] font-bold text-[12px]">{totalEvents}</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="text-[#8B949E]">{lang === 'en' ? 'Done' : 'Đã xong'}</span>
                <span className="text-[#10B981] font-bold text-[12px]">{completedEvents}</span>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column (Sidebar Mini Calendar) */}
        <div className="w-[260px] shrink-0 flex flex-col gap-2.5">

          {/* Mini Calendar Card */}
          <div className="bg-[#0E1318] border border-[rgba(255,255,255,0.08)] rounded-[12px] px-3.5 py-2.5 relative shrink-0">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                {/* Month Dropdown */}
                <div className="relative h-[32px] flex items-center bg-[#161C24] border border-[rgba(255,255,255,0.05)] rounded-[6px] hover:bg-[#1f2937] transition">
                  <select
                    value={month}
                    onChange={(e) => setGlobalCurrentDate(new Date(year, parseInt(e.target.value, 10), 1))}
                    className="appearance-none bg-transparent text-[#F5F7FA] text-[12px] font-bold px-2.5 pr-6 h-full outline-none cursor-pointer"
                    style={{ colorScheme: 'dark' }}
                  >
                    {(lang === 'en' ? monthNamesEn : monthNamesVi).map((mName, idx) => (
                      <option key={idx} value={idx} className="bg-[#161C24] text-[#F5F7FA] text-[12px] py-1">{mName}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-3 h-3 text-[#8B949E] absolute right-2 pointer-events-none" />
                </div>

                {/* Year Dropdown */}
                <div className="relative h-[32px] flex items-center bg-[#161C24] border border-[rgba(255,255,255,0.05)] rounded-[6px] hover:bg-[#1f2937] transition">
                  <select
                    value={year}
                    onChange={(e) => setGlobalCurrentDate(new Date(parseInt(e.target.value, 10), month, 1))}
                    className="appearance-none bg-transparent text-[#F5F7FA] text-[12px] font-bold px-2.5 pr-6 h-full outline-none cursor-pointer"
                    style={{ colorScheme: 'dark' }}
                  >
                    {Array.from({ length: 11 }).map((_, i) => {
                      const y = year - 5 + i;
                      return <option key={y} value={y} className="bg-[#161C24] text-[#F5F7FA] text-[12px] py-1">{y}</option>;
                    })}
                  </select>
                  <ChevronDown className="w-3 h-3 text-[#8B949E] absolute right-2 pointer-events-none" />
                </div>
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
                const isSelected = c.dateStr === globalSelectedDateStr;
                if (isSelected) {
                  bgClass += " ring-[1.5px] ring-white ring-offset-1 ring-offset-[#0E1318]";
                }

                return (
                  <div key={idx} className="flex flex-col items-center justify-start relative h-[28px] cursor-pointer group" onClick={() => { if (c.day) setGlobalSelectedDateStr(c.dateStr) }}>
                    <div className={`w-[24px] h-[24px] mx-auto flex items-center justify-center rounded-full text-[12px] font-sans transition-all ${bgClass}`}>
                      {c.day}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Event Details */}
          <div className="bg-[#0E1318] border border-[rgba(255,255,255,0.08)] rounded-[12px] p-3 flex-1 min-h-[150px] flex flex-col shrink-0 overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between mb-2 shrink-0">
              <h3 className="text-[9px] font-bold text-[#8B949E] uppercase tracking-widest mb-0">
                {lang === "en" ? "EVENT DETAILS" : "CHI TIẾT SỰ KIỆN"}
              </h3>
            </div>
            {(() => {
              const activeDateStr = globalSelectedDateStr || todayStr;
              const dayEvents = filteredEvents.filter(e => e.date === activeDateStr);

              if (dayEvents.length === 0) {
                return (
                  <div className="flex-1 flex flex-col items-center justify-center text-[10px] text-[#8B949E] p-4 border border-dashed border-[#1e2329] rounded-[8px]">
                    <CalendarIcon className="w-6 h-6 mb-2 opacity-20" />
                    <span className="text-center italic px-2">
                      {lang === "en" ? "No events scheduled for this day." : "Không có sự kiện nào trong ngày này."}
                    </span>
                  </div>
                );
              }

              return (
                <div className="flex flex-col gap-2.5">
                  <div className="text-[10px] text-[#F5F7FA] font-bold mb-1 pb-1 border-b border-[rgba(255,255,255,0.05)]">
                    {activeDateStr}
                  </div>
                  {dayEvents.map(event => {
                    const isExpanded = dayEvents.length === 1 || selectedEvent?.id === event.id;
                    return (
                      <div
                        key={event.id}
                        onClick={() => setSelectedEvent(isExpanded && dayEvents.length > 1 ? null : event)}
                        className={`flex flex-col gap-2 relative bg-[#161C24] p-2.5 rounded-[8px] border ${isExpanded ? 'border-[rgba(255,255,255,0.15)]' : 'border-[rgba(255,255,255,0.05)]'} hover:border-[rgba(255,255,255,0.1)] transition-colors group cursor-pointer`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 pr-12">
                            <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${event.category === 'work' ? 'bg-[#10B981]' :
                                event.category === 'personal' ? 'bg-[#06b6d4]' :
                                  event.category === 'meeting' ? 'bg-[#f97316]' :
                                    event.category === 'ai_agent' ? 'bg-[#a855f7]' : 'bg-[#8B949E]'
                              }`} />
                            <h4 className="text-[#F5F7FA] text-[12px] font-bold leading-tight">{event.title}</h4>
                          </div>

                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity absolute top-2 right-2">
                            {onEditEvent && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedEvent(event);
                                  setIsEditMode(true);
                                  setIsNewEventModalOpen(true);
                                }}
                                className="p-1 text-blue-500/60 hover:text-blue-500 hover:bg-blue-500/10 rounded transition-colors"
                                title={lang === "en" ? "Edit Event" : "Chỉnh sửa sự kiện"}
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                            )}
                            {onDeleteEvent && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (window.confirm(lang === 'en' ? 'Are you sure you want to delete this event?' : 'Bạn có chắc chắn muốn xóa sự kiện này?')) {
                                    onDeleteEvent(event.id);
                                    if (selectedEvent?.id === event.id) setSelectedEvent(null);
                                  }
                                }}
                                className="p-1 text-orange-500/60 hover:text-orange-500 hover:bg-orange-500/10 rounded transition-colors"
                                title={lang === "en" ? "Delete Event" : "Xóa sự kiện"}
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-[#8B949E] mt-0.5">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-2.5 h-2.5 shrink-0" />
                            <span>{event.startTime}{event.endTime ? ` - ${event.endTime}` : ''}</span>
                          </div>
                          {!isExpanded && (
                            <div className="flex items-center gap-1.5">
                              <span className={`capitalize ${event.priority === 'high' ? 'text-red-400' :
                                  event.priority === 'medium' ? 'text-orange-400' : 'text-blue-400'
                                }`}>
                                {event.priority}
                              </span>
                              <span className="text-[8px]">•</span>
                              <span className="capitalize">
                                {event.status === 'done' ? (lang === 'en' ? 'Done' : 'Hoàn thành') :
                                  event.status === 'in_progress' ? (lang === 'en' ? 'Doing' : 'Đang làm') :
                                    (lang === 'en' ? 'Todo' : 'Chưa làm')}
                              </span>
                            </div>
                          )}
                        </div>

                        {isExpanded && (
                          <>
                            <div className="grid grid-cols-2 gap-2 text-[10px] mt-1 border-t border-[rgba(255,255,255,0.05)] pt-2">
                              <div>
                                <span className="text-[#8B949E] block mb-0.5">{lang === "en" ? "Status" : "Trạng thái"}</span>
                                <span className="text-[#F5F7FA] font-medium capitalize">
                                  {event.status === 'done' ? (lang === 'en' ? 'Completed' : 'Hoàn thành') :
                                    event.status === 'in_progress' ? (lang === 'en' ? 'In Progress' : 'Đang làm') :
                                      (lang === 'en' ? 'To Do' : 'Chưa làm')}
                                </span>
                              </div>
                              <div>
                                <span className="text-[#8B949E] block mb-0.5">{lang === "en" ? "Priority" : "Độ ưu tiên"}</span>
                                <span className={`font-bold capitalize ${event.priority === 'high' ? 'text-red-400' :
                                    event.priority === 'medium' ? 'text-orange-400' : 'text-blue-400'
                                  }`}>
                                  {event.priority}
                                </span>
                              </div>
                            </div>

                            {event.description && (
                              <div className="mt-1">
                                <span className="text-[#8B949E] text-[10px] block mb-1">{lang === "en" ? "Description" : "Mô tả"}</span>
                                <div className="text-[11px] text-[#F5F7FA] p-2 bg-[#0E1318] rounded-[6px] border border-[rgba(255,255,255,0.05)] whitespace-pre-wrap leading-relaxed max-h-[120px] overflow-y-auto overflow-x-hidden break-words custom-scrollbar">
                                  {event.description}
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )
                  })}
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      <NewEventModal
        isOpen={isNewEventModalOpen}
        onClose={() => {
          setIsNewEventModalOpen(false);
          setIsEditMode(false);
          setSelectedEvent(null);
        }}
        lang={lang}
        projects={db.projects}
        initialDate={globalSelectedDateStr}
        initialEvent={isEditMode ? selectedEvent : undefined}
        onSubmit={(data) => {
          if (isEditMode && selectedEvent && onEditEvent) {
            const updated = { ...selectedEvent, ...data };
            onEditEvent(updated);
            setSelectedEvent(updated);
          } else if (onAddEvent) {
            onAddEvent({
              ...data,
              id: `evt-${Date.now()}`,
              status: "todo"
            });
          }
        }}
      />
    </div>
  );
}
