import { notFound } from "next/navigation";
import { WORKFLOW_MODULES } from "@/lib/reference-data";
import { ModuleWorkbench } from "@/components/module-workbench";

export function generateStaticParams() {
  return WORKFLOW_MODULES.map((module) => ({ slug: module.slug }));
}

export default function WorkflowPage({ params }: { params: { slug: string } }) {
  const module = WORKFLOW_MODULES.find((item) => item.slug === params.slug);
  if (!module) {
    notFound();
  }

  return <ModuleWorkbench module={module} />;
}
