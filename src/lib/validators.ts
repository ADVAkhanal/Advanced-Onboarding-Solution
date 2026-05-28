import { z } from "zod";

const optionalText = z.string().trim().min(1).max(5000).optional();
const optionalShortText = z.string().trim().min(1).max(255).optional();
const id = z.string().trim().min(1);
const optionalId = z.string().trim().min(1).optional();
const optionalDate = z.string().datetime().optional();
const optionalMoney = z.coerce.number().nonnegative().max(999_999_999).optional();
const optionalQuantity = z.coerce.number().nonnegative().max(999_999_999).optional();

export const loginSchema = z.object({
  email: z.string().email().transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(256)
});

export const ticketCreateSchema = z.object({
  departmentId: id,
  ticketCenterId: id,
  categoryId: z.string().trim().min(1).optional(),
  title: z.string().trim().min(3).max(180),
  description: z.string().trim().min(5).max(8000),
  requestedForId: z.string().trim().min(1).optional(),
  assignedManagerId: z.string().trim().min(1).optional(),
  assignedOwnerId: z.string().trim().min(1).optional(),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT", "WORK_STOPPAGE"]).default("NORMAL"),
  dueDate: z.string().datetime().optional(),
  locationId: z.string().trim().min(1).optional(),
  shiftId: z.string().trim().min(1).optional(),
  relatedEmployeeId: z.string().trim().min(1).optional(),
  relatedOnboardingCaseId: z.string().trim().min(1).optional(),
  relatedPayrollRequestId: z.string().trim().min(1).optional()
});

export const ticketUpdateSchema = z.object({
  status: z.enum(["New", "Assigned", "In Progress", "Waiting", "Blocked", "Escalated", "Resolved", "Closed", "Cancelled", "Reopened"]).optional(),
  assignedOwnerId: z.string().trim().min(1).optional().nullable(),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT", "WORK_STOPPAGE"]).optional(),
  dueDate: z.string().datetime().optional().nullable(),
  resolutionNotes: optionalText.nullable(),
  reopen: z.boolean().optional()
});

export const ticketCommentSchema = z.object({
  body: z.string().trim().min(1).max(4000)
});

export const onboardingCreateSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  preferredName: z.string().trim().max(80).optional(),
  personalEmail: z.string().email().optional(),
  phone: z.string().trim().max(40).optional(),
  employeeId: z.string().trim().max(80).optional(),
  onboardingType: z.string().trim().min(1),
  employmentType: z.enum(["EMPLOYEE", "CONTRACTOR", "TEMP", "INTERN", "SEASONAL"]),
  departmentId: id,
  jobTitleId: z.string().trim().min(1).optional(),
  jobTitle: z.string().trim().max(120).optional(),
  managerId: z.string().trim().min(1).optional(),
  directorId: z.string().trim().min(1).optional(),
  startDate: z.string().datetime(),
  shiftId: z.string().trim().min(1).optional(),
  locationId: z.string().trim().min(1).optional(),
  workArea: z.string().trim().max(120).optional(),
  payType: z.string().trim().max(40).optional(),
  payRateSummary: z.string().trim().max(200).optional(),
  payrollSetupRequired: z.boolean().default(false),
  timekeepingSetupRequired: z.boolean().default(false),
  equipmentRequired: z.boolean().default(false),
  softwareRequired: z.boolean().default(false),
  workspaceRequired: z.boolean().default(false),
  badgeKeyRequired: z.boolean().default(false),
  trainingRequired: z.boolean().default(false),
  policyAcknowledgmentsRequired: z.boolean().default(false),
  uniformPpeRequired: z.boolean().default(false),
  mentorBuddyId: z.string().trim().min(1).optional(),
  firstDaySchedule: optionalText,
  lunchMeetingPlan: optionalText,
  notes: optionalText
});

