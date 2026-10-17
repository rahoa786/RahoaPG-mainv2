import { Home } from 'lucide-react';

export default function Logo() {
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-navy-800 text-white shadow-md">
        <Home className="h-5 w-5" />
      </div>
      <div className="flex flex-col leading-none">
        <span className="text-lg font-extrabold tracking-tight text-navy-800">Rahoa</span>
        <span className="text-[11px] font-medium text-navy-400">List. Match. Stay.</span>
      </div>
    </div>
  );
}
