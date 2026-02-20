import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Menu, ArrowRight } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

interface LandingHeaderProps {
  onRequestAccess?: () => void;
  showCTA?: boolean;
}

const navLinks = [
  { label: "Product", href: "#product" },
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#how-it-works" },
];

function BrandLogo({ className }: { className?: string }) {
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

export function LandingHeader({ onRequestAccess, showCTA = true }: LandingHeaderProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isScrolled, setIsScrolled] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      setScrollProgress((currentScrollY / scrollHeight) * 100);
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
      setIsScrolled(currentScrollY > 50);
      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  const scrollToSection = (href: string) => {
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
    setMobileMenuOpen(false);
  };

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-500",
        isVisible ? "translate-y-0" : "-translate-y-full",
        isScrolled 
          ? "bg-background/90 backdrop-blur-xl border-b border-border/50" 
          : "bg-black"
      )}
    >
      <div 
        className="absolute bottom-0 left-0 h-[1px] bg-foreground/40" 
        style={{ width: `${scrollProgress}%` }} 
      />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          <Link to="/" className="shrink-0">
            <BrandLogo className={cn(
              "text-sm sm:text-base tracking-tight transition-colors duration-300",
              isScrolled ? "text-foreground" : "text-white"
            )} />
          </Link>

          {/* Right: Hamburger Menu - Always visible */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  isScrolled ? "text-foreground hover:bg-accent" : "text-white hover:bg-white/10"
                )}
              >
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:w-[400px] bg-background/95 backdrop-blur-xl border-l border-border/50 p-0">
              <div className="flex flex-col h-full">
                {/* Mobile Header */}
                <div className="flex items-center justify-between p-6 border-b border-border/50">
                  <BrandLogo className="text-sm tracking-tight text-foreground" />
                </div>
                
                {/* Nav Links */}
                <nav className="flex-1 p-6 space-y-2">
                  {navLinks.map((link, index) => (
                    <button
                      key={link.label}
                      onClick={() => scrollToSection(link.href)}
                      className="w-full text-left px-4 py-4 text-lg font-medium text-foreground hover:text-foreground/70 transition-colors rounded-lg hover:bg-accent/50"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      {link.label}
                    </button>
                  ))}
                </nav>
                
                {/* CTA Section */}
                <div className="p-6 border-t border-border/50 space-y-3">
                  {onRequestAccess && (
                    <Button
                      onClick={() => {
                        onRequestAccess();
                        setMobileMenuOpen(false);
                      }}
                      className="w-full bg-foreground text-background hover:bg-foreground/90 rounded-none uppercase tracking-wide text-sm"
                    >
                      Request Access
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  )}
                  <Link to="/login" className="block">
                    <Button variant="outline" className="w-full">
                      Login
                    </Button>
                  </Link>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

export default LandingHeader;