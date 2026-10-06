import { CheckCircle2, XCircle } from 'lucide-react'
export default function Toast({ message, error }: { message: string; error?: boolean }) {
  return <div className={`fixed bottom-5 right-5 z-[100] flex max-w-sm items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold text-white shadow-2xl ${error ? 'bg-rose-600' : 'bg-slate-900'}`}>
    {error ? <XCircle size={18}/> : <CheckCircle2 size={18}/>} {message}
  </div>
}
