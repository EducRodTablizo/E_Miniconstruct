import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import {
  FileText, Calendar, Plus, Eye, TrendingUp,
  Users, Package, ClipboardList, FileBarChart2
} from 'lucide-react'
import {
  format, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  startOfYear, endOfYear, subDays
} from 'date-fns'
import { useHistoricalReports, useGenerateReport, HistoricalReport } from '@/hooks/useHistoricalReports'
import { useRBAC } from '@/hooks/useRBAC'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from '@/hooks/useToast'
import { formatCurrency, formatDate } from '@/lib/utils'

const REPORT_TYPE_LABELS: Record<string, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  yearly: 'Yearly',
}

function getDefaultRange(type: string): { start: string; end: string; label: string } {
  const now = new Date()
  const fmt = (d: Date) => format(d, 'yyyy-MM-dd')
  switch (type) {
    case 'daily':
      return { start: fmt(subDays(now, 1)), end: fmt(now), label: `Daily – ${fmt(now)}` }
    case 'weekly':
      return {
        start: fmt(startOfWeek(now, { weekStartsOn: 1 })),
        end:   fmt(endOfWeek(now,   { weekStartsOn: 1 })),
        label: `Week of ${fmt(startOfWeek(now, { weekStartsOn: 1 }))}`,
      }
    case 'monthly':
      return { start: fmt(startOfMonth(now)), end: fmt(endOfMonth(now)), label: format(now, 'MMMM yyyy') }
    case 'yearly':
      return { start: fmt(startOfYear(now)), end: fmt(endOfYear(now)), label: format(now, 'yyyy') }
    default:
      return { start: fmt(now), end: fmt(now), label: fmt(now) }
  }
}

