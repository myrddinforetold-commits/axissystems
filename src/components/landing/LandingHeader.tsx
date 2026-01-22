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
        "fixed top-0 left-0 right-0 z-50 transition-transform duration-300 bg-black",
        isVisible ? "translate-y-0" : "-translate-y-full"
      )}
    >
      <nav className="relative w-full px-4 sm:px-6 lg:px-8">
        <div className="flex h-20 sm:h-24 lg:h-28 items-center justify-center">
          {/* Left: Request Access */}
          {showCTA && onRequestAccess && (
            <div className="absolute left-4 sm:left-6 lg:left-8">
              <Button
                variant="outline"
                size="sm"
                onClick={onRequestAccess}
                className="border-white/30 bg-transparent text-white/90 hover:bg-white/20 hover:text-white hover:border-white/50 transition-all duration-300"
              >
                Request Access
              </Button>
            </div>
          )}

          {/* Center: Logo */}
          <Link to="/" className="flex-shrink-0">
            <img 
              src={axisLogo} 
              alt="Axis Systems" 
              className="h-32 sm:h-40 lg:h-48 w-auto" 
            />
          </Link>

          {/* Right: Login */}
          <div className="absolute right-4 sm:right-6 lg:right-8">
            <Link to="/login">
              <Button
                variant="ghost"
                size="sm"
                className="text-white/90 hover:text-white hover:bg-white/20 transition-all duration-300"
              >
                Login
              </Button>
            </Link>
          </div>
        </div>
      </nav>
    </header>
  );
}
