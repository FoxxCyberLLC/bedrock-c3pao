/**
 * SSP PDF Document - CMMC Level 2 ISSM Template Format
 * Matches the SSP_CMMC_L2_ISSM_Template.docx structure
 */

import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
} from '@react-pdf/renderer';
import { styles, getStatusStyle } from './styles';
// Prisma types replaced - data comes from SaaS API as JSON;

// Component props
interface SSPDocumentProps {
  ssp: SSP & {
    atoPackage: {
      name: string;
      cmmcLevel: string;
      organization: {
        name: string;
        legalName: string | null;
      } | null;
    };
  };
}

// Helper to format status for display
function formatStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'COMPLIANT': 'Implemented (Internal)',
    'IN_PROGRESS': 'Partially Implemented (In POA&M)',
    'NON_COMPLIANT': 'Planned (In POA&M)',
    'NOT_APPLICABLE': 'Not Applicable',
    'NOT_STARTED': 'Not Started',
  };
  return statusMap[status] || status;
}

// Helper to format occurrence
function formatOccurrence(occurrence: string | null): string {
  if (!occurrence) return 'Not specified';
  const occMap: Record<string, string> = {
    'DAILY': 'Daily',
    'WEEKLY': 'Weekly',
    'MONTHLY': 'Monthly',
    'QUARTERLY': 'Quarterly',
    'ANNUAL': 'Annual',
    'EVENT_DRIVEN': 'Event-driven',
    'CONTINUOUS': 'Continuous',
  };
  return occMap[occurrence] || occurrence;
}

// Header component
const DocumentHeader: React.FC<{
  systemName: string;
  version: string;
}> = ({ systemName, version }) => (
  <View style={styles.header} fixed>
    <Text style={{ fontWeight: 'bold' }}>{systemName}</Text>
    <Text>System Security Plan</Text>
    <Text>Version {version}</Text>
  </View>
);

// Footer component
const DocumentFooter: React.FC<{
  organizationName: string;
}> = ({ organizationName }) => (
  <View style={styles.footer} fixed>
    <Text style={{ color: '#d32f2f', fontWeight: 'bold' }}>CUI</Text>
    <Text>{organizationName}</Text>
    <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
  </View>
);

// Cover Page - matches template exactly
const CoverPage: React.FC<{ ssp: SSPDocumentProps['ssp'] }> = ({ ssp }) => (
  <Page size="A4" style={styles.page}>
    <View style={styles.coverPage}>
      {ssp.status === 'DRAFT' && (
        <Text style={[styles.watermark, { top: '40%', left: '20%' }]}>DRAFT</Text>
      )}

      <Text style={{ fontSize: 32, fontWeight: 'bold', color: '#1a365d', marginBottom: 5 }}>
        SYSTEM SECURITY PLAN
      </Text>
      <Text style={{ fontSize: 14, color: '#4a5568', marginBottom: 30 }}>
        (SSP)
      </Text>

      <View style={{ backgroundColor: '#2b6cb0', padding: 10, marginBottom: 30 }}>
        <Text style={{ fontSize: 16, color: '#fff', fontWeight: 'bold' }}>
          CMMC Level {ssp.atoPackage.cmmcLevel.replace('LEVEL_', '')} Compliance
        </Text>
      </View>

      <View style={{ marginTop: 20, width: '80%' }}>
        <View style={{ flexDirection: 'row', marginBottom: 8 }}>
          <Text style={{ width: 150, fontWeight: 'bold', fontSize: 11 }}>Organization Name</Text>
          <Text style={{ flex: 1, fontSize: 11 }}>{ssp.atoPackage.organization?.name || '[Organization Name]'}</Text>
        </View>
        <View style={{ flexDirection: 'row', marginBottom: 8 }}>
          <Text style={{ width: 150, fontWeight: 'bold', fontSize: 11 }}>System Name</Text>
          <Text style={{ flex: 1, fontSize: 11 }}>{ssp.systemName || ssp.atoPackage.name}</Text>
        </View>
        {ssp.contractNumber && (
          <View style={{ flexDirection: 'row', marginBottom: 8 }}>
            <Text style={{ width: 150, fontWeight: 'bold', fontSize: 11 }}>Contract Number(s)</Text>
            <Text style={{ flex: 1, fontSize: 11 }}>{ssp.contractNumber}</Text>
          </View>
        )}
        <View style={{ flexDirection: 'row', marginBottom: 8 }}>
          <Text style={{ width: 150, fontWeight: 'bold', fontSize: 11 }}>Classification</Text>
          <Text style={{ flex: 1, fontSize: 11, color: '#c53030' }}>Controlled Unclassified Information (CUI)</Text>
        </View>
        <View style={{ flexDirection: 'row', marginBottom: 8 }}>
          <Text style={{ width: 150, fontWeight: 'bold', fontSize: 11 }}>Revision Date</Text>
          <Text style={{ flex: 1, fontSize: 11 }}>
            {ssp.revisionDate ? new Date(ssp.revisionDate).toLocaleDateString() : new Date().toLocaleDateString()}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', marginBottom: 8 }}>
          <Text style={{ width: 150, fontWeight: 'bold', fontSize: 11 }}>Version</Text>
          <Text style={{ flex: 1, fontSize: 11 }}>{ssp.version}</Text>
        </View>
      </View>

      <View style={{ marginTop: 40, padding: 15, borderWidth: 2, borderColor: '#c53030', backgroundColor: '#fff5f5' }}>
        <Text style={{ fontSize: 10, color: '#c53030', fontWeight: 'bold', textAlign: 'center' }}>
          DISTRIBUTION: This document contains CUI and must be protected accordingly.
        </Text>
      </View>
    </View>
  </Page>
);

