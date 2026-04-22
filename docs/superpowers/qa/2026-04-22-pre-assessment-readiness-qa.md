# Pre-Assessment Readiness — Manual QA Checklist

Run against a local dev environment: `npm run dev` and log in as a lead assessor.

## Tab structure
- [ ] Engagement detail page shows three tab groups: Package Data, Assessment, Engagement
- [ ] Old Team, Notes, Details tabs are gone
- [ ] Engagement → Overview renders OSC summary + metadata cards
- [ ] Engagement → Schedule & Logistics renders form with date/textarea fields
- [ ] Assessment → Planning renders readiness workspace → team card → planning board
- [ ] Assessment → Review renders existing review content + notes panel

## Readiness workspace
- [ ] 8 items listed with icons, status chips, and progress bar
- [ ] Selecting an item highlights it and populates the right-pane detail
- [ ] Artifact drag/drop accepts pdf, png, jpeg, gif, docx, xlsx, txt, csv
- [ ] Upload >50 MB file → rejected with clear error
- [ ] Upload wrong mime type → rejected
- [ ] Uploaded artifacts list shows filename, size, uploader, timestamp
- [ ] Artifact download link works (returns correct file)
- [ ] Uploader can delete their own artifact; lead can delete any
- [ ] Non-lead cannot delete another user's artifact

## Completion + waiver (as lead)
- [ ] Mark item complete → completion record appears; icon updates; progress increments
- [ ] Re-open item → status reverts correctly (in_progress if artifacts exist, else not_started)
- [ ] Grant waiver → modal requires reason ≥ 20 chars; shorter rejected
- [ ] Revoke waiver → status reverts to in_progress/not_started
- [ ] Non-lead sees read-only controls, no action buttons

## Start Assessment
- [ ] Button disabled with helper text until 8/8 complete or waived
- [ ] Enabled when 8/8; click → phase transitions to ASSESS
- [ ] Phase tracker at top re-renders to show ASSESS as active
- [ ] Non-lead cannot click even when enabled (403 returned if tried)

## Phase initialization
- [ ] Fresh engagement with no phase → opening readiness workspace sets phase to PRE_ASSESS automatically
- [ ] No "cannot move from '' to 'ASSESS'" error

## Notes (Review tab)
- [ ] Add note dialog works, body 1-10000 chars
- [ ] Notes listed newest-first
- [ ] Only author sees Edit/Delete buttons on their notes
- [ ] Editing a note creates a revision; "Edited N times · View history" link appears
- [ ] Revision history dialog shows all past bodies with editor + timestamp
- [ ] Soft delete hides note; revisions still preserved in DB

## Audit bundle export (as lead)
- [ ] Engagement → Overview shows Export audit bundle button
- [ ] Click → downloads zip
- [ ] Zip contains: manifest.json, checklist.json, audit-log.json, notes.json, artifacts/
- [ ] Non-lead does NOT see the export button; direct URL access returns 403

## Regression checks
- [ ] Customer readiness panel (separate feature) still works
- [ ] Controls / Progress / Evidence / STIG / POAM tabs still function
- [ ] Logout / login / session expiry behave normally
