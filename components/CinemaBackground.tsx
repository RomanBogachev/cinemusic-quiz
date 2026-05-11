import { CinemaParticleCanvas } from "@/components/CinemaParticleCanvas";

type CinemaBackgroundProps = {
  variant?: "apple" | "theater";
};

type CinemaTheaterBackdropProps = {
  className?: string;
};

export function CinemaTheaterBackdrop({ className = "pointer-events-none fixed inset-0 z-0 overflow-hidden bg-black" }: CinemaTheaterBackdropProps) {
  return (
    <div aria-hidden="true" className={className}>
      <div
        className="absolute inset-0 bg-cover bg-no-repeat"
        style={{
          backgroundImage: "url('/cinema-theme/cinema-hall-background.png')",
          backgroundPosition: "center bottom"
        }}
      />
      <div className="absolute inset-0 bg-black/20" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_34%,rgba(120,190,255,0.16)_0%,rgba(120,190,255,0.07)_22%,rgba(0,0,0,0)_52%)]" />
      <div className="absolute inset-0 hidden bg-[url('/cinema-theme/cinema-particles.svg')] bg-cover bg-center opacity-35 motion-reduce:block" />
      <CinemaParticleCanvas variant="theater" />
    </div>
  );
}

export function CinemaBackground({ variant = "apple" }: CinemaBackgroundProps) {
  if (variant === "theater") {
    return <CinemaTheaterBackdrop />;
  }

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
