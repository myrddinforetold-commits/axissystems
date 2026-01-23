import { useState } from "react";
import { Users, Brain, ShieldCheck, Zap, Globe } from "lucide-react";
import { cn } from "@/lib/utils";

const features = [
  {
    icon: Users,
    title: "Role-Based AI Agents",
    description: "Define AI roles that mirror your org structure. Each role maintains its own context and expertise.",
    size: "large",
    gradient: "from-cyan-500/20 via-transparent to-transparent",
  },
  {
    icon: Brain,
    title: "Persistent Memory",
    description: "Conversations persist. Context compounds. Decisions reference what came before.",
    size: "wide",
    gradient: "from-purple-500/20 via-transparent to-transparent",
  },
  {
    icon: ShieldCheck,
    title: "Human-in-the-Loop",
    description: "Every action requires approval. AI advises. Humans decide.",
    size: "normal",
    gradient: "from-emerald-500/20 via-transparent to-transparent",
  },
  {
    icon: Zap,
    title: "Real-time Sync",
    description: "Changes propagate instantly across all roles and team members.",
    size: "normal",
    gradient: "from-amber-500/20 via-transparent to-transparent",
  },
  {
    icon: Globe,
    title: "Shared Context",
    description: "Pin insights for company-wide access. Build collective intelligence.",
    size: "normal",
    gradient: "from-blue-500/20 via-transparent to-transparent",
  },
];

interface FeatureCardProps {
  icon: typeof Users;
  title: string;
  description: string;
  size: string;
  gradient: string;
  index: number;
}

function FeatureCard({ icon: Icon, title, description, size, gradient, index }: FeatureCardProps) {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({
      x: ((e.clientX - rect.left) / rect.width - 0.5) * 10,
      y: ((e.clientY - rect.top) / rect.height - 0.5) * 10,
    });
  };

  return (
    <div
      className={cn(
        "group relative perspective-1000",
        size === "large" && "md:col-span-1 md:row-span-2",
        size === "wide" && "md:col-span-2",
        "opacity-0 animate-fade-in-up"
      )}
      style={{ animationDelay: `${0.2 + index * 0.1}s` }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setMousePos({ x: 0, y: 0 });
      }}
    >
      <div
        className={cn(
          "preserve-3d h-full p-6 md:p-8 rounded-2xl transition-all duration-300",
          "glass-card hover:border-white/30",
          "relative overflow-hidden"
        )}
        style={{
          transform: isHovered
            ? `rotateX(${-mousePos.y}deg) rotateY(${mousePos.x}deg)`
            : "rotateX(0) rotateY(0)",
        }}
      >
        {/* Gradient background */}
        <div className={cn("absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500", gradient)} />
        
        {/* Animated border glow */}
        <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
          <div className="absolute inset-[-1px] rounded-2xl bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent animate-shimmer bg-[length:200%_100%]" />
        </div>
        
        {/* Content */}
        <div className="relative z-10">
          <div className="w-12 h-12 mb-6 rounded-xl glass flex items-center justify-center group-hover:glow-border transition-all duration-300">
            <Icon className="w-5 h-5 text-foreground/70 group-hover:text-cyan-400 transition-colors duration-300" />
          </div>
          
          <h3 className="text-lg font-semibold text-foreground mb-3 group-hover:text-gradient-shimmer transition-all duration-300">
            {title}
          </h3>
          
          <p className="text-muted-foreground leading-relaxed text-sm">
            {description}
          </p>
        </div>
        
        {/* Corner accent */}
        <div className="absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-tl from-white/5 to-transparent rounded-tl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      </div>
    </div>
  );
}

export function BentoFeatures() {
  return (
    <section className="py-24 md:py-32 px-6 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/20 to-background" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(var(--neon-cyan)/0.05),transparent_70%)]" />
      
      <div className="max-w-6xl mx-auto relative">
        <div className="text-center mb-16">
          <p className="text-sm uppercase tracking-widest text-muted-foreground mb-4 opacity-0 animate-fade-in">
            Platform Capabilities
          </p>
          <h2 className="text-3xl md:text-4xl font-light text-foreground opacity-0 animate-fade-in" style={{ animationDelay: "0.1s" }}>
            Everything your AI workforce needs
          </h2>
        </div>
        
        <div className="grid md:grid-cols-3 gap-4 md:gap-6">
          {features.map((feature, index) => (
            <FeatureCard key={feature.title} {...feature} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}
