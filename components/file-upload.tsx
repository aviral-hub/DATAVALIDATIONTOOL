"use client"

import { useState, useCallback } from "react"
import { useDropzone } from "react-dropzone"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle } from "lucide-react"
import type {
  FileData,
  DataAnalysisResult,
  EfficiencyMetrics,
  ContextualIssue,
  CrossFieldIssue,
  OutlierInfo,
} from "@/app/page"
import * as XLSX from "xlsx"
import Papa from "papaparse"
import { toast } from "sonner"

interface FileUploadProps {
  onFileUpload: (file: FileData) => void
}

export function FileUpload({ onFileUpload }: FileUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [currentStep, setCurrentStep] = useState("")

  const detectDataType = (values: any[]): string => {
    const nonNullValues = values.filter((v) => v !== null && v !== undefined && v !== "")
    if (nonNullValues.length === 0) return "unknown"

    const sample = nonNullValues.slice(0, Math.min(100, nonNullValues.length))

    // Check for boolean
    if (sample.every((v) => typeof v === "boolean" || v === "true" || v === "false" || v === "1" || v === "0")) {
      return "boolean"
    }

    // Check for number
    const numericValues = sample.filter((v) => !isNaN(Number(v)) && v !== "")
    if (numericValues.length / sample.length > 0.8) {
      return "number"
    }

    // Check for date
    const dateValues = sample.filter((v) => {
      const dateStr = String(v)
      return (
        /^\d{4}-\d{2}-\d{2}/.test(dateStr) ||
        /^\d{2}\/\d{2}\/\d{4}/.test(dateStr) ||
        /^\d{2}-\d{2}-\d{4}/.test(dateStr) ||
        !isNaN(Date.parse(dateStr))
      )
    })
    if (dateValues.length / sample.length > 0.7) {
      return "date"
    }

    // Check for email
    const emailValues = sample.filter((v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v)))
    if (emailValues.length / sample.length > 0.8) {
      return "email"
    }

    // Check for phone
    const phoneValues = sample.filter((v) => /^[+]?[1-9][\d]{0,15}$/.test(String(v).replace(/[\s\-$$$$]/g, "")))
    if (phoneValues.length / sample.length > 0.8) {
      return "phone"
    }

    // Check for URL
    const urlValues = sample.filter((v) => {
      try {
        new URL(String(v))
        return true
      } catch {
        return false
      }
    })
    if (urlValues.length / sample.length > 0.8) {
      return "url"
    }

    return "string"
  }

  const calculateStatistics = (values: any[], dataType: string) => {
    const nonNullValues = values.filter((v) => v !== null && v !== undefined && v !== "")

    if (nonNullValues.length === 0) {
      return { count: 0, uniqueValues: 0 }
    }

    const uniqueValues = new Set(nonNullValues).size

    if (dataType === "number") {
      const numValues = nonNullValues.map((v) => Number(v)).filter((v) => !isNaN(v))
      if (numValues.length === 0) return { count: 0, uniqueValues }

      const sorted = numValues.sort((a, b) => a - b)
      const sum = numValues.reduce((a, b) => a + b, 0)
      const mean = sum / numValues.length
      const variance = numValues.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / numValues.length
      const stdDev = Math.sqrt(variance)

      return {
        count: numValues.length,
        uniqueValues,
        min: sorted[0],
        max: sorted[sorted.length - 1],
        mean: Number(mean.toFixed(2)),
        median:
          sorted.length % 2 === 0
            ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
            : sorted[Math.floor(sorted.length / 2)],
        stdDev: Number(stdDev.toFixed(2)),
        q1: sorted[Math.floor(sorted.length * 0.25)],
        q3: sorted[Math.floor(sorted.length * 0.75)],
      }
    }

    // For non-numeric data
    const frequency = nonNullValues.reduce(
      (acc, val) => {
        acc[val] = (acc[val] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    const mostCommon = Object.entries(frequency).sort(([, a], [, b]) => b - a)[0]

    return {
      count: nonNullValues.length,
      uniqueValues,
      mostCommon: mostCommon ? mostCommon[0] : null,
      mostCommonCount: mostCommon ? mostCommon[1] : 0,
      averageLength:
        dataType === "string"
          ? Number((nonNullValues.reduce((sum, val) => sum + String(val).length, 0) / nonNullValues.length).toFixed(1))
          : undefined,
    }
  }

  const detectOutliers = (values: any[], dataType: string): OutlierInfo[] => {
    if (dataType !== "number") return []

    const numValues = values.map((v, index) => ({ value: Number(v), index })).filter(({ value }) => !isNaN(value))

    if (numValues.length < 4) return []

    const nums = numValues.map((v) => v.value)
    const mean = nums.reduce((a, b) => a + b, 0) / nums.length
    const stdDev = Math.sqrt(nums.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / nums.length)

    if (stdDev === 0) return []

    return numValues
      .map(({ value, index }) => ({
        rowIndex: index,
        value,
        zScore: Math.abs((value - mean) / stdDev),
      }))
      .filter(({ zScore }) => zScore > 2.5) // Values more than 2.5 standard deviations away
      .sort((a, b) => b.zScore - a.zScore)
      .slice(0, 20) // Limit to top 20 outliers
  }

  const detectContextualIssues = (
    data: any[],
    headers: string[],
    dataTypes: Record<string, string>,
  ): ContextualIssue[] => {
    const issues: ContextualIssue[] = []

    for (let rowIndex = 0; rowIndex < data.length; rowIndex++) {
      const row = data[rowIndex]

      for (const header of headers) {
        const value = row[header]
        if (value === null || value === undefined || value === "") continue

        const lowerHeader = header.toLowerCase()
        const stringValue = String(value)

        // Age validation
        if (lowerHeader.includes("age")) {
          const age = Number(value)
          if (!isNaN(age)) {
            if (age < 0) {
              issues.push({
                column: header,
                row: rowIndex,
                value,
                issue: "Negative age value",
                severity: "critical",
                suggestion: "Age cannot be negative. Consider removing or correcting this value.",
              })
            } else if (age > 150) {
              issues.push({
                column: header,
                row: rowIndex,
                value,
                issue: "Unrealistic age value",
                severity: "high",
                suggestion: "Age over 150 is unrealistic. Verify this value.",
              })
            } else if (age > 120) {
              issues.push({
                column: header,
                row: rowIndex,
                value,
                issue: "Very high age value",
                severity: "medium",
                suggestion: "Age over 120 is unusual. Please verify.",
              })
            }
          }
        }

        // Date validation
        if (dataTypes[header] === "date" || lowerHeader.includes("date")) {
          const date = new Date(value)
          const now = new Date()
          const year1900 = new Date("1900-01-01")

          if (isNaN(date.getTime())) {
            issues.push({
              column: header,
              row: rowIndex,
              value,
              issue: "Invalid date format",
              severity: "high",
              suggestion: "Use a standard date format (YYYY-MM-DD, MM/DD/YYYY, etc.)",
            })
          } else {
            if (lowerHeader.includes("birth") && date > now) {
              issues.push({
                column: header,
                row: rowIndex,
                value,
                issue: "Birth date in the future",
                severity: "critical",
                suggestion: "Birth date cannot be in the future.",
              })
            }

            if (date < year1900) {
              issues.push({
                column: header,
                row: rowIndex,
                value,
                issue: "Date before 1900",
                severity: "medium",
                suggestion: "Dates before 1900 may be incorrect.",
              })
            }

            if (date.getFullYear() > now.getFullYear() + 10) {
              issues.push({
                column: header,
                row: rowIndex,
                value,
                issue: "Date too far in future",
                severity: "medium",
                suggestion: "Date seems unrealistically far in the future.",
              })
            }
          }
        }

        // Email validation
        if (dataTypes[header] === "email" || lowerHeader.includes("email")) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
          if (!emailRegex.test(stringValue)) {
            issues.push({
              column: header,
              row: rowIndex,
              value,
              issue: "Invalid email format",
              severity: "medium",
              suggestion: "Email should follow the format: user@domain.com",
            })
          }
        }

        // Phone validation
        if (dataTypes[header] === "phone" || lowerHeader.includes("phone")) {
          const cleanPhone = stringValue.replace(/[\s\-$$$$]/g, "")
          if (!/^[+]?[1-9][\d]{7,15}$/.test(cleanPhone)) {
            issues.push({
              column: header,
              row: rowIndex,
              value,
              issue: "Invalid phone number format",
              severity: "medium",
              suggestion: "Phone number should contain 8-16 digits, optionally starting with +",
            })
          }
        }

        // Salary/Income validation
        if (lowerHeader.includes("salary") || lowerHeader.includes("income") || lowerHeader.includes("wage")) {
          const amount = Number(value)
          if (!isNaN(amount)) {
            if (amount < 0) {
              issues.push({
                column: header,
                row: rowIndex,
                value,
                issue: "Negative salary/income",
                severity: "high",
                suggestion: "Salary/income cannot be negative.",
              })
            } else if (amount > 10000000) {
              issues.push({
                column: header,
                row: rowIndex,
                value,
                issue: "Unusually high salary/income",
                severity: "medium",
                suggestion: "This salary/income value seems unusually high. Please verify.",
              })
            }
          }
        }

        // Percentage validation
        if (lowerHeader.includes("percent") || lowerHeader.includes("rate") || stringValue.includes("%")) {
          const percent = Number(stringValue.replace("%", ""))
          if (!isNaN(percent)) {
            if (percent < 0 || percent > 100) {
              issues.push({
                column: header,
                row: rowIndex,
                value,
                issue: "Percentage out of valid range",
                severity: "medium",
                suggestion: "Percentage should be between 0 and 100.",
              })
            }
          }
        }
      }
    }

    return issues.slice(0, 1000) // Limit to prevent performance issues
  }

  const detectCrossFieldIssues = (
    data: any[],
    headers: string[],
    dataTypes: Record<string, string>,
  ): CrossFieldIssue[] => {
    const issues: CrossFieldIssue[] = []

    for (let rowIndex = 0; rowIndex < data.length; rowIndex++) {
      const row = data[rowIndex]

      // Age vs Birth Date consistency
      const ageCol = headers.find((h) => h.toLowerCase().includes("age"))
      const birthCol = headers.find((h) => h.toLowerCase().includes("birth") && h.toLowerCase().includes("date"))

      if (ageCol && birthCol && row[ageCol] && row[birthCol]) {
        const age = Number(row[ageCol])
        const birthDate = new Date(row[birthCol])

        if (!isNaN(age) && !isNaN(birthDate.getTime())) {
          const currentYear = new Date().getFullYear()
          const birthYear = birthDate.getFullYear()
          const calculatedAge = currentYear - birthYear

          if (Math.abs(age - calculatedAge) > 1) {
            issues.push({
              columns: [ageCol, birthCol],
              row: rowIndex,
              issue: `Age (${age}) doesn't match birth date (calculated: ${calculatedAge})`,
              severity: "high",
              suggestion: "Verify that age and birth date are consistent.",
            })
          }
        }
      }

      // Start Date vs End Date
      const startCols = headers.filter((h) => h.toLowerCase().includes("start") && h.toLowerCase().includes("date"))
      const endCols = headers.filter((h) => h.toLowerCase().includes("end") && h.toLowerCase().includes("date"))

      startCols.forEach((startCol) => {
        endCols.forEach((endCol) => {
          if (row[startCol] && row[endCol]) {
            const startDate = new Date(row[startCol])
            const endDate = new Date(row[endCol])

            if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime()) && startDate > endDate) {
              issues.push({
                columns: [startCol, endCol],
                row: rowIndex,
                issue: "Start date is after end date",
                severity: "critical",
                suggestion: "Start date should be before or equal to end date.",
              })
            }
          }
        })
      })

      // Salary vs Experience consistency
      const salaryCol = headers.find((h) => h.toLowerCase().includes("salary") || h.toLowerCase().includes("income"))
      const experienceCol = headers.find(
        (h) => h.toLowerCase().includes("experience") || h.toLowerCase().includes("years"),
      )

      if (salaryCol && experienceCol && row[salaryCol] && row[experienceCol]) {
        const salary = Number(row[salaryCol])
        const experience = Number(row[experienceCol])

        if (!isNaN(salary) && !isNaN(experience)) {
          // Very rough heuristic: salary should generally increase with experience
          if (experience > 10 && salary < 30000) {
            issues.push({
              columns: [salaryCol, experienceCol],
              row: rowIndex,
              issue: "Low salary for high experience level",
              severity: "medium",
              suggestion: "Verify salary is appropriate for experience level.",
            })
          }
        }
      }
    }

    return issues.slice(0, 500) // Limit to prevent performance issues
  }

  const calculateQualityScore = (analysis: Omit<DataAnalysisResult, "qualityScore">): number => {
    let score = 100

    // Deduct for null values
    const totalCells = analysis.totalRows * analysis.totalColumns
    const totalNulls = Object.values(analysis.nullValues).reduce((sum, count) => sum + count, 0)
    const nullPercentage = totalCells > 0 ? (totalNulls / totalCells) * 100 : 0
    score -= nullPercentage * 0.5 // Deduct 0.5 points per percentage of null values

    // Deduct for duplicates
    const duplicatePercentage = analysis.totalRows > 0 ? (analysis.duplicates / analysis.totalRows) * 100 : 0
    score -= duplicatePercentage * 2 // Deduct 2 points per percentage of duplicates

    // Deduct for issues
    const totalIssues = analysis.contextualIssues.length + analysis.crossFieldIssues.length
    const issuePercentage = analysis.totalRows > 0 ? (totalIssues / analysis.totalRows) * 100 : 0
    score -= issuePercentage * 1.5 // Deduct 1.5 points per percentage of rows with issues

    // Bonus for data type diversity (indicates rich dataset)
    const uniqueDataTypes = new Set(Object.values(analysis.dataTypes)).size
    if (uniqueDataTypes > 3) score += 5

    return Math.max(0, Math.min(100, Math.round(score)))
  }

  const analyzeData = (data: any[], headers: string[]): DataAnalysisResult => {
    setCurrentStep("Analyzing data structure...")

    const totalRows = data.length
    const totalColumns = headers.length

    // Calculate null values
    setCurrentStep("Detecting missing values...")
    const nullValues: Record<string, number> = {}
    headers.forEach((header) => {
      nullValues[header] = data.filter(
        (row) =>
          row[header] === null ||
          row[header] === undefined ||
          row[header] === "" ||
          (typeof row[header] === "string" && row[header].trim() === ""),
      ).length
    })

    // Detect duplicates
    setCurrentStep("Finding duplicate records...")
    const uniqueRows = new Set(data.map((row) => JSON.stringify(row)))
    const duplicates = totalRows - uniqueRows.size

    // Determine data types
    setCurrentStep("Analyzing data types...")
    const dataTypes: Record<string, string> = {}
    headers.forEach((header) => {
      const columnValues = data.map((row) => row[header])
      dataTypes[header] = detectDataType(columnValues)
    })

    // Calculate statistics
    setCurrentStep("Computing statistics...")
    const statistics: Record<string, any> = {}
    headers.forEach((header) => {
      const columnValues = data.map((row) => row[header])
      statistics[header] = calculateStatistics(columnValues, dataTypes[header])
    })

    // Detect outliers
    setCurrentStep("Identifying outliers...")
    const outliers: Record<string, OutlierInfo[]> = {}
    headers.forEach((header) => {
      const columnValues = data.map((row) => row[header])
      outliers[header] = detectOutliers(columnValues, dataTypes[header])
    })

    // Context-aware validation
    setCurrentStep("Running contextual validation...")
    const contextualIssues = detectContextualIssues(data, headers, dataTypes)

    // Cross-field validation
    setCurrentStep("Checking field relationships...")
    const crossFieldIssues = detectCrossFieldIssues(data, headers, dataTypes)

    const analysisWithoutScore = {
      totalRows,
      totalColumns,
      nullValues,
      duplicates,
      dataTypes,
      outliers,
      statistics,
      contextualIssues,
      crossFieldIssues,
    }

    // Calculate quality score
    setCurrentStep("Computing quality score...")
    const qualityScore = calculateQualityScore(analysisWithoutScore)

    return {
      ...analysisWithoutScore,
      qualityScore,
    }
  }

  const calculateEfficiency = (startTime: number, dataSize: number, issuesFound: number): EfficiencyMetrics => {
    const endTime = performance.now()
    const processingTime = endTime - startTime

    return {
      processingTime: Math.round(processingTime),
      memoryUsage: Math.round((dataSize * 64) / 1024), // Rough estimate in KB
      validationSpeed: Math.round(dataSize / (processingTime / 1000)), // rows per second
      issuesDetected: issuesFound,
      fixesApplied: 0,
      dataQualityImprovement: 0,
    }
  }

  const processFile = async (file: File): Promise<FileData> => {
    const startTime = performance.now()
    setCurrentStep("Reading file...")

    return new Promise((resolve, reject) => {
      const fileExtension = file.name.split(".").pop()?.toLowerCase()

      if (fileExtension === "csv") {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          dynamicTyping: true,
          complete: (results) => {
            try {
              if (results.errors.length > 0) {
                console.warn("CSV parsing warnings:", results.errors)
              }

              const headers = results.meta.fields || []
              const data = results.data as any[]

              if (headers.length === 0) {
                throw new Error("No columns found in the CSV file")
              }

              if (data.length === 0) {
                throw new Error("No data rows found in the CSV file")
              }

              setCurrentStep("Analyzing data quality...")
              const analysis = analyzeData(data, headers)
              const totalIssues = analysis.contextualIssues.length + analysis.crossFieldIssues.length
              const efficiency = calculateEfficiency(startTime, data.length, totalIssues)

              const fileData: FileData = {
                id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                name: file.name,
                size: file.size,
                uploadDate: new Date(),
                data,
                headers,
                analysis,
                efficiency,
              }

              resolve(fileData)
            } catch (error) {
              reject(error)
            }
          },
          error: (error) => reject(new Error(`CSV parsing error: ${error.message}`)),
        })
      } else if (fileExtension === "xlsx" || fileExtension === "xls") {
        const reader = new FileReader()
        reader.onload = (e) => {
          try {
            const data = new Uint8Array(e.target?.result as ArrayBuffer)
            const workbook = XLSX.read(data, { type: "array" })

            if (workbook.SheetNames.length === 0) {
              throw new Error("No sheets found in the Excel file")
            }

            const sheetName = workbook.SheetNames[0]
            const worksheet = workbook.Sheets[sheetName]
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" })

            if (jsonData.length === 0) {
              throw new Error("No data found in the Excel file")
            }

            const headers = (jsonData[0] as string[]).filter((h) => h && h.trim())
            if (headers.length === 0) {
              throw new Error("No valid column headers found")
            }

            const rows = jsonData
              .slice(1)
              .map((row: any) => {
                const obj: any = {}
                headers.forEach((header, index) => {
                  obj[header] = (row as any[])[index] || ""
                })
                return obj
              })
              .filter((row) => Object.values(row).some((val) => val !== ""))

            if (rows.length === 0) {
              throw new Error("No data rows found in the Excel file")
            }

            setCurrentStep("Analyzing data quality...")
            const analysis = analyzeData(rows, headers)
            const totalIssues = analysis.contextualIssues.length + analysis.crossFieldIssues.length
            const efficiency = calculateEfficiency(startTime, rows.length, totalIssues)

            const fileData: FileData = {
              id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              name: file.name,
              size: file.size,
              uploadDate: new Date(),
              data: rows,
              headers,
              analysis,
              efficiency,
            }

            resolve(fileData)
          } catch (error) {
            reject(error)
          }
        }
        reader.onerror = () => reject(new Error("Failed to read Excel file"))
        reader.readAsArrayBuffer(file)
      } else {
        reject(new Error("Unsupported file format. Please upload CSV or Excel files."))
      }
    })
  }

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return

      const file = acceptedFiles[0]

      // Validate file size (max 50MB)
      if (file.size > 50 * 1024 * 1024) {
        setError("File size too large. Please upload files smaller than 50MB.")
        return
      }

      setUploading(true)
      setProgress(0)
      setError(null)
      setCurrentStep("Preparing to process file...")

      try {
        // Simulate progress updates
        const progressInterval = setInterval(() => {
          setProgress((prev) => {
            if (prev >= 90) {
              clearInterval(progressInterval)
              return 90
            }
            return prev + Math.random() * 15
          })
        }, 200)

        const fileData = await processFile(file)

        clearInterval(progressInterval)
        setProgress(100)
        setCurrentStep("Complete!")

        setTimeout(() => {
          onFileUpload(fileData)
          setUploading(false)
          setProgress(0)
          setCurrentStep("")
        }, 500)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to process file"
        setError(errorMessage)
        setUploading(false)
        setProgress(0)
        setCurrentStep("")
        toast.error(errorMessage)
      }
    },
    [onFileUpload],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
    },
    multiple: false,
    maxSize: 50 * 1024 * 1024, // 50MB
  })

  return (
    <div className="space-y-4">
      <Card
        {...getRootProps()}
        className={`border-2 border-dashed cursor-pointer transition-all duration-200 ${
          isDragActive
            ? "border-blue-500 bg-blue-50 scale-105"
            : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
        } ${uploading ? "pointer-events-none opacity-75" : ""}`}
      >
        <CardContent className="flex flex-col items-center justify-center py-12">
          <input {...getInputProps()} />
          <div className="mb-4">
            {uploading ? (
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            ) : (
              <FileSpreadsheet className={`h-12 w-12 ${isDragActive ? "text-blue-500" : "text-gray-400"}`} />
            )}
          </div>
          <div className="text-center">
            <p className="text-lg font-medium text-gray-900 mb-2">
              {uploading ? "Processing your file..." : isDragActive ? "Drop your file here" : "Upload your data file"}
            </p>
            <p className="text-sm text-gray-500 mb-4">
              {uploading ? currentStep : "Drag and drop or click to select CSV or Excel files (max 50MB)"}
            </p>
            {!uploading && (
              <Button variant="outline" className="mt-2 bg-transparent">
                <Upload className="h-4 w-4 mr-2" />
                Choose File
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {uploading && (
        <Card>
          <CardContent className="py-6">
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>{currentStep}</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="w-full" />
              <div className="text-xs text-gray-500 text-center">This may take a few moments for large files...</div>
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <div>
                <p className="font-medium">Upload Error</p>
                <p className="text-sm">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* File format help */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="py-4">
          <div className="flex items-start gap-2 text-blue-700">
            <CheckCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium mb-1">Supported formats:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>CSV files (.csv) - Comma-separated values</li>
                <li>Excel files (.xlsx, .xls) - Microsoft Excel format</li>
                <li>Maximum file size: 50MB</li>
                <li>First row should contain column headers</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