export const payrollCreateSchema = z.object({
  employeeProfileId: z.string().trim().min(1).optional(),
  departmentId: id,
  managerId: z.string().trim().min(1).optional(),
  requestType: z.string().trim().min(1).max(80),
  effectiveDate: z.string().datetime().optional(),
  payrollPeriodId: z.string().trim().min(1).optional(),
  currentValueSummary: optionalText,
  proposedChangeSummary: z.string().trim().min(3).max(2000),
  businessReason: z.string().trim().min(5).max(2000),
  managerRecommendation: optionalText,
  directorApprovalRequired: z.boolean().default(false),
  payrollAdminReviewRequired: z.boolean().default(true),
  notes: optionalText
});

export const timeOffCreateSchema = z.object({
  employeeProfileId: id,
  departmentId: id,
  managerId: z.string().trim().min(1).optional(),
  timeOffType: z.string().trim().min(1).max(80),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  hoursRequested: z.number().positive().optional(),
  daysRequested: z.number().positive().optional(),
  reason: optionalText,
  coveragePlan: optionalText,
  payrollNoteRequired: z.boolean().default(false)
});

export const attendanceIssueCreateSchema = z.object({
  employeeProfileId: id,
  departmentId: id,
  managerId: z.string().trim().min(1).optional(),
  issueType: z.string().trim().min(1).max(80),
  issueDate: z.string().datetime(),
  shiftId: z.string().trim().min(1).optional(),
  description: z.string().trim().min(5).max(4000),
  correctionNeeded: z.boolean().default(false),
  payrollImpact: z.boolean().default(false),
  notes: optionalText
});

export const approvalCreateSchema = z.object({
  approvalType: z.string().trim().min(1).max(120),
  sourceType: z.string().trim().min(1).max(120),
  sourceId: id,
  departmentId: z.string().trim().min(1).optional(),
  ownerId: z.string().trim().min(1).optional(),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT", "WORK_STOPPAGE"]).default("NORMAL"),
  dueDate: z.string().datetime().optional(),
  summary: z.string().trim().min(5).max(2000)
});

export const taskCreateSchema = z.object({
  title: z.string().trim().min(3).max(180),
  description: optionalText,
  departmentId: z.string().trim().min(1).optional(),
  ownerId: z.string().trim().min(1).optional(),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT", "WORK_STOPPAGE"]).default("NORMAL"),
  dueDate: z.string().datetime().optional(),
  linkedTicketId: z.string().trim().min(1).optional(),
  linkedOnboardingCaseId: z.string().trim().min(1).optional(),
  linkedPayrollRequestId: z.string().trim().min(1).optional()
});

export const reportCreateSchema = z.object({
  reportType: z.string().trim().min(1).max(160),
  title: z.string().trim().min(3).max(180),
  departmentId: z.string().trim().min(1).optional(),
  dateRangeStart: z.string().datetime().optional(),
  dateRangeEnd: z.string().datetime().optional(),
  filtersUsed: z.record(z.unknown()).optional(),
  format: z.enum(["PDF", "DOCX", "XLSX", "CSV", "MARKDOWN", "HTML", "JSON"]).optional()
});

export const erpCustomerCreateSchema = z.object({
  accountNumber: z.string().trim().min(1).max(60).optional(),
  name: z.string().trim().min(2).max(180),
  primaryContactName: optionalShortText,
  primaryEmail: z.string().email().optional(),
  primaryPhone: optionalShortText,
  billingCity: optionalShortText,
  billingState: optionalShortText,
  shippingCity: optionalShortText,
  shippingState: optionalShortText,
  ownerId: optionalId,
  status: z.string().trim().min(1).max(60).default("ACTIVE"),
  notes: optionalText
});

export const erpVendorCreateSchema = z.object({
  vendorNumber: z.string().trim().min(1).max(60).optional(),
  name: z.string().trim().min(2).max(180),
  primaryContactName: optionalShortText,
  primaryEmail: z.string().email().optional(),
  primaryPhone: optionalShortText,
  city: optionalShortText,
  state: optionalShortText,
  ownerId: optionalId,
  status: z.string().trim().min(1).max(60).default("ACTIVE"),
  notes: optionalText
});

