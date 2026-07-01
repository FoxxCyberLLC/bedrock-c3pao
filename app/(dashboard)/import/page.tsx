'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { importSnapshotAction, type ImportActionResult } from '@/app/actions/import'

/**
 * Air-gapped snapshot import. The assessor uploads the OSC's `v1` package (zip); it is loaded
 * into local Postgres + evidence storage. No network call — the whole assessment then runs
 * offline against the imported data.
 */
export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null)
  const [result, setResult] = useState<ImportActionResult['data'] | null>(null)
  const [pending, startTransition] = useTransition()

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) {
      toast.error('Choose a snapshot .zip to import')
      return
    }
    const formData = new FormData()
    formData.set('file', file)
    startTransition(async () => {
      const res = await importSnapshotAction(formData)
      if (res.success && res.data) {
        setResult(res.data)
        const rows = Object.values(res.data.tables).reduce((a, b) => a + b, 0)
        toast.success(`Imported engagement ${res.data.engagementId} — ${rows} rows, ${res.data.evidenceCount} evidence files`)
      } else {
        setResult(null)
        toast.error(res.error ?? 'Import failed')
      }
    })
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Import Assessment Package</h1>
        <p className="text-muted-foreground text-sm">
          Load an OSC-provided assessment snapshot to work offline. Nothing leaves this machine.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Snapshot package</CardTitle>
          <CardDescription>Select the <code>.zip</code> exported by the contractor (OSC).</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="snapshot">Package file</Label>
              <Input
                id="snapshot"
                type="file"
                accept=".zip,application/zip"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                disabled={pending}
              />
            </div>
            <Button type="submit" disabled={pending || !file}>
              {pending ? 'Importing…' : 'Import package'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Import complete</CardTitle>
            <CardDescription>Engagement {result.engagementId}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>{result.evidenceCount} evidence files stored · {result.linkCount} evidence links</p>
            <ul className="text-muted-foreground list-inside list-disc">
              {Object.entries(result.tables).map(([table, count]) => (
                <li key={table}>
                  {table}: {count}
                </li>
              ))}
            </ul>
            {result.skippedTables.length > 0 && (
              <p className="text-muted-foreground">Skipped (unmodeled): {result.skippedTables.join(', ')}</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
