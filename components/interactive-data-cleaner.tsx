"use client"

import * as React from "react"
import { useState, useMemo, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Trash2,
  Wand2,
  Eye,
  Undo,
  CheckCircle,
  Filter,
  Search,
  RefreshCw,
  Sparkles,
  Target,
  Columns,
  RowsIcon,
  Settings,
  Info,
  Play,
} from "lucide-react"
import { toast } from "sonner"
import type { FileData } from "@/app/page"

interface CleaningAction {
  id: string
  type:
    | "trim"
    | "fillNulls"
    | "standardizeCase"
    | "removeDuplicates"
    | "removeRows"
    | "replaceValue"
    | "formatDate"
    | "formatNumber"
  column?: string
  rowIndices?: number[]
  description: string
  applied: boolean
  originalValue?: any
  newValue?: any
  condition?: string
  impact: "low" | "medium" | "high"
  category: "formatting" | "missing-data" | "duplicates" | "validation" | "transformation"
}

interface CleaningRule {
  id: string
  name: string
  description: string
  condition: string
  action: string
  column: string
  enabled: boolean
  priority: number
}

interface InteractiveDataCleanerProps {
  file: FileData
  onFileUpdate: (file: FileData) => void
}

export default function InteractiveDataCleaner({ file, onFileUpdate }: InteractiveDataCleanerProps) {
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set())
  const [selectedColumns, setSelectedColumns] = useState<Set<string>>(new Set())
  const [cleaningActions, setCleaningActions] = useState<CleaningAction[]>([])
  const [cleaningRules, setCleaningRules] = useState<CleaningRule[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [filterColumn, setFilterColumn] = useState<string>("all")
  const [previewMode, setPreviewMode] = useState(false)
  const [previewData, setPreviewData] = useState<any[]>([])
  const [undoStack, setUndoStack] = useState<any[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingProgress, setProcessingProgress] = useState(0)
  const [activeTab, setActiveTab] = useState("overview")

  // Generate cleaning suggestions based on data analysis
  const generateCleaningSuggestions = useCallback(() => {
    const suggestions: CleaningAction[] = []

    if (!file.data || !file.headers) return suggestions

    file.headers.forEach((header) => {
      const columnData = file.data.map((row) => row[header])
      const nullCount = columnData.filter((val) => val === null || val === undefined || val === "").length
      const totalCount = columnData.length

      // Missing data suggestions
      if (nullCount > 0) {
        suggestions.push({
          id: `fill-nulls-${header}`,
          type: "fillNulls",
          column: header,
          description: `Fill ${nullCount} missing values in "${header}" (${Math.round((nullCount / totalCount) * 100)}% of data)`,
          applied: false,
          impact: nullCount > totalCount * 0.1 ? "high" : nullCount > totalCount * 0.05 ? "medium" : "low",
          category: "missing-data",
        })
      }

      // Whitespace trimming suggestions
      const needsTrimming = columnData.filter(
        (val) => typeof val === "string" && (val.startsWith(" ") || val.endsWith(" ")),
      ).length

      if (needsTrimming > 0) {
        suggestions.push({
          id: `trim-${header}`,
          type: "trim",
          column: header,
          description: `Remove extra spaces from ${needsTrimming} values in "${header}"`,
          applied: false,
          impact: "low",
          category: "formatting",
        })
      }

      // Case standardization suggestions
      if (typeof columnData[0] === "string") {
        const hasInconsistentCase = columnData.some(
          (val) => typeof val === "string" && val !== val.toLowerCase() && val !== val.toUpperCase(),
        )

        if (hasInconsistentCase) {
          suggestions.push({
            id: `standardize-case-${header}`,
            type: "standardizeCase",
            column: header,
            description: `Standardize text casing in "${header}" for consistency`,
            applied: false,
            impact: "medium",
            category: "formatting",
          })
        }
      }
    })

    // Duplicate row detection
    const duplicateRows = findDuplicateRows()
    if (duplicateRows.length > 0) {
      suggestions.push({
        id: "remove-duplicates",
        type: "removeDuplicates",
        rowIndices: duplicateRows,
        description: `Remove ${duplicateRows.length} duplicate rows`,
        applied: false,
        impact: "high",
        category: "duplicates",
      })
    }

    setCleaningActions(suggestions)
  }, [file])

  // Find duplicate rows
  const findDuplicateRows = useCallback(() => {
    if (!file.data) return []

    const seen = new Set()
    const duplicates: number[] = []

    file.data.forEach((row, index) => {
      const rowString = JSON.stringify(row)
      if (seen.has(rowString)) {
        duplicates.push(index)
      } else {
        seen.add(rowString)
      }
    })

    return duplicates
  }, [file.data])

  // Apply cleaning action
  const applyCleaningAction = useCallback(
    async (action: CleaningAction) => {
      if (action.applied) return

      setIsProcessing(true)
      setProcessingProgress(0)

      // Save current state for undo
      setUndoStack((prev) => [...prev, { data: [...file.data], headers: [...file.headers] }])

      try {
        let updatedData = [...file.data]

        // Simulate processing progress
        const progressInterval = setInterval(() => {
          setProcessingProgress((prev) => Math.min(prev + 10, 90))
        }, 100)

        switch (action.type) {
          case "trim":
            if (action.column) {
              updatedData = updatedData.map((row) => ({
                ...row,
                [action.column!]:
                  typeof row[action.column!] === "string" ? row[action.column!].trim() : row[action.column!],
              }))
            }
            break

          case "fillNulls":
            if (action.column) {
              const nonNullValues = updatedData
                .map((row) => row[action.column!])
                .filter((val) => val !== null && val !== undefined && val !== "")

              const mostCommon = getMostCommonValue(nonNullValues)
              const fillValue = mostCommon || "N/A"

              updatedData = updatedData.map((row) => ({
                ...row,
                [action.column!]:
                  row[action.column!] === null || row[action.column!] === undefined || row[action.column!] === ""
                    ? fillValue
                    : row[action.column!],
              }))
            }
            break

          case "standardizeCase":
            if (action.column) {
              updatedData = updatedData.map((row) => ({
                ...row,
                [action.column!]:
                  typeof row[action.column!] === "string" ? row[action.column!].toLowerCase() : row[action.column!],
              }))
            }
            break

          case "removeDuplicates":
            const seen = new Set()
            updatedData = updatedData.filter((row, index) => {
              const rowString = JSON.stringify(row)
              if (seen.has(rowString)) {
                return false
              }
              seen.add(rowString)
              return true
            })
            break

          case "removeRows":
            if (action.rowIndices) {
              updatedData = updatedData.filter((_, index) => !action.rowIndices!.includes(index))
            }
            break
        }

        clearInterval(progressInterval)
        setProcessingProgress(100)

        // Update file data
        const updatedFile = {
          ...file,
          data: updatedData,
        }

        onFileUpdate(updatedFile)

        // Mark action as applied
        setCleaningActions((prev) => prev.map((a) => (a.id === action.id ? { ...a, applied: true } : a)))

        toast.success(`✅ ${action.description} - Applied successfully!`)
      } catch (error) {
        toast.error("Failed to apply cleaning action")
        console.error(error)
      } finally {
        setIsProcessing(false)
        setProcessingProgress(0)
      }
    },
    [file, onFileUpdate],
  )

  // Get most common value for filling nulls
  const getMostCommonValue = (values: any[]) => {
    const frequency: Record<string, number> = {}
    values.forEach((val) => {
      const key = String(val)
      frequency[key] = (frequency[key] || 0) + 1
    })

    return Object.entries(frequency).sort(([, a], [, b]) => b - a)[0]?.[0]
  }

  // Undo last action
  const undoLastAction = useCallback(() => {
    if (undoStack.length === 0) return

    const lastState = undoStack[undoStack.length - 1]
    const updatedFile = {
      ...file,
      data: lastState.data,
      headers: lastState.headers,
    }

    onFileUpdate(updatedFile)
    setUndoStack((prev) => prev.slice(0, -1))

    // Reset applied status for actions
    setCleaningActions((prev) => prev.map((action) => ({ ...action, applied: false })))

    toast.success("Action undone successfully")
  }, [undoStack, file, onFileUpdate])

  // Toggle row selection
  const toggleRowSelection = (rowIndex: number) => {
    setSelectedRows((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(rowIndex)) {
        newSet.delete(rowIndex)
      } else {
        newSet.add(rowIndex)
      }
      return newSet
    })
  }

  // Toggle column selection
  const toggleColumnSelection = (column: string) => {
    setSelectedColumns((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(column)) {
        newSet.delete(column)
      } else {
        newSet.add(column)
      }
      return newSet
    })
  }

  // Select all rows
  const selectAllRows = () => {
    if (selectedRows.size === file.data.length) {
      setSelectedRows(new Set())
    } else {
      setSelectedRows(new Set(Array.from({ length: file.data.length }, (_, i) => i)))
    }
  }

  // Filter data based on search and column filter
  const filteredData = useMemo(() => {
    if (!file.data) return []

    return file.data.filter((row, index) => {
      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase()
        const matchesSearch = Object.values(row).some((value) => String(value).toLowerCase().includes(searchLower))
        if (!matchesSearch) return false
      }

      // Column filter
      if (filterColumn !== "all") {
        const columnValue = row[filterColumn]
        if (columnValue === null || columnValue === undefined || columnValue === "") {
          return false
        }
      }

      return true
    })
  }, [file.data, searchTerm, filterColumn])

  // Generate suggestions on component mount
  React.useEffect(() => {
    generateCleaningSuggestions()
  }, [generateCleaningSuggestions])

  // Data quality metrics
  const dataQualityMetrics = useMemo(() => {
    if (!file.data || !file.headers) return null

    const totalCells = file.data.length * file.headers.length
    const nullCells = file.data.reduce(
      (sum, row) =>
        sum +
        file.headers.filter((header) => row[header] === null || row[header] === undefined || row[header] === "").length,
      0,
    )

    const duplicateRows = findDuplicateRows().length
    const completeness = Math.round(((totalCells - nullCells) / totalCells) * 100)
    const uniqueness = Math.round(((file.data.length - duplicateRows) / file.data.length) * 100)

    return {
      completeness,
      uniqueness,
      totalRows: file.data.length,
      totalColumns: file.headers.length,
      nullCells,
      duplicateRows,
    }
  }, [file, findDuplicateRows])

  return (
    <div className="space-y-6">
      {/* Header with metrics */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-blue-500" />
                Interactive Data Cleaner
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">Clean your data with smart suggestions and interactive tools</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={undoLastAction} disabled={undoStack.length === 0}>
                <Undo className="h-4 w-4 mr-1" />
                Undo
              </Button>
              <Button variant="outline" size="sm" onClick={generateCleaningSuggestions}>
                <RefreshCw className="h-4 w-4 mr-1" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>

        {dataQualityMetrics && (
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{dataQualityMetrics.completeness}%</div>
                <div className="text-sm text-gray-600">Data Completeness</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{dataQualityMetrics.uniqueness}%</div>
                <div className="text-sm text-gray-600">Data Uniqueness</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-700">{dataQualityMetrics.nullCells}</div>
                <div className="text-sm text-gray-600">Missing Values</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{dataQualityMetrics.duplicateRows}</div>
                <div className="text-sm text-gray-600">Duplicate Rows</div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Processing indicator */}
      {isProcessing && (
        <Alert>
          <RefreshCw className="h-4 w-4 animate-spin" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <span>Processing data cleaning...</span>
              <span>{processingProgress}%</span>
            </div>
            <Progress value={processingProgress} className="mt-2" />
          </AlertDescription>
        </Alert>
      )}

      {/* Main cleaning interface */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Info className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="suggestions" className="flex items-center gap-2">
            <Wand2 className="h-4 w-4" />
            Smart Clean
          </TabsTrigger>
          <TabsTrigger value="manual" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Manual Clean
          </TabsTrigger>
          <TabsTrigger value="rules" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Rules
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Data Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span>Total Rows:</span>
                  <Badge variant="outline">{file.data?.length || 0}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Total Columns:</span>
                  <Badge variant="outline">{file.headers?.length || 0}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Selected Rows:</span>
                  <Badge variant="secondary">{selectedRows.size}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Selected Columns:</span>
                  <Badge variant="secondary">{selectedColumns.size}</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Cleaning Progress</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span>Available Actions:</span>
                  <Badge variant="outline">{cleaningActions.length}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Applied Actions:</span>
                  <Badge variant="secondary">{cleaningActions.filter((a) => a.applied).length}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>High Impact:</span>
                  <Badge variant="destructive">{cleaningActions.filter((a) => a.impact === "high").length}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Can Undo:</span>
                  <Badge variant={undoStack.length > 0 ? "default" : "outline"}>{undoStack.length} steps</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Smart Cleaning Suggestions Tab */}
        <TabsContent value="suggestions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wand2 className="h-5 w-5" />
                Smart Cleaning Suggestions
              </CardTitle>
              <p className="text-sm text-gray-600">AI-powered recommendations to improve your data quality</p>
            </CardHeader>
            <CardContent>
              {cleaningActions.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Great job! 🎉</h3>
                  <p className="text-gray-600">Your data looks clean and ready to use.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {cleaningActions.map((action) => (
                    <div
                      key={action.id}
                      className={`border rounded-lg p-4 ${action.applied ? "bg-green-50 border-green-200" : "bg-white"}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge
                              variant={
                                action.impact === "high"
                                  ? "destructive"
                                  : action.impact === "medium"
                                    ? "default"
                                    : "secondary"
                              }
                              className="text-xs"
                            >
                              {action.impact} impact
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {action.category}
                            </Badge>
                            {action.applied && (
                              <Badge variant="default" className="text-xs bg-green-600">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Applied
                              </Badge>
                            )}
                          </div>
                          <p className={`text-sm ${action.applied ? "line-through text-gray-500" : "text-gray-900"}`}>
                            {action.description}
                          </p>
                          {action.column && (
                            <p className="text-xs text-gray-500 mt-1">
                              Column: <code className="bg-gray-100 px-1 rounded">{action.column}</code>
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2 ml-4">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Eye className="h-4 w-4 mr-1" />
                                Preview
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl">
                              <DialogHeader>
                                <DialogTitle>Preview: {action.description}</DialogTitle>
                                <DialogDescription>See what changes will be made to your data</DialogDescription>
                              </DialogHeader>
                              <div className="max-h-96 overflow-auto">
                                <p className="text-sm text-gray-600 mb-4">
                                  This preview shows the first 10 affected rows
                                </p>
                                {/* Preview content would go here */}
                              </div>
                            </DialogContent>
                          </Dialog>
                          <Button
                            size="sm"
                            onClick={() => applyCleaningAction(action)}
                            disabled={action.applied || isProcessing}
                          >
                            {action.applied ? (
                              <>
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Done
                              </>
                            ) : (
                              <>
                                <Play className="h-4 w-4 mr-1" />
                                Apply
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {cleaningActions.filter((a) => !a.applied).length > 1 && (
                    <div className="pt-4 border-t">
                      <Button
                        onClick={() => {
                          cleaningActions.filter((a) => !a.applied).forEach((action) => applyCleaningAction(action))
                        }}
                        disabled={isProcessing}
                        className="w-full"
                      >
                        <Sparkles className="h-4 w-4 mr-2" />
                        Apply All Suggestions
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Manual Cleaning Tab */}
        <TabsContent value="manual" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Row-wise cleaning */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <RowsIcon className="h-5 w-5" />
                  Row Operations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Selected Rows: {selectedRows.size}</Label>
                  <Button variant="outline" size="sm" onClick={selectAllRows}>
                    {selectedRows.size === file.data?.length ? "Deselect All" : "Select All"}
                  </Button>
                </div>

                <div className="space-y-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    className="w-full"
                    disabled={selectedRows.size === 0}
                    onClick={() => {
                      const action: CleaningAction = {
                        id: `remove-rows-${Date.now()}`,
                        type: "removeRows",
                        rowIndices: Array.from(selectedRows),
                        description: `Remove ${selectedRows.size} selected rows`,
                        applied: false,
                        impact: "high",
                        category: "validation",
                      }
                      applyCleaningAction(action)
                      setSelectedRows(new Set())
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete Selected
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Column-wise cleaning */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Columns className="h-5 w-5" />
                  Column Operations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Selected Columns: {selectedColumns.size}</Label>
                  <div className="mt-2 max-h-32 overflow-y-auto space-y-1">
                    {file.headers?.map((header) => (
                      <div key={header} className="flex items-center space-x-2">
                        <Checkbox
                          id={header}
                          checked={selectedColumns.has(header)}
                          onCheckedChange={() => toggleColumnSelection(header)}
                        />
                        <Label htmlFor={header} className="text-sm truncate">
                          {header}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full bg-transparent"
                    disabled={selectedColumns.size === 0}
                    onClick={() => {
                      selectedColumns.forEach((column) => {
                        const action: CleaningAction = {
                          id: `trim-${column}-${Date.now()}`,
                          type: "trim",
                          column,
                          description: `Trim spaces in "${column}"`,
                          applied: false,
                          impact: "low",
                          category: "formatting",
                        }
                        applyCleaningAction(action)
                      })
                    }}
                  >
                    Trim Spaces
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full bg-transparent"
                    disabled={selectedColumns.size === 0}
                    onClick={() => {
                      selectedColumns.forEach((column) => {
                        const action: CleaningAction = {
                          id: `fill-nulls-${column}-${Date.now()}`,
                          type: "fillNulls",
                          column,
                          description: `Fill missing values in "${column}"`,
                          applied: false,
                          impact: "medium",
                          category: "missing-data",
                        }
                        applyCleaningAction(action)
                      })
                    }}
                  >
                    Fill Missing
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Quick actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Target className="h-5 w-5" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  variant="outline"
                  className="w-full bg-transparent"
                  onClick={() => {
                    const action: CleaningAction = {
                      id: `remove-duplicates-${Date.now()}`,
                      type: "removeDuplicates",
                      description: "Remove all duplicate rows",
                      applied: false,
                      impact: "high",
                      category: "duplicates",
                    }
                    applyCleaningAction(action)
                  }}
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Remove Duplicates
                </Button>

                <Button variant="outline" className="w-full bg-transparent" onClick={generateCleaningSuggestions}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Scan for Issues
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Data table with selection */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Data Preview & Selection</CardTitle>
                <div className="flex gap-2">
                  <div className="flex items-center gap-2">
                    <Search className="h-4 w-4" />
                    <Input
                      placeholder="Search data..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-48"
                    />
                  </div>
                  <Select value={filterColumn} onValueChange={setFilterColumn}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Columns</SelectItem>
                      {file.headers?.map((header) => (
                        <SelectItem key={header} value={header}>
                          {header}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96 w-full">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox checked={selectedRows.size === file.data?.length} onCheckedChange={selectAllRows} />
                      </TableHead>
                      {file.headers?.map((header) => (
                        <TableHead key={header} className="min-w-32">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={selectedColumns.has(header)}
                              onCheckedChange={() => toggleColumnSelection(header)}
                            />
                            <span className="truncate">{header}</span>
                          </div>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.slice(0, 50).map((row, index) => (
                      <TableRow key={index} className={selectedRows.has(index) ? "bg-blue-50" : ""}>
                        <TableCell>
                          <Checkbox
                            checked={selectedRows.has(index)}
                            onCheckedChange={() => toggleRowSelection(index)}
                          />
                        </TableCell>
                        {file.headers?.map((header) => (
                          <TableCell key={header} className="max-w-32">
                            <div className="truncate" title={String(row[header] || "")}>
                              {row[header] === null || row[header] === undefined || row[header] === "" ? (
                                <span className="text-gray-400 italic">empty</span>
                              ) : (
                                String(row[header])
                              )}
                            </div>
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
              {filteredData.length > 50 && (
                <p className="text-sm text-gray-500 mt-2 text-center">Showing first 50 of {filteredData.length} rows</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Rules Tab */}
        <TabsContent value="rules" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Custom Cleaning Rules
              </CardTitle>
              <p className="text-sm text-gray-600">Create automated rules to clean your data based on conditions</p>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Coming Soon</h3>
                <p className="text-gray-600">Custom rule builder will be available in the next update</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
