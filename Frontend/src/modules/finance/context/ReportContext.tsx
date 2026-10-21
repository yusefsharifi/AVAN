import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { useFinanceStore } from '../store';
export type ReportContextType={fiscalYearId:string;fromPeriod:number;toPeriod:number;setFiscalYearId:(id:string)=>void;setPeriodRange:(from:number,to:number)=>void;recalcTrigger:number;forceRecalc:()=>void};
const Context=createContext<ReportContextType|null>(null);
export function ReportProvider({children}:{children:ReactNode}){const {fiscalYears,activeFiscalYear}=useFinanceStore();const initial=fiscalYears.find(y=>y.year===activeFiscalYear)?.id||fiscalYears[0]?.id||'';const [fiscalYearId,setFiscalYearId]=useState(initial),[fromPeriod,setFrom]=useState(1),[toPeriod,setTo]=useState(12),[recalcTrigger,setTrigger]=useState(0);const value=useMemo(()=>({fiscalYearId,fromPeriod,toPeriod,setFiscalYearId,setPeriodRange:(from:number,to:number)=>{setFrom(from);setTo(Math.max(from,to))},recalcTrigger,forceRecalc:()=>setTrigger(x=>x+1)}),[fiscalYearId,fromPeriod,toPeriod,recalcTrigger]);return <Context.Provider value={value}>{children}</Context.Provider>}
export function useReportContext(){const x=useContext(Context);if(!x)throw new Error('useReportContext باید داخل ReportProvider استفاده شود');return x}
export function useOptionalReportContext(){return useContext(Context)}
