import type { AuthenticatedUser } from "./auth";
import { prisma } from "./prisma";

const openTicketStatuses = ["New", "Assigned", "In Progress", "Waiting on Requester", "Waiting on Manager", "Waiting on Director", "Blocked", "Escalated", "Reopened"];
const openOnboardingStatuses = ["Submitted", "Manager Review", "Director Review", "HR Review", "Payroll Setup Pending", "Department Setup Pending", "Equipment Pending", "Training Pending", "Ready for First Day", "Active Onboarding", "30-Day Review", "60-Day Review", "90-Day Review"];

export type CommandCenterData = Awaited<ReturnType<typeof getCommandCenterData>>;

export async function getCommandCenterData(user: AuthenticatedUser) {
  const now = new Date();
  const departmentScope = user.userLevel === "MANAGER" ? { departmentId: user.departmentId ?? "__none__" } : {};

  const [
    openTickets,
    overdueTickets,
    workStoppageTickets,
    activeOnboarding,
    payrollPending,
    timeOffPending,
    approvalsPending,
    blockersOpen,
    lifecyclePending,
    checklistMissed,
    contractorExpirations,
    departments,
    recentTickets,
    upcomingOnboarding,
    payrollPeriods,
    approvalQueue,
    blockers
  ] = await Promise.all([
    prisma.ticket.count({ where: { organizationId: user.organizationId, status: { in: openTicketStatuses }, archivedAt: null, ...departmentScope } }),
    prisma.ticket.count({ where: { organizationId: user.organizationId, status: { in: openTicketStatuses }, dueDate: { lt: now }, archivedAt: null, ...departmentScope } }),
    prisma.ticket.count({ where: { organizationId: user.organizationId, priority: "WORK_STOPPAGE", status: { in: openTicketStatuses }, archivedAt: null, ...departmentScope } }),
    prisma.onboardingCase.count({ where: { organizationId: user.organizationId, status: { in: openOnboardingStatuses }, archivedAt: null, ...departmentScope } }),
    prisma.payrollChangeRequest.count({ where: { organizationId: user.organizationId, status: { in: ["Submitted", "Manager Review", "Director Review", "Payroll Review", "Needs More Info", "Approved for Payroll Entry"] }, archivedAt: null, ...departmentScope } }),
    prisma.timeOffRequest.count({ where: { organizationId: user.organizationId, status: { in: ["Submitted", "Manager Review", "Needs Coverage Plan"] }, archivedAt: null, ...departmentScope } }),
    prisma.approvalRequest.count({ where: { organizationId: user.organizationId, status: "Pending", archivedAt: null, ...departmentScope } }),
    prisma.blocker.count({ where: { organizationId: user.organizationId, status: { in: ["Open", "Blocked", "Escalated"] }, archivedAt: null, ...departmentScope } }),
    prisma.lifecycleEvent.count({ where: { organizationId: user.organizationId, status: { in: ["Open", "In Review"] }, archivedAt: null, ...departmentScope } }),
    prisma.checklistCompletion.count({ where: { organizationId: user.organizationId, status: "Missed", archivedAt: null, ...departmentScope } }),
    prisma.contractorExpiration.count({ where: { organizationId: user.organizationId, expirationDate: { gte: now }, status: "Upcoming", archivedAt: null, ...departmentScope } }),
    prisma.department.findMany({ where: { organizationId: user.organizationId, archivedAt: null, ...(user.userLevel === "MANAGER" ? { id: user.departmentId ?? "__none__" } : {}) }, orderBy: { name: "asc" }, take: 20 }),
    prisma.ticket.findMany({ where: { organizationId: user.organizationId, archivedAt: null, ...departmentScope }, orderBy: { updatedAt: "desc" }, take: 8 }),
    prisma.onboardingCase.findMany({ where: { organizationId: user.organizationId, startDate: { gte: now }, archivedAt: null, ...departmentScope }, orderBy: { startDate: "asc" }, take: 5 }),
    prisma.payrollPeriod.findMany({ where: { organizationId: user.organizationId, archivedAt: null }, orderBy: { startDate: "desc" }, take: 1 }),
    prisma.approvalRequest.findMany({ where: { organizationId: user.organizationId, status: "Pending", archivedAt: null, ...departmentScope }, orderBy: [{ dueDate: "asc" }, { updatedAt: "desc" }], take: 8 }),
    prisma.blocker.findMany({ where: { organizationId: user.organizationId, status: { in: ["Open", "Blocked", "Escalated"] }, archivedAt: null, ...departmentScope }, orderBy: { updatedAt: "desc" }, take: 8 })
  ]);

  const departmentHealth = await Promise.all(
    departments.map(async (department) => {
      const [open, overdue] = await Promise.all([
        prisma.ticket.count({ where: { organizationId: user.organizationId, departmentId: department.id, status: { in: openTicketStatuses }, archivedAt: null } }),
        prisma.ticket.count({ where: { organizationId: user.organizationId, departmentId: department.id, status: { in: openTicketStatuses }, dueDate: { lt: now }, archivedAt: null } })
      ]);
      const score = Math.max(0, Math.min(100, 96 - open * 2 - overdue * 8));
      return { id: department.id, name: department.name, open, overdue, score };
    })
  );

  const onboardingReadiness = activeOnboarding === 0 ? 100 : Math.max(0, Math.min(100, 100 - activeOnboarding * 3));
  const payrollReadiness = payrollPeriods[0]?.readinessScore ?? (payrollPending === 0 ? 100 : Math.max(0, 100 - payrollPending * 6));
  const productivityScore = Math.max(0, Math.min(100, 92 - overdueTickets * 4 - blockersOpen * 3 - approvalsPending * 2));

  return {
    generatedAt: now.toISOString(),
    metrics: {
      openTickets,
      overdueTickets,
      workStoppageTickets,
      activeOnboarding,
      onboardingReadiness,
      payrollPending,
      payrollReadiness,
      timeOffPending,
      approvalsPending,
      blockersOpen,
      lifecyclePending,
      checklistMissed,
      contractorExpirations,
      productivityScore
    },
    departmentHealth,
    recentTickets,
    upcomingOnboarding,
    payrollPeriod: payrollPeriods[0] ?? null,
    approvalQueue,
    blockers
  };
}
