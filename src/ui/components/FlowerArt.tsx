

export function FlowerArt({ className }: { className?: string }) {
    return (
        <svg
            viewBox="0 0 400 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
            aria-hidden="true"
        >
            <path
                d="M20 80 Q 50 20 80 80 T 140 80 T 200 80"
                stroke="#10B981"
                strokeWidth="2"
                fill="none"
            />
            <circle cx="20" cy="80" r="4" fill="#F472B6" />
            <circle cx="80" cy="80" r="4" fill="#F472B6" />
            <circle cx="140" cy="80" r="4" fill="#F472B6" />
            <circle cx="200" cy="80" r="4" fill="#F472B6" />

            <path
                d="M220 80 Q 250 20 280 80 T 340 80"
                stroke="#10B981"
                strokeWidth="2"
                fill="none"
            />
            <circle cx="220" cy="80" r="3" fill="#60A5FA" />
            <circle cx="280" cy="80" r="3" fill="#60A5FA" />
            <circle cx="340" cy="80" r="3" fill="#60A5FA" />
        </svg>
    )
}
