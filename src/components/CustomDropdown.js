import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

function CustomDropdown({
  label,
  value,
  options,
  onChange,
  disabled = false,
  placeholder = 'Select...',
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const selected = options.find((o) => o.value === value);
  const displayLabel = selected ? selected.label : placeholder;

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  const handleSelect = (optionValue) => {
    onChange(optionValue);
    setOpen(false);
  };

  return (
    <div className={`custom-dropdown${disabled ? ' is-disabled' : ''}`} ref={ref}>
      {label && <label className="form-label">{label}</label>}
      <button
        type="button"
        className={`custom-dropdown-trigger${open ? ' is-open' : ''}`}
        onClick={() => !disabled && setOpen((o) => !o)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={`custom-dropdown-value${!selected ? ' is-placeholder' : ''}`}>
          {displayLabel}
        </span>
        <ChevronDown className="custom-dropdown-chevron" size={18} strokeWidth={2} />
      </button>
      <div className={`custom-dropdown-menu${open ? ' is-open' : ''}`} role="listbox">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            role="option"
            aria-selected={option.value === value}
            className={`custom-dropdown-item${option.value === value ? ' is-selected' : ''}`}
            onClick={() => handleSelect(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default CustomDropdown;
