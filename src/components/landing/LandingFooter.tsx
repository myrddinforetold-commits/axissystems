export function LandingFooter() {
  return (
    <footer className="py-16 px-6 border-t border-border">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col items-center text-center">
          <div className="text-lg font-medium tracking-wide text-foreground mb-6">
            AXIS SYSTEMS
          </div>
          <nav className="flex items-center gap-6 text-sm text-muted-foreground mb-8">
            <span className="hover:text-foreground cursor-pointer transition-colors">
              Product
            </span>
            <span className="text-border">•</span>
            <span className="hover:text-foreground cursor-pointer transition-colors">
              About
            </span>
            <span className="text-border">•</span>
            <span className="hover:text-foreground cursor-pointer transition-colors">
              Contact
            </span>
          </nav>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Axis Systems
          </p>
        </div>
      </div>
    </footer>
  );
}
