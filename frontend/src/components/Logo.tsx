import { BriefcaseBusiness } from 'lucide-react'

export default function Logo() {
  return (
    <div className="flex items-center gap-2.5 font-black tracking-tight text-slate-950 dark:text-white">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/25">
        <BriefcaseBusiness size={19} />
      </span>
      <span className="text-lg">get<span className="text-emerald-500">Placed</span></span>
    </div>
  )
}
