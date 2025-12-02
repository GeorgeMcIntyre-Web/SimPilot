
export function FlowerArt({ className }: { className?: string }) {
    return (
        <svg
            viewBox="0 0 400 120"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
            aria-hidden="true"
        >
            {/* Rose 1 */}
            <g transform="translate(50, 30)">
                {/* Outer petals */}
                <ellipse cx="0" cy="-3" rx="8" ry="10" fill="#F472B6" opacity="0.9" transform="rotate(-20 0 -3)" />
                <ellipse cx="6" cy="0" rx="8" ry="10" fill="#F472B6" opacity="0.9" transform="rotate(20 6 0)" />
                <ellipse cx="0" cy="3" rx="8" ry="10" fill="#F472B6" opacity="0.9" transform="rotate(70 0 3)" />
                <ellipse cx="-6" cy="0" rx="8" ry="10" fill="#F472B6" opacity="0.9" transform="rotate(110 -6 0)" />
                <ellipse cx="-3" cy="-3" rx="8" ry="10" fill="#EC4899" opacity="0.85" transform="rotate(50 -3 -3)" />
                <ellipse cx="3" cy="-3" rx="8" ry="10" fill="#EC4899" opacity="0.85" transform="rotate(-50 3 -3)" />
                {/* Inner petals */}
                <ellipse cx="0" cy="0" rx="5" ry="6" fill="#F9A8D4" opacity="0.95" transform="rotate(45 0 0)" />
                <circle cx="0" cy="0" r="3" fill="#FBCFE8" />
            </g>
            <path d="M 50 40 L 50 90" stroke="#10B981" strokeWidth="3" strokeLinecap="round" />
            <ellipse cx="40" cy="65" rx="4" ry="3" fill="#10B981" opacity="0.7" transform="rotate(-30 40 65)" />
            <ellipse cx="60" cy="75" rx="4" ry="3" fill="#10B981" opacity="0.7" transform="rotate(30 60 75)" />

            {/* Daisy 1 */}
            <g transform="translate(150, 35)">
                {/* Petals */}
                <ellipse cx="0" cy="-8" rx="4" ry="12" fill="#FEF3C7" />
                <ellipse cx="7" cy="-4" rx="4" ry="12" fill="#FEF3C7" transform="rotate(45 7 -4)" />
                <ellipse cx="7" cy="4" rx="4" ry="12" fill="#FEF3C7" transform="rotate(90 7 4)" />
                <ellipse cx="0" cy="8" rx="4" ry="12" fill="#FEF3C7" transform="rotate(135 0 8)" />
                <ellipse cx="-7" cy="4" rx="4" ry="12" fill="#FEF3C7" transform="rotate(180 -7 4)" />
                <ellipse cx="-7" cy="-4" rx="4" ry="12" fill="#FEF3C7" transform="rotate(225 -7 -4)" />
                <ellipse cx="0" cy="-8" rx="4" ry="12" fill="#FEF3C7" transform="rotate(270 0 -8)" />
                <ellipse cx="7" cy="-4" rx="4" ry="12" fill="#FEF3C7" transform="rotate(315 7 -4)" />
                {/* Center */}
                <circle cx="0" cy="0" r="5" fill="#FCD34D" />
                <circle cx="0" cy="0" r="3" fill="#F59E0B" />
            </g>
            <path d="M 150 45 L 150 90" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" />
            <ellipse cx="142" cy="70" rx="3" ry="2.5" fill="#10B981" opacity="0.7" transform="rotate(-25 142 70)" />

            {/* Tulip */}
            <g transform="translate(250, 25)">
                <path d="M 0 0 Q -8 -15 -5 -25 Q -2 -30 0 -28 Q 2 -30 5 -25 Q 8 -15 0 0 Z" fill="#EC4899" />
                <path d="M 0 0 Q -6 -12 -4 -20 Q -2 -24 0 -22 Q 2 -24 4 -20 Q 6 -12 0 0 Z" fill="#F472B6" />
                <path d="M 0 -28 L 0 0" stroke="#F472B6" strokeWidth="2" fill="none" />
            </g>
            <path d="M 250 25 L 250 90" stroke="#10B981" strokeWidth="3" strokeLinecap="round" />
            <ellipse cx="240" cy="60" rx="5" ry="4" fill="#10B981" opacity="0.7" transform="rotate(-35 240 60)" />
            <ellipse cx="260" cy="70" rx="5" ry="4" fill="#10B981" opacity="0.7" transform="rotate(35 260 70)" />

            {/* Sunflower */}
            <g transform="translate(330, 30)">
                {/* Petals */}
                <ellipse cx="0" cy="-10" rx="3" ry="10" fill="#FCD34D" />
                <ellipse cx="7" cy="-7" rx="3" ry="10" fill="#FCD34D" transform="rotate(30 7 -7)" />
                <ellipse cx="10" cy="0" rx="3" ry="10" fill="#FCD34D" transform="rotate(60 10 0)" />
                <ellipse cx="7" cy="7" rx="3" ry="10" fill="#FCD34D" transform="rotate(90 7 7)" />
                <ellipse cx="0" cy="10" rx="3" ry="10" fill="#FCD34D" transform="rotate(120 0 10)" />
                <ellipse cx="-7" cy="7" rx="3" ry="10" fill="#FCD34D" transform="rotate(150 -7 7)" />
                <ellipse cx="-10" cy="0" rx="3" ry="10" fill="#FCD34D" transform="rotate(180 -10 0)" />
                <ellipse cx="-7" cy="-7" rx="3" ry="10" fill="#FCD34D" transform="rotate(210 -7 -7)" />
                <ellipse cx="0" cy="-10" rx="3" ry="10" fill="#FCD34D" transform="rotate(240 0 -10)" />
                <ellipse cx="7" cy="-7" rx="3" ry="10" fill="#FCD34D" transform="rotate(270 7 -7)" />
                <ellipse cx="10" cy="0" rx="3" ry="10" fill="#FCD34D" transform="rotate(300 10 0)" />
                <ellipse cx="7" cy="7" rx="3" ry="10" fill="#FCD34D" transform="rotate(330 7 7)" />
                {/* Center */}
                <circle cx="0" cy="0" r="6" fill="#92400E" />
                <circle cx="0" cy="0" r="4" fill="#78350F" />
            </g>
            <path d="M 330 40 L 330 90" stroke="#10B981" strokeWidth="3.5" strokeLinecap="round" />
            <ellipse cx="320" cy="65" rx="5" ry="4" fill="#10B981" opacity="0.7" transform="rotate(-40 320 65)" />
            <ellipse cx="340" cy="75" rx="5" ry="4" fill="#10B981" opacity="0.7" transform="rotate(40 340 75)" />

            {/* Ground line */}
            <line x1="0" y1="90" x2="400" y2="90" stroke="#10B981" strokeWidth="2" opacity="0.3" />
        </svg>
    )
}
