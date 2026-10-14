export default function Tajinaste({ size = 64, className }) {
    return (
        <svg
            className={className}
            width={size}
            height={size}
            viewBox="0 0 64 96"
            aria-hidden="true"
            focusable="false"
        >
            <path d="M32 94 C23 82 14 76 6 74 C17 72 26 78 30 84 Z" fill="#2E7D4F" />
            <path d="M32 94 C41 82 50 76 58 74 C47 72 38 78 34 84 Z" fill="#2E7D4F" />
            <path d="M32 94 C27 80 23 72 18 68 C26 70 31 78 33 86 Z" fill="#3E8E5A" />
            <path d="M32 94 C37 80 41 72 46 68 C38 70 33 78 31 86 Z" fill="#3E8E5A" />
            <path d="M32 6 C25 28 24 52 27 72 C30 77 34 77 37 72 C40 52 39 28 32 6 Z" fill="#D9552B" />
            <path d="M32 6 C28 28 27 52 28 72 L32 74 L32 6 Z" fill="#C24720" />
        </svg>
    );
}
