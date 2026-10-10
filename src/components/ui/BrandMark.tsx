import React from 'react';

export const BrandMark: React.FC<{ className?: string }> = ({ className = 'h-8 w-8' }) => (
  <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
    <defs>
      <linearGradient id="tg-mark-fill" x1="4" y1="2" x2="28" y2="30" gradientUnits="userSpaceOnUse">
        <stop stopColor="#29E9BF" stopOpacity="0.22" />
        <stop offset="1" stopColor="#245A4D" stopOpacity="0.05" />
      </linearGradient>
    </defs>
    <rect x="0.5" y="0.5" width="31" height="31" rx="9.5" fill="url(#tg-mark-fill)" stroke="#29E9BF" strokeOpacity="0.35" />
    <path d="M10 11.5 16 8l6 3.5v9L16 24l-6-3.5v-9Z" stroke="#29E9BF" strokeWidth="1.5" strokeLinejoin="round" />
    <path d="M16 8v7.5m0 0 6-4m-6 4-6-4M16 15.5V24" stroke="#29E9BF" strokeOpacity="0.55" strokeWidth="1.2" strokeLinejoin="round" />
    <circle cx="16" cy="15.5" r="2" fill="#29E9BF" />
  </svg>
);
