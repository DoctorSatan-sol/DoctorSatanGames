import React from "react";
import "./FancyCheckbox.css";

type Props = {
  checked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  label?: string;
};

export const FancyCheckbox: React.FC<Props> = ({ checked, onChange, label }) => (
  <label className="fancy-checkbox">
    <input type="checkbox" checked={checked} onChange={onChange} />
    <span className="fancy-checkmark">
      <svg viewBox="0 0 20 20" className="checkmark-svg" aria-hidden="true">
        <rect x="2" y="2" width="16" height="16" rx="5" fill="url(#fancyGradient)" />
        <defs>
          <linearGradient id="fancyGradient" x1="0" y1="0" x2="20" y2="20" gradientUnits="userSpaceOnUse">
            <stop stopColor="#ff416c" />
            <stop offset="1" stopColor="#ff4b2b" />
          </linearGradient>
        </defs>
        {checked && (
          <polyline points="5,11 9,15 15,7" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        )}
      </svg>
    </span>
    {label && <span className="fancy-label">{label}</span>}
  </label>
);
