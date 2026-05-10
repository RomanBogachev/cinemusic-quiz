import { CinemaParticleCanvas } from "@/components/CinemaParticleCanvas";

type CinemaBackgroundProps = {
  variant?: "apple" | "theater";
};

function TheaterSeats() {
  return (
    <div className="absolute inset-x-[-18%] bottom-[-1.5rem] h-[24vh] min-h-[120px] opacity-95 md:inset-x-[-8%] md:h-[32vh] md:min-h-[165px]">
      {[0, 1, 2].map((row) => (
        <div
          key={row}
          className="absolute left-1/2 flex -translate-x-1/2 justify-center gap-1.5 md:gap-2"
          style={{
            bottom: `${row * 2.45}rem`,
            transform: `translateX(-50%) scale(${1 - row * 0.12})`,
            opacity: 0.95 - row * 0.22
          }}
        >
          {Array.from({ length: 20 - row * 3 }).map((_, index) => (
            <span
              key={index}
              className="block h-11 w-9 rounded-t-[20px] border border-red-300/10 bg-[linear-gradient(180deg,#8f1526_0%,#4d0914_70%,#170307_100%)] shadow-[0_-10px_26px_rgba(255,54,82,0.08),inset_0_1px_0_rgba(255,255,255,0.16)] md:h-16 md:w-14 md:rounded-t-[28px]"
            />
          ))}
        </div>
      ))}
      <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black via-black/80 to-transparent" />
    </div>
  );
}

export function CinemaBackground({ variant = "apple" }: CinemaBackgroundProps) {
  if (variant === "theater") {
    return (
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#030207]">
        <CinemaParticleCanvas variant="theater" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center_top,rgba(245,214,152,0.22),rgba(18,12,24,0.50)_34%,rgba(3,2,7,0.98)_72%)]" />
        <div className="absolute left-1/2 top-[7vh] h-[42vh] w-[82vw] -translate-x-1/2 bg-[linear-gradient(180deg,rgba(255,244,216,0.20),rgba(122,173,255,0.08)_45%,transparent)] blur-2xl [clip-path:polygon(40%_0,60%_0,100%_100%,0_100%)]" />
        <div className="absolute left-1/2 top-[10vh] h-[52vh] w-[82vw] -translate-x-1/2 rounded-[50%] bg-[radial-gradient(ellipse_at_center,rgba(178,215,255,0.18),rgba(255,215,149,0.10)_38%,transparent_70%)] blur-2xl" />
        <div className="absolute inset-y-0 left-0 w-[22vw] bg-gradient-to-r from-black via-black/60 to-transparent" />
        <div className="absolute inset-y-0 right-0 w-[22vw] bg-gradient-to-l from-black via-black/60 to-transparent" />
        <div className="absolute inset-x-0 top-0 h-[38vh] bg-[linear-gradient(180deg,rgba(0,0,0,0.82),rgba(0,0,0,0.18),transparent)]" />
        <div className="absolute inset-x-[9vw] top-[12vh] h-[42vh] rounded-[3rem] bg-[radial-gradient(ellipse_at_center,rgba(255,239,202,0.16),rgba(94,143,214,0.08)_42%,transparent_72%)] blur-3xl" />
        <TheaterSeats />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(4,3,8,0.1),rgba(0,0,0,0.34)_72%,rgba(0,0,0,0.9))]" />
      </div>
    );
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
