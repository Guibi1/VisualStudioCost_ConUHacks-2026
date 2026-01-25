import * as React from "react";
import Autoplay from "embla-carousel-autoplay";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";

export const Route = createFileRoute("/")({ component: Page });

const slides = [
    {
        type: "video" as const,
        src: "https://www.youtube.com/embed/q1dqM86BbKo?rel=0",
        label: "2-minute overview",
    },
    {
        type: "image" as const,
        src: "/Screenshot 2026-01-25 at 10.06.51.png",
        label: "Dashboard summary",
    },
    {
        type: "image" as const,
        src: "/Screenshot 2026-01-25 at 10.07.22.png",
        label: "Cost drivers view",
    },
    {
        type: "image" as const,
        src: "/Screenshot 2026-01-25 at 10.07.46.png",
        label: "Trend breakdown",
    },
];

function Page() {
    const autoplay = React.useRef(
        Autoplay({
            delay: 2000,
            stopOnInteraction: false,
            stopOnMouseEnter: true,
        }),
    );

    return (
        <div className="min-h-full bg-gradient-to-b from-background via-background to-muted/40">
            <div className="mx-auto max-w-6xl px-6 py-16">
                <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_minmax(0,1fr)]">
                    <div className="space-y-6 text-center lg:text-left">
                        <div className="flex items-center justify-center gap-4 lg:justify-start">
                            <img src="/logo.png" alt="VSCost logo" className="mt-1 h-12 w-12" />
                            <div className="space-y-1">
                                <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">VSCost</h1>
                                <p className="text-base text-muted-foreground">
                                    Track, visualize, and understand your costs over time.
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-center gap-3 lg:justify-start">
                            <div className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
                                Cloud + Repo native
                            </div>
                            <div className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-100">
                                Real-time insights
                            </div>
                        </div>

                        <p className="text-lg text-muted-foreground">
                            Ship confidently with live cost signals, actionable alerts, and dashboards tailored to your
                            repositories.
                        </p>

                        <div className="flex flex-wrap items-center justify-center gap-3 lg:justify-start">
                            <Button size="lg" render={<Link to="/dashboard" />} nativeButton={false}>
                                Open Dashboard
                            </Button>
                        </div>

                        <div className="grid grid-cols-1 gap-4 text-sm text-muted-foreground sm:grid-cols-3">
                            <div>📊 Cost breakdowns</div>
                            <div>⏱ Real-time updates</div>
                            <div>📈 Historical trends</div>
                        </div>
                    </div>

                    <div className="rounded-2xl border bg-card/70 p-4 shadow-xl shadow-black/5 backdrop-blur">
                        <Carousel className="w-full" opts={{ align: "start", loop: true }} plugins={[autoplay.current]}>
                            <CarouselContent>
                                {slides.map((slide) => (
                                    <CarouselItem key={slide.src} className="pl-2 pr-2 lg:pl-4 lg:pr-4">
                                        <div className="overflow-hidden rounded-xl border bg-muted/40 shadow-sm">
                                            {slide.type === "video" ? (
                                                <iframe
                                                    title="VSCost overview video"
                                                    src={slide.src}
                                                    className="aspect-video w-full"
                                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                    allowFullScreen
                                                />
                                            ) : (
                                                <img
                                                    src={slide.src}
                                                    alt={slide.label}
                                                    className="aspect-video w-full object-cover"
                                                    loading="lazy"
                                                />
                                            )}
                                        </div>
                                        <p className="mt-3 text-center text-sm text-muted-foreground">{slide.label}</p>
                                    </CarouselItem>
                                ))}
                            </CarouselContent>

                            <CarouselPrevious className="hidden lg:flex" />
                            <CarouselNext className="hidden lg:flex" />
                        </Carousel>

                        <p className="mt-3 text-center text-xs text-muted-foreground">
                            Auto-plays every 2 seconds (hover to pause, swipe or use arrows to explore).
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
