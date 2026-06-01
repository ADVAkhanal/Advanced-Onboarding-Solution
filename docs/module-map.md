# Module Map

Snapshot of the production modules in the Advanced Shop Management & Onboarding Command Center, the data they own, and how they relate.

> Working tree: `C:/Users/Akhanal/Documents/Shop Management/` (package name `cleanops-command-center`, commercial alias `Advanced Shop Command Center`).

---

## Identity & access

| Path | Owns | Notes |
|---|---|---|
| `src/lib/auth.ts` | sessions, `getCurrentUser`, `requireUser`, `requirePermission`, scope helpers | Cookie-based HMAC session, bcrypt password hashing (Argon2id migration on next-login planned). |
| `src/lib/permissions.ts` | permission catalog, `permissionsForLevel`, `can` | Hybrid RBAC by tier + scoped permissions catalog. |
| `src/lib/audit.ts` | `recordAudit` | Append-only `AuditLog`. |
| `src/lib/data-boundary.ts` | `assertNoProhibitedFields` | Blocks SSN/banking/credentials/CUI keys from incoming payloads. |

---

## Core operations

| Module | Routes | API | Schema |
|---|---|---|---|
| **Department tickets** | `/tickets`, `/tickets/[id]` | `/api/tickets/*` | `Ticket`, `TicketCenter`, `TicketCategory`, `TicketComment`, `TicketInternalNote`, `TicketStatusHistory`, `TicketEscalation`, `TicketAttachment` |
| **Onboarding** | `/onboarding`, `/onboarding/[id]` | `/api/onboarding-cases/*` | `OnboardingCase`, `OnboardingTemplate`, `OnboardingChecklist*`, `OnboardingCaseItem`, `OnboardingMilestone`, `OnboardingComment`, `OnboardingDocument`, `OnboardingStatusHistory` |
| **Payroll coordination** | `/payroll-coordination` | `/api/payroll/*` | `PayrollPeriod`, `PayrollChangeRequest`, `PayrollRequestComment`, `PayrollRequestStatusHistory`, `PayrollExport`, `PayrollPeriodChecklist*` |
| **Time off** | `/time-off` | `/api/time-off/*` | `TimeOffRequest` |
| **Attendance** | `/attendance` | `/api/attendance/*` | `AttendanceIssueRecord`, `ScheduleIssueRecord`, `TimeCorrectionRequest` |
| **Tasks / productivity** | `/tasks` | `/api/tasks/*` | `ProductivityBoard*`, `ProductivityTask`, `TaskComment`, `RecurringTask`, `RecurringChecklist*`, `ChecklistCompletion`, `FollowUp`, `Blocker`, `Escalation`, `DepartmentGoal`, `Commitment` |
| **Approvals** | `/approvals` | `/api/approvals/*` | `ApprovalRequest`, `ApprovalStep`, `ApprovalDecision`, `ApprovalRule`, `ApprovalEscalation` |
| **Reports** | `/reports` | `/api/reports/*` | `Report`, `ReportExport`, `ReportTemplate` |
| **Employee lifecycle** | `/employee`, admin · directory | (read paths only at present) | `EmployeeProfile`, `EmploymentRecord`, `LifecycleEvent`, `RoleChangeRequest`, `TransferRequest`, `RehireRequest`, `ContractorRecord`, `ContractorExpiration`, `ManagerNote`, `OneOnOneNote`, `MeetingNote`, `MeetingActionItem`, `Announcement` |
| **Requests** | (embedded in tickets/onboarding flows) | route helpers in `src/lib/erp-routes.ts` | `EquipmentRequest`, `SupplyRequest`, `SoftwareCoordinationRequest`, `WorkspaceRequest`, `BadgeKeyRequest`, `TrainingAssignment`, `PolicyAcknowledgment` |

---

## Internal ERP (manufacturing)

