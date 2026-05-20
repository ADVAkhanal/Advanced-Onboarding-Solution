import { notFound } from "next/navigation";
import { NAVIGATION, WORKFLOW_MODULES } from "@/lib/reference-data";
import { ModuleWorkbench } from "@/components/module-workbench";

export function generateStaticParams() {
  return NAVIGATION.map((slug) => ({ slug }));
}

export default function WorkflowPage({ params }: { params: { slug: string } }) {
  if (!NAVIGATION.includes(params.slug as never)) {
    notFound();
  }
  const workflowModule = WORKFLOW_MODULES.find((item) => item.slug === params.slug);
  if (!workflowModule) {
    notFound();
  }

  return <ModuleWorkbench module={workflowModule} />;
}
