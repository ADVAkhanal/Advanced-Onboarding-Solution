import { notFound } from "next/navigation";
import { WORKFLOW_MODULES } from "@/lib/reference-data";
import { ModuleWorkbench } from "@/components/module-workbench";

export function generateStaticParams() {
  return WORKFLOW_MODULES.map((item) => ({ slug: item.slug }));
}

export default function WorkflowPage({ params }: { params: { slug: string } }) {
  const workflowModule = WORKFLOW_MODULES.find((item) => item.slug === params.slug);
  if (!workflowModule) {
    notFound();
  }

  return <ModuleWorkbench module={workflowModule} />;
}
