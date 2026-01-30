/**
 * CMMC Compliance Checklist Data
 * Supports Level 1 (17 practices from FAR 52.204-21) and Level 2 (110 NIST 800-171 practices)
 */

export type CMMCLevelType = 'LEVEL_1' | 'LEVEL_2' | 'LEVEL_3'

export interface ChecklistSection {
  id: string
  title: string
  description?: string
  items: ChecklistItemData[]
}

export interface ChecklistItemData {
  id: string
  label: string
  description?: string
  link?: string // Link to relevant section in the app
  critical?: boolean // Mark as critical/commonly failed
  cmmcLevel: CMMCLevelType // Minimum level required for this item
}

export const checklistData: ChecklistSection[] = [
  {
    id: 'pre-assessment',
    title: 'Pre-Assessment Documentation',
    description: 'Core documents and scoping requirements',
    items: [
      {
        id: 'pre-ssp',
        label: 'System Security Plan (SSP)',
        description: 'Documents how security requirements are met',
        link: '/cmmc/ssp',
        cmmcLevel: 'LEVEL_1',
      },
      {
        id: 'pre-poam',
        label: 'Plan of Action & Milestones (POA&M)',
        description: 'Addresses identified gaps with remediation timelines',
        link: '/cmmc/poams',
        cmmcLevel: 'LEVEL_2', // POA&M required for Level 2+
      },
      {
        id: 'pre-assets',
        label: 'Asset Inventory',
        description: 'Complete listing of all CUI assets',
        link: '/cmmc/assets',
        cmmcLevel: 'LEVEL_1',
      },
      {
        id: 'pre-network',
        label: 'Network Diagram',
        description: 'Shows CMMC assessment scope boundaries',
        cmmcLevel: 'LEVEL_1',
      },
      {
        id: 'pre-policies',
        label: 'Policies and Procedures',
        description: 'Written security policies for applicable domains',
        cmmcLevel: 'LEVEL_1',
      },
      {
        id: 'scope-define',
        label: 'Define CMMC Assessment Scope',
        cmmcLevel: 'LEVEL_1',
      },
      {
        id: 'scope-fci',
        label: 'Identify all FCI assets',
        description: 'Federal Contract Information assets',
        cmmcLevel: 'LEVEL_1',
      },
      {
        id: 'scope-cui',
        label: 'Identify all CUI assets',
        description: 'Controlled Unclassified Information assets',
        cmmcLevel: 'LEVEL_2',
      },
      {
        id: 'scope-spa',
        label: 'Document Security Protection Assets (SPAs)',
        link: '/cmmc/assets',
        cmmcLevel: 'LEVEL_2',
      },
      {
        id: 'scope-crma',
        label: 'Identify Contractor Risk Managed Assets (CRMAs)',
        link: '/cmmc/assets',
        cmmcLevel: 'LEVEL_2',
      },
      {
        id: 'scope-specialized',
        label: 'Document Specialized Assets (IoT, OT, GFE)',
        link: '/cmmc/assets',
        cmmcLevel: 'LEVEL_2',
      },
      {
        id: 'scope-esp',
        label: 'Map external service providers (ESPs)',
        link: '/cmmc/esps',
        cmmcLevel: 'LEVEL_2',
      },
    ],
  },
  {
    id: 'ac',
    title: 'Domain: Access Control (AC)',
    description: 'Level 1: 4 practices, Level 2: 22 practices',
    items: [
      // Level 1 Access Control (4 practices)
      {
        id: 'AC.L1-3.1.1',
        label: 'AC.L1-3.1.1 - Limit system access to authorized users',
        link: '/cmmc/control-catalog/AC',
        cmmcLevel: 'LEVEL_1',
      },
      {
        id: 'AC.L1-3.1.2',
        label: 'AC.L1-3.1.2 - Limit system access to authorized transaction types',
        link: '/cmmc/control-catalog/AC',
        cmmcLevel: 'LEVEL_1',
      },
      {
        id: 'AC.L1-3.1.20',
        label: 'AC.L1-3.1.20 - Verify and control external system connections',
        link: '/cmmc/control-catalog/AC',
        cmmcLevel: 'LEVEL_1',
      },
      {
        id: 'AC.L1-3.1.22',
        label: 'AC.L1-3.1.22 - Control CUI/FCI on publicly accessible systems',
        link: '/cmmc/control-catalog/AC',
        cmmcLevel: 'LEVEL_1',
      },
      // Level 2 Access Control (additional 18 practices)
      {
        id: 'AC.L2-3.1.3',
        label: 'AC.L2-3.1.3 - Control information flow between security domains',
        link: '/cmmc/control-catalog/AC',
        cmmcLevel: 'LEVEL_2',
      },
      {
        id: 'AC.L2-3.1.4',
        label: 'AC.L2-3.1.4 - Separate duties of individuals',
        link: '/cmmc/control-catalog/AC',
        cmmcLevel: 'LEVEL_2',
      },
      {
        id: 'AC.L2-3.1.5',
        label: 'AC.L2-3.1.5 - Employ least privilege principle',
        link: '/cmmc/control-catalog/AC',
        critical: true,
        cmmcLevel: 'LEVEL_2',
      },
      {
        id: 'AC.L2-3.1.6',
        label: 'AC.L2-3.1.6 - Use non-privileged accounts for non-privileged functions',
        link: '/cmmc/control-catalog/AC',
        cmmcLevel: 'LEVEL_2',
      },
      {
        id: 'AC.L2-3.1.7',
        label: 'AC.L2-3.1.7 - Prevent non-privileged users from executing privileged functions',
        link: '/cmmc/control-catalog/AC',
        cmmcLevel: 'LEVEL_2',
      },
      {
        id: 'AC.L2-3.1.8',
        label: 'AC.L2-3.1.8 - Limit unsuccessful login attempts',
        link: '/cmmc/control-catalog/AC',
        cmmcLevel: 'LEVEL_2',
      },
      {
        id: 'AC.L2-3.1.9',
        label: 'AC.L2-3.1.9 - Provide privacy and security notices',
        link: '/cmmc/control-catalog/AC',
        cmmcLevel: 'LEVEL_2',
      },
      {
        id: 'AC.L2-3.1.10',
        label: 'AC.L2-3.1.10 - Use session lock after period of inactivity',
        link: '/cmmc/control-catalog/AC',
        cmmcLevel: 'LEVEL_2',
      },
      {
        id: 'AC.L2-3.1.11',
        label: 'AC.L2-3.1.11 - Terminate user sessions after defined period',
        link: '/cmmc/control-catalog/AC',
        cmmcLevel: 'LEVEL_2',
      },
      {
        id: 'AC.L2-3.1.12',
        label: 'AC.L2-3.1.12 - Monitor and control remote access sessions',
        link: '/cmmc/control-catalog/AC',
        cmmcLevel: 'LEVEL_2',
      },
      {
        id: 'AC.L2-3.1.13',
        label: 'AC.L2-3.1.13 - Employ cryptographic mechanisms for remote access',
        link: '/cmmc/control-catalog/AC',
        critical: true,
        cmmcLevel: 'LEVEL_2',
      },
      {
        id: 'AC.L2-3.1.14',
        label: 'AC.L2-3.1.14 - Route remote access via managed access control points',
        link: '/cmmc/control-catalog/AC',
        cmmcLevel: 'LEVEL_2',
      },
      {
        id: 'AC.L2-3.1.15',
        label: 'AC.L2-3.1.15 - Authorize remote execution of privileged commands',
        link: '/cmmc/control-catalog/AC',
        cmmcLevel: 'LEVEL_2',
      },
      {
        id: 'AC.L2-3.1.16',
        label: 'AC.L2-3.1.16 - Authorize wireless access before allowing connections',
        link: '/cmmc/control-catalog/AC',
        cmmcLevel: 'LEVEL_2',
      },
      {
        id: 'AC.L2-3.1.17',
        label: 'AC.L2-3.1.17 - Protect wireless access using authentication and encryption',
        link: '/cmmc/control-catalog/AC',
        cmmcLevel: 'LEVEL_2',
      },
      {
        id: 'AC.L2-3.1.18',
        label: 'AC.L2-3.1.18 - Control connection of mobile devices',
        link: '/cmmc/control-catalog/AC',
        cmmcLevel: 'LEVEL_2',
      },
      {
        id: 'AC.L2-3.1.19',
        label: 'AC.L2-3.1.19 - Encrypt CUI on mobile devices',
        link: '/cmmc/control-catalog/AC',
        critical: true,
        cmmcLevel: 'LEVEL_2',
      },
      {
        id: 'AC.L2-3.1.21',
        label: 'AC.L2-3.1.21 - Limit use of portable storage devices',
        link: '/cmmc/control-catalog/AC',
        cmmcLevel: 'LEVEL_2',
      },
    ],
  },
  {
    id: 'ia',
    title: 'Domain: Identification and Authentication (IA)',
    description: 'Level 1: 2 practices, Level 2: 11 practices',
    items: [
      // Level 1 IA (2 practices)
      {
        id: 'IA.L1-3.5.1',
        label: 'IA.L1-3.5.1 - Identify information system users',
        link: '/cmmc/control-catalog/IA',
        cmmcLevel: 'LEVEL_1',
      },
      {
        id: 'IA.L1-3.5.2',
        label: 'IA.L1-3.5.2 - Authenticate users, processes, or devices',
        link: '/cmmc/control-catalog/IA',
        cmmcLevel: 'LEVEL_1',
      },
      // Level 2 IA (additional practices)
      {
        id: 'IA.L2-3.5.3',
        label: 'IA.L2-3.5.3 - Use multifactor authentication for local access',
        link: '/cmmc/control-catalog/IA',
        critical: true,
        cmmcLevel: 'LEVEL_2',
      },
      {
        id: 'IA.L2-3.5.4',
        label: 'IA.L2-3.5.4 - Use replay-resistant authentication mechanisms',
        link: '/cmmc/control-catalog/IA',
        cmmcLevel: 'LEVEL_2',
      },
      {
        id: 'IA.L2-3.5.5',
        label: 'IA.L2-3.5.5 - Prevent reuse of identifiers',
        link: '/cmmc/control-catalog/IA',
        cmmcLevel: 'LEVEL_2',
      },
      {
        id: 'IA.L2-3.5.6',
        label: 'IA.L2-3.5.6 - Disable identifiers after period of inactivity',
        link: '/cmmc/control-catalog/IA',
        cmmcLevel: 'LEVEL_2',
      },
      {
        id: 'IA.L2-3.5.7',
        label: 'IA.L2-3.5.7 - Enforce minimum password complexity',
        link: '/cmmc/control-catalog/IA',
        cmmcLevel: 'LEVEL_2',
      },
      {
        id: 'IA.L2-3.5.8',
        label: 'IA.L2-3.5.8 - Prohibit password reuse for specified generations',
        link: '/cmmc/control-catalog/IA',
        cmmcLevel: 'LEVEL_2',
      },
      {
        id: 'IA.L2-3.5.9',
        label: 'IA.L2-3.5.9 - Allow temporary password use with immediate change',
        link: '/cmmc/control-catalog/IA',
        cmmcLevel: 'LEVEL_2',
      },
      {
        id: 'IA.L2-3.5.10',
        label: 'IA.L2-3.5.10 - Store and transmit only cryptographically-protected passwords',
        link: '/cmmc/control-catalog/IA',
        critical: true,
        cmmcLevel: 'LEVEL_2',
      },
      {
        id: 'IA.L2-3.5.11',
        label: 'IA.L2-3.5.11 - Obscure feedback of authentication information',
        link: '/cmmc/control-catalog/IA',
        cmmcLevel: 'LEVEL_2',
      },
    ],
  },
  {
    id: 'mp',
    title: 'Domain: Media Protection (MP)',
    description: 'Level 1: 1 practice, Level 2: 9 practices',
    items: [
      // Level 1 MP (1 practice)
      {
        id: 'MP.L1-3.8.3',
        label: 'MP.L1-3.8.3 - Sanitize or destroy media before disposal or reuse',
        link: '/cmmc/control-catalog/MP',
        cmmcLevel: 'LEVEL_1',
      },
      // Level 2 MP (additional practices)
      {
        id: 'MP.L2-3.8.1',
        label: 'MP.L2-3.8.1 - Protect paper and digital media containing CUI',
        link: '/cmmc/control-catalog/MP',
        cmmcLevel: 'LEVEL_2',
      },
      {
        id: 'MP.L2-3.8.2',
        label: 'MP.L2-3.8.2 - Limit access to CUI on media to authorized users',
        link: '/cmmc/control-catalog/MP',
        cmmcLevel: 'LEVEL_2',
      },
      {
        id: 'MP.L2-3.8.4',
        label: 'MP.L2-3.8.4 - Mark media with CUI markings',
        link: '/cmmc/control-catalog/MP',
        cmmcLevel: 'LEVEL_2',
      },
      {
        id: 'MP.L2-3.8.5',
        label: 'MP.L2-3.8.5 - Control access to media with CUI and accountability',
        link: '/cmmc/control-catalog/MP',
        cmmcLevel: 'LEVEL_2',
      },
      {
        id: 'MP.L2-3.8.6',
        label: 'MP.L2-3.8.6 - Implement cryptographic protections for CUI during transport',
        link: '/cmmc/control-catalog/MP',
        critical: true,
        cmmcLevel: 'LEVEL_2',
      },
      {
        id: 'MP.L2-3.8.7',
        label: 'MP.L2-3.8.7 - Control use of removable media',
        link: '/cmmc/control-catalog/MP',
        cmmcLevel: 'LEVEL_2',
      },
      {
        id: 'MP.L2-3.8.8',
        label: 'MP.L2-3.8.8 - Prohibit portable storage when owner is unknown',
        link: '/cmmc/control-catalog/MP',
        cmmcLevel: 'LEVEL_2',
      },
      {
        id: 'MP.L2-3.8.9',
        label: 'MP.L2-3.8.9 - Protect backup CUI at storage locations',
        link: '/cmmc/control-catalog/MP',
        cmmcLevel: 'LEVEL_2',
      },
    ],
  },
  {
    id: 'pe',
    title: 'Domain: Physical Protection (PE)',
    description: 'Level 1: 4 practices, Level 2: 6 practices',
    items: [
      // Level 1 PE (4 practices)
      {
        id: 'PE.L1-3.10.1',
        label: 'PE.L1-3.10.1 - Limit physical access to authorized individuals',
        link: '/cmmc/control-catalog/PE',
        cmmcLevel: 'LEVEL_1',
      },
      {
        id: 'PE.L1-3.10.3',
        label: 'PE.L1-3.10.3 - Escort visitors and monitor visitor activity',
        link: '/cmmc/control-catalog/PE',
        cmmcLevel: 'LEVEL_1',
      },
      {
        id: 'PE.L1-3.10.4',
        label: 'PE.L1-3.10.4 - Maintain audit logs of physical access',
        link: '/cmmc/control-catalog/PE',
        cmmcLevel: 'LEVEL_1',
      },
      {
        id: 'PE.L1-3.10.5',
        label: 'PE.L1-3.10.5 - Control and manage physical access devices',
        link: '/cmmc/control-catalog/PE',
        cmmcLevel: 'LEVEL_1',
      },
      // Level 2 PE (additional practices)
      {
        id: 'PE.L2-3.10.2',
        label: 'PE.L2-3.10.2 - Protect and monitor the physical facility',
        link: '/cmmc/control-catalog/PE',
        cmmcLevel: 'LEVEL_2',
      },
      {
        id: 'PE.L2-3.10.6',
        label: 'PE.L2-3.10.6 - Enforce safeguarding at alternate work sites',
        link: '/cmmc/control-catalog/PE',
        cmmcLevel: 'LEVEL_2',
      },
    ],
  },
  {
    id: 'sc',
    title: 'Domain: System and Communications Protection (SC)',
    description: 'Level 1: 2 practices, Level 2: 16 practices',
    items: [
      // Level 1 SC (2 practices)
      {
        id: 'SC.L1-3.13.1',
        label: 'SC.L1-3.13.1 - Monitor and control communications at external boundaries',
        link: '/cmmc/control-catalog/SC',
        cmmcLevel: 'LEVEL_1',
      },
      {
        id: 'SC.L1-3.13.5',
        label: 'SC.L1-3.13.5 - Implement subnetworks for publicly accessible systems',
        link: '/cmmc/control-catalog/SC',
        cmmcLevel: 'LEVEL_1',
      },
      // Level 2 SC (additional practices)
      {
        id: 'SC.L2-3.13.2',
        label: 'SC.L2-3.13.2 - Employ architectural designs to protect CUI',
        link: '/cmmc/control-catalog/SC',
        cmmcLevel: 'LEVEL_2',
      },
      {
        id: 'SC.L2-3.13.3',
        label: 'SC.L2-3.13.3 - Separate user functionality from system management',
        link: '/cmmc/control-catalog/SC',
        cmmcLevel: 'LEVEL_2',
      },
      {
        id: 'SC.L2-3.13.4',
        label: 'SC.L2-3.13.4 - Prevent unauthorized transfer via shared resources',
        link: '/cmmc/control-catalog/SC',
        cmmcLevel: 'LEVEL_2',
      },
      {
        id: 'SC.L2-3.13.6',
        label: 'SC.L2-3.13.6 - Deny network traffic by default',
        link: '/cmmc/control-catalog/SC',
        cmmcLevel: 'LEVEL_2',
      },
      {
        id: 'SC.L2-3.13.7',
        label: 'SC.L2-3.13.7 - Prevent remote devices from split tunneling',
        link: '/cmmc/control-catalog/SC',
        cmmcLevel: 'LEVEL_2',
      },
      {
        id: 'SC.L2-3.13.8',
        label: 'SC.L2-3.13.8 - Implement cryptographic mechanisms for CUI in transit',
        link: '/cmmc/control-catalog/SC',
        critical: true,
        cmmcLevel: 'LEVEL_2',
      },
      {
        id: 'SC.L2-3.13.9',
        label: 'SC.L2-3.13.9 - Terminate network connections after period of inactivity',
        link: '/cmmc/control-catalog/SC',
        cmmcLevel: 'LEVEL_2',
      },
      {
        id: 'SC.L2-3.13.10',
        label: 'SC.L2-3.13.10 - Establish and manage cryptographic keys',
        link: '/cmmc/control-catalog/SC',
        cmmcLevel: 'LEVEL_2',
      },
      {
        id: 'SC.L2-3.13.11',
        label: 'SC.L2-3.13.11 - Employ FIPS-validated cryptography',
        link: '/cmmc/control-catalog/SC',
        critical: true,
        cmmcLevel: 'LEVEL_2',
      },
      {
        id: 'SC.L2-3.13.12',
        label: 'SC.L2-3.13.12 - Prohibit remote activation of collaborative devices',
        link: '/cmmc/control-catalog/SC',
        cmmcLevel: 'LEVEL_2',
      },
      {
        id: 'SC.L2-3.13.13',
        label: 'SC.L2-3.13.13 - Control and monitor use of mobile code',
        link: '/cmmc/control-catalog/SC',
        cmmcLevel: 'LEVEL_2',
      },
      {
        id: 'SC.L2-3.13.14',
        label: 'SC.L2-3.13.14 - Control and monitor use of VoIP',
        link: '/cmmc/control-catalog/SC',
        cmmcLevel: 'LEVEL_2',
      },
      {
        id: 'SC.L2-3.13.15',
        label: 'SC.L2-3.13.15 - Protect authenticity of communications sessions',
        link: '/cmmc/control-catalog/SC',
        cmmcLevel: 'LEVEL_2',
      },
      {
        id: 'SC.L2-3.13.16',
        label: 'SC.L2-3.13.16 - Protect CUI at rest',
        link: '/cmmc/control-catalog/SC',
        critical: true,
        cmmcLevel: 'LEVEL_2',
      },
    ],
  },
  {
    id: 'si',
    title: 'Domain: System and Information Integrity (SI)',
    description: 'Level 1: 4 practices, Level 2: 7 practices',
    items: [
      // Level 1 SI (4 practices)
      {
        id: 'SI.L1-3.14.1',
        label: 'SI.L1-3.14.1 - Identify, report, and correct system flaws',
        link: '/cmmc/control-catalog/SI',
        cmmcLevel: 'LEVEL_1',
      },
      {
        id: 'SI.L1-3.14.2',
        label: 'SI.L1-3.14.2 - Provide malicious code protection',
        link: '/cmmc/control-catalog/SI',
        critical: true,
        cmmcLevel: 'LEVEL_1',
      },
      {
        id: 'SI.L1-3.14.4',
        label: 'SI.L1-3.14.4 - Update malicious code protection mechanisms',
        link: '/cmmc/control-catalog/SI',
        cmmcLevel: 'LEVEL_1',
      },
      {
        id: 'SI.L1-3.14.5',
        label: 'SI.L1-3.14.5 - Perform system and file scans',
        link: '/cmmc/control-catalog/SI',
        cmmcLevel: 'LEVEL_1',
      },
      // Level 2 SI (additional practices)
      {
        id: 'SI.L2-3.14.3',
        label: 'SI.L2-3.14.3 - Monitor system security alerts and advisories',
        link: '/cmmc/control-catalog/SI',
        cmmcLevel: 'LEVEL_2',
      },
      {
        id: 'SI.L2-3.14.6',
        label: 'SI.L2-3.14.6 - Monitor inbound and outbound communications',
        link: '/cmmc/control-catalog/SI',
        cmmcLevel: 'LEVEL_2',
      },
      {
        id: 'SI.L2-3.14.7',
        label: 'SI.L2-3.14.7 - Identify unauthorized use of systems',
        link: '/cmmc/control-catalog/SI',
        cmmcLevel: 'LEVEL_2',
      },
    ],
  },
  {
    id: 'at',
    title: 'Domain: Awareness and Training (AT)',
    description: 'Level 2 only: 3 practices',
    items: [
      {
        id: 'AT.L2-3.2.1',
        label: 'AT.L2-3.2.1 - Ensure managers, system admins, and users are trained',
        link: '/cmmc/control-catalog/AT',
        critical: true,
        cmmcLevel: 'LEVEL_2',
      },
      {
        id: 'AT.L2-3.2.2',
        label: 'AT.L2-3.2.2 - Provide role-based security training before access',
        link: '/cmmc/control-catalog/AT',
        cmmcLevel: 'LEVEL_2',
      },
      {
        id: 'AT.L2-3.2.3',
        label: 'AT.L2-3.2.3 - Provide security training updates and refreshers',
        link: '/cmmc/control-catalog/AT',
        cmmcLevel: 'LEVEL_2',
      },
    ],
  },
  {
    id: 'au',
    title: 'Domain: Audit and Accountability (AU)',
    description: 'Level 2 only: 9 practices',
    items: [
      {
        id: 'AU.L2-3.3.1',
        label: 'AU.L2-3.3.1 - Create and retain audit logs to enable monitoring',
        link: '/cmmc/control-catalog/AU',
        critical: true,
        cmmcLevel: 'LEVEL_2',
      },
      {
        id: 'AU.L2-3.3.2',
        label: 'AU.L2-3.3.2 - Ensure actions can be traced to individual users',
        link: '/cmmc/control-catalog/AU',
        cmmcLevel: 'LEVEL_2',
      },
      {
        id: 'AU.L2-3.3.3',
        label: 'AU.L2-3.3.3 - Review and update logged events periodically',
        link: '/cmmc/control-catalog/AU',
        cmmcLevel: 'LEVEL_2',
      },
      {
        id: 'AU.L2-3.3.4',
        label: 'AU.L2-3.3.4 - Alert on audit failure and take appropriate action',
        link: '/cmmc/control-catalog/AU',
        cmmcLevel: 'LEVEL_2',
      },
      {
        id: 'AU.L2-3.3.5',
        label: 'AU.L2-3.3.5 - Correlate audit records across repositories',
        link: '/cmmc/control-catalog/AU',
        cmmcLevel: 'LEVEL_2',
      },
      {
        id: 'AU.L2-3.3.6',
        label: 'AU.L2-3.3.6 - Provide audit reduction and report generation',
        link: '/cmmc/control-catalog/AU',
        cmmcLevel: 'LEVEL_2',
      },
      {
        id: 'AU.L2-3.3.7',
        label: 'AU.L2-3.3.7 - Provide and implement system audit capability',
        link: '/cmmc/control-catalog/AU',
        cmmcLevel: 'LEVEL_2',
      },
      {
        id: 'AU.L2-3.3.8',
        label: 'AU.L2-3.3.8 - Protect audit information and tools',
        link: '/cmmc/control-catalog/AU',
        cmmcLevel: 'LEVEL_2',
      },
      {
        id: 'AU.L2-3.3.9',
        label: 'AU.L2-3.3.9 - Limit management of audit functionality to subset of users',
        link: '/cmmc/control-catalog/AU',
        cmmcLevel: 'LEVEL_2',
      },
    ],
  },
  {
    id: 'continuous',
    title: 'Continuous Compliance',
    description: 'Ongoing activities and requirements',
    items: [
      {
        id: 'cont-annual-affirmation',
        label: 'Submit annual affirmation of continued compliance',
        cmmcLevel: 'LEVEL_1',
      },
      {
        id: 'cont-sprs',
        label: 'Update SPRS (Supplier Performance Risk System) scores',
        cmmcLevel: 'LEVEL_2',
      },
      {
        id: 'cont-poam-review',
        label: 'Review and update POA&M items',
        link: '/cmmc/poams',
        cmmcLevel: 'LEVEL_2',
      },
      {
        id: 'cont-internal-review',
        label: 'Conduct internal compliance reviews',
        cmmcLevel: 'LEVEL_1',
      },
      {
        id: 'cont-assessment-3yr',
        label: 'Complete C3PAO assessment every 3 years',
        cmmcLevel: 'LEVEL_2',
      },
      {
        id: 'cont-self-assessment',
        label: 'Complete annual self-assessment',
        cmmcLevel: 'LEVEL_1',
      },
      {
        id: 'cont-ssp-update',
        label: 'Update System Security Plan',
        link: '/cmmc/ssp',
        cmmcLevel: 'LEVEL_1',
      },
      {
        id: 'cont-security-alerts',
        label: 'Monitor security alerts and advisories',
        cmmcLevel: 'LEVEL_1',
      },
      {
        id: 'cont-patching',
        label: 'Apply security patches within defined timeframes',
        cmmcLevel: 'LEVEL_1',
      },
      {
        id: 'cont-vuln-scans',
        label: 'Conduct periodic vulnerability scans',
        cmmcLevel: 'LEVEL_2',
      },
      {
        id: 'cont-policy-review',
        label: 'Review and update security policies',
        cmmcLevel: 'LEVEL_1',
      },
      {
        id: 'cont-training',
        label: 'Train personnel on security requirements',
        cmmcLevel: 'LEVEL_1',
      },
      {
        id: 'cont-audit-logs',
        label: 'Maintain audit logs and review regularly',
        cmmcLevel: 'LEVEL_2',
      },
      {
        id: 'cont-ir-test',
        label: 'Test incident response procedures',
        cmmcLevel: 'LEVEL_2',
      },
      {
        id: 'cont-asset-update',
        label: 'Update asset inventory as changes occur',
        link: '/cmmc/assets',
        cmmcLevel: 'LEVEL_1',
      },
    ],
  },
]