// Prepared By & Record of Changes
const PreparedByPage: React.FC<{ ssp: SSPDocumentProps['ssp'] }> = ({ ssp }) => (
  <Page size="A4" style={styles.page}>
    <DocumentHeader systemName={ssp.systemName || ssp.atoPackage.name} version={ssp.version} />

    <Text style={styles.h1}>Prepared By & Record of Changes</Text>

    <Text style={styles.h2}>Prepared By</Text>
    <View style={styles.table}>
      <View style={styles.tableRow}>
        <View style={[styles.tableCell, { width: 100, backgroundColor: '#e2e8f0' }]}>
          <Text style={{ fontWeight: 'bold' }}>Name</Text>
        </View>
        <View style={[styles.tableCell, { flex: 1 }]}>
          <Text>{ssp.preparedByName || '[Author Name]'}</Text>
        </View>
      </View>
      <View style={styles.tableRow}>
        <View style={[styles.tableCell, { width: 100, backgroundColor: '#e2e8f0' }]}>
          <Text style={{ fontWeight: 'bold' }}>Title</Text>
        </View>
        <View style={[styles.tableCell, { flex: 1 }]}>
          <Text>{ssp.preparedByTitle || '[Author Title]'}</Text>
        </View>
      </View>
      <View style={styles.tableRow}>
        <View style={[styles.tableCell, { width: 100, backgroundColor: '#e2e8f0' }]}>
          <Text style={{ fontWeight: 'bold' }}>Email</Text>
        </View>
        <View style={[styles.tableCell, { flex: 1 }]}>
          <Text>{ssp.preparedByEmail || '[Email Address]'}</Text>
        </View>
      </View>
      <View style={styles.tableRow}>
        <View style={[styles.tableCell, { width: 100, backgroundColor: '#e2e8f0' }]}>
          <Text style={{ fontWeight: 'bold' }}>Phone</Text>
        </View>
        <View style={[styles.tableCell, { flex: 1 }]}>
          <Text>{ssp.preparedByPhone || '[Phone Number]'}</Text>
        </View>
      </View>
      <View style={styles.tableRow}>
        <View style={[styles.tableCell, { width: 100, backgroundColor: '#e2e8f0' }]}>
          <Text style={{ fontWeight: 'bold' }}>Department</Text>
        </View>
        <View style={[styles.tableCell, { flex: 1 }]}>
          <Text>{ssp.preparedByDepartment || '[Department Name]'}</Text>
        </View>
      </View>
    </View>

    <Text style={[styles.h2, { marginTop: 20 }]}>Revision History</Text>
    <View style={styles.table}>
      <View style={styles.tableHeaderRow}>
        <View style={[styles.tableHeaderCell, { width: 60 }]}><Text>Version</Text></View>
        <View style={[styles.tableHeaderCell, { width: 80 }]}><Text>Date</Text></View>
        <View style={[styles.tableHeaderCell, { flex: 1 }]}><Text>Description</Text></View>
      </View>
      <View style={styles.tableRow}>
        <View style={[styles.tableCell, { width: 60 }]}><Text>{ssp.version}</Text></View>
        <View style={[styles.tableCell, { width: 80 }]}>
          <Text>{ssp.generatedAt ? new Date(ssp.generatedAt).toLocaleDateString() : 'Current'}</Text>
        </View>
        <View style={[styles.tableCell, { flex: 1 }]}><Text>Initial SSP</Text></View>
      </View>
    </View>

    <DocumentFooter organizationName={ssp.atoPackage.organization?.name || 'Organization'} />
  </Page>
);

