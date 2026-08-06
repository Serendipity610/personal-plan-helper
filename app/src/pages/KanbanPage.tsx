import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function KanbanPage() {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold tracking-tight">看板视图</h2>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">看板</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">看板视图开发中...</p>
        </CardContent>
      </Card>
    </div>
  );
}
