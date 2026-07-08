"use client";
import { useState } from "react";
import { StepId, Session } from "@/lib/steps";
import Stepper from "@/components/Stepper";
import OptinForm from "@/components/steps/OptinForm";
import ContentScreen from "@/components/steps/ContentScreen";
import OrbCall from "@/components/steps/OrbCall";
import TextPhase from "@/components/steps/TextPhase";
import DocScreen from "@/components/steps/DocScreen";
import AgendarScreen from "@/components/steps/AgendarScreen";
import GraciasChecklist from "@/components/steps/GraciasChecklist";

export default function Home() {
  const [step, setStep] = useState<StepId>("optin");
  const [session, setSession] = useState<Session | null>(null);

  const patch = (p: Partial<Session>) =>
    setSession((s) => (s ? { ...s, ...p } : s));

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 sm:py-16">
      {session && <Stepper current={step} />}

      {step === "optin" && (
        <OptinForm
          onDone={(s) => {
            setSession(s);
            setStep("bienvenida");
          }}
        />
      )}

      {step === "bienvenida" && (
        <ContentScreen
          title={`¡Hola, ${session?.nombre.split(" ")[0]}! Bienvenido 🎉`}
          body={
            "Estás por configurar tu agente de IA con Propy AI. En los próximos minutos vas a conversar con el ORB por voz, dejar unos datos por escrito, y recibir tu documento de onboarding.\n\nDale continuar cuando estés listo."
          }
          videoUrl={null}
          onNext={() => setStep("proceso")}
        />
      )}

      {step === "proceso" && (
        <ContentScreen
          title="Así trabajaremos juntos"
          body={
            "1. Conversas con el ORB por voz sobre tu negocio.\n2. Completas un cuestionario corto con datos exactos.\n3. Generamos tu documento de onboarding.\n4. Agendas tu reunión de planificación.\n\n¡Empecemos!"
          }
          videoUrl={null}
          onNext={() => setStep("orb")}
          nextLabel="Empezar la llamada →"
        />
      )}

      {step === "orb" && session && (
        <OrbCall session={session} onDone={() => setStep("texto")} />
      )}

      {step === "texto" && session && (
        <TextPhase
          session={session}
          onDone={(answers) => {
            patch({ answers: { ...session.answers, ...answers } });
            setStep("doc");
          }}
        />
      )}

      {step === "doc" && (
        <DocScreen docUrl={session?.doc_url} onNext={() => setStep("agendar")} />
      )}

      {step === "agendar" && <AgendarScreen onNext={() => setStep("gracias")} />}

      {step === "gracias" && <GraciasChecklist nombre={session?.nombre ?? ""} />}
    </main>
  );
}
