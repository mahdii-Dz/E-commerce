'use client';

import { useState, useEffect, useRef } from 'react';
import { ChevronDown, CheckCircle2, Loader } from 'lucide-react';

export default function CustomSelect({ value, onChange, options, isUpdating }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);
  const [pos, setPos] = useState(null);

  useEffect(() => {
    if (open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const estimatedH = Math.min(options.length * 42, 320);
      const dropdownW = Math.max(rect.width, 220);
      const top = (rect.bottom + 4 + estimatedH) > window.innerHeight
        ? rect.top - estimatedH - 4
        : rect.bottom + 4;
      const left = Math.max(4, Math.min(rect.left, window.innerWidth - dropdownW - 4));
      setPos({ top, left, width: rect.width });
    }
  }, [open, options.length]);

  const currentOption = options.find(o => String(o.value) === String(value));
  const currentColor = currentOption?.color || '#6B7280';
  const currentLabel = currentOption?.label || value;
  const Icon = currentOption?.icon;

  return (
    <div className="relative">
      <button
        ref={btnRef}
        onClick={() => !isUpdating && setOpen(true)}
        disabled={isUpdating}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-sm whitespace-nowrap transition-shadow hover:shadow-md"
        style={{
          backgroundColor: `${currentColor}15`,
          color: currentColor,
          borderColor: `${currentColor}40`,
          cursor: isUpdating ? 'wait' : 'pointer',
        }}
      >
        {isUpdating ? (
          <Loader size={14} className="animate-spin" />
        ) : Icon ? (
          <Icon size={14} />
        ) : null}
        <span>{currentLabel}</span>
        {!isUpdating && <ChevronDown size={12} className="opacity-60" />}
      </button>

      {open && pos && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="fixed z-50 bg-white rounded-xl border border-gray-200 shadow-xl py-1 overflow-y-auto"
            style={{ top: pos.top, left: pos.left, width: Math.max(pos.width, 220), maxHeight: 320 }}
          >
            {options.map(s => {
              const OptionIcon = s.icon;
              return (
                <button
                  key={s.value}
                  onClick={() => { onChange(s.value); setOpen(false); }}
                  className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-right hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors"
                >
                  {OptionIcon ? (
                    <OptionIcon size={16} style={{ color: s.color }} />
                  ) : null}
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                  <span className={String(value) === String(s.value) ? 'font-semibold' : ''} style={{ color: String(value) === String(s.value) ? s.color : '#374151' }}>
                    {s.label}
                  </span>
                  {String(value) === String(s.value) && <CheckCircle2 size={14} className="mr-auto" style={{ color: s.color }} />}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