// Ownership & Cybersecurity Overview
const OwnershipOverviewPage: React.FC<{ ssp: SSPDocumentProps['ssp'] }> = ({ ssp }) => (
  <Page size="A4" style={styles.page}>
    <DocumentHeader systemName={ssp.systemName || ssp.atoPackage.name} version={ssp.version} />

    <Text style={styles.h1}>Ownership & Cybersecurity Overview</Text>

    <View style={styles.section}>
      <Text style={styles.h2}>General Description / Purpose</Text>
      <Text style={styles.paragraph}>
        {ssp.systemPurpose || '[Describe the purpose of this system and its role in supporting CUI operations.]'}
      </Text>
    </View>

    {ssp.contractsContainingCUI && (
      <View style={styles.section}>
        <Text style={styles.h2}>Contracts Containing CUI</Text>
        <Text style={styles.paragraph}>{ssp.contractsContainingCUI}</Text>
      </View>
    )}

    <View style={styles.section}>
      <Text style={styles.h2}>System Identification - CUI Overview</Text>
      <Text style={styles.paragraph}>
        {ssp.cuiOverview || '[Define what CUI is for your contracts. What specific data types constitute CUI?]'}
      </Text>
    </View>

    <View style={styles.section}>
      <Text style={styles.h2}>Key Stakeholders</Text>
      <View style={styles.table}>
        <View style={styles.tableHeaderRow}>
          <View style={[styles.tableHeaderCell, { flex: 1 }]}><Text>Name</Text></View>
          <View style={[styles.tableHeaderCell, { width: 80 }]}><Text>Role</Text></View>
          <View style={[styles.tableHeaderCell, { flex: 1 }]}><Text>Contact</Text></View>
        </View>
        <View style={styles.tableRow}>
          <View style={[styles.tableCell, { flex: 1 }]}><Text>{ssp.systemOwner || '[Name]'}</Text></View>
          <View style={[styles.tableCell, { width: 80 }]}><Text>System Owner</Text></View>
          <View style={[styles.tableCell, { flex: 1 }]}><Text>{ssp.systemOwnerEmail || '[Email/Phone]'}</Text></View>
        </View>
        <View style={styles.tableRow}>
          <View style={[styles.tableCell, { flex: 1 }]}><Text>{ssp.securityOfficer || '[Name]'}</Text></View>
          <View style={[styles.tableCell, { width: 80 }]}><Text>ISSO</Text></View>
          <View style={[styles.tableCell, { flex: 1 }]}><Text>{ssp.securityOfficerEmail || '[Email/Phone]'}</Text></View>
        </View>
        {ssp.authorizingOfficial && (
          <View style={styles.tableRow}>
            <View style={[styles.tableCell, { flex: 1 }]}><Text>{ssp.authorizingOfficial}</Text></View>
            <View style={[styles.tableCell, { width: 80 }]}><Text>AO</Text></View>
            <View style={[styles.tableCell, { flex: 1 }]}><Text>{ssp.authorizingOfficialEmail || '[Email/Phone]'}</Text></View>
          </View>
        )}
      </View>
    </View>

    {ssp.documentationRepository && (
      <View style={styles.section}>
        <Text style={styles.h2}>Documentation Repository</Text>
        <Text style={styles.paragraph}>{ssp.documentationRepository}</Text>
      </View>
    )}

    <DocumentFooter organizationName={ssp.atoPackage.organization?.name || 'Organization'} />
  </Page>
);

