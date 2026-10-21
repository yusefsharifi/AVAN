import { ResponsiveContainer, LineChart, Line } from "recharts";
export const Spark = ({ data, up = true }: { data: number[]; up?: boolean }) => (
  <ResponsiveContainer width={72} height={32}>
    <LineChart data={data.map((v, i) => ({ v, i }))}>
      <Line type="monotone" dataKey="v" stroke={up ? "#10B981" : "#EF4444"} dot={false} strokeWidth={1.5} />
    </LineChart>
  </ResponsiveContainer>
);
