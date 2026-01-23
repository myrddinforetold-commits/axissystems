import { useEffect, useRef } from "react";

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  layer: number; // 0 = back, 1 = mid, 2 = front
  pulseOffset: number;
  connections: number[];
}

interface Ripple {
  x: number;
  y: number;
  radius: number;
  opacity: number;
}

export function NeuralMeshBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodesRef = useRef<Node[]>([]);
  const ripplesRef = useRef<Ripple[]>([]);
  const animationRef = useRef<number>();
  const mouseRef = useRef({ x: -1000, y: -1000 });
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
      // Responsive node count
      const isMobile = canvas.offsetWidth < 768;
      const nodeCount = isMobile ? 50 : 90;
      const nodes: Node[] = [];
      
      for (let i = 0; i < nodeCount; i++) {
        const layer = i < nodeCount * 0.3 ? 0 : i < nodeCount * 0.7 ? 1 : 2;
        const speedMultiplier = [0.15, 0.25, 0.4][layer];
        
        nodes.push({
          x: Math.random() * canvas.offsetWidth,
          y: Math.random() * canvas.offsetHeight,
          vx: (Math.random() - 0.5) * speedMultiplier,
          vy: (Math.random() - 0.5) * speedMultiplier,
          size: [1.5, 2.5, 3.5][layer] + Math.random() * 1.5,
          layer,
          pulseOffset: Math.random() * Math.PI * 2,
          connections: [],
        });
      }
      
      // Create connections within layers
      nodes.forEach((node, i) => {
        const sameLayerNodes = nodes
          .map((other, j) => ({ index: j, dist: Math.hypot(node.x - other.x, node.y - other.y), layer: other.layer }))
          .filter((d) => d.index !== i && Math.abs(d.layer - node.layer) <= 1)
          .sort((a, b) => a.dist - b.dist)
          .slice(0, 4);
        
        node.connections = sameLayerNodes.map((d) => d.index);
      });
      
      nodesRef.current = nodes;
    };

    const animate = () => {
      if (!ctx || !canvas) return;
      
      const width = canvas.offsetWidth;
      const height = canvas.offsetHeight;
      timeRef.current += 0.016;
      const time = timeRef.current;
      
      ctx.clearRect(0, 0, width, height);
      
      const nodes = nodesRef.current;
      const ripples = ripplesRef.current;
      const mouse = mouseRef.current;
      
      // Update and draw ripples
      for (let i = ripples.length - 1; i >= 0; i--) {
        const ripple = ripples[i];
        ripple.radius += 3;
        ripple.opacity -= 0.02;
        
        if (ripple.opacity <= 0) {
          ripples.splice(i, 1);
          continue;
        }
        
        ctx.beginPath();
        ctx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `hsla(180, 100%, 60%, ${ripple.opacity * 0.3})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      
      // Update node positions
      nodes.forEach((node) => {
        node.x += node.vx;
        node.y += node.vy;
        
        // Wrap around edges smoothly
        if (node.x < -50) node.x = width + 50;
        if (node.x > width + 50) node.x = -50;
        if (node.y < -50) node.y = height + 50;
        if (node.y > height + 50) node.y = -50;
        
        // Mouse attraction (gravity well effect)
        const dx = mouse.x - node.x;
        const dy = mouse.y - node.y;
        const dist = Math.hypot(dx, dy);
        const attractRadius = 200;
        
        if (dist < attractRadius && dist > 20) {
          const force = (1 - dist / attractRadius) * 0.03 * (node.layer + 1);
          node.vx += (dx / dist) * force;
          node.vy += (dy / dist) * force;
        }
        
        // Damping
        node.vx *= 0.995;
        node.vy *= 0.995;
        
        // Speed limits by layer
        const maxSpeed = [0.3, 0.5, 0.8][node.layer];
        const speed = Math.hypot(node.vx, node.vy);
        if (speed > maxSpeed) {
          node.vx = (node.vx / speed) * maxSpeed;
          node.vy = (node.vy / speed) * maxSpeed;
        }
      });
      
      // Draw connections by layer (back to front)
      for (let layer = 0; layer <= 2; layer++) {
        const layerAlpha = [0.15, 0.25, 0.4][layer];
        
        nodes.filter(n => n.layer === layer).forEach((node) => {
          node.connections.forEach((j) => {
            const other = nodes[j];
            if (!other) return;
            
            const dist = Math.hypot(node.x - other.x, node.y - other.y);
            const maxDist = [150, 180, 220][layer];
            
            if (dist < maxDist) {
              const alpha = (1 - dist / maxDist) * layerAlpha;
              
              // Gradient line with pulse
              const gradient = ctx.createLinearGradient(node.x, node.y, other.x, other.y);
              const pulseIntensity = Math.sin(time * 2 + node.pulseOffset) * 0.3 + 0.7;
              
              if (layer === 2) {
                gradient.addColorStop(0, `hsla(180, 100%, 60%, ${alpha * pulseIntensity})`);
                gradient.addColorStop(0.5, `hsla(220, 100%, 70%, ${alpha * pulseIntensity})`);
                gradient.addColorStop(1, `hsla(270, 100%, 60%, ${alpha * pulseIntensity})`);
              } else {
                gradient.addColorStop(0, `hsla(180, 80%, 50%, ${alpha * 0.6})`);
                gradient.addColorStop(1, `hsla(260, 80%, 50%, ${alpha * 0.6})`);
              }
              
              ctx.beginPath();
              ctx.moveTo(node.x, node.y);
              ctx.lineTo(other.x, other.y);
              ctx.strokeStyle = gradient;
              ctx.lineWidth = layer === 2 ? 1.5 : 1;
              ctx.stroke();
            }
          });
        });
      }
      
      // Draw nodes by layer (back to front)
      for (let layer = 0; layer <= 2; layer++) {
        nodes.filter(n => n.layer === layer).forEach((node) => {
          const mouseDist = Math.hypot(mouse.x - node.x, mouse.y - node.y);
          const mouseGlow = mouseDist < 150 ? (1 - mouseDist / 150) : 0;
          const pulse = Math.sin(time * 3 + node.pulseOffset) * 0.3 + 0.7;
          
          const baseAlpha = [0.3, 0.5, 0.8][layer];
          const glowSize = node.size * (1 + mouseGlow * 2 + pulse * 0.3);
          
          // Outer glow
          if (layer === 2 || mouseGlow > 0) {
            const glowRadius = glowSize * 4;
            const gradient = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, glowRadius);
            gradient.addColorStop(0, `hsla(180, 100%, 70%, ${(baseAlpha * 0.4 + mouseGlow * 0.3) * pulse})`);
            gradient.addColorStop(0.5, `hsla(200, 100%, 60%, ${(baseAlpha * 0.2 + mouseGlow * 0.15) * pulse})`);
            gradient.addColorStop(1, `hsla(220, 100%, 50%, 0)`);
            
            ctx.beginPath();
            ctx.arc(node.x, node.y, glowRadius, 0, Math.PI * 2);
            ctx.fillStyle = gradient;
            ctx.fill();
          }
          
          // Core node
          const coreGradient = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, glowSize);
          coreGradient.addColorStop(0, `hsla(180, 100%, 90%, ${baseAlpha + mouseGlow * 0.4})`);
          coreGradient.addColorStop(0.6, `hsla(200, 100%, 70%, ${baseAlpha * 0.8})`);
          coreGradient.addColorStop(1, `hsla(220, 100%, 50%, 0)`);
          
          ctx.beginPath();
          ctx.arc(node.x, node.y, glowSize, 0, Math.PI * 2);
          ctx.fillStyle = coreGradient;
          ctx.fill();
        });
      }
      
      // Draw data particles (energy pulses along connections)
      nodes.filter(n => n.layer >= 1).forEach((node, i) => {
        node.connections.forEach((j, ci) => {
          const other = nodes[j];
          if (!other || other.layer < node.layer) return;
          
          const dist = Math.hypot(node.x - other.x, node.y - other.y);
          if (dist > 200) return;
          
          // Multiple particles per connection
          for (let p = 0; p < 2; p++) {
            const progress = ((time * 0.8 + i * 0.3 + ci * 0.5 + p * 0.5) % 2) / 2;
            
            if (progress < 1) {
              const px = node.x + (other.x - node.x) * progress;
              const py = node.y + (other.y - node.y) * progress;
              const particleAlpha = Math.sin(progress * Math.PI) * 0.8;
              
              // Particle with trail
              const trailGradient = ctx.createRadialGradient(px, py, 0, px, py, 6);
              trailGradient.addColorStop(0, `hsla(180, 100%, 80%, ${particleAlpha})`);
              trailGradient.addColorStop(0.5, `hsla(200, 100%, 70%, ${particleAlpha * 0.5})`);
              trailGradient.addColorStop(1, `hsla(220, 100%, 60%, 0)`);
              
              ctx.beginPath();
              ctx.arc(px, py, 4, 0, Math.PI * 2);
              ctx.fillStyle = trailGradient;
              ctx.fill();
            }
          }
        });
      });
      
      // Occasional shooting stars
      if (Math.random() < 0.002) {
        const startX = Math.random() * width;
        const startY = Math.random() * height * 0.5;
        
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(startX + 80, startY + 80);
        const starGradient = ctx.createLinearGradient(startX, startY, startX + 80, startY + 80);
        starGradient.addColorStop(0, 'hsla(180, 100%, 90%, 0.8)');
        starGradient.addColorStop(1, 'hsla(180, 100%, 90%, 0)');
        ctx.strokeStyle = starGradient;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      
      animationRef.current = requestAnimationFrame(animate);
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    };

    const handleClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      ripplesRef.current.push({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        radius: 0,
        opacity: 1,
      });
    };

    resizeCanvas();
    initNodes();
    animate();
    
    const handleResize = () => {
      resizeCanvas();
      initNodes();
    };
    
    window.addEventListener("resize", handleResize);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("click", handleClick);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      window.removeEventListener("resize", handleResize);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("click", handleClick);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full cursor-crosshair"
    />
  );
}