// System Environment Page
const SystemEnvironmentPage: React.FC<{ ssp: SSPDocumentProps['ssp'] }> = ({ ssp }) => (
  <Page size="A4" style={styles.page}>
    <DocumentHeader systemName={ssp.systemName || ssp.atoPackage.name} version={ssp.version} />

    <Text style={styles.h1}>System Environment</Text>

    <View style={styles.section}>
      <Text style={styles.h2}>Operating Model</Text>
      <Text style={{ fontSize: 10, fontWeight: 'bold', marginBottom: 5 }}>Operating Environment Where CUI Exists:</Text>
      <View style={{ marginLeft: 10 }}>
        <Text style={{ fontSize: 10, marginBottom: 3 }}>
          {ssp.operatingModelPublicCloud ? '☑' : '☐'} Public Cloud - Cloud services supporting multiple organizations
        </Text>
        <Text style={{ fontSize: 10, marginBottom: 3 }}>
          {ssp.operatingModelPrivateCloud ? '☑' : '☐'} Private Cloud - Cloud services dedicated to your organization
        </Text>
        <Text style={{ fontSize: 10, marginBottom: 3 }}>
          {ssp.operatingModelDataCenter ? '☑' : '☐'} Data Center - Company-owned and operated datacenter
        </Text>
        <Text style={{ fontSize: 10, marginBottom: 3 }}>
          {ssp.operatingModelHybrid ? '☑' : '☐'} Hybrid - Combination of cloud and on-premise
        </Text>
        <Text style={{ fontSize: 10, marginBottom: 3 }}>
          {ssp.operatingModelDispersed ? '☑' : '☐'} Dispersed Endpoints - CUI on workstations/endpoints
        </Text>
        <Text style={{ fontSize: 10, marginBottom: 3 }}>
          {ssp.operatingModelAirGapped ? '☑' : '☐'} Air-Gapped - Isolated network with no external connectivity
        </Text>
      </View>
    </View>

    <View style={styles.section}>
      <Text style={{ fontSize: 10, fontWeight: 'bold', marginBottom: 5 }}>Where CUI Is Stored, Transmitted, or Processed:</Text>
      <View style={{ marginLeft: 10 }}>
        <Text style={{ fontSize: 10, marginBottom: 3 }}>
          {ssp.cuiEndUserWorkstations ? '☑' : '☐'} End User Workstations (desktops, laptops)
        </Text>
        <Text style={{ fontSize: 10, marginBottom: 3 }}>
          {ssp.cuiMobileDevices ? '☑' : '☐'} Mobile Devices (tablets, smartphones)
        </Text>
        <Text style={{ fontSize: 10, marginBottom: 3 }}>
          {ssp.cuiServers ? '☑' : '☐'} Servers (file, application, database)
        </Text>
        <Text style={{ fontSize: 10, marginBottom: 3 }}>
          {ssp.cuiIndustrialControlSystems ? '☑' : '☐'} Industrial Control Systems (ICS)
        </Text>
        <Text style={{ fontSize: 10, marginBottom: 3 }}>
          {ssp.cuiInternalApplications ? '☑' : '☐'} Internal Applications/Services
        </Text>
        <Text style={{ fontSize: 10, marginBottom: 3 }}>
          {ssp.cuiSaas ? '☑' : '☐'} Software as a Service (SaaS)
        </Text>
        <Text style={{ fontSize: 10, marginBottom: 3 }}>
          {ssp.cuiPaas ? '☑' : '☐'} Platform as a Service (PaaS)
        </Text>
        <Text style={{ fontSize: 10, marginBottom: 3 }}>
          {ssp.cuiIaas ? '☑' : '☐'} Infrastructure as a Service (IaaS)
        </Text>
      </View>
    </View>

    <View style={styles.section}>
      <Text style={styles.h2}>Interconnectivity Overview</Text>
      <Text style={styles.paragraph}>
        {ssp.interconnectivityOverview || ssp.interconnections || '[Describe how systems within the CUI environment communicate.]'}
      </Text>
    </View>

    <View style={styles.section}>
      <Text style={styles.h2}>Identification & Authentication Overview</Text>
      <Text style={styles.paragraph}>
        {ssp.identificationAuthOverview || '[Describe authentication mechanisms: Active Directory, LDAP, MFA, etc.]'}
      </Text>
      {(ssp.userCount || ssp.adminCount) && (
        <Text style={{ fontSize: 10, marginTop: 5 }}>
          Users: {ssp.userCount || 'N/A'} | Admins: {ssp.adminCount || 'N/A'}
        </Text>
      )}
    </View>

    <DocumentFooter organizationName={ssp.atoPackage.organization?.name || 'Organization'} />
  </Page>
);

// System Description & Boundary Page
const SystemDescriptionPage: React.FC<{ ssp: SSPDocumentProps['ssp'] }> = ({ ssp }) => (
  <Page size="A4" style={styles.page}>
    <DocumentHeader systemName={ssp.systemName || ssp.atoPackage.name} version={ssp.version} />

    <Text style={styles.h1}>System Components & Network Boundaries</Text>

    {ssp.systemDescription && (
      <View style={styles.section}>
        <Text style={styles.h2}>System Description</Text>
        <Text style={styles.paragraph}>{ssp.systemDescription}</Text>
      </View>
    )}

    {ssp.systemBoundary && (
      <View style={styles.section}>
        <Text style={styles.h2}>Authorization Boundary</Text>
        <Text style={styles.paragraph}>{ssp.systemBoundary}</Text>
      </View>
    )}

    {ssp.systemArchitecture && (
      <View style={styles.section}>
        <Text style={styles.h2}>System Architecture</Text>
        <Text style={styles.paragraph}>{ssp.systemArchitecture}</Text>
      </View>
    )}

    {ssp.dataFlow && (
      <View style={styles.section}>
        <Text style={styles.h2}>Data Flow</Text>
        <Text style={styles.paragraph}>{ssp.dataFlow}</Text>
      </View>
    )}

    <View style={[styles.infoBox, { marginTop: 20 }]}>
      <Text style={{ fontSize: 10, fontWeight: 'bold' }}>Network Diagram</Text>
      <Text style={{ fontSize: 9, marginTop: 5 }}>
        [Network diagram should be attached separately or referenced here. Show CUI boundaries, data flows, security zones, and external connections.]
      </Text>
    </View>

    <DocumentFooter organizationName={ssp.atoPackage.organization?.name || 'Organization'} />
  </Page>
);

