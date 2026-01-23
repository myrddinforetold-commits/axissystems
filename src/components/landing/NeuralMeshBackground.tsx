import { useEffect, useRef } from "react";

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  connections: number[];
}

export function NeuralMeshBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodesRef = useRef<Node[]>([]);
  const animationRef = useRef<number>();
  const mouseRef = useRef({ x: 0, y: 0 });

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
      const nodeCount = 40;
      const nodes: Node[] = [];
      
      for (let i = 0; i < nodeCount; i++) {
        nodes.push({
          x: Math.random() * canvas.offsetWidth,
          y: Math.random() * canvas.offsetHeight,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
          connections: [],
        });
      }
      
      // Create connections
      nodes.forEach((node, i) => {
        const distances = nodes
          .map((other, j) => ({ index: j, dist: Math.hypot(node.x - other.x, node.y - other.y) }))
          .filter((d) => d.index !== i)
          .sort((a, b) => a.dist - b.dist)
          .slice(0, 3);
        
        node.connections = distances.map((d) => d.index);
      });
      
      nodesRef.current = nodes;
    };

    const animate = () => {
      if (!ctx || !canvas) return;
      
      ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);
      
      const nodes = nodesRef.current;
      const mouse = mouseRef.current;
      
      // Update positions
      nodes.forEach((node) => {
        node.x += node.vx;
        node.y += node.vy;
        
        // Bounce off edges
        if (node.x < 0 || node.x > canvas.offsetWidth) node.vx *= -1;
        if (node.y < 0 || node.y > canvas.offsetHeight) node.vy *= -1;
        
        // Mouse influence
        const dx = mouse.x - node.x;
        const dy = mouse.y - node.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 150 && dist > 0) {
          node.vx -= (dx / dist) * 0.02;
          node.vy -= (dy / dist) * 0.02;
        }
        
        // Damping
        node.vx *= 0.99;
        node.vy *= 0.99;
      });
      
      // Draw connections
      nodes.forEach((node, i) => {
        node.connections.forEach((j) => {
          const other = nodes[j];
          const dist = Math.hypot(node.x - other.x, node.y - other.y);
          const maxDist = 200;
          
          if (dist < maxDist) {
            const alpha = (1 - dist / maxDist) * 0.3;
            const gradient = ctx.createLinearGradient(node.x, node.y, other.x, other.y);
            gradient.addColorStop(0, `hsla(180, 100%, 50%, ${alpha})`);
            gradient.addColorStop(1, `hsla(270, 100%, 60%, ${alpha})`);
            
            ctx.beginPath();
            ctx.moveTo(node.x, node.y);
            ctx.lineTo(other.x, other.y);
            ctx.strokeStyle = gradient;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        });
      });
      
      // Draw nodes
      nodes.forEach((node) => {
        const mouseDist = Math.hypot(mouse.x - node.x, mouse.y - node.y);
        const glow = mouseDist < 100 ? 1 - mouseDist / 100 : 0;
        
        // Outer glow
        if (glow > 0) {
          ctx.beginPath();
          ctx.arc(node.x, node.y, 8 + glow * 10, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(180, 100%, 50%, ${glow * 0.3})`;
          ctx.fill();
        }
        
        // Node
        ctx.beginPath();
        ctx.arc(node.x, node.y, 2 + glow * 2, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(180, 100%, ${60 + glow * 40}%, ${0.5 + glow * 0.5})`;
        ctx.fill();
      });
      
      // Draw data particles flowing along connections
      const time = Date.now() * 0.001;
      nodes.forEach((node, i) => {
        node.connections.forEach((j, ci) => {
          const other = nodes[j];
          const progress = ((time + i * 0.5 + ci * 0.3) % 2) / 2;
          
          if (progress < 1) {
            const px = node.x + (other.x - node.x) * progress;
            const py = node.y + (other.y - node.y) * progress;
            
            ctx.beginPath();
            ctx.arc(px, py, 1.5, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(180, 100%, 70%, ${0.8 - progress * 0.6})`;
            ctx.fill();
          }
        });
      });
      
      animationRef.current = requestAnimationFrame(animate);
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    };

    resizeCanvas();
    initNodes();
    animate();
    
    window.addEventListener("resize", () => {
      resizeCanvas();
      initNodes();
    });
    canvas.addEventListener("mousemove", handleMouseMove);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      canvas.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ opacity: 0.8 }}
    />
  );
}
