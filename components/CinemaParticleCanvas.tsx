"use client";

import { useEffect, useRef } from "react";

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  hue: "gold" | "blue" | "white";
};

type CinemaParticleCanvasProps = {
  variant?: "apple" | "theater";
};

const theaterColors: Record<Particle["hue"], [number, number, number]> = {
  gold: [255, 214, 132],
  blue: [170, 211, 255],
  white: [255, 255, 255]
};

export function CinemaParticleCanvas({ variant = "apple" }: CinemaParticleCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (media.matches) return;

    const currentCanvas = canvasRef.current;
    const currentContext = currentCanvas?.getContext("2d");
    if (!currentCanvas || !currentContext) return;
    const canvas = currentCanvas;
    const context = currentContext;

    let animationFrame = 0;
    let width = 0;
    let height = 0;
    const particles: Particle[] = [];

    function resize() {
      const ratio = window.devicePixelRatio || 1;
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * ratio);
      canvas.height = Math.floor(height * ratio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      particles.length = 0;
      const particleCount = variant === "theater" ? 54 : 36;
      for (let index = 0; index < particleCount; index += 1) {
        const hue = Math.random() > 0.72 ? "blue" : Math.random() > 0.45 ? "gold" : "white";
        particles.push({
          x: variant === "theater" ? width * (0.18 + Math.random() * 0.64) : Math.random() * width,
          y: variant === "theater" ? height * (0.08 + Math.random() * 0.62) : Math.random() * height,
          vx: (Math.random() - 0.5) * (variant === "theater" ? 0.11 : 0.18),
          vy: (Math.random() - 0.5) * (variant === "theater" ? 0.08 : 0.18),
          radius: variant === "theater" ? 0.7 + Math.random() * 3.8 : 1.5 + Math.random() * 4,
          alpha: variant === "theater" ? 0.12 + Math.random() * 0.22 : 0.16 + Math.random() * 0.24,
          hue
        });
      }
    }

    function draw(time: number) {
      context.clearRect(0, 0, width, height);
      const glow = context.createRadialGradient(width * 0.5, height * 0.28, 0, width * 0.5, height * 0.28, width * 0.72);
      if (variant === "theater") {
        glow.addColorStop(0, `rgba(255, 228, 178, ${0.11 + Math.sin(time / 1800) * 0.025})`);
        glow.addColorStop(0.45, "rgba(125, 173, 255, 0.045)");
        glow.addColorStop(1, "rgba(255, 255, 255, 0)");
      } else {
        glow.addColorStop(0, `rgba(0, 122, 255, ${0.08 + Math.sin(time / 1400) * 0.025})`);
        glow.addColorStop(0.52, "rgba(52, 199, 89, 0.035)");
        glow.addColorStop(1, "rgba(255, 255, 255, 0)");
      }
      context.fillStyle = glow;
      context.fillRect(0, 0, width, height);

      for (const particle of particles) {
        particle.x += particle.vx;
        particle.y += particle.vy;
        if (particle.x < -20) particle.x = width + 20;
        if (particle.x > width + 20) particle.x = -20;
        if (particle.y < -20) particle.y = height + 20;
        if (particle.y > height + 20) particle.y = -20;

        const [red, green, blue] = variant === "theater" ? theaterColors[particle.hue] : [0, 122, 255];
        const gradient = context.createRadialGradient(particle.x, particle.y, 0, particle.x, particle.y, particle.radius * (variant === "theater" ? 9 : 7));
        gradient.addColorStop(0, `rgba(${red}, ${green}, ${blue}, ${particle.alpha})`);
        gradient.addColorStop(0.38, `rgba(${red}, ${green}, ${blue}, ${particle.alpha * 0.34})`);
        gradient.addColorStop(1, `rgba(${red}, ${green}, ${blue}, 0)`);
        context.fillStyle = gradient;
        context.beginPath();
        context.arc(particle.x, particle.y, particle.radius * (variant === "theater" ? 9 : 7), 0, Math.PI * 2);
        context.fill();
      }
      animationFrame = requestAnimationFrame(draw);
    }

    resize();
    window.addEventListener("resize", resize);
    animationFrame = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationFrame);
    };
  }, [variant]);

  return <canvas ref={canvasRef} aria-hidden="true" className={`pointer-events-none fixed inset-0 ${variant === "theater" ? "z-0" : "-z-20"}`} />;
}
