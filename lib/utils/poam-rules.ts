// POAM Business Rules and Validation Utilities
// Based on CMMC POA&M requirements

// Prisma types replaced - data comes from SaaS API as JSON;
import { addDays, isPast, differenceInDays, startOfDay } from 'date-fns';
import type {
  CreatePOAMInput,
  UpdatePOAMInput,
  POAMValidationResult,
  POAMValidationError,
  POAMWithMilestones,
} from '@/lib/types/poam';

/**
 * Get the number of days allowed for remediation based on risk level
 * - CRITICAL/HIGH: 30 days
 * - MODERATE: 90 days
 * - LOW: 180 days
 */
export function getDaysToRemediate(riskLevel: RiskLevel): number {
  switch (riskLevel) {
    case 'CRITICAL':
    case 'HIGH':
      return 30;
    case 'MODERATE':
      return 90;
    case 'LOW':
      return 180;
    default:
      return 180;
  }
}

/**
 * Calculate the remediation deadline based on creation date and risk level
 */
export function calculateDeadline(createdAt: Date, riskLevel: RiskLevel): Date {
  const days = getDaysToRemediate(riskLevel);
  return addDays(createdAt, days);
}

/**
 * Check if a POAM is overdue
 */
export function isPOAMOverdue(deadline: Date, status: POAMStatus): boolean {
  // Closed POAMs are never overdue
  if (status === 'CLOSED') {
    return false;
  }

  return isPast(deadline);
}

/**
 * Determine the correct status for a POAM based on deadline
 */
export function determinePOAMStatus(
  currentStatus: POAMStatus,
  deadline: Date
): POAMStatus {
  // Don't change closed status
  if (currentStatus === 'CLOSED') {
    return 'CLOSED';
  }

  // Check if overdue
  if (isPast(deadline)) {
    return 'OVERDUE';
  }

  // Keep current status if not overdue
  return currentStatus === 'OVERDUE' ? 'OPEN' : currentStatus;
}

/**
 * Check if a temporary deficiency can achieve "MET" status
 * Requirements:
 * 1. Must have remediation plan
 * 2. Must have at least one milestone
 * 3. Must show progress (at least one completed milestone)
 */
export function canAchieveMETStatus(poam: POAMWithMilestones): boolean {
  // Must have remediation plan
  if (!poam.remediationPlan || poam.remediationPlan.trim().length === 0) {
    return false;
  }

  // Must have milestones
  if (!poam.milestones || poam.milestones.length === 0) {
    return false;
  }

  // Must show progress (at least one completed milestone)
  const hasProgress = poam.milestones.some((m) => m.completed);

  return hasProgress;
}

/**
 * Validate POAM creation input
 */
