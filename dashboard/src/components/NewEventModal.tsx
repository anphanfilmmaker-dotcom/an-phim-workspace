import React, { useState, useEffect } from 'react';
import { X, Calendar as CalendarIcon, Clock, ChevronDown, Flag, User, Bell } from 'lucide-react';
import { Project } from '../types';

interface NewEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'en' | 'vi';
  projects?: Project[];
  onSubmit: (eventData: any) => void;
  initialEvent?: any;
  initialDate?: string;
}

export default function NewEventModal({ isOpen, onClose, lang, projects = [], onSubmit, initialEvent, initialDate }: NewEventModalProps) {
  const [eventName, setEventName] = useState('');
  const [date, setDate] = useState('2026-06-16');
  const [startTime, setStartTime] = useState('14:00');
  const [endTime, setEndTime] = useState('15:30');
  const [category, setCategory] = useState('meeting');
  const [priority, setPriority] = useState('high');
  const [owner, setOwner] = useState('An Phan');
  const [projectId, setProjectId] = useState('Galaxy Corp TVC');
  const [description, setDescription] = useState('');
  const [isAllDay, setIsAllDay] = useState(false);
  const [reminder, setReminder] = useState('15 phút');

  useEffect(() => {
    if (isOpen) {
      if (initialEvent) {
        setEventName(initialEvent.title || '');
        setDate(initialEvent.date || '');
        setStartTime(initialEvent.startTime || '');
        setEndTime(initialEvent.endTime || '');
        setCategory(initialEvent.category || 'meeting');
        setPriority(initialEvent.priority || 'medium');
        setOwner(initialEvent.owner || '');
        setProjectId(initialEvent.projectId || '');
        setDescription(initialEvent.description || '');
      } else {
        setEventName('');
        setDate(initialDate || '');
        setStartTime('');
        setEndTime('');
        setCategory('meeting');
        setPriority('medium');
        setOwner('');
        setProjectId('');
        setDescription('');
      }
    }
  }, [isOpen, initialEvent]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    onSubmit({
      title: eventName,
      date,
      startTime,
      endTime,
      category,
      priority,
      owner,
      projectId,
      description
    });
    onClose();
  };

  const inputClass = "w-full bg-[#111826] border border-[rgba(255,255,255,0.08)] rounded-[8px] px-3 py-1 text-[13px] text-[#F5F7FA] placeholder-[#8B949E]/50 focus:outline-none focus:border-[#f97316] focus:ring-1 focus:ring-[#f97316]/30 transition h-[34px] leading-normal";
  const selectClass = "w-full appearance-none bg-[#111826] border border-[rgba(255,255,255,0.08)] rounded-[8px] pl-8 pr-7 py-1 text-[13px] text-[#F5F7FA] focus:outline-none focus:border-[#f97316] focus:ring-1 focus:ring-[#f97316]/30 transition h-[34px] cursor-pointer leading-normal";
  const labelClass = "text-[12px] font-medium text-[#E2E8F0] flex items-center gap-1 mb-0.5";
  
  // Custom class to hide native date/time picker icon and make the whole input click-to-open
  const datePickerClass = "[&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer relative z-10 bg-transparent";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200 p-2 sm:p-4">
      <div className="bg-[#0B1220] border border-[rgba(255,255,255,0.08)] rounded-[16px] shadow-[0_10px_40px_rgba(0,0,0,0.5)] w-full max-w-[540px] flex flex-col font-sans overflow-hidden">
        
        {/* Header */}
        <div className="px-5 py-2.5 flex items-start justify-between border-b border-[rgba(255,255,255,0.05)]">
          <div className="flex items-center gap-3">
            <div className="w-[36px] h-[36px] rounded-[10px] bg-[#1a1412] border border-[#f97316]/30 flex items-center justify-center shrink-0">
              <CalendarIcon className="w-4 h-4 text-[#f97316]" strokeWidth={2} />
            </div>
            <div className="flex flex-col">
              <h2 className="text-[14px] font-bold text-[#F5F7FA] tracking-wide uppercase">
                {initialEvent 
                  ? (lang === 'en' ? 'Edit Event' : 'Chỉnh sửa sự kiện')
                  : (lang === 'en' ? 'Create New Event' : 'Tạo sự kiện mới')}
              </h2>
              <p className="text-[11px] text-[#8B949E]">
                {lang === 'en' ? 'Add work schedule, meeting or reminder' : 'Thêm lịch làm việc, cuộc họp hoặc nhắc việc'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-[#8B949E] hover:text-white transition p-1.5 hover:bg-white/5 rounded-full z-10 relative">
            <X className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>

        {/* Form Body */}
        <div className="px-5 py-3 flex flex-col gap-2.5 overflow-y-auto max-h-[75vh] custom-scrollbar">
          
          {/* Event Name */}
          <div>
            <label className={labelClass}>
              {lang === 'en' ? 'Event name' : 'Tên sự kiện'} <span className="text-[#ef4444]">*</span>
            </label>
            <input 
              type="text" 
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              placeholder={lang === 'en' ? 'e.g. Concept Review Meeting' : 'VD: Họp chốt concept TVC'}
              className={inputClass}
            />
          </div>

          {/* Date & Time Row */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="col-span-1 relative">
              <label className={labelClass}>
                {lang === 'en' ? 'Date' : 'Ngày'} <span className="text-[#ef4444]">*</span>
              </label>
              <div className="relative bg-[#111826] border border-[rgba(255,255,255,0.08)] rounded-[8px] h-[34px] focus-within:border-[#f97316] focus-within:ring-1 focus-within:ring-[#f97316]/30 transition overflow-hidden">
                <input 
                  type="date" 
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  style={{ colorScheme: 'dark' }}
                  className={`w-full h-full pl-8 pr-2 text-[13px] text-[#F5F7FA] focus:outline-none ${datePickerClass}`}
                />
                <CalendarIcon className="w-3.5 h-3.5 text-[#8B949E] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none z-0" />
              </div>
            </div>
            <div className="col-span-1 relative">
              <label className={labelClass}>
                {lang === 'en' ? 'Start time' : 'Giờ bắt đầu'} <span className="text-[#ef4444]">*</span>
              </label>
              <div className={`relative bg-[#111826] border border-[rgba(255,255,255,0.08)] rounded-[8px] h-[34px] transition overflow-hidden ${isAllDay ? 'opacity-50' : 'focus-within:border-[#f97316] focus-within:ring-1 focus-within:ring-[#f97316]/30'}`}>
                <input 
                  type="time" 
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  disabled={isAllDay}
                  style={{ colorScheme: 'dark' }}
                  className={`w-full h-full pl-8 pr-2 text-[13px] text-[#F5F7FA] focus:outline-none disabled:cursor-not-allowed ${datePickerClass}`}
                />
                <Clock className="w-3.5 h-3.5 text-[#8B949E] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none z-0" />
              </div>
            </div>
            <div className="col-span-1 relative">
              <label className={labelClass}>
                {lang === 'en' ? 'End time' : 'Giờ kết thúc'} <span className="text-[#ef4444]">*</span>
              </label>
              <div className={`relative bg-[#111826] border border-[rgba(255,255,255,0.08)] rounded-[8px] h-[34px] transition overflow-hidden ${isAllDay ? 'opacity-50' : 'focus-within:border-[#f97316] focus-within:ring-1 focus-within:ring-[#f97316]/30'}`}>
                <input 
                  type="time" 
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  disabled={isAllDay}
                  style={{ colorScheme: 'dark' }}
                  className={`w-full h-full pl-8 pr-2 text-[13px] text-[#F5F7FA] focus:outline-none disabled:cursor-not-allowed ${datePickerClass}`}
                />
                <Clock className="w-3.5 h-3.5 text-[#8B949E] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none z-0" />
              </div>
            </div>
          </div>

          {/* Category & Priority Row */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className={labelClass}>
                {lang === 'en' ? 'Category' : 'Danh mục'} <span className="text-[#ef4444]">*</span>
              </label>
              <div className="relative">
                <select 
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className={selectClass}
                >
                  <option value="meeting">{lang === 'en' ? 'Meeting / Event' : 'Họp / Sự kiện'}</option>
                  <option value="work">{lang === 'en' ? 'Work' : 'Công việc'}</option>
                  <option value="personal">{lang === 'en' ? 'Personal' : 'Cá nhân'}</option>
                  <option value="ai_agent">AI Agent</option>
                  <option value="other">{lang === 'en' ? 'Other' : 'Khác'}</option>
                </select>
                <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center">
                  <div className={`w-2.5 h-2.5 rounded-full ${
                    category === 'meeting' ? 'bg-[#f97316]' :
                    category === 'work' ? 'bg-[#10B981]' :
                    category === 'personal' ? 'bg-[#06b6d4]' :
                    category === 'ai_agent' ? 'bg-[#a855f7]' : 'bg-[#8B949E]'
                  }`}></div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-[#8B949E] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
            
            <div>
              <label className={labelClass}>
                {lang === 'en' ? 'Priority' : 'Mức độ ưu tiên'} <span className="text-[#ef4444]">*</span>
              </label>
              <div className="relative">
                <select 
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className={selectClass}
                >
                  <option value="high">{lang === 'en' ? 'High' : 'Cao'}</option>
                  <option value="medium">{lang === 'en' ? 'Medium' : 'Trung bình'}</option>
                  <option value="low">{lang === 'en' ? 'Low' : 'Thấp'}</option>
                </select>
                <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#ef4444] flex items-center justify-center">
                  <Flag className="w-3.5 h-3.5" />
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-[#8B949E] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Assignee & Project Row */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className={labelClass}>
                {lang === 'en' ? 'Assignee' : 'Người phụ trách'} <span className="text-[#ef4444]">*</span>
              </label>
              <div className="relative">
                <select 
                  value={owner}
                  onChange={(e) => setOwner(e.target.value)}
                  className={selectClass}
                >
                  <option value="">{lang === 'en' ? 'Select person' : 'Chọn người'}</option>
                  <option value="An Phan">An Phan</option>
                  <option value="Minh Đan">Minh Đan</option>
                  <option value="Trâm Anh">Trâm Anh</option>
                </select>
                <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none w-[16px] h-[16px] rounded-full bg-[#1F2937] overflow-hidden flex items-center justify-center border border-[rgba(255,255,255,0.1)]">
                  {/* Mock avatar */}
                  <img src="https://i.pravatar.cc/150?u=a042581f4e29026024d" alt="Avatar" className="w-full h-full object-cover" onError={(e) => e.currentTarget.style.display = 'none'} />
                  <User className="w-2.5 h-2.5 text-[#8B949E] absolute" />
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-[#8B949E] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className={labelClass}>
                {lang === 'en' ? 'Project' : 'Dự án'}
              </label>
              <div className="relative">
                <select 
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className={`${selectClass} pl-2.5`}
                >
                  <option value="">{lang === 'en' ? 'Select (optional)' : 'Chọn (tùy chọn)'}</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                  <option value="Galaxy Corp TVC">Galaxy Corp TVC</option>
                  <option value="Video CT1 - The Mar">Video CT1 - The Mar</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-[#8B949E] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className={labelClass}>
              {lang === 'en' ? 'Description / Notes' : 'Mô tả / ghi chú'}
            </label>
            <textarea 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={lang === 'en' ? 'Enter event details...' : 'Nhập chi tiết sự kiện...'}
              className="w-full bg-[#111826] border border-[rgba(255,255,255,0.08)] rounded-[8px] px-3 py-1.5 text-[13px] text-[#F5F7FA] placeholder-[#8B949E]/50 focus:outline-none focus:border-[#f97316] focus:ring-1 focus:ring-[#f97316]/30 transition min-h-[48px] resize-none leading-normal"
            />
          </div>

        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-[#0B1220] border-t border-[rgba(255,255,255,0.05)] flex flex-col gap-2.5">
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <label className="flex items-center gap-1.5 cursor-pointer group">
                <div className={`w-[14px] h-[14px] rounded-[3px] border ${isAllDay ? 'bg-[#10B981] border-[#10B981]' : 'border-[rgba(255,255,255,0.2)] bg-transparent'} flex items-center justify-center transition`}>
                  {isAllDay && <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                </div>
                <span className="text-[12px] text-[#8B949E] group-hover:text-white transition">
                  {lang === 'en' ? 'All day' : 'Cả ngày'}
                </span>
              </label>
              
              <div className="w-[1px] h-3 bg-[rgba(255,255,255,0.1)]"></div>

              <div className="flex items-center gap-1">
                <Bell className="w-[12px] h-[12px] text-[#8B949E]" />
                <span className="text-[12px] text-[#8B949E]">{lang === 'en' ? 'Remind' : 'Nhắc trước'}</span>
                <div className="relative ml-1 border border-[rgba(255,255,255,0.1)] bg-[#111826] rounded-[6px] px-2 py-1 flex items-center hover:border-[rgba(255,255,255,0.2)] transition">
                  <select 
                    value={reminder}
                    onChange={(e) => setReminder(e.target.value)}
                    className="appearance-none bg-transparent text-[11px] font-medium text-[#F5F7FA] pr-3.5 outline-none cursor-pointer"
                  >
                    <option className="bg-[#111826] text-white" value="15 phút">15 phút</option>
                    <option className="bg-[#111826] text-white" value="30 phút">30 phút</option>
                    <option className="bg-[#111826] text-white" value="1 giờ">1 giờ</option>
                  </select>
                  <ChevronDown className="w-2.5 h-2.5 text-[#8B949E] absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Colors */}
            <div className="flex items-center gap-1.5">
              {['work', 'personal', 'meeting', 'ai_agent', 'other'].map(cat => {
                const colors: Record<string, string> = {
                  work: 'bg-[#10B981]',
                  personal: 'bg-[#06b6d4]',
                  meeting: 'bg-[#f97316]',
                  ai_agent: 'bg-[#a855f7]',
                  other: 'bg-[#8B949E]'
                };
                const isSelected = category === cat;
                return (
                  <div 
                    key={cat}
                    onClick={() => setCategory(cat)}
                    className={`w-[18px] h-[18px] rounded-full cursor-pointer flex items-center justify-center transition-all ${
                      isSelected ? 'ring-1 ring-white ring-offset-[1.5px] ring-offset-[#0B1220]' : 'hover:scale-110 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <div className={`w-[10px] h-[10px] rounded-full ${colors[cat]}`}></div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2.5 border-t border-[rgba(255,255,255,0.05)]">
            <button 
              onClick={onClose}
              className="px-5 py-1.5 rounded-[6px] text-[12px] font-medium text-[#E2E8F0] bg-[#111826] border border-[rgba(255,255,255,0.08)] hover:bg-white/5 transition w-full sm:w-auto text-center"
            >
              {lang === 'en' ? 'Cancel' : 'Huỷ'}
            </button>
            <button 
              onClick={handleSubmit}
              className="px-5 py-1.5 rounded-[6px] bg-[#10B981] hover:bg-[#059669] text-[#050809] text-[13px] font-bold transition flex items-center justify-center gap-1 shadow-[0_4px_12px_rgba(16,185,129,0.3)] w-full sm:w-auto"
            >
              {!initialEvent && <span className="text-[14px] leading-none mb-[1px]">+</span>}
              {initialEvent 
                ? (lang === 'en' ? 'Save' : 'Lưu')
                : (lang === 'en' ? 'Create Event' : 'Tạo sự kiện')}
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
