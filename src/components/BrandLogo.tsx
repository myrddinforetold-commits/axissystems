import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface BrandLogoProps {
  className?: string;
}

export function BrandLogo({ className }: BrandLogoProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [displayText, setDisplayText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fullText = "rontier Intelligence";

  useEffect(() => {
    if (isHovered && !isTyping) {
      setIsTyping(true);
      let i = 0;
      const type = () => {
        if (i <= fullText.length) {
          setDisplayText(fullText.slice(0, i));
          i++;
          timeoutRef.current = setTimeout(type, 30);
        } else {
          setIsTyping(false);
        }
      };
      type();
    } else if (!isHovered) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setIsTyping(false);
      setDisplayText("");
    }
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [isHovered]);

  return (
    <span
      className={cn("font-mono cursor-pointer select-none whitespace-nowrap", className)}
      style={{ fontFamily: "'JetBrains Mono', monospace" }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <span className="font-semibold">FI</span>
      {displayText && (
        <span className="font-light">
          <span>: F</span>{displayText}
        </span>
      )}
      {isTyping && <span className="animate-pulse ml-0.5">|</span>}
    </span>
  );
}
