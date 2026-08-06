import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function MatrixPage() {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold tracking-tight">艾森豪威尔四象限</h2>
      <div className="grid grid-cols-2 gap-4">
        {[
          { title: "重要 & 紧急", color: "border-red-400" },
          { title: "重要 & 不紧急", color: "border-blue-400" },
          { title: "不重要 & 紧急", color: "border-yellow-400" },
          { title: "不重要 & 不紧急", color: "border-green-400" },
        ].map((quadrant) => (
          <Card key={quadrant.title} className={`border-l-4 ${quadrant.color}`}>
            <CardHeader>
              <CardTitle className="text-base">{quadrant.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">暂无计划</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
