"use client";

import * as React from "react";
import { toast as sonnerToast } from "sonner";

type ToastVariant = "default" | "destructive";

type ToastInput = {
  id?: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  variant?: ToastVariant;
  duration?: number;
  className?: string;
  onOpenChange?: (open: boolean) => void;
};

type ToastUpdate = ToastInput & {
  id: string;
};

function getToastMessage({ title, description }: ToastInput): React.ReactNode {
  return title ?? description ?? "";
}

function getToastOptions(props: ToastInput) {
  const { id, title, description, action, duration, className, onOpenChange } = props;

  return {
    id,
    description: title ? description : undefined,
    action,
    duration,
    className,
    onDismiss: () => onOpenChange?.(false),
    onAutoClose: () => onOpenChange?.(false),
  };
}

function toast(props: ToastInput) {
  const id = String(props.id ?? crypto.randomUUID());
  const show = props.variant === "destructive" ? sonnerToast.error : sonnerToast;

  show(getToastMessage(props), getToastOptions({ ...props, id }));

  return {
    id,
    dismiss: () => sonnerToast.dismiss(id),
    update: (nextProps: ToastUpdate) => {
      const next = { ...nextProps, id };
      const nextShow = next.variant === "destructive" ? sonnerToast.error : sonnerToast;
      nextShow(getToastMessage(next), getToastOptions(next));
    },
  };
}

function useToast() {
  return {
    toasts: [],
    toast,
    dismiss: (toastId?: string) => sonnerToast.dismiss(toastId),
  };
}

export { useToast, toast };
