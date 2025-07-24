"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import type { FileData } from "@/app/page"
import { Download, Mail } from "lucide-react"
import jsPDF from "jspdf"
import "jspdf-autotable"
import autoTable from "jspdf-autotable"

interface ReportGeneratorProps {
  file: FileData
}

interface ReportSection {
  id: string
  name: string
  description: string
  enabled: boolean
}

export function ReportGenerator({ file }: ReportGeneratorProps) {
  const [reportSections, setReportSections] = useState<ReportSection[]>([
    { id: "summary", name: "Executive Summary", description: "High-level overview of data quality", enabled: true },
    { id: "metrics", name: "Quality Metrics", description: "Detailed quality scores and statistics", enabled: true },
    { id: "issues", name: "Issues Analysis", description: "Detailed breakdown of data issues found", enabled: true },
    {
      id: "recommendations",
      name: "Recommendations",
      description: "Suggested actions for data improvement",
      enabled: true,
    },
    {
      id: "technical",
      name: "Technical Details",
      description: "Processing efficiency and technical metrics",
      enabled: false,
    },
    { id: "preview", name: "Data Preview", description: "Sample of the analyzed data", enabled: false },
  ])

  const [reportFormat, setReportFormat] = useState<"pdf" | "html" | "json">("pdf")
  const [customNotes, setCustomNotes] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)

  const toggleSection = (sectionId: string) => {
    setReportSections((prev) =>
      prev.map((section) => (section.id === sectionId ? { ...section, enabled: !section.enabled } : section)),
    )
  }

  const getQualityScore = (file: FileData) => {
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

  const generatePDFReport = () => {
    const doc = new jsPDF()
    let yPosition = 20

    // Title
    doc.setFontSize(20)
    doc.text("Data Quality Analysis Report", 20, yPosition)
    yPosition += 15

    // File info
    doc.setFontSize(12)
    doc.text(`File: ${file.name}`, 20, yPosition)
    yPosition += 8
    doc.text(`Analysis Date: ${new Date().toLocaleDateString()}`, 20, yPosition)
    yPosition += 15

    if (reportSections.find((s) => s.id === "summary")?.enabled) {
      // Executive Summary
      doc.setFontSize(16)
      doc.text("Executive Summary", 20, yPosition)
      yPosition += 10

      doc.setFontSize(12)
      const qualityScore = getQualityScore(file)
      const totalIssues = (file.analysis?.contextualIssues.length || 0) + (file.analysis?.crossFieldIssues.length || 0)

      doc.text(`Overall Quality Score: ${qualityScore}%`, 20, yPosition)
      yPosition += 8
      doc.text(`Total Rows Analyzed: ${file.analysis?.totalRows.toLocaleString() || 0}`, 20, yPosition)
      yPosition += 8
      doc.text(`Total Issues Found: ${totalIssues}`, 20, yPosition)
      yPosition += 8
      doc.text(`Duplicate Records: ${file.analysis?.duplicates || 0}`, 20, yPosition)
      yPosition += 15
    }

    if (reportSections.find((s) => s.id === "metrics")?.enabled && file.analysis) {
      // Quality Metrics
      doc.setFontSize(16)
      doc.text("Quality Metrics", 20, yPosition)
      yPosition += 10

      // Null values table
      const nullData = Object.entries(file.analysis.nullValues).map(([column, count]) => [
        column,
        count.toString(),
        `${((count / file.analysis!.totalRows) * 100).toFixed(1)}%`,
      ])

      if (nullData.length > 0) {
        doc.setFontSize(12)
        doc.text("Null Values by Column:", 20, yPosition)
        yPosition += 5
        autoTable(doc, {
          startY: yPosition,
          head: [["Column", "Null Count", "Percentage"]],
          body: nullData.slice(0, 10), // Limit to first 10 columns
          theme: "grid",
          styles: { fontSize: 8 },
        })

        yPosition = (doc as any).lastAutoTable.finalY + 15
      }
    }

    if (reportSections.find((s) => s.id === "issues")?.enabled && file.analysis) {
      // Issues Analysis
      if (yPosition > 250) {
        doc.addPage()
        yPosition = 20
      }

      doc.setFontSize(16)
      doc.text("Issues Analysis", 20, yPosition)
      yPosition += 10

      const contextualIssues = file.analysis.contextualIssues.slice(0, 5)
      if (contextualIssues.length > 0) {
        doc.setFontSize(12)
        doc.text("Top Contextual Issues:", 20, yPosition)
        yPosition += 8

        contextualIssues.forEach((issue, index) => {
          doc.setFontSize(10)
          doc.text(`${index + 1}. ${issue.issue} (${issue.severity})`, 25, yPosition)
          yPosition += 6
          doc.text(`   Column: ${issue.column}, Row: ${issue.row + 1}`, 25, yPosition)
          yPosition += 8
        })
      }
    }

    if (reportSections.find((s) => s.id === "recommendations")?.enabled) {
      // Recommendations
      if (yPosition > 220) {
        doc.addPage()
        yPosition = 20
      }

      doc.setFontSize(16)
      doc.text("Recommendations", 20, yPosition)
      yPosition += 10

      doc.setFontSize(12)
      const recommendations = [
        "Review and clean null values in critical columns",
        "Remove or merge duplicate records",
        "Validate data types and formats",
        "Implement data quality checks in your pipeline",
        "Consider automated data validation rules",
      ]

      recommendations.forEach((rec, index) => {
        doc.text(`${index + 1}. ${rec}`, 25, yPosition)
        yPosition += 8
      })
    }

    if (customNotes.trim()) {
      if (yPosition > 220) {
        doc.addPage()
        yPosition = 20
      }

      doc.setFontSize(16)
      doc.text("Additional Notes", 20, yPosition)
      yPosition += 10

      doc.setFontSize(12)
      const lines = doc.splitTextToSize(customNotes, 170)
      doc.text(lines, 20, yPosition)
    }

    return doc
  }

  const generateHTMLReport = () => {
    const qualityScore = getQualityScore(file)
    const totalIssues = (file.analysis?.contextualIssues.length || 0) + (file.analysis?.crossFieldIssues.length || 0)

    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Data Quality Analysis Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; }
          .header { border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
          .section { margin-bottom: 30px; }
          .metric { background: #f5f5f5; padding: 15px; margin: 10px 0; border-radius: 5px; }
          .issue { background: #fff3cd; padding: 10px; margin: 5px 0; border-left: 4px solid #ffc107; }
          .critical { border-left-color: #dc3545; background: #f8d7da; }
          .high { border-left-color: #fd7e14; background: #fff3cd; }
          table { width: 100%; border-collapse: collapse; margin: 15px 0; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Data Quality Analysis Report</h1>
          <p><strong>File:</strong> ${file.name}</p>
          <p><strong>Analysis Date:</strong> ${new Date().toLocaleDateString()}</p>
        </div>
    `

    if (reportSections.find((s) => s.id === "summary")?.enabled) {
      html += `
        <div class="section">
          <h2>Executive Summary</h2>
          <div class="metric">
            <h3>Overall Quality Score: ${qualityScore}%</h3>
            <p>Total Rows: ${file.analysis?.totalRows.toLocaleString() || 0}</p>
            <p>Total Issues: ${totalIssues}</p>
            <p>Duplicates: ${file.analysis?.duplicates || 0}</p>
          </div>
        </div>
      `
    }

    if (reportSections.find((s) => s.id === "metrics")?.enabled && file.analysis) {
      html += `
        <div class="section">
          <h2>Quality Metrics</h2>
          <h3>Null Values by Column</h3>
          <table>
            <tr><th>Column</th><th>Null Count</th><th>Percentage</th></tr>
      `

      Object.entries(file.analysis.nullValues).forEach(([column, count]) => {
        const percentage = ((count / file.analysis!.totalRows) * 100).toFixed(1)
        html += `<tr><td>${column}</td><td>${count}</td><td>${percentage}%</td></tr>`
      })

      html += `</table></div>`
    }

    if (reportSections.find((s) => s.id === "issues")?.enabled && file.analysis) {
      html += `
        <div class="section">
          <h2>Issues Analysis</h2>
          <h3>Contextual Issues</h3>
      `

      file.analysis.contextualIssues.slice(0, 10).forEach((issue) => {
        html += `
          <div class="issue ${issue.severity}">
            <strong>${issue.issue}</strong> (${issue.severity})<br>
            Column: ${issue.column}, Row: ${issue.row + 1}<br>
            Value: ${issue.value}
          </div>
        `
      })

      html += `</div>`
    }

    if (customNotes.trim()) {
      html += `
        <div class="section">
          <h2>Additional Notes</h2>
          <p>${customNotes.replace(/\n/g, "<br>")}</p>
        </div>
      `
    }

    html += `</body></html>`
    return html
  }

  const generateJSONReport = () => {
    const qualityScore = getQualityScore(file)
    const totalIssues = (file.analysis?.contextualIssues.length || 0) + (file.analysis?.crossFieldIssues.length || 0)

    return {
      reportMetadata: {
        fileName: file.name,
        generatedAt: new Date().toISOString(),
        reportSections: reportSections.filter((s) => s.enabled).map((s) => s.id),
      },
      summary: reportSections.find((s) => s.id === "summary")?.enabled
        ? {
            qualityScore,
            totalRows: file.analysis?.totalRows || 0,
            totalColumns: file.analysis?.totalColumns || 0,
            totalIssues,
            duplicates: file.analysis?.duplicates || 0,
          }
        : undefined,
      metrics: reportSections.find((s) => s.id === "metrics")?.enabled
        ? {
            nullValues: file.analysis?.nullValues,
            dataTypes: file.analysis?.dataTypes,
            statistics: file.analysis?.statistics,
          }
        : undefined,
      issues: reportSections.find((s) => s.id === "issues")?.enabled
        ? {
            contextualIssues: file.analysis?.contextualIssues,
            crossFieldIssues: file.analysis?.crossFieldIssues,
          }
        : undefined,
      technical: reportSections.find((s) => s.id === "technical")?.enabled
        ? {
            efficiency: file.efficiency,
            processingMetrics: {
              uploadDate: file.uploadDate,
              fileSize: file.size,
            },
          }
        : undefined,
      customNotes: customNotes.trim() || undefined,
    }
  }

  const generateReport = async () => {
    setIsGenerating(true)

    try {
      let blob: Blob
      let filename: string

      switch (reportFormat) {
        case "pdf":
          const pdf = generatePDFReport()
          blob = new Blob([pdf.output("blob")], { type: "application/pdf" })
          filename = `${file.name.replace(/\.[^/.]+$/, "")}_report.pdf`
          break

        case "html":
          const html = generateHTMLReport()
          blob = new Blob([html], { type: "text/html" })
          filename = `${file.name.replace(/\.[^/.]+$/, "")}_report.html`
          break

        case "json":
          const json = generateJSONReport()
          blob = new Blob([JSON.stringify(json, null, 2)], { type: "application/json" })
          filename = `${file.name.replace(/\.[^/.]+$/, "")}_report.json`
          break

        default:
          throw new Error("Unsupported format")
      }

      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Error generating report:", error)
    } finally {
      setIsGenerating(false)
    }
  }

  const emailReport = () => {
    const subject = `Data Quality Report - ${file.name}`
    const body = `Please find attached the data quality analysis report for ${file.name}.

Key findings:
- Quality Score: ${getQualityScore(file)}%
- Total Issues: ${(file.analysis?.contextualIssues.length || 0) + (file.analysis?.crossFieldIssues.length || 0)}
- Duplicates: ${file.analysis?.duplicates || 0}

Generated on: ${new Date().toLocaleDateString()}`

    const mailtoLink = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    window.open(mailtoLink)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Report Generator</h2>
        <p className="text-gray-600">Generate comprehensive data quality reports</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Report Sections</CardTitle>
            <CardDescription>Select which sections to include in your report</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {reportSections.map((section) => (
                <div key={section.id} className="flex items-start space-x-3">
                  <Checkbox
                    id={section.id}
                    checked={section.enabled}
                    onCheckedChange={() => toggleSection(section.id)}
                  />
                  <div className="flex-1">
                    <Label htmlFor={section.id} className="font-medium">
                      {section.name}
                    </Label>
                    <p className="text-sm text-gray-500">{section.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Report Configuration</CardTitle>
            <CardDescription>Configure report format and additional options</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="format">Report Format</Label>
              <Select value={reportFormat} onValueChange={(value: any) => setReportFormat(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF Document</SelectItem>
                  <SelectItem value="html">HTML Report</SelectItem>
                  <SelectItem value="json">JSON Data</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea
                id="notes"
                placeholder="Add any additional notes or context for this report..."
                value={customNotes}
                onChange={(e) => setCustomNotes(e.target.value)}
                rows={4}
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={generateReport} disabled={isGenerating} className="flex-1">
                <Download className="h-4 w-4 mr-2" />
                {isGenerating ? "Generating..." : "Generate Report"}
              </Button>
              <Button variant="outline" onClick={emailReport}>
                <Mail className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Report Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Report Preview</CardTitle>
          <CardDescription>Preview of the report content</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="border-l-4 border-blue-500 pl-4">
              <h3 className="font-semibold">File: {file.name}</h3>
              <p className="text-sm text-gray-600">Analysis Date: {new Date().toLocaleDateString()}</p>
            </div>

            {reportSections.find((s) => s.id === "summary")?.enabled && (
              <div>
                <h4 className="font-medium mb-2">Executive Summary</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-sm text-gray-600">Quality Score</p>
                    <p className="text-lg font-semibold">{getQualityScore(file)}%</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-sm text-gray-600">Total Rows</p>
                    <p className="text-lg font-semibold">{file.analysis?.totalRows.toLocaleString() || 0}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-sm text-gray-600">Issues Found</p>
                    <p className="text-lg font-semibold">
                      {(file.analysis?.contextualIssues.length || 0) + (file.analysis?.crossFieldIssues.length || 0)}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-sm text-gray-600">Duplicates</p>
                    <p className="text-lg font-semibold">{file.analysis?.duplicates || 0}</p>
                  </div>
                </div>
              </div>
            )}

            {reportSections.find((s) => s.id === "issues")?.enabled && file.analysis && (
              <div>
                <h4 className="font-medium mb-2">Top Issues</h4>
                <div className="space-y-2">
                  {file.analysis.contextualIssues.slice(0, 3).map((issue, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-yellow-50 rounded">
                      <Badge variant="outline">{issue.severity}</Badge>
                      <span className="text-sm">{issue.issue}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="text-sm text-gray-500">
              Selected sections:{" "}
              {reportSections
                .filter((s) => s.enabled)
                .map((s) => s.name)
                .join(", ")}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
