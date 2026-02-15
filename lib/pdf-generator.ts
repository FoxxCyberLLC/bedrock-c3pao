// @ts-nocheck
/**
 * PDF Generator Service
 * Generates PDF documents from SSP data using @react-pdf/renderer
 */

import { renderToBuffer, renderToStream } from '@react-pdf/renderer';
import React from 'react';
import { SSPDocument } from './pdf-templates/ssp-document';
import { prisma } from './prisma';
import { uploadToS3 } from './s3-client';

/**
 * Generates a PDF for the given SSP and optionally uploads it to S3
 * @param sspId - The ID of the SSP to generate PDF for
 * @returns The PDF buffer and metadata
 */
export async function generateSSPPDF(sspId: string): Promise<{
  buffer: Buffer;
  fileName: string;
  s3Url: string | null;
}> {
  try {
    // Fetch SSP with all required relations
    const ssp = await prisma.sSP.findUnique({
      where: { id: sspId },
      include: {
        atoPackage: {
          include: {
            organization: true,
          },
        },
      },
    });

    if (!ssp) {
      throw new Error('SSP not found');
    }

    // Generate PDF as a buffer
    const document = React.createElement(SSPDocument, {
      ssp: ssp as typeof ssp & {
        atoPackage: NonNullable<typeof ssp.atoPackage> & {
          organization: NonNullable<NonNullable<typeof ssp.atoPackage>['organization']>;
        };
      }
    });
    const pdfBuffer = await renderToBuffer(document as never);

    // Create filename with timestamp and sanitized system name
    const systemName = (ssp.systemName || ssp.atoPackage.name)
      .replace(/[^a-zA-Z0-9]/g, '_')
      .substring(0, 50);
    const downloadFileName = `${systemName}_SSP_v${ssp.version}.pdf`;

    // Try to upload to S3, but don't fail if it doesn't work
    let s3Url: string | null = null;
    const organizationId = ssp.atoPackage.organizationId;

    if (organizationId && process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY) {
      try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const s3Key = `ssp/${ssp.atoPackageId}/${systemName}_SSP_v${ssp.version}_${timestamp}.pdf`;

        const s3Result = await uploadToS3(
          organizationId,
          Buffer.from(pdfBuffer),
          s3Key,
          'application/pdf'
        );

        // Update SSP with PDF URL
        await prisma.sSP.update({
          where: { id: sspId },
          data: {
            pdfUrl: s3Result.url,
            pdfS3Key: s3Result.key,
          },
        });

        s3Url = s3Result.url;
      } catch (s3Error) {
        // Log but don't fail - PDF generation succeeded, just S3 upload failed
        console.warn('S3 upload failed, PDF will be returned without storage:', s3Error);
      }
    }

    return {
      buffer: Buffer.from(pdfBuffer),
      fileName: downloadFileName,
      s3Url,
    };
  } catch (error) {
    console.error('Error generating SSP PDF:', error);
    throw new Error(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generates a PDF stream for immediate download (doesn't save to S3)
 * @param sspId - The ID of the SSP to generate PDF for
 * @returns A readable stream of the PDF
 */
export async function generateSSPPDFStream(sspId: string) {
  try {
    // Fetch SSP with all required relations
    const ssp = await prisma.sSP.findUnique({
      where: { id: sspId },
      include: {
        atoPackage: {
          include: {
            organization: true,
          },
        },
      },
    });

    if (!ssp) {
      throw new Error('SSP not found');
    }

    // Generate PDF as a stream
    const streamDocument = React.createElement(SSPDocument, {
      ssp: ssp as typeof ssp & {
        atoPackage: NonNullable<typeof ssp.atoPackage> & {
          organization: NonNullable<NonNullable<typeof ssp.atoPackage>['organization']>;
        };
      }
    });
    const pdfStream = await renderToStream(streamDocument as never);

    return pdfStream;
  } catch (error) {
    console.error('Error generating SSP PDF stream:', error);
    throw new Error(`Failed to generate PDF stream: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Deletes a PDF from S3
 * @param organizationId - The organization ID to determine the bucket
 * @param s3Key - The S3 key of the PDF to delete
 */
export async function deleteSSPPDF(organizationId: string, s3Key: string): Promise<void> {
  try {
    // Import deleteFromS3 and getOrganizationBucketName dynamically to avoid circular dependencies
    const { deleteFromS3, getOrganizationBucketName } = await import('./s3-client');
    const bucketName = getOrganizationBucketName(organizationId);
    await deleteFromS3(bucketName, s3Key);
  } catch (error) {
    console.error('Error deleting SSP PDF:', error);
    throw new Error(`Failed to delete PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
