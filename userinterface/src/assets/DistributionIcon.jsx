// src/components/ar/shared/DistributionIcon.jsx
import { GiCard3Spades } from "react-icons/gi";

function DistributionIcon({ className = "h-6 w-6" }) {
  return (
    <span className={`relative inline-block ${className}`}>
      {/* back card 1 */}
      <GiCard3Spades
        className="absolute inset-0 h-full w-full -rotate-12 -translate-x-1 text-current opacity-60"
        aria-hidden="true"
      />
      {/* back card 2 */}
      <GiCard3Spades
        className="absolute inset-0 h-full w-full rotate-12 translate-x-1 text-current opacity-60"
        aria-hidden="true"
      />
      {/* front card (the real icon) */}
      <GiCard3Spades className="relative h-full w-full text-current" />
    </span>
  );
}

export default DistributionIcon;