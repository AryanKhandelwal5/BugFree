import { Button } from "@/components/ui/button";
import type { JSX } from "react";

const capabilities = ["Repository intelligence", "AI engineering agents", "Secure execution"];

export default function HomePage(): JSX.Element {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 py-16">
      <p className="mb-4 text-sm font-semibold uppercase tracking-[0.24em] text-sky-300">CodePilot AI</p>
      <h1 className="max-w-3xl text-5xl font-bold tracking-tight text-white">
        Production-grade software engineering, amplified by AI.
      </h1>
      <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
        The workspace foundation is online. Repository-aware planning, governed execution, and
        persistent engineering memory will arrive as tested vertical slices.
      </p>
      <ul className="mt-10 grid gap-3 sm:grid-cols-3">
        {capabilities.map((capability) => (
          <li className="rounded-lg border border-slate-700 bg-slate-900 p-4 text-slate-200" key={capability}>
            {capability}
          </li>
        ))}
      </ul>
      <div className="mt-10"><Button type="button">Platform foundation</Button></div>
    </main>
  );
}
