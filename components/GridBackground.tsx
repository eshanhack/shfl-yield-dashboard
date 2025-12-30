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
  const mouseRef = useRef({ x: 0.5, y: 0.5, active: false });
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
      mouseRef.current = {
        x: e.clientX,
        y: e.clientY,
        active: true,
      };
    };
    
    const handleMouseLeave = () => {
      mouseRef.current.active = false;
    };
    
    window.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseleave", handleMouseLeave);

    // Grid configuration
    const gridSize = 40;
    const perspectiveStrength = intensity === "strong" ? 0.4 : intensity === "medium" ? 0.25 : 0.18;
    const baseOpacity = intensity === "strong" ? 0.35 : intensity === "medium" ? 0.25 : 0.18;
    const torchRadius = intensity === "strong" ? 250 : intensity === "medium" ? 200 : 180;
    const torchIntensity = intensity === "strong" ? 2.5 : intensity === "medium" ? 2.2 : 2.0;
    
    let time = 0;

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      
      time += 0.005;
      
      // Calculate vortex center
      const vortexX = width * 0.5;
      const vortexY = height * 0.85;
      
      // Mouse position for torch effect
      const mouseX = mouseRef.current.x;
      const mouseY = mouseRef.current.y;
      const mouseActive = mouseRef.current.active;
      
      // Helper to calculate torch brightness boost
      const getTorchBoost = (x: number, y: number) => {
        if (!mouseActive) return 1;
        const dx = x - mouseX;
        const dy = y - mouseY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > torchRadius) return 1;
        // Smooth falloff - brighter at center
        const falloff = 1 - (dist / torchRadius);
        return 1 + (falloff * falloff * torchIntensity);
      };
      
      // Draw horizontal lines with perspective warp
      const numHorizontalLines = Math.ceil(height / gridSize) + 20;
      
      for (let i = -10; i < numHorizontalLines; i++) {
        const baseY = i * gridSize - (time * 50) % gridSize;
        
        // Draw line in segments for torch effect
        let prevX = 0;
        let prevY = baseY;
        
        for (let x = 0; x <= width; x += 8) {
          // Calculate distance from vortex
          const dx = x - vortexX;
          const dy = baseY - vortexY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const maxDist = Math.sqrt(width * width + height * height);
          
          // Warp effect
          const warpFactor = Math.pow(1 - dist / maxDist, 2) * perspectiveStrength;
          const warpedY = baseY + (vortexY - baseY) * warpFactor * 0.5;
          const warpedX = x + (vortexX - x) * warpFactor * 0.3;
          
          if (x > 0) {
            // Calculate opacity with torch boost
            const normalizedY = baseY / height;
            const lineOpacity = baseOpacity * Math.max(0, Math.min(1, normalizedY * 1.5));
            const torchBoost = getTorchBoost((prevX + warpedX) / 2, (prevY + warpedY) / 2);
            const finalOpacity = Math.min(0.9, lineOpacity * torchBoost);
            
            ctx.beginPath();
            ctx.moveTo(prevX, prevY);
            ctx.lineTo(warpedX, warpedY);
            ctx.strokeStyle = `rgba(138, 43, 226, ${finalOpacity})`;
            ctx.lineWidth = torchBoost > 1.5 ? 1.5 : 1;
            ctx.stroke();
          }
          
          prevX = warpedX;
          prevY = warpedY;
        }
      }
      
      // Draw vertical lines with perspective
      const numVerticalLines = Math.ceil(width / gridSize) + 10;
      
      for (let i = -5; i < numVerticalLines; i++) {
        const baseX = i * gridSize;
        
        let prevX = baseX;
        let prevY = 0;
        
        for (let y = 0; y <= height; y += 8) {
          const dx = baseX - vortexX;
          const dy = y - vortexY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const maxDist = Math.sqrt(width * width + height * height);
          
          const warpFactor = Math.pow(1 - dist / maxDist, 2) * perspectiveStrength;
          const warpedX = baseX + (vortexX - baseX) * warpFactor * 0.5;
          const warpedY = y + (vortexY - y) * warpFactor * 0.3;
          
          if (y > 0) {
            const normalizedX = Math.abs(baseX - width / 2) / (width / 2);
            const lineOpacity = baseOpacity * (1 - normalizedX * 0.5);
            const torchBoost = getTorchBoost((prevX + warpedX) / 2, (prevY + warpedY) / 2);
            const finalOpacity = Math.min(0.9, lineOpacity * torchBoost);
            
            ctx.beginPath();
            ctx.moveTo(prevX, prevY);
            ctx.lineTo(warpedX, warpedY);
            ctx.strokeStyle = `rgba(138, 43, 226, ${finalOpacity})`;
            ctx.lineWidth = torchBoost > 1.5 ? 1.5 : 1;
            ctx.stroke();
          }
          
          prevX = warpedX;
          prevY = warpedY;
        }
      }
      
      // Add glow at vortex center
      const vortexGradient = ctx.createRadialGradient(
        vortexX, vortexY, 0,
        vortexX, vortexY, 350
      );
      vortexGradient.addColorStop(0, `rgba(138, 43, 226, ${baseOpacity * 0.6})`);
      vortexGradient.addColorStop(0.5, `rgba(138, 43, 226, ${baseOpacity * 0.2})`);
      vortexGradient.addColorStop(1, "rgba(138, 43, 226, 0)");
      
      ctx.fillStyle = vortexGradient;
      ctx.fillRect(0, 0, width, height);
      
      // Add torch glow following mouse
      if (mouseActive) {
        const torchGradient = ctx.createRadialGradient(
          mouseX, mouseY, 0,
          mouseX, mouseY, torchRadius * 1.5
        );
        torchGradient.addColorStop(0, `rgba(138, 43, 226, ${baseOpacity * 1.2})`);
        torchGradient.addColorStop(0.3, `rgba(138, 43, 226, ${baseOpacity * 0.5})`);
        torchGradient.addColorStop(0.6, `rgba(138, 43, 226, ${baseOpacity * 0.15})`);
        torchGradient.addColorStop(1, "rgba(138, 43, 226, 0)");
        
        ctx.fillStyle = torchGradient;
        ctx.fillRect(0, 0, width, height);
      }
      
      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
      cancelAnimationFrame(animationRef.current);
    };
  }, [intensity, interactive]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ opacity: intensity === "subtle" ? 0.6 : intensity === "medium" ? 0.5 : 0.45 }}
    />
  );
}
