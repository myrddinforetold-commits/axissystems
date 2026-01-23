import axisLogo from "@/assets/axis-logo.png";

export function LandingFooter() {
  return (
    <footer className="py-20 px-6 border-t border-border/50 bg-black relative overflow-hidden">
      {/* Background grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.03)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.03)_1px,transparent_1px)] bg-[size:4rem_4rem]" />
      
      <div className="max-w-6xl mx-auto relative">
        <div className="flex flex-col items-center text-center">
          {/* Logo */}
          <img 
            src={axisLogo} 
            alt="Axis Systems" 
            className="h-24 mb-8 opacity-70 hover:opacity-100 transition-opacity duration-300" 
          />
          
          {/* Tagline */}
          <p className="text-sm text-white/40 max-w-md mb-8">
            The operating system for how companies think and act.
          </p>
          
          {/* Nav links */}
          <nav className="flex items-center gap-8 text-sm text-white/60 mb-12">
            {["Product", "About", "Blog", "Contact"].map((item) => (
              <span 
                key={item}
                className="relative cursor-pointer transition-colors duration-200 hover:text-white group"
              >
                {item}
                <span className="absolute -bottom-1 left-0 w-full h-px bg-white/50 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
              </span>
            ))}
          </nav>
          
          {/* Status badge */}
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-white/60">All Systems Operational</span>
          </div>
          
          {/* Copyright */}
          <p className="text-xs text-white/30">
            © {new Date().getFullYear()} Axis Systems. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
