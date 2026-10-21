const LiveDot = ({ color = "bg-emerald-500" }: { color?: string }) => (
  <span className="relative inline-flex h-2.5 w-2.5 flex-shrink-0">
    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${color} opacity-60`} />
    <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${color}`} />
  </span>
);
export default LiveDot;
