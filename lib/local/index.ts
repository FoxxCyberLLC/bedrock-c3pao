/**
 * Barrel for the offline local data layer. Domain modules (engagements, controls, objectives,
 * evidence, …) are added in Tasks 11-20 and re-exported here so server actions import from one
 * place. For now it exposes the offline-mode utilities.
 */
export { isOffline, assertOnline, OfflineModeError } from '@/lib/mode'
export {
  getLocalEngagementSummaries,
  getLocalEngagementDetail,
  setLocalEngagementStatus,
  setLocalAssessmentMode,
  getLocalEngagementPhase,
  setLocalEngagementPhase,
  getLocalEngagementLifecycle,
} from './engagements'
export { getLocalControls, updateLocalControlNotes, getLocalStats } from './controls'
export { getLocalObjectives, getLocalObjective, updateLocalObjective } from './objectives'
export {
  getLocalSnapshots,
  getLocalSnapshotObjectives,
  startLocalCorrectionOpportunity,
  resumeLocalReEvaluation,
} from './snapshots'
export { getLocalEvidence, getLocalEvidenceObject, getLocalEvidenceBytes } from './evidence'
export { getLocalSSP, getLocalAssets, getLocalPoams } from './ssp-assets-poam'
export { getLocalFindings, createLocalFinding, updateLocalFinding, reviewLocalFinding } from './findings'
export {
  getLocalNotes, createLocalNote,
  getLocalCheckins, createLocalCheckin,
  getLocalComments, createLocalComment,
} from './collab'
export {
  getLocalTeam, getLocalAvailableAssessors, addLocalTeamMember,
  updateLocalTeamMemberRole, removeLocalTeamMember, setLocalAssessorDomains,
  isLocalEngagementLead,
} from './team'
export {
  getLocalDailyProgress, getLocalProgressByDomain, getLocalProgressByAssessor,
  getLocalPlanning, updateLocalPlanning, sendLocalProposal, acknowledgeLocalIntroduction,
} from './progress'
