import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function DashboardPage() {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold tracking-tight">数据总览</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          { title: "全部计划", value: "0" },
          { title: "已完成", value: "0" },
          { title: "进行中", value: "0" },
          { title: "逾期", value: "0" },
        ].map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
