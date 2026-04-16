import logoImg from "../../../assets/BantayLogo.png";

interface BantayLogoProps {
  /** Pixel size for width & height (square). Default 36 */
  size?: number;
  className?: string;
}

/**
 * Official Bantay SP seal logo.
 * Drop-in replacement for the Shield icon used throughout the app.
 */
export function BantayLogo({ size = 36, className = "" }: BantayLogoProps) {
  return (
    <img
      src={logoImg}
      alt="Bantay SP Logo"
      width={size}
      height={size}
      className={`rounded-full object-contain shrink-0 ${className}`}
      draggable={false}
    />
  );
}
