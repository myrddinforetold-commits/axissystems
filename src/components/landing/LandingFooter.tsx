import axisLogo from "@/assets/axis-logo.png";

export function LandingFooter() {
  return (
    <footer className="py-16 px-6 border-t border-border bg-black">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col items-center text-center">
          <img src={axisLogo} alt="Axis Systems" className="h-16 mb-6 opacity-80 hover:opacity-100 transition-opacity" />
          <nav className="flex items-center gap-6 text-sm text-white/60 mb-8">
            <span className="hover:text-white cursor-pointer transition-colors duration-200">
              Product
            </span>
            <span className="text-white/30">•</span>
            <span className="hover:text-white cursor-pointer transition-colors duration-200">
              About
            </span>
            <span className="text-white/30">•</span>
            <span className="hover:text-white cursor-pointer transition-colors duration-200">
              Contact
            </span>
          </nav>
          <p className="text-sm text-white/40">
            © {new Date().getFullYear()} Axis Systems. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
