import type { ButtonHTMLAttributes, JSX } from "react";

import { cn } from "@/lib/utils";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

export function Button({ className, ...props }: ButtonProps): JSX.Element {
  return (
    <button
      className={cn(
        "rounded-md bg-sky-500 px-4 py-2 font-medium text-slate-950 transition hover:bg-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-300 disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}
