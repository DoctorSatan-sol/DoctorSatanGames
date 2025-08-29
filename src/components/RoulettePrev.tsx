import Link from "next/link";

interface RoulettePrevProps {
    title: string;
    link: string;
}

export default function RoulettePrev({ title, link }: RoulettePrevProps) {
    return (
        <div className="basis-[24%] min-w-[180px] flex-shrink-0 flex flex-col items-start">
            <Link href={link} className="group block rounded-xl overflow-hidden shadow-lg border-2 border-red-800 bg-black/70 hover:scale-105 transition-all duration-200">
                <div className="flex flex-col gap-1 p-1">
                    <div className="aspect-video w-full rounded-lg border-2 border-red-800 overflow-hidden">
                        <img
                            src={`/${title}.png`}
                            alt="Roulette preview"
                            className="object-cover w-full h-full bg-black"
                            style={{ aspectRatio: '16/9' }}
                        />
                    </div>
                    <div className="flex items-center justify-center rounded-lg border-2 border-red-800 bg-black/80 p-1">
                        <span
                            className="text-2xl font-bold select-none"
                            style={{    
                                fontFamily: "'Creepster', cursive, sans-serif",
                                textShadow: '3px 3px 0 #500, 6px 6px 0 #200',
                                letterSpacing: '2px',
                                color: '#ef4444',
                            }}
                        >
                            {title}
                        </span>
                    </div>
                </div>
            </Link>
        </div>
    )
}