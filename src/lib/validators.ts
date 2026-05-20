import { z } from "zod";

const optionalText = z.string().trim().min(1).max(5000).optional();
const id = z.string().trim().min(1);

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

export const uploadRules = {
  allowedMimeTypes: ["application/pdf", "image/png", "image/jpeg", "text/csv", "text/plain"],
  maxBytes: Number(process.env.MAX_UPLOAD_BYTES ?? 10_485_760)
};