export const erpPartCreateSchema = z.object({
  partNumber: z.string().trim().min(1).max(100),
  revision: z.string().trim().min(1).max(30).default("A"),
  description: z.string().trim().min(2).max(500),
  customerId: optionalId,
  unitOfMeasure: z.string().trim().min(1).max(40).default("EA"),
  makeBuy: z.enum(["MAKE", "BUY", "MAKE_BUY"]).default("MAKE"),
  status: z.string().trim().min(1).max(60).default("ACTIVE"),
  notes: optionalText
});

export const erpQuoteCreateSchema = z.object({
  quoteNumber: z.string().trim().min(1).max(60).optional(),
  customerId: optionalId,
  title: z.string().trim().min(3).max(180),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT", "WORK_STOPPAGE"]).default("NORMAL"),
  status: z.string().trim().min(1).max(60).default("DRAFT"),
  dueDate: optionalDate,
  estimatedValue: optionalMoney,
  marginTarget: optionalMoney,
  validUntil: optionalDate,
  ownerId: optionalId,
  notes: optionalText
});

const materialCategory = z.enum([
  "ALLOY_STEEL",
  "STAINLESS_STEEL",
  "CARBON_STEEL",
  "ALUMINUM",
  "TITANIUM",
  "BRASS",
  "COPPER",
  "NICKEL_ALLOY",
  "PLASTIC",
  "COMPOSITE",
  "OTHER"
]);

const manufacturingProcess = z.enum([
  "TURNING",
  "MILLING",
  "MULTI_SPINDLE",
  "SWISS_TURNING",
  "GRINDING",
  "EDM",
  "WIRE_EDM",
  "HONING",
  "LAPPING",
  "INSPECTION",
  "ASSEMBLY",
  "OTHER"
]);

const complexityClass = z.enum(["SIMPLE", "MODERATE", "COMPLEX", "HIGHLY_COMPLEX"]);

const diameterClass = z.enum([
  "UNDER_25_MM",
  "FROM_25_TO_75_MM",
  "FROM_75_TO_150_MM",
  "FROM_150_TO_300_MM",
  "OVER_300_MM",
  "NOT_APPLICABLE"
]);

// Manufacturing-aware quote intake. Creates one Quote + one QuoteLine
// in the same transaction with cycle / setup / cost snapshots captured.
export const erpManufacturingQuoteCreateSchema = z.object({
  customerId: optionalId,
  title: z.string().trim().min(3).max(180),
  dueDate: optionalDate,
  validUntil: optionalDate,
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT", "WORK_STOPPAGE"]).default("NORMAL"),
  notes: optionalText,

  // Part / line metadata
  partNumber: z.string().trim().max(60).optional(),
  partDescription: z.string().trim().min(3).max(500),
  revision: z.string().trim().max(20).optional(),
  quantity: z.coerce.number().int().min(1).max(1_000_000),

  // Manufacturing bucket — drives cycle-time lookup.
  materialCategory: materialCategory,
  process: manufacturingProcess,
  complexityClass: complexityClass,
  diameterClass: diameterClass.default("NOT_APPLICABLE"),

  // Cost snapshots. All optional — the operator can override the lookup
  // estimate, leave blank to use the lookup, or fill in all fields manually
  // when there is no matching lookup row.
  setupHours: optionalMoney,
  cycleMinutesPerPiece: optionalMoney,
  materialCostPerUnit: optionalMoney,
  laborRatePerHour: optionalMoney,
  burdenRatePerHour: optionalMoney,
  marginPercent: z.coerce.number().min(0).max(95).optional(),

  cycleTimeLookupId: optionalId,
  routingNotes: optionalText,
  exportControlFlag: z.coerce.boolean().optional()
});

