export default function ConfirmDialog({
  open,
  title,
  text,
  confirmLabel = 'Confirm',
  danger,
  busy,
  onClose,
  onConfirm,
}: {
  open: boolean
  title: string
  text: string
  confirmLabel?: string
  danger?: boolean
  busy?: boolean
  onClose: () => void
  onConfirm: () => void
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[80] grid place-items-end bg-slate-950/50 p-4 sm:place-items-center" onClick={onClose}>
      <div className="glass-card w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-black">{title}</h3>
        <p className="mt-2 text-sm text-slate-500">{text}</p>
        <div className="mt-6 flex justify-end gap-2">
          <button className="btn-secondary" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button
            className={danger ? 'btn-primary bg-rose-600 hover:bg-rose-700' : 'btn-primary'}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
