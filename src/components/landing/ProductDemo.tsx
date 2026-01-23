import { useState } from "react";
import { Users, Brain, GitBranch } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  {
    id: "roles",
    label: "Roles",
    icon: Users,
    content: {
      title: "AI roles that mirror your org",
      items: [
        { role: "Chief of Staff", status: "Active", lastAction: "Generated weekly summary" },
        { role: "Product Lead", status: "Active", lastAction: "Drafted PRD for Q2 features" },
        { role: "Sales Director", status: "Idle", lastAction: "Analyzed pipeline metrics" },
      ],
    },
  },
  {
    id: "memory",
    label: "Memory",
    icon: Brain,
    content: {
      title: "Persistent company memory",
      items: [
        { memory: "Q4 Revenue Target: $2.5M", source: "CEO", date: "2 days ago" },
        { memory: "Key competitor launched feature X", source: "Product", date: "1 week ago" },
        { memory: "Customer churn reduced by 15%", source: "CoS", date: "3 weeks ago" },
      ],
    },
  },
  {
    id: "workflow",
    label: "Workflow",
    icon: GitBranch,
    content: {
      title: "Approval-based execution",
      items: [
        { action: "Send investor update", status: "Pending", from: "CoS" },
        { action: "Schedule team sync", status: "Approved", from: "CEO" },
        { action: "Draft blog post", status: "In Review", from: "Product" },
      ],
    },
  },
];

export function ProductDemo() {
  const [activeTab, setActiveTab] = useState("roles");
  const currentTab = tabs.find((t) => t.id === activeTab);

  return (
    <section className="py-24 md:py-32 px-6 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/20 to-background" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,hsl(var(--neon-purple)/0.05),transparent_70%)]" />

      <div className="max-w-5xl mx-auto relative">
        <div className="text-center mb-12">
          <p className="text-sm uppercase tracking-widest text-muted-foreground mb-4 opacity-0 animate-fade-in">
            See it in action
          </p>
          <h2 className="text-3xl md:text-4xl font-light text-foreground opacity-0 animate-fade-in" style={{ animationDelay: "0.1s" }}>
            Your AI command center
          </h2>
        </div>

        {/* Demo container */}
        <div className="glass-card rounded-2xl p-2 glow-border-purple opacity-0 animate-scale-in" style={{ animationDelay: "0.2s" }}>
          {/* Tab bar */}
          <div className="flex gap-2 p-2 bg-black/20 rounded-xl mb-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300",
                  activeTab === tab.id
                    ? "bg-white/10 text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                )}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content area */}
          <div className="p-6 min-h-[300px]">
            <h3 className="text-lg font-medium text-foreground mb-6">
              {currentTab?.content.title}
            </h3>

            <div className="space-y-3">
              {activeTab === "roles" &&
                currentTab?.content.items.map((item: any, i: number) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center">
                        <Users className="w-5 h-5 text-foreground/70" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{item.role}</p>
                        <p className="text-xs text-muted-foreground">{item.lastAction}</p>
                      </div>
                    </div>
                    <span
                      className={cn(
                        "text-xs px-2 py-1 rounded-full",
                        item.status === "Active"
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {item.status}
                    </span>
                  </div>
                ))}

              {activeTab === "memory" &&
                currentTab?.content.items.map((item: any, i: number) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-2 h-2 rounded-full bg-cyan-400" />
                      <div>
                        <p className="text-foreground">{item.memory}</p>
                        <p className="text-xs text-muted-foreground">
                          Pinned by {item.source} • {item.date}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}

              {activeTab === "workflow" &&
                currentTab?.content.items.map((item: any, i: number) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <GitBranch className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-foreground">{item.action}</p>
                        <p className="text-xs text-muted-foreground">From: {item.from}</p>
                      </div>
                    </div>
                    <span
                      className={cn(
                        "text-xs px-2 py-1 rounded-full",
                        item.status === "Approved"
                          ? "bg-emerald-500/20 text-emerald-400"
                          : item.status === "Pending"
                          ? "bg-amber-500/20 text-amber-400"
                          : "bg-blue-500/20 text-blue-400"
                      )}
                    >
                      {item.status}
                    </span>
                  </div>
                ))}
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-white/10 flex items-center justify-between text-xs text-muted-foreground">
            <span>Last sync: just now</span>
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Connected
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