// Quote status transition. The route enforces the state machine; the
// schema only validates the target is one of the known statuses.
export const erpQuoteStatusTransitionSchema = z.object({
  status: z.enum(["DRAFT", "QUOTED", "WON", "LOST", "ON_HOLD", "EXPIRED"]),
  reason: z.string().trim().min(1).max(500).optional()
});

// Cycle-time lookup upsert payload. The bucket fields (material,
// process, complexity, diameter) are the unique key — POSTs upsert
// against an existing row when the bucket matches.
export const erpCycleTimeLookupSchema = z.object({
  materialCategory: materialCategory,
  process: manufacturingProcess,
  complexityClass: complexityClass,
  diameterClass: diameterClass.default("NOT_APPLICABLE"),
  estimatedSetupHours: z.coerce.number().min(0).max(999),
  estimatedCycleMinutes: z.coerce.number().min(0).max(99_999),
  sampleSize: z.coerce.number().int().min(0).max(1_000_000).optional(),
  confidenceScore: z.coerce.number().min(0).max(1).optional(),
  notes: optionalText
});

export const erpSalesOrderCreateSchema = z.object({
  orderNumber: z.string().trim().min(1).max(60).optional(),
  customerId: optionalId,
  quoteId: optionalId,
  customerPoNumber: optionalShortText,
  promisedDate: optionalDate,
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT", "WORK_STOPPAGE"]).default("NORMAL"),
  status: z.string().trim().min(1).max(60).default("OPEN"),
  ownerId: optionalId,
  notes: optionalText
});

export const erpWorkOrderCreateSchema = z.object({
  workOrderNumber: z.string().trim().min(1).max(60).optional(),
  salesOrderId: optionalId,
  customerId: optionalId,
  partId: optionalId,
  departmentId: optionalId,
  title: z.string().trim().min(3).max(180),
  quantity: z.coerce.number().positive().max(999_999_999).default(1),
  releasedQuantity: optionalQuantity,
  dueDate: optionalDate,
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT", "WORK_STOPPAGE"]).default("NORMAL"),
  status: z.string().trim().min(1).max(60).default("PLANNED"),
  routerStatus: z.string().trim().min(1).max(60).default("NOT_RELEASED"),
  materialStatus: z.string().trim().min(1).max(60).default("NOT_ALLOCATED"),
  qualityStatus: z.string().trim().min(1).max(60).default("NOT_STARTED"),
  shippingStatus: z.string().trim().min(1).max(60).default("NOT_READY"),
  ownerId: optionalId,
  notes: optionalText
});

export const erpOperationCreateSchema = z.object({
  workOrderId: id,
  operationNumber: z.coerce.number().int().positive().max(9999),
  workCenter: z.string().trim().min(1).max(120),
  description: z.string().trim().min(2).max(500),
  setupHours: optionalQuantity,
  runHours: optionalQuantity,
  status: z.string().trim().min(1).max(60).default("QUEUED"),
  scheduledStart: optionalDate,
  scheduledEnd: optionalDate,
  assignedToId: optionalId,
  departmentId: optionalId,
  ownerId: optionalId
});

export const erpScheduleCreateSchema = z.object({
  workOrderId: optionalId,
  operationId: optionalId,
  workCenter: z.string().trim().min(1).max(120),
  scheduleDate: z.string().datetime(),
  startTime: optionalDate,
  endTime: optionalDate,
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT", "WORK_STOPPAGE"]).default("NORMAL"),
  status: z.string().trim().min(1).max(60).default("SCHEDULED"),
  departmentId: optionalId,
  ownerId: optionalId
});

export const erpInventoryCreateSchema = z.object({
  itemNumber: z.string().trim().min(1).max(100),
  partId: optionalId,
  description: z.string().trim().min(2).max(500),
  itemType: z.string().trim().min(1).max(80).default("MATERIAL"),
  unitOfMeasure: z.string().trim().min(1).max(40).default("EA"),
  quantityOnHand: optionalQuantity.default(0),
  quantityAllocated: optionalQuantity.default(0),
  reorderPoint: optionalQuantity,
  locationCode: optionalShortText,
  status: z.string().trim().min(1).max(60).default("ACTIVE"),
  notes: optionalText
});

