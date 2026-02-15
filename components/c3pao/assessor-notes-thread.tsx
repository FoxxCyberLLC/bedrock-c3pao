'use client'

import { useState, useEffect, useRef } from 'react'
import { format, formatDistanceToNow } from 'date-fns'
import { Send, Loader2, MessageSquare, Info } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { addAssessorNote, getAssessorNotes } from '@/app/actions/c3pao-dashboard'

interface AssessorNote {
  id: string
  authorId: string
  authorName: string
  content: string
  isSystem: boolean
  createdAt: Date
}

interface AssessorNotesThreadProps {
  engagementId: string
  currentUserId: string
  legacyNotes: string | null
}

export function AssessorNotesThread({
  engagementId,
  currentUserId,
  legacyNotes,
}: AssessorNotesThreadProps) {
  const [notes, setNotes] = useState<AssessorNote[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function fetchNotes() {
      const result = await getAssessorNotes(engagementId)
      if (result.success && result.data) {
        setNotes(result.data.map((n: AssessorNote) => ({
          ...n,
          createdAt: new Date(n.createdAt),
        })))
      }
      setIsLoading(false)
    }
    fetchNotes()
  }, [engagementId])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [notes])

  const handleSend = async () => {
    if (!newMessage.trim() || isSending) return

    setIsSending(true)
    const messageContent = newMessage.trim()
    setNewMessage('')

    const optimisticNote: AssessorNote = {
      id: `temp-${Date.now()}`,
      authorId: currentUserId,
      authorName: 'You',
      content: messageContent,
      isSystem: false,
      createdAt: new Date(),
    }
    setNotes(prev => [...prev, optimisticNote])

    const result = await addAssessorNote(engagementId, messageContent)

    if (result.success && result.data) {
      setNotes(prev =>
        prev.map(n =>
          n.id === optimisticNote.id
            ? { ...result.data, createdAt: new Date(result.data.createdAt) }
            : n
        )
      )
    } else {
      setNotes(prev => prev.filter(n => n.id !== optimisticNote.id))
      setNewMessage(messageContent)
      toast.error(result.error || 'Failed to send note')
    }

    setIsSending(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      handleSend()
    }
  }

  const showLegacyNotes = legacyNotes && notes.length === 0 && !isLoading

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Assessor Notes
        </CardTitle>
        <CardDescription>
          Internal notes for your assessment team
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          ref={scrollRef}
          className="h-[400px] overflow-y-auto border rounded-lg p-4 space-y-4 bg-muted/30"
        >
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {showLegacyNotes && (
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-4">
                  <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 text-sm font-medium mb-2">
                    <Info className="h-4 w-4" />
                    Legacy Notes
                  </div>
                  <p className="text-sm whitespace-pre-wrap text-amber-900 dark:text-amber-100">
                    {legacyNotes}
                  </p>
                </div>
              )}

              {notes.length === 0 && !showLegacyNotes && (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <MessageSquare className="h-10 w-10 mb-2 opacity-50" />
                  <p className="text-sm">No notes yet</p>
                  <p className="text-xs">Add a note to start the thread</p>
                </div>
              )}

              {notes.map((note) => (
                <div key={note.id}>
                  {note.isSystem ? (
                    <div className="flex items-center justify-center gap-2 py-2">
                      <div className="h-px bg-border flex-1" />
                      <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-muted text-xs text-muted-foreground">
                        <Info className="h-3 w-3" />
                        <span className="italic">{note.content}</span>
                        <span className="text-muted-foreground/70">
                          by {note.authorName} · {formatDistanceToNow(note.createdAt, { addSuffix: true })}
                        </span>
                      </div>
                      <div className="h-px bg-border flex-1" />
                    </div>
                  ) : (
                    <div className="bg-background border rounded-lg p-3 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm">
                          {note.authorId === currentUserId ? 'You' : note.authorName}
                        </span>
                        <span
                          className="text-xs text-muted-foreground"
                          title={format(note.createdAt, 'PPpp')}
                        >
                          {formatDistanceToNow(note.createdAt, { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                    </div>
                  )}
                </div>
              ))}
            </>
          )}
        </div>

        <div className="flex gap-2">
          <Textarea
            placeholder="Add a note... (Ctrl+Enter to send)"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
            className="resize-none flex-1"
            disabled={isSending}
          />
          <Button
            onClick={handleSend}
            disabled={!newMessage.trim() || isSending}
            className="self-end"
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          Notes are only visible to your C3PAO team
        </p>
      </CardContent>
    </Card>
  )
}
