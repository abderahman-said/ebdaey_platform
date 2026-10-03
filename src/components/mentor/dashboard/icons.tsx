import React from "react";

export const UserChatIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <circle cx="10" cy="8" r="4" />
    <path d="M3 21c0-3.866 3.134-7 7-7s7 3.134 7 7" />
    <circle cx="19" cy="5" r="1.4" fill="currentColor" stroke="currentColor" />
  </svg>
);

export const UserChatDoubleIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <circle cx="8" cy="7" r="3.2" />
    <path d="M2.5 20c0-3.033 2.467-5.5 5.5-5.5s5.5 2.467 5.5 5.5" />
    <circle cx="17" cy="7" r="3.2" />
    <path d="M11.5 20c0-3.033 2.467-5.5 5.5-5.5s5.5 2.467 5.5 5.5" />
  </svg>
);

export const UserChatDotsIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <circle cx="8" cy="7" r="3.5" />
    <path d="M2 20c0-3.314 2.686-6 6-6s6 2.686 6 6" />
    <path d="M17 5 L19 7 L22 3" />
    <path d="M17 11 L19 13 L22 9" />
    <path d="M17 17 L19 19 L22 15" />
  </svg>
);

export const PlayCircleSolid = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="10" />
    <polygon points="10,8 16,12 10,16" fill="currentColor" stroke="currentColor" strokeLinejoin="round" />
  </svg>
);
