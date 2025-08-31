import RoulettePrev from "@/components/RoulettePrev";

export default function Home() {
  return (
  <div className="flex flex-wrap gap-4">
      <RoulettePrev title="Bullet's Fate" link="/roulette" />
      <RoulettePrev title="Clicks to Hell" link="/poc" />
    </div>
  );
}