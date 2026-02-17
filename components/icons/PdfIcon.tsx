
import React from 'react';

export const PdfIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg
        {...props}
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
        <path d="M10.29 18.9H8v-5.8h2.3c1.33 0 2.2.84 2.2 2.9s-.87 2.9-2.21 2.9z"></path>
        <path d="M15.25 18.9H12.9v-5.8h2.35v1.6h-1.1v1.2h1.1v1.4h-1.1v1.6z"></path>
    </svg>
);
