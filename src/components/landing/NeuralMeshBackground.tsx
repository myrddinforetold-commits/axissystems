import { useEffect, useRef, useState } from "react";

const LOG_LINES = [
  { prefix: "role.assign", label: "Chief of Staff", value: "active" },
  { prefix: "task.create", label: "Q2 operational review", value: "pending approval" },
  { prefix: "role.assign", label: "Operations", value: "active" },
  { prefix: "memory.write", label: "product_context_v3", value: "stored" },
  { prefix: "task.execute", label: "Customer follow-up batch", value: "running" },
  { prefix: "role.assign", label: "CEO", value: "active" },
  { prefix: "workflow.request", label: "send_memo → Operations", value: "awaiting approval" },
  { prefix: "task.complete", label: "Internal report — week 12", value: "done" },
  { prefix: "memory.read", label: "company_grounding_v2", value: "loaded" },
  { prefix: "role.assign", label: "Product", value: "active" },
  { prefix: "task.create", label: "Roadmap prioritisation brief", value: "pending approval" },
  { prefix: "workflow.approve", label: "send_memo → CEO", value: "approved" },
  { prefix: "task.execute", label: "Task routing — support queue", value: "running" },
  { prefix: "memory.write", label: "decision_log_q2", value: "stored" },
  { prefix: "task.complete", label: "Operational coordination — March", value: "done" },
];

interface DisplayLine {
  id: number;
  prefix: string;
  label: string;
  value: string;
  typed: number; // chars typed so far in the full string
  full: string;
  opacity: number;
}

export function NeuralMeshBackground() {
  const [lines, setLines] = useState<DisplayLine[]>([]);
  const counterRef = useRef(0);
  const lineIndexRef = useRef(0);

  useEffect(() => {
    const MAX_LINES = 8;

    const addLine = () => {
      const src = LOG_LINES[lineIndexRef.current % LOG_LINES.length];
      lineIndexRef.current++;
      const full = `${src.prefix}   ${src.label}`;
      const newLine: DisplayLine = {
        id: counterRef.current++,
        prefix: src.prefix,
        label: src.label,
        value: src.value,
        typed: 0,
        full,
        opacity: 1,
      };

      setLines((prev) => {
        const next = [...prev, newLine].slice(-MAX_LINES);
        return next;
      });
    };

    // Type characters
    const typeInterval = setInterval(() => {
      setLines((prev) =>
        prev.map((l) =>
          l.typed < l.full.length ? { ...l, typed: l.typed + 2 } : l
        )
      );
    }, 30);

    // Add new line every ~2.2s
    addLine();
    const lineInterval = setInterval(addLine, 2200);

    // Fade out old lines
    const fadeInterval = setInterval(() => {
      setLines((prev) =>
        prev.map((l, i) => {
          if (i < prev.length - 5) {
            return { ...l, opacity: Math.max(0, l.opacity - 0.04) };
          }
          return l;
        })
      );
    }, 50);

    return () => {
      clearInterval(typeInterval);
      clearInterval(lineInterval);
      clearInterval(fadeInterval);
    };
  }, []);

  const getValueColor = (value: string) => {
    if (value === "done") return "text-emerald-500/70";
    if (value === "running") return "text-sky-400/70";
    if (value === "approved") return "text-emerald-400/70";
    if (value.includes("approval")) return "text-amber-400/60";
    if (value === "active") return "text-foreground/40";
    if (value === "stored" || value === "loaded") return "text-foreground/35";
    return "text-foreground/30";
  };

  const getPrefixColor = (prefix: string) => {
    if (prefix.startsWith("task.complete") || prefix.startsWith("workflow.approve")) return "text-foreground/25";
    if (prefix.startsWith("task.execute") || prefix.startsWith("task.create")) return "text-foreground/30";
    if (prefix.startsWith("role")) return "text-foreground/30";
    return "text-foreground/20";
  };

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none select-none">
      {/* Gradient — top vignette so log doesn't bleed into headline */}
      <div className="absolute inset-0 z-10" style={{
        background: "linear-gradient(to top, transparent 0%, hsla(220,20%,6%,0.5) 60%, hsla(220,20%,6%,0.85) 100%)"
      }} />

      {/* Terminal log — anchored to bottom */}
      <div className="absolute bottom-0 left-0 right-0 pb-20 px-8 md:px-20 z-0 flex flex-col gap-2">
        {lines.map((line) => {
          const display = line.full.slice(0, line.typed);
          const showValue = line.typed >= line.full.length;
          const showCursor = line.typed < line.full.length;

          const valueStyle = (() => {
            if (line.value === "done") return { color: "hsla(150,60%,55%,0.8)" };
            if (line.value === "running") return { color: "hsla(200,80%,60%,0.75)" };
            if (line.value === "approved") return { color: "hsla(150,60%,55%,0.75)" };
            if (line.value.includes("approval")) return { color: "hsla(40,80%,60%,0.65)" };
            return { color: "hsla(220,15%,55%,0.5)" };
          })();

          return (
            <div
              key={line.id}
              className="flex items-baseline gap-3 font-mono text-[11px] md:text-[12px] leading-relaxed transition-opacity duration-500"
              style={{ opacity: line.opacity }}
            >
              {/* prefix */}
              <span className="shrink-0 tracking-wide" style={{ color: "hsla(220,15%,45%,0.6)" }}>
                {display.slice(0, line.prefix.length)}
              </span>

              {/* label */}
              {display.length > line.prefix.length && (
                <span style={{ color: "hsla(220,15%,70%,0.55)" }}>
                  {display.slice(line.prefix.length).trimStart()}
                  {showCursor && (
                    <span
                      className="inline-block ml-0.5 animate-blink"
                      style={{ width: "1px", height: "10px", backgroundColor: "hsla(220,15%,70%,0.5)", verticalAlign: "middle" }}
                    />
                  )}
                </span>
              )}

              {/* value */}
              {showValue && (
                <span className="ml-auto shrink-0 text-[10px] uppercase tracking-widest" style={valueStyle}>
                  {line.value}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

