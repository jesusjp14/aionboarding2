"use client";
import { Card, Button } from "@/components/ui";

// Pantallas de contenido (Bienvenida / Proceso). Muestra video si hay
// videoUrl, o solo el texto si es null. Así se suben videos después sin tocar código.
export default function ContentScreen({
  title,
  body,
  videoUrl,
  onNext,
  nextLabel = "Continuar →",
}: {
  title: string;
  body: string;
  videoUrl?: string | null;
  onNext: () => void;
  nextLabel?: string;
}) {
  return (
    <Card>
      <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
      {videoUrl ? (
        <div className="mt-6 aspect-video w-full overflow-hidden rounded-xl bg-slate-100">
          <iframe
            src={videoUrl}
            className="h-full w-full"
            allow="accelerometer; autoplay; encrypted-media; gyroscope"
            allowFullScreen
          />
        </div>
      ) : null}
      <p className="mt-6 whitespace-pre-line leading-relaxed text-slate-600">{body}</p>
      <div className="mt-8">
        <Button onClick={onNext}>{nextLabel}</Button>
      </div>
    </Card>
  );
}
