"use client";

import { useState } from "react";
import { Camera, Check, Loader2 } from "lucide-react";
import html2canvas from "html2canvas";

const LOGO_URL = "https://i.ibb.co/TDMBKTP7/shfl-logo-2.png";

interface ScreenshotButtonProps {
  targetRef: React.RefObject<HTMLElement>;
  filename?: string;
  className?: string;
}

// Helper to load image as Promise
const loadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
};

export default function ScreenshotButton({ 
  targetRef, 
  filename = "shfl-pro-screenshot",
  className = ""
}: ScreenshotButtonProps) {
  const [status, setStatus] = useState<"idle" | "capturing" | "done">("idle");

  const captureScreenshot = async () => {
    if (!targetRef.current || status === "capturing") return;

    setStatus("capturing");

    try {
      // Load the logo first
      let logoImg: HTMLImageElement | null = null;
      try {
        logoImg = await loadImage(LOGO_URL);
      } catch {
        // Logo failed to load, continue without it
        console.warn("Failed to load watermark logo");
      }

      // Capture the modal content - keep options minimal to avoid layout issues
      const canvas = await html2canvas(targetRef.current, {
        backgroundColor: "#0a0a0a",
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: true,
      });

      // Create a new canvas to add watermark
      const finalCanvas = document.createElement("canvas");
      const ctx = finalCanvas.getContext("2d");
      if (!ctx) throw new Error("Could not get canvas context");

      finalCanvas.width = canvas.width;
      finalCanvas.height = canvas.height;

      // Draw the screenshot
      ctx.drawImage(canvas, 0, 0);

      // Add watermark in the center
      ctx.save();
      ctx.globalAlpha = 0.25; // 25% transparency

      const fontSize = Math.max(24, canvas.width * 0.035);
      const logoSize = fontSize * 1.5;
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      
      // Calculate total width of logo + text for centering
      const textWidth = fontSize * 4; // Approximate width of "shfl.pro"
      const gap = fontSize * 0.5;
      const totalWidth = logoSize + gap + textWidth;
      const startX = centerX - totalWidth / 2;

      // Draw logo if loaded
      if (logoImg) {
        ctx.drawImage(
          logoImg,
          startX,
          centerY - logoSize / 2,
          logoSize,
          logoSize
        );
      } else {
        // Fallback: draw a purple circle with "S"
        ctx.beginPath();
        ctx.arc(startX + logoSize / 2, centerY, logoSize / 2, 0, Math.PI * 2);
        ctx.fillStyle = "#8A2BE2";
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.font = `bold ${logoSize * 0.5}px system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("S", startX + logoSize / 2, centerY);
      }

      // Draw "shfl.pro" text
      ctx.font = `bold ${fontSize}px "Space Grotesk", "Inter", system-ui, sans-serif`;
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText("shfl.pro", startX + logoSize + gap, centerY);

      ctx.restore();

      // Convert to blob and download
      finalCanvas.toBlob((blob) => {
        if (!blob) return;

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${filename}-${new Date().toISOString().split("T")[0]}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        setStatus("done");
        setTimeout(() => setStatus("idle"), 2000);
      }, "image/png", 1.0);
    } catch (error) {
      console.error("Screenshot failed:", error);
      setStatus("idle");
    }
  };

  return (
    <button
      onClick={captureScreenshot}
      disabled={status === "capturing"}
      className={`
        group p-1.5 rounded-md transition-all duration-200
        text-terminal-textMuted hover:text-terminal-textSecondary
        hover:bg-terminal-border/30
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
      title="Download screenshot"
    >
      {status === "idle" && (
        <Camera className="w-3.5 h-3.5 opacity-40 group-hover:opacity-70 transition-opacity" />
      )}
      {status === "capturing" && (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      )}
      {status === "done" && (
        <Check className="w-3.5 h-3.5 text-terminal-positive" />
      )}
    </button>
  );
}

