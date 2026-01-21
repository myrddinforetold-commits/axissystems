import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import axisLogo from "@/assets/axis-logo.png";

interface LandingHeaderProps {
  onRequestAccess?: () => void;
  showCTA?: boolean;
}

export function LandingHeader({ onRequestAccess, showCTA = true }: LandingHeaderProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
      
      setLastScrollY(currentScrollY);
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-transform duration-300",
        isVisible ? "translate-y-0" : "-translate-y-full"
      )}
    >
      {/* Metallic rainbow gradient background */}
      <div className="absolute inset-0 bg-alien-metallic bg-[length:200%_100%] animate-holographic-shift" />
      
      {/* Dark overlay for depth */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      
      {/* Metallic shimmer effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-metallic-shimmer" />
      </div>
      
      {/* Bottom edge glow */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-alien-border bg-[length:200%_100%] animate-border-glow" />
      
      {/* Subtle top highlight */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />

      <nav className="relative w-full px-4 sm:px-6 lg:px-8">
        <div className="flex h-20 sm:h-24 lg:h-28 items-center justify-between">
          <Link to="/" className="flex-shrink-0 group">
            <img 
              src={axisLogo} 
              alt="Axis Systems" 
              className="h-32 sm:h-40 lg:h-48 w-auto transition-all duration-300 group-hover:drop-shadow-[0_0_15px_rgba(0,255,255,0.5)]" 
            />
          </Link>
          
          <div className="flex items-center gap-2 sm:gap-3">
            <Link to="/login">
              <Button
                variant="ghost"
                size="sm"
                className="relative text-white/90 hover:text-white hover:bg-white/10 border border-transparent hover:border-cyan-500/30 transition-all duration-300"
              >
                Login
              </Button>
            </Link>
            {showCTA && onRequestAccess && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRequestAccess}
                className="relative border-alien-button bg-black/40 text-white hover:bg-cyan-950/50 hover:border-cyan-400/60 hover:shadow-[0_0_20px_rgba(0,255,255,0.3)] transition-all duration-300 overflow-hidden group"
              >
                <span className="relative z-10">Request Access</span>
                {/* Button holographic shimmer */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
              </Button>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
}
