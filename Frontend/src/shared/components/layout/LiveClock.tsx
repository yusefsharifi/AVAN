import { useState, useEffect } from "react";
export const LiveClock = ({ dark = false }: { dark?: boolean }) => {
  const [t, setT] = useState(new Date());
  useEffect(() => { const id = setInterval(() => setT(new Date()), 1000); return () => clearInterval(id); }, []);
  return (
    <div dir="ltr" className="text-center">
      <div className={`text-2xl font-bold font-mono tracking-wider ${dark ? "text-white" : "text-primary"}`}>
        {t.toLocaleTimeString("fa-IR")}
      </div>
      <div className={`text-[10px] mt-0.5 ${dark ? "text-blue-300" : "text-muted-foreground"}`}>
        {t.toLocaleDateString("fa-IR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
      </div>
    </div>
  );
};
