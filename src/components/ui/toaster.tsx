"use client";

import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster
      closeButton
      richColors
      position="bottom-right"
      toastOptions={{
        classNames: {
          toast: "font-sans",
          title: "text-sm font-semibold",
          description: "text-xs",
        },
      }}
    />
  );
}
