/**
 * CMMC L2 Certificate PDF template (landscape, single page).
 *
 * Renders a draft Certificate of CMMC Status. Until the Go API exposes a
 * cert-issuance endpoint that persists certUid + signing official, every
 * certificate produced is marked DRAFT — both via the `isDraft` watermark
 * and the `DRAFT-...` certUid prefix.
 */

import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

export interface CertificateData {
  organizationName: string
  packageName: string
  cmmcLevel: string
  determination: 'FINAL_LEVEL_2' | 'CONDITIONAL_LEVEL_2'
  issuedDate: Date
  expiryDate: Date
  poamCloseoutDate?: Date | null
  leadAssessorName: string
  c3paoName: string
  certUid: string
  isDraft: boolean
}

const PAGE_WIDTH = 842
const PAGE_HEIGHT = 595

const styles = StyleSheet.create({
  page: { padding: 0, fontFamily: 'Helvetica', backgroundColor: '#ffffff' },
  outerBorder: {
    position: 'absolute', top: 18, left: 18, right: 18, bottom: 18,
    borderWidth: 2, borderColor: '#1f3a5f',
  },
  innerBorder: {
    position: 'absolute', top: 28, left: 28, right: 28, bottom: 28,
    borderWidth: 0.5, borderColor: '#7a8fa6',
  },
  content: {
    flex: 1, paddingTop: 72, paddingBottom: 56,
    paddingHorizontal: 80, alignItems: 'center',
  },
  title: {
    fontSize: 30, fontWeight: 'bold', color: '#1f3a5f',
    letterSpacing: 1, marginBottom: 6, textAlign: 'center',
  },
  subtitle: {
    fontSize: 13, color: '#4a5568', fontStyle: 'italic',
    marginBottom: 28, textAlign: 'center',
  },
  preamble: { fontSize: 11, color: '#2d3748', marginBottom: 10, textAlign: 'center' },
  orgName: {
    fontSize: 28, fontWeight: 'bold', color: '#1a202c',
    textAlign: 'center', marginBottom: 8,
  },
  packageName: {
    fontSize: 14, fontStyle: 'italic', color: '#4a5568',
    textAlign: 'center', marginBottom: 18,
  },
  achievement: { fontSize: 11, color: '#2d3748', marginBottom: 12, textAlign: 'center' },
  badgeFinal: {
    paddingVertical: 10, paddingHorizontal: 28, borderRadius: 4,
    backgroundColor: '#1f3a5f', marginBottom: 24,
  },
  badgeConditional: {
    paddingVertical: 10, paddingHorizontal: 28, borderRadius: 4,
    backgroundColor: '#b7791f', marginBottom: 24,
  },
  badgeText: {
    fontSize: 18, fontWeight: 'bold', color: '#ffffff',
    letterSpacing: 2, textAlign: 'center',
  },
  metaRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 8, marginBottom: 20 },
  metaCol: { paddingHorizontal: 28, alignItems: 'center' },
  metaLabel: {
    fontSize: 8, textTransform: 'uppercase', color: '#718096',
    letterSpacing: 1, marginBottom: 4,
  },
  metaValue: { fontSize: 12, fontWeight: 'bold', color: '#1a202c' },
  signatureBlock: { marginTop: 4, alignItems: 'center' },
  signatureLine: {
    width: 260, borderBottomWidth: 0.75, borderBottomColor: '#1a202c',
    marginBottom: 4, height: 18, marginTop: 18,
  },
  signatureLabel: { fontSize: 9, color: '#4a5568', textAlign: 'center' },
  signatureName: { fontSize: 11, fontWeight: 'bold', color: '#1a202c', marginTop: 2 },
  footer: {
    position: 'absolute', bottom: 36, left: 80, right: 80,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
  },
  certUid: { fontFamily: 'Courier', fontSize: 8, color: '#718096' },
  c3paoName: { fontSize: 9, color: '#4a5568', textAlign: 'right' },
  watermark: {
    position: 'absolute', top: PAGE_HEIGHT / 2 - 90, left: 0, right: 0,
    fontSize: 220, fontWeight: 'bold', color: '#9ca3af',
    opacity: 0.15, textAlign: 'center', transform: 'rotate(-25deg)',
  },
})

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function formatLongDate(date: Date): string {
  return `${MONTHS[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()}`
}

interface CMMCCertificateProps {
  data: CertificateData
}

/** Landscape one-page CMMC L2 certificate. */
export function CMMCCertificate({
  data,
}: CMMCCertificateProps): React.ReactElement {
  const isFinal = data.determination === 'FINAL_LEVEL_2'
  const determinationLabel = isFinal ? 'FINAL LEVEL 2' : 'CONDITIONAL LEVEL 2'
  const expiryLabel = isFinal ? 'Certificate Expires' : 'POA&M Closeout Due'
  const expiryValue =
    !isFinal && data.poamCloseoutDate
      ? formatLongDate(data.poamCloseoutDate)
      : formatLongDate(data.expiryDate)

  return (
    <Document>
      <Page size={[PAGE_WIDTH, PAGE_HEIGHT]} style={styles.page}>
        {data.isDraft ? (
          <Text style={styles.watermark} fixed>DRAFT</Text>
        ) : null}

        <View style={styles.outerBorder} fixed />
        <View style={styles.innerBorder} fixed />

        <View style={styles.content}>
          <Text style={styles.title}>Certificate of CMMC Status</Text>
          <Text style={styles.subtitle}>
            Cybersecurity Maturity Model Certification — {data.cmmcLevel}
          </Text>

          <Text style={styles.preamble}>This certifies that</Text>
          <Text style={styles.orgName}>{data.organizationName}</Text>
          <Text style={styles.packageName}>{data.packageName}</Text>

          <Text style={styles.achievement}>has achieved a determination of</Text>
          <View style={isFinal ? styles.badgeFinal : styles.badgeConditional}>
            <Text style={styles.badgeText}>{determinationLabel}</Text>
          </View>

          <View style={styles.metaRow}>
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>Issued</Text>
              <Text style={styles.metaValue}>{formatLongDate(data.issuedDate)}</Text>
            </View>
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>{expiryLabel}</Text>
              <Text style={styles.metaValue}>{expiryValue}</Text>
            </View>
          </View>

          <View style={styles.signatureBlock}>
            <Text style={styles.signatureName}>{data.leadAssessorName}</Text>
            <Text style={styles.signatureLabel}>Recommending Assessor</Text>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>
              To Be Signed by Authorized Certifying Official
            </Text>
          </View>
        </View>

        <View style={styles.footer} fixed>
          <Text style={styles.certUid}>{data.certUid}</Text>
          <Text style={styles.c3paoName}>Issued by {data.c3paoName}</Text>
        </View>
      </Page>
    </Document>
  )
}
