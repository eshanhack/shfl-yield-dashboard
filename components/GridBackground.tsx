"use client";

import { useEffect, useRef } from "react";

interface GridBackgroundProps {
  intensity?: "subtle" | "medium" | "strong";
  interactive?: boolean;
}

export default function GridBackground({ 
  intensity = "subtle", 
  interactive = true 
}: GridBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0.5, y: 0.5 });
  const animationRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };

    resize();
    window.addEventListener("resize", resize);

    // Mouse tracking for interactivity
    const handleMouseMove = (e: MouseEvent) => {
      if (!interactive) return;
      mouseRef.current = {
        x: e.clientX / width,
        y: e.clientY / height,
      };
    };
    window.addEventListener("mousemove", handleMouseMove);

    // Grid configuration
    const gridSize = 40;
    const perspectiveStrength = intensity === "strong" ? 0.4 : intensity === "medium" ? 0.25 : 0.15;
    const baseOpacity = intensity === "strong" ? 0.3 : intensity === "medium" ? 0.2 : 0.12;
    
    let time = 0;

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      
      time += 0.005;
      
      // Calculate vortex center with subtle mouse influence
      const vortexX = width * (0.5 + (mouseRef.current.x - 0.5) * 0.1);
      const vortexY = height * (0.8 + (mouseRef.current.y - 0.5) * 0.1);
      
      // Draw horizontal lines with perspective warp
      const numHorizontalLines = Math.ceil(height / gridSize) + 20;
      
      for (let i = -10; i < numHorizontalLines; i++) {
        const baseY = i * gridSize - (time * 50) % gridSize;
        
        ctx.beginPath();
        
        for (let x = 0; x <= width; x += 5) {
          // Calculate distance from vortex
          const dx = x - vortexX;
          const dy = baseY - vortexY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const maxDist = Math.sqrt(width * width + height * height);
          
          // Warp effect - lines curve toward vortex
          const warpFactor = Math.pow(1 - dist / maxDist, 2) * perspectiveStrength;
          const warpedY = baseY + (vortexY - baseY) * warpFactor * 0.5;
          const warpedX = x + (vortexX - x) * warpFactor * 0.3;
          
          if (x === 0) {
            ctx.moveTo(warpedX, warpedY);
          } else {
            ctx.lineTo(warpedX, warpedY);
          }
        }
        
        // Fade based on distance from bottom (horizon)
        const normalizedY = baseY / height;
        const lineOpacity = baseOpacity * Math.max(0, Math.min(1, normalizedY * 1.5));
        
        ctx.strokeStyle = `rgba(138, 43, 226, ${lineOpacity})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      
      // Draw vertical lines with perspective
      const numVerticalLines = Math.ceil(width / gridSize) + 10;
      
      for (let i = -5; i < numVerticalLines; i++) {
        const baseX = i * gridSize;
        
        ctx.beginPath();
        
        for (let y = 0; y <= height; y += 5) {
          const dx = baseX - vortexX;
          const dy = y - vortexY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const maxDist = Math.sqrt(width * width + height * height);
          
          const warpFactor = Math.pow(1 - dist / maxDist, 2) * perspectiveStrength;
          const warpedX = baseX + (vortexX - baseX) * warpFactor * 0.5;
          const warpedY = y + (vortexY - y) * warpFactor * 0.3;
          
          if (y === 0) {
            ctx.moveTo(warpedX, warpedY);
          } else {
            ctx.lineTo(warpedX, warpedY);
          }
        }
        
        // Distance from center affects opacity
        const normalizedX = Math.abs(baseX - width / 2) / (width / 2);
        const lineOpacity = baseOpacity * (1 - normalizedX * 0.5);
        
        ctx.strokeStyle = `rgba(138, 43, 226, ${lineOpacity})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      
      // Add glow at vortex center
      const gradient = ctx.createRadialGradient(
        vortexX, vortexY, 0,
        vortexX, vortexY, 300
      );
      gradient.addColorStop(0, `rgba(138, 43, 226, ${baseOpacity * 0.8})`);
      gradient.addColorStop(0.5, `rgba(138, 43, 226, ${baseOpacity * 0.3})`);
      gradient.addColorStop(1, "rgba(138, 43, 226, 0)");
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
      
      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(animationRef.current);
    };
  }, [intensity, interactive]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ opacity: 0.6 }}
    />
  );
}

