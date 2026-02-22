"use client";

type LeaveCartDialogProps = {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function LeaveCartDialog({ open, onCancel, onConfirm }: LeaveCartDialogProps) {
  if (!open) return null;

  return (
    <>
      <button
        type="button"
        aria-label="Close leave cart dialog"
        className="fixed inset-0 z-40 bg-black/35"
        onClick={onCancel}
      />
      <div className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-[448px] rounded-t-3xl bg-[#FDFAF1] p-5 shadow-[0_-10px_30px_rgba(0,0,0,0.18)]">
        <h3 className="text-lg font-bold text-[#8D4925]">Leave this page?</h3>
        <p className="mt-2 text-sm leading-6 text-[#475569]">
          You have items in your cart. If you leave now, those items will be removed.
        </p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="h-11 rounded-xl border border-[#8D4925]/20 bg-white text-sm font-bold text-[#8D4925]"
          >
            Stay Here
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="h-11 rounded-xl bg-[#8D4925] text-sm font-bold text-white"
          >
            Leave Page
          </button>
        </div>
      </div>
    </>
  );
}
