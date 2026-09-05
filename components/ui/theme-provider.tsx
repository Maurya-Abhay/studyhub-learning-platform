'use client';
import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light'|'dark';
const ThemeContext = createContext<{theme:Theme;toggle:()=>void}>({theme:'dark',toggle:()=>{}});
export function ThemeProvider({children}:{children:React.ReactNode}){
  const [theme,setTheme]=useState<Theme>('dark');
  useEffect(()=>{const saved=localStorage.getItem('study-theme') as Theme|null; const next=saved||'dark'; setTheme(next); document.documentElement.classList.toggle('dark',next==='dark');},[]);
  const toggle=()=>setTheme(t=>{const next=t==='dark'?'light':'dark'; document.documentElement.classList.toggle('dark',next==='dark'); localStorage.setItem('study-theme',next); return next;});
  return <ThemeContext.Provider value={{theme,toggle}}>{children}</ThemeContext.Provider>
}
export const useTheme=()=>useContext(ThemeContext);
