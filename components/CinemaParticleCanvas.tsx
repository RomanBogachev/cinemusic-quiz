"use client";

import { useEffect, useRef } from "react";

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
};

export function CinemaParticleCanvas() {
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
      for (let index = 0; index < 36; index += 1) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.18,
          vy: (Math.random() - 0.5) * 0.18,
          radius: 1.5 + Math.random() * 4,
          alpha: 0.16 + Math.random() * 0.24
        });
      }
    }

    function draw(time: number) {
      context.clearRect(0, 0, width, height);
      const glow = context.createRadialGradient(width * 0.5, height * 0.25, 0, width * 0.5, height * 0.25, width * 0.7);
      glow.addColorStop(0, `rgba(0, 122, 255, ${0.08 + Math.sin(time / 1400) * 0.025})`);
      glow.addColorStop(0.52, "rgba(52, 199, 89, 0.035)");
      glow.addColorStop(1, "rgba(255, 255, 255, 0)");
      context.fillStyle = glow;
      context.fillRect(0, 0, width, height);

      for (const particle of particles) {
        particle.x += particle.vx;
        particle.y += particle.vy;
        if (particle.x < -20) particle.x = width + 20;
        if (particle.x > width + 20) particle.x = -20;
        if (particle.y < -20) particle.y = height + 20;
        if (particle.y > height + 20) particle.y = -20;

        const gradient = context.createRadialGradient(particle.x, particle.y, 0, particle.x, particle.y, particle.radius * 7);
        gradient.addColorStop(0, `rgba(0, 122, 255, ${particle.alpha})`);
        gradient.addColorStop(1, "rgba(0, 122, 255, 0)");
        context.fillStyle = gradient;
        context.beginPath();
        context.arc(particle.x, particle.y, particle.radius * 7, 0, Math.PI * 2);
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
  }, []);

  return <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none fixed inset-0 -z-20" />;
}
