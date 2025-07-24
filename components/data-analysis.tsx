"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { FileData } from "@/app/page"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
  Download,
  Eye,
  EyeOff,
  TrendingUp,
  TrendingDown,
} from "lucide-react"
import { toast } from "sonner"

interface DataAnalysisProps {
  file: FileData
  onFileUpdate: (file: FileData) => void
}

export function DataAnalysis({ file, onFileUpdate }: DataAnalysisProps) {
  const [showPreview, setShowPreview] = useState(false)
  const [previewRows, setPreviewRows] = useState(10)
  const { analysis, efficiency } = file

  if (!analysis) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No analysis data available</p>
            <p className="text-sm text-gray-400">Please re-upload the file to generate analysis</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-500"
      case "high":
        return "bg-orange-500"
      case "medium":
        return "bg-yellow-500"
      case "low":
        return "bg-blue-500"
      default:
        return "bg-gray-500"
    }
  }

  const getSeverityBadgeVariant = (severity: string) => {
    switch (severity) {
      case "critical":
        return "destructive"
      case "high":
        return "destructive"
      case "medium":
        return "secondary"
      case "low":
        return "outline"
      default:
        return "outline"
    }
  }

  const getQualityScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600"
    if (score >= 70) return "text-blue-600"
    if (score >= 50) return "text-yellow-600"
    return "text-red-600"
  }

  const getQualityScoreBadge = (score: number) => {
    if (score >= 90) return "default"
    if (score >= 70) return "secondary"
    if (score >= 50) return "outline"
    return "destructive"
  }

  // Prepare chart data
  const nullValuesData = Object.entries(analysis.nullValues)
    .map(([column, count]) => ({
      column: column.length > 15 ? column.substring(0, 15) + "..." : column,
      fullColumn: column,
      nulls: count,
      percentage: Math.round((count / analysis.totalRows) * 100),
      nonNulls: analysis.totalRows - count,
    }))
    .sort((a, b) => b.percentage - a.percentage)

  const dataTypesData = Object.entries(analysis.dataTypes).reduce(
    (acc, [column, type]) => {
      acc[type] = (acc[type] || 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )

  const pieData = Object.entries(dataTypesData).map(([type, count]) => ({
    name: type.charAt(0).toUpperCase() + type.slice(1),
    value: count,
    percentage: Math.round((count / analysis.totalColumns) * 100),
  }))

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82ca9d"]

  const issuesSeverityData = ["critical", "high", "medium", "low"]
    .map((severity) => ({
      severity: severity.charAt(0).toUpperCase() + severity.slice(1),
      contextual: analysis.contextualIssues.filter((issue) => issue.severity === severity).length,
      crossField: analysis.crossFieldIssues.filter((issue) => issue.severity === severity).length,
      total:
        analysis.contextualIssues.filter((issue) => issue.severity === severity).length +
        analysis.crossFieldIssues.filter((issue) => issue.severity === severity).length,
    }))
    .filter((item) => item.total > 0)

  const exportAnalysis = () => {
    try {
      const analysisReport = {
        fileName: file.name,
        uploadDate: file.uploadDate,
        summary: {
          totalRows: analysis.totalRows,
          totalColumns: analysis.totalColumns,
          duplicates: analysis.duplicates,
          qualityScore: analysis.qualityScore,
          totalIssues: analysis.contextualIssues.length + analysis.crossFieldIssues.length,
        },
        efficiency,
        dataQuality: {
          nullValues: analysis.nullValues,
          dataTypes: analysis.dataTypes,
          outliers: Object.fromEntries(Object.entries(analysis.outliers).filter(([, outliers]) => outliers.length > 0)),
        },
        issues: {
          contextualIssues: analysis.contextualIssues,
          crossFieldIssues: analysis.crossFieldIssues,
        },
        statistics: analysis.statistics,
        generatedAt: new Date().toISOString(),
      }

      const blob = new Blob([JSON.stringify(analysisReport, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${file.name.replace(/\.[^/.]+$/, "")}_analysis_report.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast.success("Analysis report exported successfully!")
    } catch (error) {
      toast.error("Failed to export analysis report")
    }
  }

  const exportDataPreview = () => {
    try {
      const csvContent = [
        file.headers.join(","),
        ...file.data.slice(0, previewRows).map((row) =>
          file.headers
            .map((header) => {
              const value = row[header]
              if (value === null || value === undefined) return ""
              const stringValue = String(value)
              return stringValue.includes(",") ? `"${stringValue}"` : stringValue
            })
            .join(","),
        ),
      ].join("\n")

      const blob = new Blob([csvContent], { type: "text/csv" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${file.name.replace(/\.[^/.]+$/, "")}_preview.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast.success("Data preview exported successfully!")
    } catch (error) {
      toast.error("Failed to export data preview")
    }
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quality Score</CardTitle>
            <div className={`text-2xl ${getQualityScoreColor(analysis.qualityScore)}`}>
              {analysis.qualityScore >= 80 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${getQualityScoreColor(analysis.qualityScore)}`}>
              {analysis.qualityScore}%
            </div>
            <Badge variant={getQualityScoreBadge(analysis.qualityScore)} className="mt-2">
              {analysis.qualityScore >= 90
                ? "Excellent"
                : analysis.qualityScore >= 70
                  ? "Good"
                  : analysis.qualityScore >= 50
                    ? "Fair"
                    : "Poor"}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Rows</CardTitle>
            <Info className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analysis.totalRows.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{analysis.totalColumns} columns</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Issues Found</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {analysis.contextualIssues.length + analysis.crossFieldIssues.length}
            </div>
            <p className="text-xs text-muted-foreground">
              {Math.round(
                ((analysis.contextualIssues.length + analysis.crossFieldIssues.length) / analysis.totalRows) * 100,
              )}
              % of rows affected
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Duplicates</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{analysis.duplicates}</div>
            <p className="text-xs text-muted-foreground">
              {Math.round((analysis.duplicates / analysis.totalRows) * 100)}% duplicate rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Efficiency Metrics */}
      {efficiency && (
        <Card>
          <CardHeader>
            <CardTitle>Processing Efficiency</CardTitle>
            <CardDescription>Performance metrics for this file analysis</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">Processing Time</p>
                <p className="text-2xl font-bold">{efficiency.processingTime}ms</p>
                <p className="text-xs text-gray-500">
                  {efficiency.processingTime < 1000
                    ? "Very Fast"
                    : efficiency.processingTime < 5000
                      ? "Fast"
                      : "Moderate"}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Memory Usage</p>
                <p className="text-2xl font-bold">{efficiency.memoryUsage}KB</p>
                <p className="text-xs text-gray-500">Estimated</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Validation Speed</p>
                <p className="text-2xl font-bold">{efficiency.validationSpeed.toLocaleString()}</p>
                <p className="text-xs text-gray-500">rows/sec</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Issues Detected</p>
                <p className="text-2xl font-bold">{efficiency.issuesDetected}</p>
                <p className="text-xs text-gray-500">Total problems found</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Fixes Applied</p>
                <p className="text-2xl font-bold">{efficiency.fixesApplied}</p>
                <p className="text-xs text-gray-500">Automatic corrections</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="overview" className="space-y-4">
        <div className="flex justify-between items-center">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="quality">Data Quality</TabsTrigger>
            <TabsTrigger value="issues">Issues</TabsTrigger>
            <TabsTrigger value="statistics">Statistics</TabsTrigger>
            <TabsTrigger value="outliers">Outliers</TabsTrigger>
          </TabsList>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowPreview(!showPreview)}>
              {showPreview ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
              {showPreview ? "Hide" : "Show"} Preview
            </Button>
            <Button onClick={exportAnalysis}>
              <Download className="h-4 w-4 mr-2" />
              Export Analysis
            </Button>
          </div>
        </div>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Data Types Distribution</CardTitle>
                <CardDescription>Types of data columns in your dataset</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percentage }) => `${name} (${percentage}%)`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value, name) => [`${value} columns`, name]} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Issues by Severity</CardTitle>
                <CardDescription>Distribution of data quality issues</CardDescription>
              </CardHeader>
              <CardContent>
                {issuesSeverityData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={issuesSeverityData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="severity" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="contextual" stackId="a" fill="#8884d8" name="Contextual Issues" />
                      <Bar dataKey="crossField" stackId="a" fill="#82ca9d" name="Cross-field Issues" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                      <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                      <p className="text-green-600 font-medium">No issues found!</p>
                      <p className="text-sm text-gray-500">Your data quality is excellent</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="quality" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Missing Values Analysis</CardTitle>
              <CardDescription>Percentage of missing values in each column</CardDescription>
            </CardHeader>
            <CardContent>
              {nullValuesData.some((item) => item.percentage > 0) ? (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={nullValuesData.filter((item) => item.percentage > 0)} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" domain={[0, 100]} />
                    <YAxis dataKey="column" type="category" width={120} />
                    <Tooltip
                      formatter={(value, name) => [
                        name === "percentage" ? `${value}%` : value,
                        name === "percentage" ? "Missing" : "Count",
                      ]}
                      labelFormatter={(label) =>
                        `Column: ${nullValuesData.find((item) => item.column === label)?.fullColumn || label}`
                      }
                    />
                    <Bar dataKey="percentage" fill="#ff7300" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                    <p className="text-green-600 font-medium">No missing values found!</p>
                    <p className="text-sm text-gray-500">All columns have complete data</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="issues" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Contextual Issues</CardTitle>
                <CardDescription>
                  Issues with individual field values ({analysis.contextualIssues.length} found)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96">
                  <div className="space-y-2">
                    {analysis.contextualIssues.length === 0 ? (
                      <div className="flex items-center gap-2 text-green-600 py-8 justify-center">
                        <CheckCircle className="h-4 w-4" />
                        <span>No contextual issues found</span>
                      </div>
                    ) : (
                      analysis.contextualIssues.slice(0, 50).map((issue, index) => (
                        <div key={index} className="flex items-start gap-2 p-3 border rounded-lg">
                          <div
                            className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${getSeverityColor(issue.severity)}`}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <Badge variant={getSeverityBadgeVariant(issue.severity)} className="text-xs">
                                {issue.severity}
                              </Badge>
                              <span className="text-sm font-medium truncate">{issue.column}</span>
                              <span className="text-xs text-gray-500">Row {issue.row + 1}</span>
                            </div>
                            <p className="text-sm text-gray-700 mb-1">{issue.issue}</p>
                            <p className="text-xs text-gray-500 mb-1">
                              Value: <code className="bg-gray-100 px-1 rounded">{String(issue.value)}</code>
                            </p>
                            <p className="text-xs text-blue-600">{issue.suggestion}</p>
                          </div>
                        </div>
                      ))
                    )}
                    {analysis.contextualIssues.length > 50 && (
                      <div className="text-center py-2">
                        <p className="text-sm text-gray-500">
                          ... and {analysis.contextualIssues.length - 50} more issues
                        </p>
                        <Button variant="outline" size="sm" className="mt-2 bg-transparent">
                          View All Issues
                        </Button>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cross-field Issues</CardTitle>
                <CardDescription>
                  Issues between related fields ({analysis.crossFieldIssues.length} found)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96">
                  <div className="space-y-2">
                    {analysis.crossFieldIssues.length === 0 ? (
                      <div className="flex items-center gap-2 text-green-600 py-8 justify-center">
                        <CheckCircle className="h-4 w-4" />
                        <span>No cross-field issues found</span>
                      </div>
                    ) : (
                      analysis.crossFieldIssues.map((issue, index) => (
                        <div key={index} className="flex items-start gap-2 p-3 border rounded-lg">
                          <div
                            className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${getSeverityColor(issue.severity)}`}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <Badge variant={getSeverityBadgeVariant(issue.severity)} className="text-xs">
                                {issue.severity}
                              </Badge>
                              <span className="text-sm font-medium">{issue.columns.join(" & ")}</span>
                              <span className="text-xs text-gray-500">Row {issue.row + 1}</span>
                            </div>
                            <p className="text-sm text-gray-700 mb-1">{issue.issue}</p>
                            <p className="text-xs text-blue-600">{issue.suggestion}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="statistics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Column Statistics</CardTitle>
              <CardDescription>Detailed statistics for each column</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Column</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Non-null Count</TableHead>
                      <TableHead>Unique Values</TableHead>
                      <TableHead>Statistics</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {file.headers.map((header) => {
                      const stats = analysis.statistics[header]
                      const dataType = analysis.dataTypes[header]
                      const nullCount = analysis.nullValues[header]

                      return (
                        <TableRow key={header}>
                          <TableCell className="font-medium max-w-32">
                            <div className="truncate" title={header}>
                              {header}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {dataType}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {stats?.count || 0}
                              <div className="text-xs text-gray-500">{nullCount > 0 && `${nullCount} missing`}</div>
                            </div>
                          </TableCell>
                          <TableCell>{stats?.uniqueValues || 0}</TableCell>
                          <TableCell>
                            {stats && (
                              <div className="text-xs space-y-1">
                                {dataType === "number" && stats.mean !== undefined ? (
                                  <>
                                    <div>Min: {stats.min}</div>
                                    <div>Max: {stats.max}</div>
                                    <div>Mean: {stats.mean}</div>
                                    <div>Median: {stats.median}</div>
                                  </>
                                ) : (
                                  <>
                                    {stats.mostCommon && (
                                      <div>Most common: {String(stats.mostCommon).substring(0, 20)}</div>
                                    )}
                                    {stats.averageLength && <div>Avg length: {stats.averageLength}</div>}
                                  </>
                                )}
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="outliers" className="space-y-4">
          <div className="grid gap-6">
            {Object.entries(analysis.outliers)
              .filter(([, outliers]) => outliers.length > 0)
              .map(([column, outliers]) => (
                <Card key={column}>
                  <CardHeader>
                    <CardTitle className="text-lg">{column}</CardTitle>
                    <CardDescription>
                      {outliers.length} outlier{outliers.length !== 1 ? "s" : ""} detected (Z-score &gt; 2.5)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {outliers.slice(0, 10).map((outlier, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-2 bg-yellow-50 rounded border-l-4 border-yellow-400"
                        >
                          <div>
                            <span className="font-medium">Row {outlier.rowIndex + 1}</span>
                            <span className="text-gray-600 ml-2">Value: {outlier.value}</span>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            Z-score: {outlier.zScore.toFixed(2)}
                          </Badge>
                        </div>
                      ))}
                      {outliers.length > 10 && (
                        <p className="text-sm text-gray-500 text-center pt-2">
                          ... and {outliers.length - 10} more outliers
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}

            {Object.values(analysis.outliers).every((outliers) => outliers.length === 0) && (
              <Card>
                <CardContent className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                    <p className="text-green-600 font-medium">No statistical outliers detected!</p>
                    <p className="text-sm text-gray-500">All numeric values appear to be within normal ranges</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Data Preview */}
      {showPreview && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Data Preview</CardTitle>
                <CardDescription>Sample rows from your dataset</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={previewRows}
                  onChange={(e) => setPreviewRows(Number(e.target.value))}
                  className="px-3 py-1 border rounded text-sm"
                >
                  <option value={10}>10 rows</option>
                  <option value={25}>25 rows</option>
                  <option value={50}>50 rows</option>
                  <option value={100}>100 rows</option>
                </select>
                <Button variant="outline" size="sm" onClick={exportDataPreview}>
                  <Download className="h-4 w-4 mr-2" />
                  Export Preview
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96 w-full">
              <div className="min-w-full">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      {file.headers.map((header) => (
                        <TableHead key={header} className="min-w-32">
                          <div className="flex items-center gap-2">
                            <span className="truncate" title={header}>
                              {header}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {analysis.dataTypes[header]}
                            </Badge>
                          </div>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {file.data.slice(0, previewRows).map((row, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium text-gray-500">{index + 1}</TableCell>
                        {file.headers.map((header) => {
                          const value = row[header]
                          const hasIssue = analysis.contextualIssues.some(
                            (issue) => issue.row === index && issue.column === header,
                          )

                          return (
                            <TableCell key={header} className={hasIssue ? "bg-red-50" : ""}>
                              <div className="max-w-32 truncate" title={String(value || "")}>
                                {value === null || value === undefined || value === "" ? (
                                  <span className="text-gray-400 italic">null</span>
                                ) : (
                                  String(value)
                                )}
                              </div>
                              {hasIssue && <AlertTriangle className="h-3 w-3 text-red-500 inline ml-1" />}
                            </TableCell>
                          )
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