/**
 * Get checklist items filtered by CMMC level
 * Level 1 packages only see Level 1 items
 * Level 2 packages see Level 1 + Level 2 items
 * Level 3 packages see all items
 */
export function getChecklistDataByLevel(level: CMMCLevelType): ChecklistSection[] {
  const levelHierarchy: Record<CMMCLevelType, CMMCLevelType[]> = {
    LEVEL_1: ['LEVEL_1'],
    LEVEL_2: ['LEVEL_1', 'LEVEL_2'],
    LEVEL_3: ['LEVEL_1', 'LEVEL_2', 'LEVEL_3'],
  }

  const allowedLevels = levelHierarchy[level]

  return checklistData
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => allowedLevels.includes(item.cmmcLevel)),
    }))
    .filter((section) => section.items.length > 0)
}

/**
 * Get total count of checklist items for a specific level
 */
export function getTotalChecklistItemsByLevel(level: CMMCLevelType): number {
  const filteredData = getChecklistDataByLevel(level)
  return filteredData.reduce((sum, section) => sum + section.items.length, 0)
}

/**
 * Get total count of all checklist items (for backward compatibility)
 */
export function getTotalChecklistItems(): number {
  return checklistData.reduce((sum, section) => sum + section.items.length, 0)
}

/**
 * Get section by ID, optionally filtered by level
 */
export function getChecklistSection(
  sectionId: string,
  level?: CMMCLevelType
): ChecklistSection | undefined {
  if (level) {
    const filteredData = getChecklistDataByLevel(level)
    return filteredData.find((section) => section.id === sectionId)
  }
  return checklistData.find((section) => section.id === sectionId)
}

/**
 * Get level-specific scoring information
 */
export function getLevelScoringInfo(level: CMMCLevelType): {
  totalPractices: number
  maxScore: number
  description: string
} {
  switch (level) {
    case 'LEVEL_1':
      return {
        totalPractices: 17,
        maxScore: 17,
        description: 'CMMC Level 1 requires all 17 practices to be implemented (self-assessment)',
      }
    case 'LEVEL_2':
      return {
        totalPractices: 110,
        maxScore: 110,
        description:
          'CMMC Level 2 covers 110 NIST SP 800-171 requirements. Your SPRS score (ranging from -203 to 110) reflects compliance status. POA&Ms may be required for gaps.',
      }
    case 'LEVEL_3':
      return {
        totalPractices: 130,
        maxScore: 130,
        description: 'CMMC Level 3 requires enhanced security practices beyond Level 2 (government-led assessment)',
      }
  }
}