export function validateCreatePOAM(
  input: CreatePOAMInput
): POAMValidationResult {
  const errors: POAMValidationError[] = [];

  // Title is required
  if (!input.title || input.title.trim().length === 0) {
    errors.push({
      field: 'title',
      message: 'Title is required',
    });
  }

  // Description is required
  if (!input.description || input.description.trim().length === 0) {
    errors.push({
      field: 'description',
      message: 'Description is required',
    });
  }

  // Remediation plan is required
  if (!input.remediationPlan || input.remediationPlan.trim().length === 0) {
    errors.push({
      field: 'remediationPlan',
      message: 'Remediation plan is required',
    });
  }

  // Scheduled completion date is required
  if (!input.scheduledCompletionDate) {
    errors.push({
      field: 'scheduledCompletionDate',
      message: 'Scheduled completion date is required',
    });
  } else {
    // Validate the scheduled completion date doesn't exceed allowed timeframe
    const maxDays = getDaysToRemediate(input.riskLevel);
    const scheduledDate = startOfDay(new Date(input.scheduledCompletionDate));
    const today = startOfDay(new Date());
    const daysDifference = differenceInDays(scheduledDate, today);

    if (daysDifference > maxDays) {
      const riskLevelName =
        input.riskLevel === 'CRITICAL' || input.riskLevel === 'HIGH'
          ? 'Critical/High'
          : input.riskLevel === 'MODERATE'
          ? 'Moderate'
          : 'Low';

      errors.push({
        field: 'scheduledCompletionDate',
        message: `${riskLevelName} risk findings must be remediated within ${maxDays} days`,
      });
    }

    // Cannot schedule in the past (compare at day level, not time level)
    if (scheduledDate < today) {
      errors.push({
        field: 'scheduledCompletionDate',
        message: 'Scheduled completion date cannot be in the past',
      });
    }
  }

  // Requirement IDs are required (filter out empty strings)
  const validRequirementIds = input.requirementIds?.filter((id) => id && id.trim() !== '') || [];
  if (validRequirementIds.length === 0) {
    errors.push({
      field: 'requirementIds',
      message: 'At least one requirement is required',
    });
  }

  // ATO Package ID is required
  if (!input.atoPackageId) {
    errors.push({
      field: 'atoPackageId',
      message: 'ATO Package is required',
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate POAM update input
 */
export function validateUpdatePOAM(
  input: UpdatePOAMInput,
  currentPOAM: { riskLevel: RiskLevel; createdAt: Date; status: POAMStatus }
): POAMValidationResult {
  const errors: POAMValidationError[] = [];

  // If updating scheduled completion date
  if (input.scheduledCompletionDate) {
    const riskLevel = input.riskLevel || currentPOAM.riskLevel;
    const maxDays = getDaysToRemediate(riskLevel);
    const scheduledDate = new Date(input.scheduledCompletionDate);
    const createdAt = new Date(currentPOAM.createdAt);
    const daysDifference = differenceInDays(scheduledDate, createdAt);

    if (daysDifference > maxDays) {
      const riskLevelName =
        riskLevel === 'CRITICAL' || riskLevel === 'HIGH'
          ? 'Critical/High'
          : riskLevel === 'MODERATE'
          ? 'Moderate'
          : 'Low';

      errors.push({
        field: 'scheduledCompletionDate',
        message: `${riskLevelName} risk findings must be remediated within ${maxDays} days of creation`,
      });
    }
  }

  // If closing POAM, actual completion date is required
  if (input.status === 'CLOSED' && !input.actualCompletionDate) {
    errors.push({
      field: 'actualCompletionDate',
      message: 'Actual completion date is required when closing a POAM',
    });
  }

  // Cannot reopen a closed POAM
  if (
    currentPOAM.status === 'CLOSED' &&
    input.status &&
    input.status !== 'CLOSED'
  ) {
    errors.push({
      field: 'status',
      message: 'Cannot reopen a closed POAM',
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Calculate days remaining until deadline
 */
export function getDaysRemaining(deadline: Date): number {
  const today = new Date();
  return differenceInDays(deadline, today);
}

/**
 * Get warning level based on days remaining
 * - 'critical': 7 days or less
 * - 'warning': 14 days or less
 * - 'normal': more than 14 days
 */
export function getDeadlineWarningLevel(
  deadline: Date
): 'critical' | 'warning' | 'normal' {
  const daysRemaining = getDaysRemaining(deadline);

  if (daysRemaining <= 7) {
    return 'critical';
  } else if (daysRemaining <= 14) {
    return 'warning';
  }

  return 'normal';
}

/**
 * Check if high/critical POAMs must be closed before authorization
 * For FedRAMP equivalency, all high/critical findings must be closed
 */
export function mustCloseBeforeAuthorization(riskLevel: RiskLevel): boolean {
  return riskLevel === 'CRITICAL' || riskLevel === 'HIGH';
}

/**
 * Calculate completion percentage based on milestones
 */
export function calculateCompletionPercentage(
  milestones: Array<{ completed: boolean }>
): number {
  if (milestones.length === 0) {
    return 0;
  }

  const completedCount = milestones.filter((m) => m.completed).length;
  return Math.round((completedCount / milestones.length) * 100);
}