// Roles & Privileges Page
const RolesPrivilegesPage: React.FC<{ ssp: SSPDocumentProps['ssp'] }> = ({ ssp }) => (
  <Page size="A4" style={styles.page}>
    <DocumentHeader systemName={ssp.systemName || ssp.atoPackage.name} version={ssp.version} />

    <Text style={styles.h1}>Roles & Privileges</Text>

    <View style={styles.table}>
      <View style={styles.tableHeaderRow}>
        <View style={[styles.tableHeaderCell, { flex: 1 }]}><Text>Role</Text></View>
        <View style={[styles.tableHeaderCell, { width: 80 }]}><Text>Privilege</Text></View>
        <View style={[styles.tableHeaderCell, { flex: 1 }]}><Text>Access Scope</Text></View>
      </View>
      <View style={styles.tableRow}>
        <View style={[styles.tableCell, { flex: 1 }]}><Text>System Owner</Text></View>
        <View style={[styles.tableCell, { width: 80 }]}><Text>Full</Text></View>
        <View style={[styles.tableCell, { flex: 1 }]}><Text>All systems</Text></View>
      </View>
      <View style={styles.tableRow}>
        <View style={[styles.tableCell, { flex: 1 }]}><Text>ISSO</Text></View>
        <View style={[styles.tableCell, { width: 80 }]}><Text>Elevated</Text></View>
        <View style={[styles.tableCell, { flex: 1 }]}><Text>Security management</Text></View>
      </View>
      <View style={styles.tableRow}>
        <View style={[styles.tableCell, { flex: 1 }]}><Text>System Admin</Text></View>
        <View style={[styles.tableCell, { width: 80 }]}><Text>Elevated</Text></View>
        <View style={[styles.tableCell, { flex: 1 }]}><Text>Assigned systems</Text></View>
      </View>
      <View style={styles.tableRow}>
        <View style={[styles.tableCell, { flex: 1 }]}><Text>Standard User</Text></View>
        <View style={[styles.tableCell, { width: 80 }]}><Text>Standard</Text></View>
        <View style={[styles.tableCell, { flex: 1 }]}><Text>Assigned resources only</Text></View>
      </View>
    </View>

    {ssp.additionalRoles && (
      <View style={[styles.section, { marginTop: 15 }]}>
        <Text style={styles.h2}>Additional Roles</Text>
        <Text style={styles.paragraph}>{ssp.additionalRoles}</Text>
      </View>
    )}

    <Text style={[styles.h1, { marginTop: 30 }]}>Supply Chain Overview</Text>
    <Text style={styles.paragraph}>
      {ssp.supplyChainOverview || '[Identify third-party service providers, cloud vendors, MSPs, and other external entities that process, store, or transmit CUI on your behalf.]'}
    </Text>

    <View style={[styles.table, { marginTop: 10 }]}>
      <View style={styles.tableHeaderRow}>
        <View style={[styles.tableHeaderCell, { flex: 1 }]}><Text>Provider</Text></View>
        <View style={[styles.tableHeaderCell, { flex: 1 }]}><Text>Service</Text></View>
        <View style={[styles.tableHeaderCell, { width: 70 }]}><Text>CUI Access</Text></View>
        <View style={[styles.tableHeaderCell, { width: 80 }]}><Text>Compliance</Text></View>
      </View>
      <View style={styles.tableRow}>
        <View style={[styles.tableCell, { flex: 1 }]}><Text>[Provider]</Text></View>
        <View style={[styles.tableCell, { flex: 1 }]}><Text>[Service]</Text></View>
        <View style={[styles.tableCell, { width: 70 }]}><Text>Yes/No</Text></View>
        <View style={[styles.tableCell, { width: 80 }]}><Text>FedRAMP/CMMC</Text></View>
      </View>
    </View>

    <DocumentFooter organizationName={ssp.atoPackage.organization?.name || 'Organization'} />
  </Page>
);

