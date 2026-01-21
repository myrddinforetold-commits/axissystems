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
        "fixed top-0 left-0 right-0 z-50 bg-black transition-transform duration-300",
        isVisible ? "translate-y-0" : "-translate-y-full"
      )}
    >
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link to="/">
          <img src={axisLogo} alt="Axis Systems" className="h-32" />
        </Link>
        
        {showCTA && onRequestAccess && (
          <Button
            variant="outline"
            onClick={onRequestAccess}
            className="border-white text-white bg-transparent hover:bg-white hover:text-black"
          >
            Request Access
          </Button>
        )}
      </div>
    </header>
  );
}
