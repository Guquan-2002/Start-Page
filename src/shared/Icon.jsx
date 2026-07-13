const ICONS = {
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    comments: <><path d="M21 15a4 4 0 0 1-4 4H8l-5 3 1.6-4.8A8 8 0 1 1 21 15Z" /><path d="M8 11h8M8 15h5" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V21h-4v-.09A1.7 1.7 0 0 0 9 19.36a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.63 15 1.7 1.7 0 0 0 3.09 14H3v-4h.09A1.7 1.7 0 0 0 4.64 9a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.63 1.7 1.7 0 0 0 10 3.09V3h4v.09A1.7 1.7 0 0 0 15 4.64a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.37 9 1.7 1.7 0 0 0 20.91 10H21v4h-.09A1.7 1.7 0 0 0 19.4 15Z" /></>,
    trash: <><path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14M10 11v6M14 11v6" /></>,
    close: <path d="M6 6l12 12M18 6 6 18" />,
    image: <><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="8.5" cy="9" r="1.5" /><path d="m4 17 5-5 4 4 2-2 5 5" /></>,
    stop: <rect x="6" y="6" width="12" height="12" rx="1" />,
    send: <path d="M22 2 9.5 14.5M22 2l-7 20-5.5-7.5L2 9l20-7Z" />,
    retry: <><path d="M20 7v5h-5" /><path d="M19 12a7 7 0 1 0-2 5" /></>,
    sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41" /></>,
    moon: <path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z" />,
    cloud: <path d="M17.5 19H7a5 5 0 1 1 1.2-9.85A6 6 0 0 1 20 11a4 4 0 0 1-2.5 8Z" />,
    'cloud-sun': <><path d="M16 6a4 4 0 0 0-7.5 2M16 2v2M20.2 3.8l-1.4 1.4" /><path d="M17.5 20H7a5 5 0 1 1 1.2-9.85A6 6 0 0 1 20 12a4 4 0 0 1-2.5 8Z" /></>,
    rain: <><path d="M17.5 16H7a5 5 0 1 1 1.2-9.85A6 6 0 0 1 20 8a4 4 0 0 1-2.5 8Z" /><path d="m8 19-1 2M13 19l-1 2M18 19l-1 2" /></>,
    bolt: <><path d="M17.5 14H7a5 5 0 1 1 1.2-9.85A6 6 0 0 1 20 6a4 4 0 0 1-2.5 8Z" /><path d="m13 15-3 5h4l-2 3" /></>,
    wind: <><path d="M3 8h11a3 3 0 1 0-3-3M3 12h16M3 16h10a3 3 0 1 1-3 3" /></>,
    snow: <><path d="M12 2v20M4 7l16 10M20 7 4 17" /><path d="m9 4 3 2 3-2M9 20l3-2 3 2" /></>,
    fog: <path d="M4 8h16M2 12h15M6 16h16" />,
    temperature: <><path d="M14 14.8V5a4 4 0 0 0-8 0v9.8a6 6 0 1 0 8 0Z" /><path d="M10 9v8" /></>,
    key: <><circle cx="8" cy="15" r="4" /><path d="m11 12 9-9M17 6l2 2M14 9l2 2" /></>,
    question: <><circle cx="12" cy="12" r="9" /><path d="M9.5 9a2.7 2.7 0 1 1 4.3 2.2c-1 .7-1.8 1.2-1.8 2.8M12 18h.01" /></>,
    warning: <><path d="M10.3 3.7 2.4 18a2 2 0 0 0 1.75 3h15.7a2 2 0 0 0 1.75-3L13.7 3.7a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4M12 17h.01" /></>,
    spinner: <><circle cx="12" cy="12" r="9" opacity=".25" /><path d="M21 12a9 9 0 0 0-9-9" /></>
};

export function Icon({ name, className = '', spin = false, ...props }) {
    const content = ICONS[name] || ICONS.question;
    const classes = ['icon', spin && 'icon-spin', className].filter(Boolean).join(' ');

    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={classes}
            aria-hidden="true"
            focusable="false"
            {...props}
        >
            {content}
        </svg>
    );
}
