/**
 * PDF Styles for SSP Documents
 * Defines consistent styling for SSP PDF generation
 */

import { StyleSheet } from '@react-pdf/renderer';

// Register fonts if needed (optional - uses built-in fonts by default)
// import { Font } from '@react-pdf/renderer';
// Font.register({
//   family: 'Roboto',
//   src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-regular-webfont.ttf',
// });

export const styles = StyleSheet.create({
  // Page styles
  page: {
    padding: 50,
    fontSize: 11,
    fontFamily: 'Helvetica',
    lineHeight: 1.5,
  },

  // Header and Footer
  header: {
    position: 'absolute',
    top: 20,
    left: 50,
    right: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    paddingBottom: 5,
    fontSize: 9,
    color: '#666',
  },

  footer: {
    position: 'absolute',
    bottom: 20,
    left: 50,
    right: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#333',
    paddingTop: 5,
    fontSize: 9,
    color: '#666',
  },

  // Cover page
  coverPage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    textAlign: 'center',
  },

  coverTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#1a1a1a',
  },

  coverSubtitle: {
    fontSize: 20,
    marginBottom: 30,
    color: '#333',
  },

  coverInfo: {
    fontSize: 12,
    marginTop: 10,
    color: '#666',
  },

  classification: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#d32f2f',
    marginTop: 40,
    padding: 10,
    borderWidth: 2,
    borderColor: '#d32f2f',
  },

  watermark: {
    position: 'absolute',
    fontSize: 60,
    color: '#f0f0f0',
    transform: 'rotate(-45deg)',
    opacity: 0.3,
    fontWeight: 'bold',
  },

  // Headings
  h1: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
    color: '#1a1a1a',
    borderBottomWidth: 2,
    borderBottomColor: '#2196F3',
    paddingBottom: 5,
  },

  h2: {
    fontSize: 15,
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 8,
    color: '#333',
  },

  h3: {
    fontSize: 13,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 6,
    color: '#444',
  },

  h4: {
    fontSize: 11,
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 4,
    color: '#555',
  },

  // Text styles
  paragraph: {
    fontSize: 11,
    marginBottom: 8,
    textAlign: 'justify',
    color: '#333',
  },

  boldText: {
    fontWeight: 'bold',
  },

  italicText: {
    fontStyle: 'italic',
  },

  // Table styles
  table: {
    marginTop: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },

  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    minHeight: 25,
    alignItems: 'stretch',
  },

  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#2196F3',
    borderBottomWidth: 2,
    borderBottomColor: '#1976D2',
    minHeight: 30,
    alignItems: 'stretch',
  },

  tableCell: {
    flex: 1,
    padding: 5,
    fontSize: 10,
    borderRightWidth: 1,
    borderRightColor: '#ddd',
    justifyContent: 'center',
  },

  tableHeaderCell: {
    flex: 1,
    padding: 5,
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
    borderRightWidth: 1,
    borderRightColor: '#1976D2',
    justifyContent: 'center',
  },

  tableCellNarrow: {
    width: 80,
    padding: 5,
    fontSize: 10,
    borderRightWidth: 1,
    borderRightColor: '#ddd',
    justifyContent: 'center',
  },

  tableCellWide: {
    flex: 2,
    padding: 5,
    fontSize: 10,
    borderRightWidth: 1,
    borderRightColor: '#ddd',
    justifyContent: 'center',
  },

  // Lists
  listItem: {
    flexDirection: 'row',
    marginBottom: 5,
  },

  listBullet: {
    width: 15,
    fontSize: 10,
  },

  listContent: {
    flex: 1,
    fontSize: 10,
  },

  // Status badges
  statusCompliant: {
    backgroundColor: '#4CAF50',
    color: '#fff',
    padding: 3,
    borderRadius: 3,
    fontSize: 9,
    fontWeight: 'bold',
    textAlign: 'center',
  },

  statusNonCompliant: {
    backgroundColor: '#f44336',
    color: '#fff',
    padding: 3,
    borderRadius: 3,
    fontSize: 9,
    fontWeight: 'bold',
    textAlign: 'center',
  },

  statusInProgress: {
    backgroundColor: '#FF9800',
    color: '#fff',
    padding: 3,
    borderRadius: 3,
    fontSize: 9,
    fontWeight: 'bold',
    textAlign: 'center',
  },

  statusNotStarted: {
    backgroundColor: '#9E9E9E',
    color: '#fff',
    padding: 3,
    borderRadius: 3,
    fontSize: 9,
    fontWeight: 'bold',
    textAlign: 'center',
  },

  statusNotApplicable: {
    backgroundColor: '#607D8B',
    color: '#fff',
    padding: 3,
    borderRadius: 3,
    fontSize: 9,
    fontWeight: 'bold',
    textAlign: 'center',
  },

  // Risk level badges
  riskCritical: {
    backgroundColor: '#B71C1C',
    color: '#fff',
    padding: 3,
    borderRadius: 3,
    fontSize: 9,
    fontWeight: 'bold',
    textAlign: 'center',
  },

  riskHigh: {
    backgroundColor: '#f44336',
    color: '#fff',
    padding: 3,
    borderRadius: 3,
    fontSize: 9,
    fontWeight: 'bold',
    textAlign: 'center',
  },

  riskModerate: {
    backgroundColor: '#FF9800',
    color: '#fff',
    padding: 3,
    borderRadius: 3,
    fontSize: 9,
    fontWeight: 'bold',
    textAlign: 'center',
  },

  riskLow: {
    backgroundColor: '#FFC107',
    color: '#333',
    padding: 3,
    borderRadius: 3,
    fontSize: 9,
    fontWeight: 'bold',
    textAlign: 'center',
  },

  // Sections
  section: {
    marginBottom: 15,
  },

  subsection: {
    marginBottom: 10,
    marginLeft: 15,
  },

  // Info boxes
  infoBox: {
    backgroundColor: '#E3F2FD',
    borderWidth: 1,
    borderColor: '#2196F3',
    padding: 10,
    marginTop: 5,
    marginBottom: 10,
    borderRadius: 3,
  },

  warningBox: {
    backgroundColor: '#FFF3E0',
    borderWidth: 1,
    borderColor: '#FF9800',
    padding: 10,
    marginTop: 5,
    marginBottom: 10,
    borderRadius: 3,
  },

  errorBox: {
    backgroundColor: '#FFEBEE',
    borderWidth: 1,
    borderColor: '#f44336',
    padding: 10,
    marginTop: 5,
    marginBottom: 10,
    borderRadius: 3,
  },

  // Control matrix specific
  controlBox: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 8,
    marginBottom: 8,
    backgroundColor: '#fafafa',
  },

  controlId: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#2196F3',
    marginBottom: 3,
  },

  controlTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 3,
  },

  controlRequirement: {
    fontSize: 9,
    marginBottom: 3,
    color: '#666',
  },

  controlImplementation: {
    fontSize: 9,
    marginTop: 5,
    marginBottom: 3,
  },

  // Page numbers and navigation
  pageNumber: {
    fontSize: 9,
    color: '#666',
  },

  // Spacing utilities
  mt5: { marginTop: 5 },
  mt10: { marginTop: 10 },
  mt15: { marginTop: 15 },
  mt20: { marginTop: 20 },
  mb5: { marginBottom: 5 },
  mb10: { marginBottom: 10 },
  mb15: { marginBottom: 15 },
  mb20: { marginBottom: 20 },
  ml5: { marginLeft: 5 },
  ml10: { marginLeft: 10 },
  ml15: { marginLeft: 15 },
  mr5: { marginRight: 5 },
  mr10: { marginRight: 10 },
});

/**
 * Get status badge style based on status value
 */
export function getStatusStyle(status: string) {
  switch (status) {
    case 'COMPLIANT':
      return styles.statusCompliant;
    case 'NON_COMPLIANT':
      return styles.statusNonCompliant;
    case 'IN_PROGRESS':
      return styles.statusInProgress;
    case 'NOT_STARTED':
      return styles.statusNotStarted;
    case 'NOT_APPLICABLE':
      return styles.statusNotApplicable;
    default:
      return styles.statusNotStarted;
  }
}

/**
 * Get risk level badge style based on risk value
 */
export function getRiskStyle(risk: string) {
  switch (risk) {
    case 'CRITICAL':
      return styles.riskCritical;
    case 'HIGH':
      return styles.riskHigh;
    case 'MODERATE':
      return styles.riskModerate;
    case 'LOW':
      return styles.riskLow;
    default:
      return styles.riskModerate;
  }
}
