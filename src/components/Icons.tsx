import React from 'react';

const iconProps: React.SVGProps<SVGSVGElement> = {
  className: 'w-5 h-5',
  strokeWidth: '2',
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

export const PlusIcon = () => (
  <svg {...iconProps}><path d="M12 5v14m-7-7h14" /></svg>
);

export const TrashIcon = () => (
  <svg {...iconProps}><path d="M3 6h18m-2 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2m-6 5v6m4-6v6" /></svg>
);

export const EditIcon = () => (
  <svg {...iconProps}><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
);

export const SaveIcon = () => (
  <svg {...iconProps}><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" /><path d="M17 21v-8H7v8M7 3v5h8" /></svg>
);

export const CalendarIcon = () => (
  <svg {...iconProps}><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
);

export const ListIcon = () => (
    <svg {...iconProps}><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>
);

export const DownloadIcon = () => (
    <svg {...iconProps}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>
);

export const CheckCircleIcon = () => (
  <svg {...iconProps}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4" /></svg>
);

export const StepForwardIcon = () => (
    <svg {...iconProps}><path d="M5 4v16M19 12l-7-7v14l7-7z" /></svg>
);

export const WarningTriangleIcon = () => (
  <svg {...iconProps}><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
);

export const ArrowRightCircleIcon = () => (
  <svg {...iconProps}><circle cx="12" cy="12" r="10"/><path d="M12 16l4-4-4-4"/><path d="M8 12h8"/></svg>
);

export const FileTextIcon = () => (
  <svg {...iconProps}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <line x1="10" y1="9" x2="8" y2="9" />
  </svg>
);

export const LightBulbIcon = () => (
  <svg {...iconProps}>
    <path d="M8 14a4 4 0 0 1-1.178-2.828C6.822 8.285 9.238 6 12.006 6 14.77 6 17.18 8.29 17.18 11.172A4 4 0 0 1 16 14v2a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2z" />
    <line x1="9" y1="18" x2="15" y2="18" />
    <line x1="10" y1="22" x2="14" y2="22" />
  </svg>
);

export const CoinsIcon = () => (
  <svg {...iconProps}>
    <ellipse cx="12" cy="6" rx="6" ry="3" />
    <path d="M6 6v5c0 1.66 2.69 3 6 3s6-1.34 6-3V6" />
    <path d="M6 11v5c0 1.66 2.69 3 6 3s6-1.34 6-3v-5" />
  </svg>
);

export const ClearFormatIcon = () => (
    <svg {...iconProps} viewBox="0 0 24 24" stroke="currentColor" fill="none">
        <path d="M6 4h12M12 4v16M4 4l16 16" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"/>
    </svg>
);

export const UploadIcon = () => (
    <svg {...iconProps}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4m14-7-5-5-5 5m5-5v12" /></svg>
);

export const UsersIcon = () => (
    <svg {...iconProps}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" /></svg>
);

export const UserIcon = () => (
    <svg {...iconProps}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
);

export const ArrowUpIcon = () => (
    <svg {...iconProps} className="w-7 h-7"><path d="M12 19V5m-7 7l7-7 7 7" /></svg>
);

export const ArrowDownIcon = () => (
    <svg {...iconProps} className="w-7 h-7"><path d="M12 5v14m-7-7l7 7 7 7" /></svg>
);

export const FolderOpenIcon = () => (
    <svg {...iconProps}><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
);

export const LogOutIcon = () => (
    <svg {...iconProps}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
);

export const ClockIcon = () => (
    <svg {...iconProps}><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
);

export const ChevronDownIcon = () => (
    <svg {...iconProps} className="w-4 h-4"><path d="m6 9 6 6 6-6" /></svg>
);

export const SignalIcon = () => (
    <svg {...iconProps} className="w-7 h-7"><path d="M2 12h.01M6.5 12h.01M11 12h.01M15.5 12h.01M20 12h.01" /></svg>
);

export const AnalyticsIcon = () => (
    <svg {...iconProps}>
        <path d="M3 3v18h18" />
        <path d="M7 16l2-5 3 3 4-9" />
        <circle cx="16" cy="5" r="1.5" />
    </svg>
);

export const XIcon = () => (
  <svg {...iconProps}><path d="m18 6-12 12M6 6l12 12" /></svg>
);

export const OrganizationIcon = () => (
  <svg {...iconProps}>
    <circle cx="12" cy="6" r="3" />
    <circle cx="6" cy="18" r="3" />
    <circle cx="18" cy="18" r="3" />
    <path d="M12 9l-4 6" />
    <path d="M12 9l4 6" />
  </svg>
);



