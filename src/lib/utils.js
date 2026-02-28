import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function getColorForString(str) {
  if (!str) return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
  
  const colors = [
    'bg-red-500/20 text-red-400 border-red-500/30',
    'bg-orange-500/20 text-orange-400 border-orange-500/30',
    'bg-amber-500/20 text-amber-400 border-amber-500/30',
    'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    'bg-lime-500/20 text-lime-400 border-lime-500/30',
    'bg-green-500/20 text-green-400 border-green-500/30',
    'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    'bg-teal-500/20 text-teal-400 border-teal-500/30',
    'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    'bg-sky-500/20 text-sky-400 border-sky-500/30',
    'bg-blue-500/20 text-blue-400 border-blue-500/30',
    'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
    'bg-violet-500/20 text-violet-400 border-violet-500/30',
    'bg-purple-500/20 text-purple-400 border-purple-500/30',
    'bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/30',
    'bg-pink-500/20 text-pink-400 border-pink-500/30',
    'bg-rose-500/20 text-rose-400 border-rose-500/30',
  ];

  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const index = Math.abs(hash) % colors.length;
  return colors[index];
}

export function getRecipeColor(str) {
  if (!str) return {
    border: 'border-slate-700',
    text: 'text-slate-300',
    glow: 'shadow-none',
    bg: 'bg-slate-500/10'
  };

  const themes = [
    { border: 'border-red-500/30', text: 'text-red-400', glow: 'shadow-red-500/10', bg: 'bg-red-500/10' },
    { border: 'border-orange-500/30', text: 'text-orange-400', glow: 'shadow-orange-500/10', bg: 'bg-orange-500/10' },
    { border: 'border-amber-500/30', text: 'text-amber-400', glow: 'shadow-amber-500/10', bg: 'bg-amber-500/10' },
    { border: 'border-yellow-500/30', text: 'text-yellow-400', glow: 'shadow-yellow-500/10', bg: 'bg-yellow-500/10' },
    { border: 'border-lime-500/30', text: 'text-lime-400', glow: 'shadow-lime-500/10', bg: 'bg-lime-500/10' },
    { border: 'border-green-500/30', text: 'text-green-400', glow: 'shadow-green-500/10', bg: 'bg-green-500/10' },
    { border: 'border-emerald-500/30', text: 'text-emerald-400', glow: 'shadow-emerald-500/10', bg: 'bg-emerald-500/10' },
    { border: 'border-teal-500/30', text: 'text-teal-400', glow: 'shadow-teal-500/10', bg: 'bg-teal-500/10' },
    { border: 'border-cyan-500/30', text: 'text-cyan-400', glow: 'shadow-cyan-500/10', bg: 'bg-cyan-500/10' },
    { border: 'border-sky-500/30', text: 'text-sky-400', glow: 'shadow-sky-500/10', bg: 'bg-sky-500/10' },
    { border: 'border-blue-500/30', text: 'text-blue-400', glow: 'shadow-blue-500/10', bg: 'bg-blue-500/10' },
    { border: 'border-indigo-500/30', text: 'text-indigo-400', glow: 'shadow-indigo-500/10', bg: 'bg-indigo-500/10' },
    { border: 'border-violet-500/30', text: 'text-violet-400', glow: 'shadow-violet-500/10', bg: 'bg-violet-500/10' },
    { border: 'border-purple-500/30', text: 'text-purple-400', glow: 'shadow-purple-500/10', bg: 'bg-purple-500/10' },
    { border: 'border-fuchsia-500/30', text: 'text-fuchsia-400', glow: 'shadow-fuchsia-500/10', bg: 'bg-fuchsia-500/10' },
    { border: 'border-pink-500/30', text: 'text-pink-400', glow: 'shadow-pink-500/10', bg: 'bg-pink-500/10' },
    { border: 'border-rose-500/30', text: 'text-rose-400', glow: 'shadow-rose-500/10', bg: 'bg-rose-500/10' },
  ];

  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const index = Math.abs(hash) % themes.length;
  return themes[index];
}