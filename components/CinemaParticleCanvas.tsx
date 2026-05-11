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
    let lastDrawTime = 0;
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
      const particleCount = variant === "theater" ? 22 : 30;
      for (let index = 0; index < particleCount; index += 1) {
        const hue = Math.random() > 0.72 ? "blue" : Math.random() > 0.45 ? "gold" : "white";
        particles.push({
          x: variant === "theater" ? width * (0.18 + Math.random() * 0.64) : Math.random() * width,
          y: variant === "theater" ? height * (0.08 + Math.random() * 0.62) : Math.random() * height,
          vx: (Math.random() - 0.5) * (variant === "theater" ? 0.11 : 0.18),
          vy: (Math.random() - 0.5) * (variant === "theater" ? 0.08 : 0.18),
          radius: variant === "theater" ? 0.7 + Math.random() * 1.7 : 1.2 + Math.random() * 3,
          alpha: variant === "theater" ? 0.10 + Math.random() * 0.14 : 0.14 + Math.random() * 0.2,
          hue
        });
      }
    }

    function draw(time: number) {
      const minFrameTime = variant === "theater" ? 1000 / 24 : 1000 / 30;
      if (time - lastDrawTime < minFrameTime) {
        animationFrame = requestAnimationFrame(draw);
        return;
      }
      lastDrawTime = time;
      context.clearRect(0, 0, width, height);

      for (const particle of particles) {
        particle.x += particle.vx;
        particle.y += particle.vy;
        if (particle.x < -20) particle.x = width + 20;
        if (particle.x > width + 20) particle.x = -20;
        if (particle.y < -20) particle.y = height + 20;
        if (particle.y > height + 20) particle.y = -20;

        const [red, green, blue] = variant === "theater" ? theaterColors[particle.hue] : [0, 122, 255];
        context.fillStyle = `rgba(${red}, ${green}, ${blue}, ${particle.alpha})`;
        context.beginPath();
        context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
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