// SDLC Page
const SDLCPage: React.FC<{ ssp: SSPDocumentProps['ssp'] }> = ({ ssp }) => (
  <Page size="A4" style={styles.page}>
    <DocumentHeader systemName={ssp.systemName || ssp.atoPackage.name} version={ssp.version} />

    <Text style={styles.h1}>System Development Life Cycle (SDLC)</Text>

    <View style={styles.section}>
      <Text style={styles.h2}>Operational Phase</Text>
      <Text style={{ fontSize: 10, fontWeight: 'bold', marginBottom: 5 }}>Current Status:</Text>
      <View style={{ marginLeft: 10 }}>
        <Text style={{ fontSize: 10, marginBottom: 3 }}>
          {ssp.operationalPhase === 'OPERATIONAL' ? '☑' : '☐'} Operational - CUI is used in production
        </Text>
        <Text style={{ fontSize: 10, marginBottom: 3 }}>
          {ssp.operationalPhase === 'DEVELOPMENT' ? '☑' : '☐'} Under Development - CUI is in dev/test environment
        </Text>
        <Text style={{ fontSize: 10, marginBottom: 3 }}>
          {ssp.operationalPhase === 'MODIFICATION' ? '☑' : '☐'} Major Modification - System undergoing significant changes
        </Text>
      </View>
    </View>

    <View style={styles.section}>
      <Text style={styles.h2}>SDLC Milestones</Text>
      <View style={styles.table}>
        <View style={styles.tableHeaderRow}>
          <View style={[styles.tableHeaderCell, { flex: 1 }]}><Text>Phase</Text></View>
          <View style={[styles.tableHeaderCell, { width: 90 }]}><Text>Date Planned</Text></View>
          <View style={[styles.tableHeaderCell, { width: 90 }]}><Text>Date Reached</Text></View>
        </View>
        <View style={styles.tableRow}>
          <View style={[styles.tableCell, { flex: 1 }]}><Text>Initiate</Text></View>
          <View style={[styles.tableCell, { width: 90 }]}>
            <Text>{ssp.sdlcInitiatePlanned ? new Date(ssp.sdlcInitiatePlanned).toLocaleDateString() : '[Date]'}</Text>
          </View>
          <View style={[styles.tableCell, { width: 90 }]}>
            <Text>{ssp.sdlcInitiateReached ? new Date(ssp.sdlcInitiateReached).toLocaleDateString() : '[Date]'}</Text>
          </View>
        </View>
        <View style={styles.tableRow}>
          <View style={[styles.tableCell, { flex: 1 }]}><Text>Develop/Design/Acquire</Text></View>
          <View style={[styles.tableCell, { width: 90 }]}>
            <Text>{ssp.sdlcDevelopPlanned ? new Date(ssp.sdlcDevelopPlanned).toLocaleDateString() : '[Date]'}</Text>
          </View>
          <View style={[styles.tableCell, { width: 90 }]}>
            <Text>{ssp.sdlcDevelopReached ? new Date(ssp.sdlcDevelopReached).toLocaleDateString() : '[Date]'}</Text>
          </View>
        </View>
        <View style={styles.tableRow}>
          <View style={[styles.tableCell, { flex: 1 }]}><Text>Implement</Text></View>
          <View style={[styles.tableCell, { width: 90 }]}>
            <Text>{ssp.sdlcImplementPlanned ? new Date(ssp.sdlcImplementPlanned).toLocaleDateString() : '[Date]'}</Text>
          </View>
          <View style={[styles.tableCell, { width: 90 }]}>
            <Text>{ssp.sdlcImplementReached ? new Date(ssp.sdlcImplementReached).toLocaleDateString() : '[Date]'}</Text>
          </View>
        </View>
        <View style={styles.tableRow}>
          <View style={[styles.tableCell, { flex: 1 }]}><Text>Operate & Maintain</Text></View>
          <View style={[styles.tableCell, { width: 90 }]}>
            <Text>{ssp.sdlcOperatePlanned ? new Date(ssp.sdlcOperatePlanned).toLocaleDateString() : '[Date]'}</Text>
          </View>
          <View style={[styles.tableCell, { width: 90 }]}>
            <Text>{ssp.sdlcOperateReached ? new Date(ssp.sdlcOperateReached).toLocaleDateString() : '[Date]'}</Text>
          </View>
        </View>
        <View style={styles.tableRow}>
          <View style={[styles.tableCell, { flex: 1 }]}><Text>Dispose</Text></View>
          <View style={[styles.tableCell, { width: 90 }]}>
            <Text>{ssp.sdlcDisposePlanned ? new Date(ssp.sdlcDisposePlanned).toLocaleDateString() : '[Date]'}</Text>
          </View>
          <View style={[styles.tableCell, { width: 90 }]}>
            <Text>{ssp.sdlcDisposeReached ? new Date(ssp.sdlcDisposeReached).toLocaleDateString() : '[Date]'}</Text>
          </View>
        </View>
      </View>
    </View>

    {ssp.sdlcMilestones && (
      <View style={styles.section}>
        <Text style={styles.h2}>Additional Milestones</Text>
        <Text style={styles.paragraph}>{ssp.sdlcMilestones}</Text>
      </View>
    )}

    <DocumentFooter organizationName={ssp.atoPackage.organization?.name || 'Organization'} />
  </Page>
);

