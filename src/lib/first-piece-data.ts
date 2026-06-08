/**
 * First-Piece reference vocabularies — the real Advanced PMC quality picklists
 * used by the run-tracking board: customers, work centers, setup techs,
 * inspection methods, statuses, results, and NC defect codes.
 *
 * All operational metadata (business relationships, equipment names, internal
 * nonconformance category codes, staff initials). No CUI/ITAR, drawings, or
 * proprietary process parameters. Part numbers are entered at runtime, never
 * seeded here.
 */

export const FP_CUSTOMERS = [
  "THE NORDAM GROUP NTR",
  "THE NORDAM GROUP I & S",
  "THE NORDAM GROUP TRANSPARENCY",
  "BETA TECHNOLOGIES",
  "GULFSTREAM AEROSPACE CORP",
  "SPIRIT AEROSYSTEMS, INC.",
  "SPIRIT AEROSYSTEMS MALAYSIA",
  "Collins Aerospace",
  "PRYER AEROSPACE",
  "HELMERICH & PAYNE",
  "T D WILLIAMSON",
  "DUCOMMUN TULSA",
  "DUCOMMUN JOPLIN",
  "SPF AMERICA",
  "ADVANCED PMC",
  "BASKINS MACHINED PRODUCTS LLC",
  "BAKER HUGHES OILFIELD OPERATIONS LLC",
  "ETI INC",
  "CROSBY GROUP INC",
  "R L HUDSON & COMPANY"
] as const;

export const FP_WORK_CENTERS = [
  "Fastems ROBO FMS One-510",
  "Okuma - M460V-5AX-503",
  "Okuma - M460V-5AX-508",
  "Okuma - M460V-5AX-509",
  "Okuma- MULTUS U3000- (205)",
  "Okuma LB3000",
  "HAAS UMC-750 5 AXIS (1)-504",
  "HAAS UMC-750 5 AXIS (2)-505",
  "Matsura MAM72",
  "Mazak - HCN-4000 II-401",
  "Mazak - HCN-4000 III-402",
  "Mazak VCN510CKY w 4AX Rotary-303",
  "Mazak VCN510CKY (2)-302",
  "Mazak VCN510CKY (1)-301",
  "Integrex 200-3ST-201",
  "Mazak Integrex 100-4ST-202",
  "HYUNDAI L 2100SY-105",
  "Mazak Quick Turn 10-104",
  "Mazak Quick Turn 250 II-102",
  "Mazak Quick Turn 6T-103",
  "Mazak QTN-250 MSY-101",
  "Komo VR510 CNC Router-306",
  "C.R. ONSRUD 5 AXIS-506"
] as const;

export const FP_SETUP_TECHS = [
  "Austin F",
  "Austin S",
  "Brian D",
  "David P",
  "Jeff R",
  "John C",
  "Justin S",
  "Keith L",
  "Matt R",
  "Thomas J",
  "Tim I"
] as const;

export const FP_INSPECTION_METHODS = ["CMM", "Dura-Max", "Manual"] as const;

export const FP_STATUSES = ["On Cycle", "Inspection", "In Queue", "Completed"] as const;

export const FP_RESULTS = ["Pass", "Fail", "Pending"] as const;

// Internal nonconformance category codes (NC codes) — quality taxonomy only.
export const FP_DEFECT_CODES = [
  "Tool wear",
  "Incorrect offsets",
  "Thermal expansion",
  "Incorrect feed/speed",
  "Vibration/chatter",
  "Fixturing problems",
  "Programming errors (G-code)",
  "Setup mistakes",
  "Wrong tool selection",
  "Part shifted / mislocated / improperly clamped",
  "NC101 (Dia/Hole U/S)",
  "NC102 (Dia/Hole O/S)",
  "NC103 (Thread/Pitch U/S)",
  "NC104 (Thread/Pitch O/S)",
  "NC105 (Hole Location)",
  "NC106 (Feature Location)",
  "NC108 (Feature Omitted)",
  "NC109 (Radius)",
  "NC110 (Chamfer)",
  "NC111 (Cutter Gouge)",
  "NC112 (Thickness U/S)",
  "NC115 (Linear Dimension)",
  "NC116 (Tap Depth O/S)",
  "NC117 (Tap Depth U/S)",
  "NC119 (Overall Length U/S)",
  "NC203 (Deburr Surface Finish)",
  "NC204 (Deburr Appearance)",
  "NC205 (Deburr Dimensional)",
  "NC502 (Surface Finish)",
  "NC503 (Nick/Ding/Scratch)",
  "NC506 (Cracked/Chipped/Broken)",
  "NC401 (Wrong PN on ID)",
  "NC404 (Type of ID)",
  "NC406 (Legibility of ID)",
  "NC602 (PN or Process Spec Incorrect)",
  "NC606 (Outside Processing Errors)",
  "NC607 (Red tagged from Processing)",
  "NC801 (Broken Tool)",
  "NC802 (Material Defect)",
  "NC804 (Lost/Miscounted)",
  "NC806 (Other)",
  "NC810 (Wrong Material)",
  "NC811 (Fixture Holding/Fixture Issues)",
  "NC812 (1st Part/Prove out)",
  "NC901 (Concentric)",
  "NC902 (Perpendicular)",
  "NC903 (Flatness)",
  "NC909 (Profile/Surface Profile)"
] as const;

export const FP_RUN_NUMBERS = [1, 2, 3, 4, 5] as const;

/** Bucket a free-text result into Pass / Fail / Pending. */
export function fpResultBucket(result: string | null | undefined): "Pass" | "Fail" | "Pending" {
  const r = (result ?? "").toLowerCase();
  if (r.includes("pass")) return "Pass";
  if (r.includes("fail")) return "Fail";
  return "Pending";
}

export function fpResultPill(result: string | null | undefined): string {
  const b = fpResultBucket(result);
  return b === "Pass" ? "green" : b === "Fail" ? "red" : "amber";
}

export function fpStatusPill(status: string | null | undefined): string {
  const s = (status ?? "").toLowerCase();
  if (s === "completed") return "green";
  if (s === "inspection") return "amber";
  return "";
}
