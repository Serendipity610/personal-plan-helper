import { useState, useEffect } from "react";
import { listPlans, listCategories, listTagWorkflows } from "@/lib/api";
import type { Plan, Category, TagWorkflow } from "@/types";

function App() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [workflows, setWorkflows] = useState<TagWorkflow[]>([]);

  useEffect(() => {
    listPlans()
      .then(setPlans)
      .catch((e) => console.error("Failed to load plans:", e));

    listCategories()
      .then(setCategories)
      .catch((e) => console.error("Failed to load categories:", e));

    listTagWorkflows()
      .then(setWorkflows)
      .catch((e) => console.error("Failed to load workflows:", e));
  }, []);

  return (
    <div className="min-h-screen bg-background p-8">
      <h1 className="text-3xl font-bold mb-8">个人计划管理器</h1>

      {/* Stats summary */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-card rounded-lg border p-4">
          <div className="text-sm text-muted-foreground">全部计划</div>
          <div className="text-2xl font-bold">{plans.length}</div>
        </div>
        <div className="bg-card rounded-lg border p-4">
          <div className="text-sm text-muted-foreground">进行中</div>
          <div className="text-2xl font-bold">
            {plans.filter((p) => p.status === "active").length}
          </div>
        </div>
        <div className="bg-card rounded-lg border p-4">
          <div className="text-sm text-muted-foreground">已完成</div>
          <div className="text-2xl font-bold">
            {plans.filter((p) => p.status === "completed").length}
          </div>
        </div>
        <div className="bg-card rounded-lg border p-4">
          <div className="text-sm text-muted-foreground">分类数</div>
          <div className="text-2xl font-bold">{categories.length}</div>
        </div>
      </div>

      {/* Plans list */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">计划列表</h2>
        {plans.length === 0 ? (
          <p className="text-muted-foreground">暂无计划，请先创建计划。</p>
        ) : (
          <div className="space-y-2">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className="bg-card rounded-lg border p-4 flex items-center gap-4"
              >
                <div className="flex-1">
                  <h3 className="font-medium">{plan.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {plan.description || "无描述"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-1 rounded bg-secondary">
                    {plan.status === "active"
                      ? "进行中"
                      : plan.status === "completed"
                        ? "已完成"
                        : "已取消"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    重要: {plan.importance} | 紧急: {plan.urgency}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Categories */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">分类</h2>
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <span
              key={cat.id}
              className="px-3 py-1 rounded-full text-sm text-white"
              style={{ backgroundColor: cat.color }}
            >
              {cat.name}
            </span>
          ))}
        </div>
      </section>

      {/* Workflows */}
      <section>
        <h2 className="text-xl font-semibold mb-4">工作流模板</h2>
        {workflows.length === 0 ? (
          <p className="text-muted-foreground">暂无工作流模板。</p>
        ) : (
          <div className="space-y-2">
            {workflows.map((wf) => (
              <div
                key={wf.id}
                className="bg-card rounded-lg border p-4"
              >
                <h3 className="font-medium">{wf.name}</h3>
                <p className="text-sm text-muted-foreground">
                  步骤: {wf.steps}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default App;
