export function LogoIcon({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ flexShrink: 0, transition: "none" }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#10B981" />
          <stop offset="100%" stopColor="#F59E0B" />
        </linearGradient>
      </defs>
      {/* Outer dashed cycle — rotational savings */}
      <circle
        cx="16"
        cy="16"
        r="13"
        stroke="url(#logo-grad)"
        strokeWidth="2"
        strokeDasharray="5 3"
        style={{ transition: "none" }}
      />
      {/* Stylized "A" */}
      <path d="M16 7L24 21H20L16 13L12 21H8L16 7Z" fill="url(#logo-grad)" style={{ transition: "none" }} />
      {/* Vault dot */}
      <circle cx="16" cy="18" r="2.5" fill="#10B981" style={{ transition: "none" }} />
    </svg>
  );
}