export const erpPurchaseOrderCreateSchema = z.object({
  poNumber: z.string().trim().min(1).max(60).optional(),
  vendorId: optionalId,
  orderDate: optionalDate,
  expectedDate: optionalDate,
  buyerId: optionalId,
  totalAmount: optionalMoney,
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT", "WORK_STOPPAGE"]).default("NORMAL"),
  status: z.string().trim().min(1).max(60).default("DRAFT"),
  notes: optionalText
});

export const erpReceiptCreateSchema = z.object({
  receiptNumber: z.string().trim().min(1).max(60).optional(),
  purchaseOrderId: optionalId,
  vendorId: optionalId,
  receivedDate: optionalDate,
  status: z.string().trim().min(1).max(60).default("RECEIVED"),
  notes: optionalText
});

export const erpShipmentCreateSchema = z.object({
  shipmentNumber: z.string().trim().min(1).max(60).optional(),
  customerId: optionalId,
  salesOrderId: optionalId,
  workOrderId: optionalId,
  carrierName: optionalShortText,
  trackingNumber: optionalShortText,
  shipDate: optionalDate,
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT", "WORK_STOPPAGE"]).default("NORMAL"),
  status: z.string().trim().min(1).max(60).default("PLANNED"),
  notes: optionalText
});

export const erpQualityInspectionCreateSchema = z.object({
  inspectionNumber: z.string().trim().min(1).max(60).optional(),
  workOrderId: optionalId,
  partId: optionalId,
  inspectionType: z.string().trim().min(1).max(100),
  result: optionalShortText,
  inspectorId: optionalId,
  dueDate: optionalDate,
  completedAt: optionalDate,
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT", "WORK_STOPPAGE"]).default("NORMAL"),
  status: z.string().trim().min(1).max(60).default("PENDING"),
  departmentId: optionalId,
  ownerId: optionalId,
  notes: optionalText
});

export const erpNonconformanceCreateSchema = z.object({
  ncrNumber: z.string().trim().min(1).max(60).optional(),
  workOrderId: optionalId,
  partId: optionalId,
  title: z.string().trim().min(3).max(180),
  severity: z.string().trim().min(1).max(60).default("MEDIUM"),
  disposition: optionalShortText,
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT", "WORK_STOPPAGE"]).default("HIGH"),
  status: z.string().trim().min(1).max(60).default("OPEN"),
  departmentId: optionalId,
  ownerId: optionalId,
  notes: optionalText
});

export const erpDocumentCreateSchema = z.object({
  documentNumber: z.string().trim().min(1).max(60).optional(),
  title: z.string().trim().min(3).max(180),
  documentType: z.string().trim().min(1).max(100),
  revision: optionalShortText,
  relatedType: optionalShortText,
  relatedId: optionalId,
  status: z.string().trim().min(1).max(60).default("ACTIVE"),
  departmentId: optionalId,
  ownerId: optionalId,
  notes: optionalText
});

export const erpTimeEntryCreateSchema = z.object({
  userId: optionalId,
  workOrderId: optionalId,
  operationId: optionalId,
  entryDate: z.string().datetime(),
  hours: z.coerce.number().positive().max(24),
  entryType: z.string().trim().min(1).max(80).default("SHOP_FLOOR"),
  status: z.string().trim().min(1).max(60).default("SUBMITTED"),
  departmentId: optionalId,
  ownerId: optionalId,
  notes: optionalText
});

export const uploadRules = {
  allowedMimeTypes: ["application/pdf", "image/png", "image/jpeg", "text/csv", "text/plain"],
  maxBytes: Number(process.env.MAX_UPLOAD_BYTES ?? 10_485_760)
};
