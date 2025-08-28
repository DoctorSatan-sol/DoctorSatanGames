import RoulettePrev from "@/components/RoulettePrev";

export default function Home() {
  return (
  <div className="flex flex-wrap gap-4">
      <RoulettePrev />
      <RoulettePrev />
      {/* Добавьте до 4 элементов в ряд, далее они будут переноситься вниз */}
    </div>
  );
}