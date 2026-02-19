import { useEffect, useRef } from "react";

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  pulseOffset: number;
}

export function NeuralMeshBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodesRef = useRef<Node[]>([]);
  const animationRef = useRef<number>();
  const timeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };

    const initNodes = () => {
      const isMobile = canvas.offsetWidth < 768;
      const nodeCount = isMobile ? 40 : 70;
      const nodes: Node[] = [];

      for (let i = 0; i < nodeCount; i++) {
        const isSmall = Math.random() > 0.7;
        nodes.push({
          x: Math.random() * canvas.offsetWidth,
          y: Math.random() * canvas.offsetHeight,
          vx: (Math.random() - 0.5) * 0.12,
          vy: (Math.random() - 0.5) * 0.12,
          size: isSmall ? 1 + Math.random() * 1 : 1.5 + Math.random() * 1.5,
          opacity: 0.2 + Math.random() * 0.5,
          pulseOffset: Math.random() * Math.PI * 2,
        });
      }

      nodesRef.current = nodes;
    };

    const animate = () => {
      if (!ctx || !canvas) return;

      const width = canvas.offsetWidth;
      const height = canvas.offsetHeight;
      timeRef.current += 0.008;
      const time = timeRef.current;

      ctx.clearRect(0, 0, width, height);

      const nodes = nodesRef.current;

      // Update positions
      nodes.forEach((node) => {
        node.x += node.vx;
        node.y += node.vy;

        if (node.x < -30) node.x = width + 30;
        if (node.x > width + 30) node.x = -30;
        if (node.y < -30) node.y = height + 30;
        if (node.y > height + 30) node.y = -30;
      });

      // Draw connections
      const maxConnectionDist = isMobile(canvas) ? 130 : 180;

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i];
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < maxConnectionDist) {
            const proximity = 1 - dist / maxConnectionDist;
            // Breathing line opacity
            const breathe = Math.sin(time + a.pulseOffset) * 0.08 + 0.92;
            const alpha = proximity * 0.14 * breathe;

            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `hsla(220, 15%, 75%, ${alpha})`;
            ctx.lineWidth = 0.75;
            ctx.stroke();
          }
        }
      }

      // Draw nodes
      nodes.forEach((node) => {
        const pulse = Math.sin(time * 1.2 + node.pulseOffset) * 0.15 + 0.85;
        const alpha = node.opacity * pulse;

        // Subtle outer glow
        const glow = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, node.size * 5);
        glow.addColorStop(0, `hsla(220, 20%, 80%, ${alpha * 0.25})`);
        glow.addColorStop(1, `hsla(220, 20%, 80%, 0)`);
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.size * 5, 0, Math.PI * 2);
        ctx.fillStyle = glow;
        ctx.fill();

        // Core dot
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.size * pulse, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(220, 20%, 82%, ${alpha})`;
        ctx.fill();
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    const isMobile = (c: HTMLCanvasElement) => c.offsetWidth < 768;

    resizeCanvas();
    initNodes();
    animate();

    const handleResize = () => {
      resizeCanvas();
      initNodes();
    };

    window.addEventListener("resize", handleResize);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
    />
  );
}