// POA&M Summary Page
const POAMSummaryPage: React.FC<{ ssp: SSPDocumentProps['ssp'] }> = ({ ssp }) => {
  const poamSummary = ssp.poamSummary ? JSON.parse(ssp.poamSummary) : null;

  return (
    <Page size="A4" style={styles.page}>
      <DocumentHeader systemName={ssp.systemName || ssp.atoPackage.name} version={ssp.version} />

      <Text style={styles.h1}>Identified Deficiencies & Remediation Plan</Text>

      {ssp.deficienciesSummary && (
        <View style={styles.section}>
          <Text style={styles.paragraph}>{ssp.deficienciesSummary}</Text>
        </View>
      )}

      {poamSummary && poamSummary.totalPOAMs > 0 ? (
        <>
          <View style={styles.infoBox}>
            <Text style={{ fontSize: 10, fontWeight: 'bold', marginBottom: 5 }}>POA&M Summary</Text>
            <Text style={{ fontSize: 9 }}>Total Items: {poamSummary.totalPOAMs}</Text>
            <Text style={{ fontSize: 9 }}>Open: {poamSummary.openPOAMs}</Text>
            <Text style={{ fontSize: 9 }}>Overdue: {poamSummary.overdue || 0}</Text>
          </View>

          <View style={[styles.table, { marginTop: 15 }]}>
            <View style={styles.tableHeaderRow}>
              <View style={[styles.tableHeaderCell, { width: 60 }]}><Text>ID</Text></View>
              <View style={[styles.tableHeaderCell, { width: 60 }]}><Text>Control</Text></View>
              <View style={[styles.tableHeaderCell, { flex: 1 }]}><Text>Weakness</Text></View>
              <View style={[styles.tableHeaderCell, { width: 70 }]}><Text>Due Date</Text></View>
              <View style={[styles.tableHeaderCell, { width: 50 }]}><Text>Status</Text></View>
            </View>
            {poamSummary.items?.slice(0, 10).map((item: { id: string; controlId: string; weakness: string; dueDate: string; status: string }, idx: number) => (
              <View key={idx} style={styles.tableRow}>
                <View style={[styles.tableCell, { width: 60 }]}><Text>{item.id}</Text></View>
                <View style={[styles.tableCell, { width: 60 }]}><Text>{item.controlId}</Text></View>
                <View style={[styles.tableCell, { flex: 1 }]}><Text>{item.weakness}</Text></View>
                <View style={[styles.tableCell, { width: 70 }]}><Text>{item.dueDate}</Text></View>
                <View style={[styles.tableCell, { width: 50 }]}><Text>{item.status}</Text></View>
              </View>
            ))}
          </View>
        </>
      ) : (
        <View style={styles.infoBox}>
          <Text style={{ fontSize: 10 }}>No POA&M items recorded. See separate POA&M document for detailed remediation tracking.</Text>
        </View>
      )}

      <DocumentFooter organizationName={ssp.atoPackage.organization?.name || 'Organization'} />
    </Page>
  );
};

// Control Implementation Page (for each control family)
const ControlImplementationPage: React.FC<{
  ssp: SSPDocumentProps['ssp'];
  familyCode: string;
  familyName: string;
  controls: Array<{
    controlId: string;
    controlTitle: string;
    basicRequirement: string;
    implementationStatus: string;
    implementationDescription: string;
    implementationType?: string | null;
    processOwner?: string | null;
    processOperator?: string | null;
    occurrence?: string | null;
    technologyInUse?: string | null;
    documentationLocation?: string | null;
    supportingPolicy?: string | null;
    supportingStandard?: string | null;
    supportingProcedure?: string | null;
  }>;
}> = ({ ssp, familyCode, familyName, controls }) => (
  <Page size="A4" style={styles.page} wrap>
    <DocumentHeader systemName={ssp.systemName || ssp.atoPackage.name} version={ssp.version} />

    <Text style={styles.h1}>{familyCode} - {familyName}</Text>

    {controls.map((control, idx) => (
      <View key={idx} style={[styles.controlBox, { marginBottom: 15 }]} wrap={false}>
        <Text style={styles.controlId}>{control.controlId} - {control.controlTitle}</Text>
        <Text style={styles.controlRequirement}>{control.basicRequirement}</Text>

        <View style={{ flexDirection: 'row', marginTop: 8, marginBottom: 5 }}>
          <Text style={{ fontSize: 9, fontWeight: 'bold', marginRight: 10 }}>Implementation Status:</Text>
          <Text style={[getStatusStyle(control.implementationStatus), { fontSize: 8 }]}>
            {formatStatus(control.implementationStatus)}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 5 }}>
          {control.processOwner && (
            <Text style={{ fontSize: 8, marginRight: 15 }}>
              <Text style={{ fontWeight: 'bold' }}>Process Owner: </Text>{control.processOwner}
            </Text>
          )}
          {control.occurrence && (
            <Text style={{ fontSize: 8, marginRight: 15 }}>
              <Text style={{ fontWeight: 'bold' }}>Occurrence: </Text>{formatOccurrence(control.occurrence)}
            </Text>
          )}
        </View>

        {control.technologyInUse && (
          <Text style={{ fontSize: 8, marginBottom: 3 }}>
            <Text style={{ fontWeight: 'bold' }}>Technology in Use: </Text>{control.technologyInUse}
          </Text>
        )}

        <View style={{ marginTop: 5, paddingTop: 5, borderTopWidth: 1, borderTopColor: '#e2e8f0' }}>
          <Text style={{ fontSize: 9, fontWeight: 'bold' }}>Control Implementation</Text>
          {control.supportingPolicy && (
            <Text style={{ fontSize: 8 }}>Supporting Policy: {control.supportingPolicy}</Text>
          )}
          <Text style={{ fontSize: 9, marginTop: 3 }}>
            {control.implementationDescription || '[Describe HOW this control is implemented.]'}
          </Text>
        </View>
      </View>
    ))}

    <DocumentFooter organizationName={ssp.atoPackage.organization?.name || 'Organization'} />
  </Page>
);

