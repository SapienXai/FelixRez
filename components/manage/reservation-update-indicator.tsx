"use client"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { RefreshCw } from "lucide-react"

type ReservationUpdateChange = {
  field?: string
  label?: string
  from?: string | number | null
  to?: string | number | null
}

type ParsedReservationUpdateSummary = {
  updatedAt?: string
  changes: ReservationUpdateChange[]
}

type ReservationUpdateIndicatorProps = {
  summary?: unknown
  compact?: boolean
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

const parseSummary = (summary: unknown): ParsedReservationUpdateSummary | null => {
  if (!isRecord(summary)) {
    return null
  }

  const changes = Array.isArray(summary.changes)
    ? summary.changes.filter(isRecord).map((change) => ({
        field: typeof change.field === "string" ? change.field : undefined,
        label: typeof change.label === "string" ? change.label : undefined,
        from: typeof change.from === "string" || typeof change.from === "number" || change.from === null ? change.from : undefined,
        to: typeof change.to === "string" || typeof change.to === "number" || change.to === null ? change.to : undefined,
      }))
    : []

  if (changes.length === 0) {
    return null
  }

  return {
    updatedAt: typeof summary.updatedAt === "string" ? summary.updatedAt : undefined,
    changes,
  }
}

const formatValue = (value: string | number | null | undefined) => {
  if (value === null || value === undefined || value === "") {
    return "-"
  }

  return String(value)
}

export function ReservationUpdateIndicator({ summary, compact = false }: ReservationUpdateIndicatorProps) {
  const parsedSummary = parseSummary(summary)

  if (!parsedSummary) {
    return null
  }

  const visibleChanges = compact ? parsedSummary.changes.slice(0, 2) : parsedSummary.changes
  const hiddenChangeCount = parsedSummary.changes.length - visibleChanges.length

  return (
    <div className={cn("space-y-2", compact && "space-y-1")}>
      <Badge variant="outline" className="w-fit border-amber-200 bg-amber-50 text-amber-700">
        <RefreshCw className="mr-1 h-3 w-3" />
        Updated
      </Badge>
      <div className={cn("space-y-1 text-xs text-amber-900", compact && "text-[11px]")}>
        {visibleChanges.map((change, index) => (
          <div key={`${change.field || change.label || "change"}-${index}`} className="leading-snug">
            <span className="font-medium">{change.label || change.field || "Field"}:</span>{" "}
            <span className="text-amber-800">{formatValue(change.from)}</span>
            <span className="px-1 text-amber-600">to</span>
            <span className="text-amber-800">{formatValue(change.to)}</span>
          </div>
        ))}
        {hiddenChangeCount > 0 && (
          <div className="text-amber-700">+{hiddenChangeCount} more changes</div>
        )}
      </div>
    </div>
  )
}
