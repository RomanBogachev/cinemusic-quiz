import { CinemaParticleCanvas } from "@/components/CinemaParticleCanvas";

export function CinemaBackground() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <CinemaParticleCanvas />
      <div className="absolute left-1/2 top-[-16rem] h-[34rem] w-[52rem] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute bottom-[-18rem] left-[-8rem] h-[34rem] w-[34rem] rounded-full bg-success/8 blur-3xl" />
      <div className="absolute right-[-10rem] top-1/3 h-[28rem] w-[28rem] rounded-full bg-primary/8 blur-3xl" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.72),rgba(245,245,247,0.86))]" />
    </div>
  );
}
