import axisLogo from "@/assets/axis-logo.png";

export function LandingFooter() {
  return (
    <footer className="py-16 px-6 border-t border-border bg-black">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col items-center text-center">
          <img src={axisLogo} alt="Axis Systems" className="h-8 mb-6" />
          <nav className="flex items-center gap-6 text-sm text-white/60 mb-8">
            <span className="hover:text-white cursor-pointer transition-colors">
              Product
            </span>
            <span className="text-white/30">•</span>
            <span className="hover:text-white cursor-pointer transition-colors">
              About
            </span>
            <span className="text-white/30">•</span>
            <span className="hover:text-white cursor-pointer transition-colors">
              Contact
            </span>
          </nav>
          <p className="text-sm text-white/60">
            © {new Date().getFullYear()} Axis Systems
          </p>
        </div>
      </div>
    </footer>
  );
}
