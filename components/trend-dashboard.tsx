"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { FileData } from "@/app/page"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts"
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle } from "lucide-react"
import { format, subDays, isAfter } from "date-fns"

interface TrendDashboardProps {
  files: FileData[]
}

export function TrendDashboard({ files }: TrendDashboardProps) {
  if (files.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <p className="text-gray-500">No data available for trend analysis</p>
        </CardContent>
      </Card>
    )
  }

  // Prepare time series data
  const timeSeriesData = files
    .sort((a, b) => a.uploadDate.getTime() - b.uploadDate.getTime())
    .map((file, index) => ({
      date: format(file.uploadDate, "MMM dd"),
      qualityScore: getQualityScore(file),
      totalIssues: (file.analysis?.contextualIssues.length || 0) + (file.analysis?.crossFieldIssues.length || 0),
      processingTime: file.efficiency?.processingTime || 0,
      rowsProcessed: file.analysis?.totalRows || 0,
      duplicates: file.analysis?.duplicates || 0,
      nullPercentage: file.analysis
        ? (Object.values(file.analysis.nullValues).reduce((sum, count) => sum + count, 0) /
            (file.analysis.totalRows * file.headers.length)) *
          100
        : 0,
    }))

  // Calculate trends
  const recentFiles = files.filter((file) => isAfter(file.uploadDate, subDays(new Date(), 7)))

  const olderFiles = files.filter((file) => !isAfter(file.uploadDate, subDays(new Date(), 7)))

  const recentAvgQuality =
    recentFiles.length > 0 ? recentFiles.reduce((sum, file) => sum + getQualityScore(file), 0) / recentFiles.length : 0

  const olderAvgQuality =
    olderFiles.length > 0 ? olderFiles.reduce((sum, file) => sum + getQualityScore(file), 0) / olderFiles.length : 0

  const qualityTrend = recentAvgQuality - olderAvgQuality

  // Issue severity distribution
  const severityData = files.reduce(
    (acc, file) => {
      if (file.analysis) {
        file.analysis.contextualIssues.forEach((issue) => {
          acc[issue.severity] = (acc[issue.severity] || 0) + 1
        })
        file.analysis.crossFieldIssues.forEach((issue) => {
          acc[issue.severity] = (acc[issue.severity] || 0) + 1
        })
      }
      return acc
    },
    {} as Record<string, number>,
  )

  const severityChartData = Object.entries(severityData).map(([severity, count]) => ({
    severity,
    count,
  }))

  // Data type distribution across all files
  const dataTypeDistribution = files.reduce(
    (acc, file) => {
      if (file.analysis) {
        Object.values(file.analysis.dataTypes).forEach((type) => {
          acc[type] = (acc[type] || 0) + 1
        })
      }
      return acc
    },
    {} as Record<string, number>,
  )

  const dataTypeChartData = Object.entries(dataTypeDistribution).map(([type, count]) => ({
    type,
    count,
  }))

  // Processing efficiency over time
  const efficiencyData = files
    .filter((file) => file.efficiency)
    .sort((a, b) => a.uploadDate.getTime() - b.uploadDate.getTime())
    .map((file) => ({
      date: format(file.uploadDate, "MMM dd"),
      processingTime: file.efficiency!.processingTime,
      validationSpeed: file.efficiency!.validationSpeed,
      memoryUsage: file.efficiency!.memoryUsage,
    }))

  function getQualityScore(file: FileData) {
    if (!file.analysis) return 0

    const totalRows = file.analysis.totalRows
    const totalIssues = file.analysis.contextualIssues.length + file.analysis.crossFieldIssues.length
    const nullPercentage =
      Object.values(file.analysis.nullValues).reduce((sum, count) => sum + count, 0) / (totalRows * file.headers.length)

    let score = 100
    score -= (totalIssues / totalRows) * 50
    score -= nullPercentage * 30
    score -= (file.analysis.duplicates / totalRows) * 20

    return Math.max(0, Math.round(score))
  }

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Trend Dashboard</h2>
        <p className="text-gray-600">Monitor data quality trends and processing efficiency over time</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quality Trend</CardTitle>
            {qualityTrend >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {qualityTrend >= 0 ? "+" : ""}
              {qualityTrend.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">vs previous period</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Issues</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {files.reduce(
                (sum, file) =>
                  sum + (file.analysis?.contextualIssues.length || 0) + (file.analysis?.crossFieldIssues.length || 0),
                0,
              )}
            </div>
            <p className="text-xs text-muted-foreground">Across all files</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Processing Time</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {files.filter((f) => f.efficiency).length > 0
                ? Math.round(
                    files.reduce((sum, file) => sum + (file.efficiency?.processingTime || 0), 0) /
                      files.filter((f) => f.efficiency).length,
                  )
                : 0}
              ms
            </div>
            <p className="text-xs text-muted-foreground">Average processing time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Files This Week</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recentFiles.length}</div>
            <p className="text-xs text-muted-foreground">Recent uploads</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Data Quality Over Time</CardTitle>
            <CardDescription>Track quality scores across file uploads</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={timeSeriesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={[0, 100]} />
                <Tooltip formatter={(value) => [`${value}%`, "Quality Score"]} />
                <Line
                  type="monotone"
                  dataKey="qualityScore"
                  stroke="#8884d8"
                  strokeWidth={2}
                  dot={{ fill: "#8884d8" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Issues by Severity</CardTitle>
            <CardDescription>Distribution of validation issues by severity level</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={severityChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ severity, percent }) => `${severity} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {severityChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Processing Efficiency</CardTitle>
            <CardDescription>Processing time and validation speed trends</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={efficiencyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="processingTime"
                  stackId="1"
                  stroke="#8884d8"
                  fill="#8884d8"
                  name="Processing Time (ms)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Data Type Distribution</CardTitle>
            <CardDescription>Types of data columns across all files</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dataTypeChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="type" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Data Quality Metrics Over Time</CardTitle>
          <CardDescription>Comprehensive view of data quality indicators</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={timeSeriesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="totalIssues" stroke="#ff7300" name="Total Issues" />
              <Line type="monotone" dataKey="duplicates" stroke="#ff0000" name="Duplicates" />
              <Line type="monotone" dataKey="nullPercentage" stroke="#ffbb28" name="Null Percentage" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Recent Activity Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity Summary</CardTitle>
          <CardDescription>Summary of recent file uploads and their quality metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentFiles.slice(0, 5).map((file) => (
              <div key={file.id} className="flex items-center justify-between p-3 border rounded">
                <div className="flex items-center gap-3">
                  <div>
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-gray-500">{format(file.uploadDate, "MMM dd, yyyy HH:mm")}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{file.analysis?.totalRows.toLocaleString()} rows</Badge>
                  <Badge variant={getQualityScore(file) >= 80 ? "default" : "secondary"}>
                    {getQualityScore(file)}% quality
                  </Badge>
                  {file.efficiency && <Badge variant="outline">{file.efficiency.processingTime}ms</Badge>}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