/* ------------------------------------------------------------------ */
/* View Report Dialog                                                   */
/* ------------------------------------------------------------------ */
function ViewReportDialog({
  report,
  onClose,
}: {
  report: HistoricalReport | null
  onClose: () => void
}) {
  if (!report) return null

  const invChanges    = (report.inventory_changes  as { action: string; at: string }[]) ?? []
  const userActivities = (report.user_activities   as { action: string; user: string; at: string }[]) ?? []
  const auditSummary   = (report.audit_summary      as { action: string; user: string; at: string }[]) ?? []

  return (
    <Dialog open={!!report} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileBarChart2 className="h-5 w-5 text-primary" />
            {report.period_label}
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            <Badge variant="secondary">{REPORT_TYPE_LABELS[report.report_type] ?? report.report_type}</Badge>
            <span>{formatDate(report.period_start)} &rarr; {formatDate(report.period_end)}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Summary KPIs */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                <TrendingUp className="h-3.5 w-3.5" />Total Sales
              </p>
              <p className="text-xl font-bold text-foreground">{formatCurrency(report.total_sales)}</p>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                <Package className="h-3.5 w-3.5" />Total Transactions
              </p>
              <p className="text-xl font-bold text-foreground">{report.total_transactions}</p>
            </div>
          </div>

          {/* Inventory Changes */}
          {invChanges.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
                <Package className="h-4 w-4" />
                Inventory Changes ({invChanges.length})
              </h4>
              <div className="border border-border rounded-lg divide-y divide-border max-h-40 overflow-y-auto">
                {invChanges.map((c, i) => (
                  <div key={i} className="px-3 py-2 text-sm flex justify-between gap-2">
                    <span className="text-foreground font-medium">{c.action}</span>
                    <span className="text-muted-foreground text-xs shrink-0">{c.at ? formatDate(c.at) : '—'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* User Activities */}
          {userActivities.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
                <Users className="h-4 w-4" />
                User Activities ({userActivities.length})
              </h4>
              <div className="border border-border rounded-lg divide-y divide-border max-h-40 overflow-y-auto">
                {userActivities.map((a, i) => (
                  <div key={i} className="px-3 py-2 text-sm flex gap-2 justify-between">
                    <span className="text-foreground">{a.user ?? 'System'} &mdash; {a.action}</span>
                    <span className="text-muted-foreground text-xs shrink-0">{a.at ? formatDate(a.at) : '—'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Audit Summary */}
          {auditSummary.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
                <ClipboardList className="h-4 w-4" />
                Audit Log Summary ({auditSummary.length} entries)
              </h4>
              <div className="border border-border rounded-lg divide-y divide-border max-h-48 overflow-y-auto">
                {auditSummary.map((e, i) => (
                  <div key={i} className="px-3 py-2 text-xs flex gap-2 justify-between">
                    <span className="text-foreground font-mono">{e.action}</span>
                    <span className="text-muted-foreground">{e.user ?? 'System'}</span>
                    <span className="text-muted-foreground shrink-0">{e.at ? formatDate(e.at) : '—'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer date range */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-3 py-2 rounded-md">
            <Calendar className="h-3.5 w-3.5" />
            Report covers: {formatDate(report.period_start)} &rarr; {formatDate(report.period_end)}
            {report.profiles?.full_name && ` · Generated by ${report.profiles.full_name}`}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/* ------------------------------------------------------------------ */
/* Main Page                                                            */
/* ------------------------------------------------------------------ */
export default function HistoricalReportsPage() {
  const { isPrivileged } = useRBAC()
  const { data: reports = [], isLoading } = useHistoricalReports()
  const generateReport = useGenerateReport()

  const [generateOpen, setGenerateOpen] = useState(false)
  const [viewReport, setViewReport] = useState<HistoricalReport | null>(null)
  const [reportType, setReportType] = useState('monthly')
  const [startDate, setStartDate] = useState(getDefaultRange('monthly').start)
  const [endDate,   setEndDate]   = useState(getDefaultRange('monthly').end)
  const [periodLabel, setPeriodLabel] = useState(getDefaultRange('monthly').label)

  if (!isPrivileged) return <Navigate to="/dashboard" replace />

  const handleTypeChange = (type: string) => {
    const range = getDefaultRange(type)
    setReportType(type)
    setStartDate(range.start)
    setEndDate(range.end)
    setPeriodLabel(range.label)
  }

  const handleGenerate = async () => {
    try {
      const startISO = new Date(startDate).toISOString()
      const endISO   = new Date(`${endDate}T23:59:59`).toISOString()
      await generateReport.mutateAsync({
        report_type:  reportType,
        period_start: startISO,
        period_end:   endISO,
        period_label: periodLabel,
      })
      toast({ title: 'Report generated', description: `${REPORT_TYPE_LABELS[reportType]} report saved.` })
      setGenerateOpen(false)
    } catch (err) {
      toast({
        title: 'Failed to generate report',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      })
    }
  }

  const totalArchivedSales        = reports.reduce((s, r) => s + r.total_sales, 0)
  const totalArchivedTransactions = reports.reduce((s, r) => s + r.total_transactions, 0)

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Historical Reports</h1>
          <p className="text-muted-foreground text-sm mt-1">Archive and review business performance reports</p>
        </div>
        <Button onClick={() => setGenerateOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Generate Report
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10"><FileText className="h-5 w-5 text-primary" /></div>
            <div>
              <p className="text-2xl font-bold text-foreground">{reports.length}</p>
              <p className="text-xs text-muted-foreground">Saved Reports</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-success/10"><TrendingUp className="h-5 w-5 text-success" /></div>
            <div>
              <p className="text-2xl font-bold text-foreground">{formatCurrency(totalArchivedSales)}</p>
              <p className="text-xs text-muted-foreground">Total Archived Sales</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-accent"><ClipboardList className="h-5 w-5 text-accent-foreground" /></div>
            <div>
              <p className="text-2xl font-bold text-foreground">{totalArchivedTransactions}</p>
              <p className="text-xs text-muted-foreground">Total Archived Transactions</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reports Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Archived Reports</CardTitle>
          <CardDescription>Click View to see full details of any report</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-16 text-center">
              <div className="h-8 w-8 mx-auto rounded-full border-2 border-primary border-t-transparent animate-spin" />
            </div>
          ) : reports.length === 0 ? (
            <div className="py-16 text-center">
              <FileBarChart2 className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-40" />
              <p className="text-foreground font-medium">No reports yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Generate your first report to start tracking business history
              </p>
              <Button variant="outline" size="sm" className="mt-4 gap-2" onClick={() => setGenerateOpen(true)}>
                <Plus className="h-4 w-4" />Generate First Report
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Total Sales</TableHead>
                  <TableHead>Transactions</TableHead>
                  <TableHead>Generated By</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map(r => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <Badge variant="secondary">{REPORT_TYPE_LABELS[r.report_type] ?? r.report_type}</Badge>
                    </TableCell>
                    <TableCell className="font-medium text-foreground">{r.period_label}</TableCell>
                    <TableCell className="font-semibold text-success">{formatCurrency(r.total_sales)}</TableCell>
                    <TableCell>{r.total_transactions}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{r.profiles?.full_name ?? '—'}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{formatDate(r.created_at)}</TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        <Button variant="ghost" size="sm" className="gap-1" onClick={() => setViewReport(r)}>
                          <Eye className="h-3.5 w-3.5" />View
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Generate Report Dialog */}
      <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />Generate Report
            </DialogTitle>
            <DialogDescription>
              Create an archived snapshot of business performance for the selected period.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Report Type</Label>
              <Select value={reportType} onValueChange={handleTypeChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(REPORT_TYPE_LABELS).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Start Date</Label>
                <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>End Date</Label>
                <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Period Label</Label>
              <Input
                value={periodLabel}
                onChange={e => setPeriodLabel(e.target.value)}
                placeholder="e.g. June 2026"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setGenerateOpen(false)}>Cancel</Button>
            <Button onClick={handleGenerate} disabled={generateReport.isPending} className="gap-2">
              <FileText className="h-4 w-4" />
              {generateReport.isPending ? 'Generating...' : 'Generate & Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Report Dialog */}
      <ViewReportDialog report={viewReport} onClose={() => setViewReport(null)} />
    </div>
  )
}
