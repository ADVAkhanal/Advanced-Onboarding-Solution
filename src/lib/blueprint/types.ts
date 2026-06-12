/**
 * ERP/MES Platform Blueprint — shared types.
 *
 * The blueprint is data-driven: structured assessments in src/lib/blueprint/*
 * rendered by the /blueprint pages. Strategy content, not runtime config —
 * editing the data files updates the published blueprint.
 */

/** The solution-path ladder, ordered cheapest-to-own first. */
export type SolutionPath =
  | "Native"          // ERPNext supports it out of the box
  | "Configuration"   // settings, roles, print formats, notifications
  | "Custom DocType"  // new doctypes in the advanced_pmc custom app
  | "Workflow"        // Frappe workflow states/transitions
  | "Scripting"       // server/client scripts in the custom app
  | "Custom App"      // built in the Shop-Management experience layer
  | "Hybrid";         // ERPNext core + Shop-Management layer together

export type Level = "Low" | "Medium" | "High";

/** One feature run through the 10-step evaluation. */
export type FeatureAssessment = {
  feature: string;
  /** What ERPNext provides today (steps 1–5 condensed honestly). */
  erpnext: string;
  /** Most maintainable solution path (step 10). */
  path: SolutionPath;
  complexity: Level;
  maintenance: Level;
  upgradeRisk: Level;
  /** The recommendation, including what already exists in Shop-Management. */
  recommendation: string;
};

export type CompetitorTake = {
  proshop: string;
  fulcrum: string;
  jobboss: string;
  gss: string;
  /** Our competitive edge for this module. */
  edge: string;
  /** Honest weakness + the improvement that closes it. */
  weakness: string;
};

export type FunctionalArea = {
  key: string;
  title: string;
  summary: string;
  /** Which delivery phase this area lands in (1–6). */
  phase: number;
  features: FeatureAssessment[];
  competitors: CompetitorTake;
};

export type Phase = {
  number: number;
  title: string;
  tagline: string;
  businessValue: string;
  features: string[];
  dependencies: string[];
  effort: string;
  upgradeImpact: Level;
  technicalRisk: Level;
  maintenanceBurden: Level;
  roi: string;
  implementationOrder: string[];
};

export function levelPill(level: Level): string {
  return level === "Low" ? "green" : level === "Medium" ? "amber" : "red";
}

export function pathPill(path: SolutionPath): string {
  if (path === "Native" || path === "Configuration") return "green";
  if (path === "Custom App" || path === "Hybrid") return "amber";
  return "";
}
