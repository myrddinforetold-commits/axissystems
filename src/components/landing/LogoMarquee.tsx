import { useEffect, useState, useRef } from "react";

const stats = [
  { value: 10000, label: "Decisions aligned", suffix: "+" },
  { value: 50, label: "Companies", suffix: "+" },
  { value: 99.9, label: "Uptime", suffix: "%" },
];

function AnimatedCounter({ value, suffix }: { value: number; suffix: string }) {
  const [count, setCount] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.5 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    const duration = 2000;
    const steps = 60;
    const increment = value / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setCount(value);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [isVisible, value]);

  return (
    <span ref={ref} className="font-mono text-2xl md:text-3xl font-light text-foreground">
      {count.toLocaleString()}{suffix}
    </span>
  );
}

export function LogoMarquee() {
  return (
    <section className="py-12 md:py-16 border-y border-border/50 bg-muted/30 overflow-hidden">
      <div className="max-w-6xl mx-auto px-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-8 md:gap-16">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <AnimatedCounter value={stat.value} suffix={stat.suffix} />
              <p className="text-xs md:text-sm text-muted-foreground mt-1 uppercase tracking-wider">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Marquee track */}
      <div className="mt-12 relative">
        <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-muted/30 to-transparent z-10" />
        <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-muted/30 to-transparent z-10" />
        
        <div className="flex animate-marquee whitespace-nowrap">
          {[...Array(2)].map((_, setIndex) => (
            <div key={setIndex} className="flex items-center gap-16 px-8">
              {[
                "Enterprise Ready",
                "SOC 2 Compliant",
                "99.9% Uptime",
                "Built for Scale",
                "Privacy First",
                "Real-time Sync",
                "Secure by Design",
                "API First",
              ].map((text, i) => (
                <div
                  key={`${setIndex}-${i}`}
                  className="flex items-center gap-3 text-muted-foreground/50"
                >
                  <div className="w-2 h-2 rounded-full bg-cyan-500/50" />
                  <span className="text-sm uppercase tracking-widest">{text}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