| Module | Routes | API | Schema |
|---|---|---|---|
| **Customers & parts** | `/erp/customers` | `/api/erp/customers`, `/api/erp/parts` | `CustomerAccount`, `Part` |
| **Quoting engine** | `/erp/quotes`, `/erp/quotes/new`, `/erp/quotes/[id]`, `/erp/quotes/cycle-times` | `/api/erp/quotes`, `/api/erp/quotes/manufacturing`, `/api/erp/quotes/[id]/{lines,status,convert}`, `/api/erp/cycle-times` | `Quote`, `QuoteLine`, `CycleTimeLookup` — manufacturing-aware. See `docs/quoting-engine.md`. |
| **Sales orders** | (in `/erp/quotes`) | `/api/erp/sales-orders` | `SalesOrder` (quote conversion target) |
| **Jobs / work orders** | `/erp/jobs` | `/api/erp/jobs`, `/api/erp/operations`, `/api/erp/operations/[id]/complete` | `WorkOrder`, `WorkOrderOperation` (operation completion captures actuals and auto-feeds cycle-time estimates — see `docs/quoting-engine.md`). |
| **Shop schedule** | `/erp/schedule` | `/api/erp/schedule` | `ShopScheduleItem` |
| **Inventory** | `/erp/inventory` | `/api/erp/inventory` | `InventoryItem`, `InventoryTransaction` |
| **Purchasing** | `/erp/purchasing` | `/api/erp/purchasing`, `/api/erp/receipts` | `PurchaseOrder`, `PurchaseOrderLine`, `Receipt` |
| **Shipping** | `/erp/shipping` | `/api/erp/shipments` | `Shipment` |
| **Quality** | `/erp/quality` | `/api/erp/quality`, `/api/erp/nonconformance` | `QualityInspection`, `NonconformanceRecord` |
| **Shop-floor time** | `/erp/shop-floor` | `/api/erp/time-entries` | `TimeEntry` |
| **Documents** | `/erp/documents` | `/api/erp/documents` | `DocumentRecord` |
| **Analytics dashboards** | `/erp/dashboards`, `/erp/dashboards/[key]`, `/erp/dashboards/[key]/print` | `/api/erp/dashboards/[key]/export.csv` | Read-only over existing models (Quote, WorkOrderOperation, ShopScheduleItem, QualityInspection, NonconformanceRecord, Part). Dynamic engine; CSV + PDF export. See `docs/dashboards.md`. |

---

## AI layer

| Module | Routes | API | Schema | Doc |
|---|---|---|---|---|
| **SOP Knowledge Base** | `/sop`, `/sop/admin`, `/sop/escalations` | `/api/sop/ask`, `/api/sop/documents`, `/api/sop/documents/[versionId]/approval`, `/api/sop/escalations`, `/api/sop/escalations/[id]` | `SopDocument`, `SopDocumentVersion`, `SopChunk` (FTS), `SopApproval`, `SopQuery`, `SopCitation`, `SopEscalation` | [sop-knowledge-base.md](./sop-knowledge-base.md) |
| **AI provider + redaction + audit** | (library only) | n/a | `AIActionLog` | [ai-integration-policy.md](./ai-integration-policy.md) |

Library code:
- `src/lib/ai/provider.ts` — `AIProvider` interface + Anthropic implementation, with `cache_control` and tool-use.
- `src/lib/ai/redaction.ts` — `redactProhibited()` strips out-of-scope content before any AI call.
- `src/lib/ai/chunker.ts` — splits SOPs into heading-attached chunks.
- `src/lib/ai/sop-retriever.ts` — Postgres FTS retrieval scoped by user permission / visibility.
- `src/lib/ai/sop-answerer.ts` — orchestrates redaction → retrieval → Claude tool-use → server-side gates.
- `src/lib/ai/sop-escalator.ts` — persists `SopQuery`, `SopCitation`, `SopEscalation`; routes escalations to the user's manager (fallback director, fallback admin).
- `src/lib/ai/audit.ts` — `recordAIAction()` for `AIActionLog`.

---

## Training & Assessments

| Module | Routes | API | Schema | Doc |
|---|---|---|---|---|
| **Training** | `/training`, `/training/records`, `/training/insights`, `/training/bank`, `/training/admin`, **public** `/quiz/[token]` | `/api/training/quizzes`, `/api/training/quizzes/[id]`, `/api/training/questions`, `/api/training/share-links`, `/api/training/attempts`, `/api/training/records.csv` | `QuestionBankCategory`, `QuizQuestion`, `QuizQuestionOption`, `QuizDefinition`, `QuizShareLink`, `QuizAttempt`, `QuizAttemptAnswer` | [training-module.md](./training-module.md) |

---

## System

| Module | Schema |
|---|---|
| Notifications, settings, file metadata | `Notification`, `NotificationLog`, `Setting`, `AppSetting`, `FileMetadata` |
| Audit log | `AuditLog` (workflow audit), `AIActionLog` (AI audit) |
| Import jobs | `ImportJob`, `ImportRow` |
