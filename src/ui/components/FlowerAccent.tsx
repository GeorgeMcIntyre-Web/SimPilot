import { useTheme } from '../ThemeContext';
import { cn } from '../lib/utils';

export function FlowerAccent({ className = "w-5 h-5" }: { className?: string }) {
    const { themeMode } = useTheme();

    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={cn(
                "motion-safe:animate-float",
                className
            )}
            aria-hidden="true"
        >
            {/* Rose flower with realistic petals - using explicit pink colors */}
            <g transform="translate(12, 6)">
                {/* Outer petals - pink rose */}
                <ellipse cx="0" cy="-3" rx="4" ry="5" fill="#F472B6" opacity="0.95" transform="rotate(-20 0 -3)" />
                <ellipse cx="3" cy="0" rx="4" ry="5" fill="#F472B6" opacity="0.95" transform="rotate(20 3 0)" />
                <ellipse cx="0" cy="3" rx="4" ry="5" fill="#F472B6" opacity="0.95" transform="rotate(70 0 3)" />
                <ellipse cx="-3" cy="0" rx="4" ry="5" fill="#F472B6" opacity="0.95" transform="rotate(110 -3 0)" />
                <ellipse cx="-2" cy="-2" rx="4" ry="5" fill="#EC4899" opacity="0.9" transform="rotate(50 -2 -2)" />
                <ellipse cx="2" cy="-2" rx="4" ry="5" fill="#EC4899" opacity="0.9" transform="rotate(-50 2 -2)" />
                <ellipse cx="2" cy="2" rx="4" ry="5" fill="#EC4899" opacity="0.9" transform="rotate(130 2 2)" />
                <ellipse cx="-2" cy="2" rx="4" ry="5" fill="#EC4899" opacity="0.9" transform="rotate(160 -2 2)" />
                
                {/* Inner petals - lighter pink */}
                <ellipse cx="0" cy="0" rx="2.5" ry="3" fill="#F9A8D4" opacity="0.98" transform="rotate(45 0 0)" />
                <ellipse cx="0" cy="0" rx="2.5" ry="3" fill="#F9A8D4" opacity="0.98" transform="rotate(-45 0 0)" />
                
                {/* Center - darker pink */}
                <circle cx="0" cy="0" r="1.5" fill="#EC4899" />
                <circle cx="0" cy="0" r="0.8" fill="#BE185D" />
            </g>
            
            {/* Stem - green */}
            <path d="M 12 11 L 12 20" stroke="#10B981" strokeWidth="2" strokeLinecap="round" fill="none" />
            
            {/* Leaves - green */}
            <ellipse cx="9.5" cy="15" rx="2.5" ry="2" fill="#10B981" opacity="0.8" transform="rotate(-30 9.5 15)" />
            <ellipse cx="14.5" cy="17" rx="2.5" ry="2" fill="#10B981" opacity="0.8" transform="rotate(30 14.5 17)" />
        </svg>
    );
}