// Security Requirements Annex Header
const SecurityRequirementsHeader: React.FC<{ ssp: SSPDocumentProps['ssp'] }> = ({ ssp }) => (
  <Page size="A4" style={styles.page}>
    <DocumentHeader systemName={ssp.systemName || ssp.atoPackage.name} version={ssp.version} />

    <Text style={styles.h1}>Annex 1: Security Requirements</Text>

    <View style={styles.section}>
      <Text style={styles.paragraph}>
        This section documents the implementation status of all 110 NIST SP 800-171 Rev 2 security
        requirements mapped to CMMC Level 2 practices.
      </Text>
    </View>

    <View style={styles.infoBox}>
      <Text style={{ fontSize: 10, fontWeight: 'bold', marginBottom: 5 }}>Implementation Status Legend</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        <View style={{ width: '50%', marginBottom: 3 }}>
          <Text style={{ fontSize: 9 }}>☑ Implemented (Internal) - Fully implemented internally</Text>
        </View>
        <View style={{ width: '50%', marginBottom: 3 }}>
          <Text style={{ fontSize: 9 }}>☑ Implemented (External) - Shared responsibility</Text>
        </View>
        <View style={{ width: '50%', marginBottom: 3 }}>
          <Text style={{ fontSize: 9 }}>☐ Partially Implemented - In POA&M</Text>
        </View>
        <View style={{ width: '50%', marginBottom: 3 }}>
          <Text style={{ fontSize: 9 }}>☐ Planned - In POA&M</Text>
        </View>
        <View style={{ width: '50%', marginBottom: 3 }}>
          <Text style={{ fontSize: 9 }}>☐ Alternative Implementation</Text>
        </View>
        <View style={{ width: '50%', marginBottom: 3 }}>
          <Text style={{ fontSize: 9 }}>☐ Not Applicable</Text>
        </View>
      </View>
    </View>

    <DocumentFooter organizationName={ssp.atoPackage.organization?.name || 'Organization'} />
  </Page>
);

// Main SSP Document
export const SSPDocument: React.FC<SSPDocumentProps> = ({ ssp }) => {
  // Parse control statements if available
  const controlStatements = ssp.controlStatements ? JSON.parse(ssp.controlStatements) : {};

  // Group controls by family
  const controlFamilies: Record<string, { name: string; controls: typeof controlStatements[string][] }> = {};

  Object.entries(controlStatements).forEach(([controlId, control]) => {
    const familyCode = controlId.split('.')[0]; // e.g., "3.1" -> "3"
    const familyMap: Record<string, string> = {
      '3.1': 'Access Control',
      '3.2': 'Awareness and Training',
      '3.3': 'Audit and Accountability',
      '3.4': 'Configuration Management',
      '3.5': 'Identification and Authentication',
      '3.6': 'Incident Response',
      '3.7': 'Maintenance',
      '3.8': 'Media Protection',
      '3.9': 'Personnel Security',
      '3.10': 'Physical Protection',
      '3.11': 'Risk Assessment',
      '3.12': 'Security Assessment',
      '3.13': 'System and Communications Protection',
      '3.14': 'System and Information Integrity',
    };

    const familyPrefix = controlId.substring(0, controlId.lastIndexOf('.'));
    const familyName = familyMap[familyPrefix] || 'Other';

    if (!controlFamilies[familyPrefix]) {
      controlFamilies[familyPrefix] = { name: familyName, controls: [] };
    }
    controlFamilies[familyPrefix].controls.push(control);
  });

  return (
    <Document
      title={`SSP - ${ssp.systemName || ssp.atoPackage.name}`}
      author={ssp.atoPackage.organization?.name || 'Organization'}
      subject="System Security Plan - CMMC Level 2"
      creator="Bedrock CMMC"
    >
      <CoverPage ssp={ssp} />
      <PreparedByPage ssp={ssp} />
      <OwnershipOverviewPage ssp={ssp} />
      <SystemEnvironmentPage ssp={ssp} />
      <SystemDescriptionPage ssp={ssp} />
      <RolesPrivilegesPage ssp={ssp} />
      <SDLCPage ssp={ssp} />
      <POAMSummaryPage ssp={ssp} />
      <SecurityRequirementsHeader ssp={ssp} />

      {/* Render each control family */}
      {Object.entries(controlFamilies).map(([familyCode, family]) => (
        <ControlImplementationPage
          key={familyCode}
          ssp={ssp}
          familyCode={familyCode}
          familyName={family.name}
          controls={family.controls}
        />
      ))}
    </Document>
  );
};
