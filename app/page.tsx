"use client"

import type React from "react"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileUpload } from "@/components/file-upload"
import { DataAnalysis } from "@/components/data-analysis"
import { ValidationRules } from "@/components/validation-rules"
import { FileHistory } from "@/components/file-history"
import { TrendDashboard } from "@/components/trend-dashboard"
import { ReportGenerator } from "@/components/report-generator"
import { CreditsPopup } from "@/components/credits-popup"
import { MobileNavigation } from "@/components/mobile-navigation"
import { Upload, BarChart3, Settings, History, TrendingUp, FileText } from "lucide-react"
import { toast, Toaster } from "sonner"

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================
// These interfaces define the structure of our data throughout the application

/**
 * Main file data structure that holds all information about an uploaded file
 * This is the core data structure used throughout the application
 */
export interface FileData {
  id: string // Unique identifier for the file
  name: string // Original filename
  size: number // File size in bytes
  uploadDate: Date // When the file was uploaded
  data: any[] // The actual data rows from the file
  headers: string[] // Column headers from the file
  analysis?: DataAnalysisResult // Results from data quality analysis
  validationResults?: ValidationResult[] // Results from validation rules
  customRules?: CustomRule[] // User-defined validation rules
  efficiency?: EfficiencyMetrics // Performance metrics for processing
}

/**
 * Results from comprehensive data analysis
 * Contains all metrics and insights about data quality
 */
export interface DataAnalysisResult {
  totalRows: number // Total number of data rows
  totalColumns: number // Total number of columns
  nullValues: Record<string, number> // Count of null values per column
  duplicates: number // Number of duplicate rows found
  dataTypes: Record<string, string> // Detected data type for each column
  outliers: Record<string, OutlierInfo[]> // Statistical outliers per column
  statistics: Record<string, any> // Statistical summary for each column
  contextualIssues: ContextualIssue[] // Issues with individual field values
  crossFieldIssues: CrossFieldIssue[] // Issues between related fields
  qualityScore: number // Overall data quality score (0-100)
}

/**
 * Information about statistical outliers in numeric columns
 */
export interface OutlierInfo {
  rowIndex: number // Index of the row containing the outlier
  value: any // The outlier value
  zScore: number // Z-score indicating how many standard deviations from mean
}

/**
 * Results from validation rule execution
 * Each validation rule produces one or more of these results
 */
export interface ValidationResult {
  id: string // Unique identifier for this validation result
  rule: string // Name of the validation rule that was applied
  severity: "low" | "medium" | "high" | "critical" // Impact level of the issue
  affectedRows: number[] // Array of row indices that have this issue
  description: string // Human-readable description of the issue
  suggestion: string // Recommended action to fix the issue
  sqlFix?: string // SQL code to fix the issue
  pythonFix?: string // Python code to fix the issue
  canAutoFix: boolean // Whether this issue can be automatically fixed
}

/**
 * Issues found in individual field values
 * These are problems with single data points
 */
export interface ContextualIssue {
  column: string // Column where the issue was found
  row: number // Row index where the issue was found
  value: any // The problematic value
  issue: string // Description of what's wrong
  severity: "low" | "medium" | "high" | "critical" // Impact level
  suggestion: string // How to fix this specific issue
}

/**
 * Issues found between related fields
 * These are problems with relationships between columns
 */
export interface CrossFieldIssue {
  columns: string[] // Columns involved in the issue
  row: number // Row index where the issue was found
  issue: string // Description of the relationship problem
  severity: "low" | "medium" | "high" | "critical" // Impact level
  suggestion: string // How to fix this relationship issue
}

/**
 * Performance metrics for file processing
 * Tracks how efficiently the system processed the data
 */
export interface EfficiencyMetrics {
  processingTime: number // Time taken to process the file (milliseconds)
  memoryUsage: number // Estimated memory usage (KB)
  validationSpeed: number // Rows processed per second
  issuesDetected: number // Total number of issues found
  fixesApplied: number // Number of issues that were automatically fixed
  dataQualityImprovement: number // Estimated improvement percentage after fixes
}

/**
 * User-defined validation rules
 * Allows users to create custom data validation logic
 */
export interface CustomRule {
  id: string // Unique identifier for the rule
  name: string // User-friendly name for the rule
  description: string // Detailed description of what the rule checks
  condition: string // Natural language condition (e.g., "age > 0")
  severity: "low" | "medium" | "high" | "critical" // Impact level if rule fails
  columns: string[] // Columns this rule applies to
  active: boolean // Whether this rule is currently enabled
}

/**
 * Navigation history state for browser back/forward functionality
 */
interface HistoryState {
  activeTab: string // Which tab was active
  activeFileId: string | null // Which file was selected
  timestamp: number // When this state was recorded
}

// ============================================================================
// CONSTANTS
// ============================================================================
// Configuration values used throughout the application

const STORAGE_KEY = "dataValidationTool_fileHistory" // localStorage key for persistence
const STORAGE_VERSION = "1.0" // Version for data compatibility

/**
 * Main application component
 * This is the root component that manages all application state and renders the UI
 */
export default function DataValidationTool() {
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  // Core application state
  const [files, setFiles] = useState<FileData[]>([]) // All uploaded files
  const [activeFile, setActiveFile] = useState<FileData | null>(null) // Currently selected file
  const [activeTab, setActiveTab] = useState("upload") // Currently active tab
  const [isLoading, setIsLoading] = useState(true) // Loading state for initial data

  // Navigation history for browser back/forward support
  const [navigationHistory, setNavigationHistory] = useState<HistoryState[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)

  // Undo/Redo functionality state
  const [undoStack, setUndoStack] = useState<{ files: FileData[]; activeFileId: string | null }[]>([])
  const [redoStack, setRedoStack] = useState<{ files: FileData[]; activeFileId: string | null }[]>([])

  // ============================================================================
  // UNDO/REDO FUNCTIONALITY
  // ============================================================================

  /**
   * Saves the current application state to the undo stack
   * This allows users to revert changes they've made
   */
  const saveToUndoStack = useCallback(() => {
    // Create a deep copy of files to ensure all nested objects are properly copied
    // This prevents reference issues when undoing changes
    const filesCopy = files.map((file) => ({
      ...file,
      data: [...file.data], // Deep copy the data array
      validationResults: file.validationResults ? [...file.validationResults] : undefined,
      customRules: file.customRules ? [...file.customRules] : undefined,
    }))

    setUndoStack((prev) => [
      ...prev.slice(-9), // Keep only last 10 states to prevent memory issues
      { files: filesCopy, activeFileId: activeFile?.id || null },
    ])
    setRedoStack([]) // Clear redo stack when new action is performed
  }, [files, activeFile])

  // ============================================================================
  // BROWSER NAVIGATION INTEGRATION
  // ============================================================================

  /**
   * Handle browser back/forward button clicks
   * This integrates our app with browser navigation
   */
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (event.state && event.state.tab) {
        setActiveTab(event.state.tab)
        if (event.state.fileId) {
          const file = files.find((f) => f.id === event.state.fileId)
          if (file) {
            setActiveFile(file)
          }
        }
      }
    }

    window.addEventListener("popstate", handlePopState)
    return () => window.removeEventListener("popstate", handlePopState)
  }, [files])

  /**
   * Update browser history when tab or file changes
   * This allows users to use browser back/forward buttons
   */
  useEffect(() => {
    const state = {
      tab: activeTab,
      fileId: activeFile?.id || null,
      timestamp: Date.now(),
    }

    // Update browser URL and history
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href)
      url.searchParams.set("tab", activeTab)
      if (activeFile) {
        url.searchParams.set("file", activeFile.id)
      } else {
        url.searchParams.delete("file")
      }

      window.history.pushState(state, "", url.toString())
    }

    // Update our internal navigation history
    setNavigationHistory((prev) => {
      const newHistory = [...prev, state]
      return newHistory.slice(-20) // Keep only last 20 states
    })
    setHistoryIndex((prev) => prev + 1)
  }, [activeTab, activeFile])

  /**
   * Navigate back in history
   */
  const goBack = useCallback(() => {
    if (historyIndex > 0) {
      const previousState = navigationHistory[historyIndex - 1]
      if (previousState) {
        setActiveTab(previousState.activeTab)
        if (previousState.activeFileId) {
          const file = files.find((f) => f.id === previousState.activeFileId)
          if (file) {
            setActiveFile(file)
          }
        } else {
          setActiveFile(null)
        }
        setHistoryIndex((prev) => prev - 1)
        window.history.back()
      }
    }
  }, [historyIndex, navigationHistory, files])

  /**
   * Navigate forward in history
   */
  const goForward = useCallback(() => {
    if (historyIndex < navigationHistory.length - 1) {
      const nextState = navigationHistory[historyIndex + 1]
      if (nextState) {
        setActiveTab(nextState.activeTab)
        if (nextState.activeFileId) {
          const file = files.find((f) => f.id === nextState.activeFileId)
          if (file) {
            setActiveFile(file)
          }
        } else {
          setActiveFile(null)
        }
        setHistoryIndex((prev) => prev + 1)
        window.history.forward()
      }
    }
  }, [historyIndex, navigationHistory, files])

  /**
   * Undo the last action
   */
  const handleUndo = useCallback(() => {
    if (undoStack.length > 0) {
      const currentState = { files, activeFileId: activeFile?.id || null }
      const previousState = undoStack[undoStack.length - 1]

      setRedoStack((prev) => [...prev, currentState])
      setUndoStack((prev) => prev.slice(0, -1))

      setFiles(previousState.files)
      if (previousState.activeFileId) {
        const file = previousState.files.find((f) => f.id === previousState.activeFileId)
        setActiveFile(file || null)
      } else {
        setActiveFile(null)
      }

      toast.success("Action undone")
    }
  }, [undoStack, files, activeFile])

  /**
   * Redo the last undone action
   */
  const handleRedo = useCallback(() => {
    if (redoStack.length > 0) {
      const currentState = { files, activeFileId: activeFile?.id || null }
      const nextState = redoStack[redoStack.length - 1]

      setUndoStack((prev) => [...prev, currentState])
      setRedoStack((prev) => prev.slice(0, -1))

      setFiles(nextState.files)
      if (nextState.activeFileId) {
        const file = nextState.files.find((f) => f.id === nextState.activeFileId)
        setActiveFile(file || null)
      } else {
        setActiveFile(null)
      }

      toast.success("Action redone")
    }
  }, [redoStack, files, activeFile])

  // ============================================================================
  // FILE MANAGEMENT
  // ============================================================================

  /**
   * Persist file changes to localStorage and update application state
   * This ensures data is saved and the UI is updated consistently
   */
  const persistFileChanges = useCallback(
    (updatedFile: FileData) => {
      // Save current state for undo functionality
      saveToUndoStack()

      // Update the files array with the modified file
      setFiles((prev) => prev.map((f) => (f.id === updatedFile.id ? updatedFile : f)))

      // Update active file if it's the one being modified
      if (activeFile?.id === updatedFile.id) {
        setActiveFile(updatedFile)
      }

      // Immediately save to localStorage to prevent data loss
      try {
        const currentData = localStorage.getItem(STORAGE_KEY)
        if (currentData) {
          const parsedData = JSON.parse(currentData)
          const updatedFiles = parsedData.files.map((f: any) =>
            f.id === updatedFile.id
              ? {
                  ...updatedFile,
                  uploadDate: updatedFile.uploadDate.toISOString(), // Convert Date to string for storage
                }
              : f,
          )

          const dataToSave = {
            ...parsedData,
            files: updatedFiles,
            lastUpdated: new Date().toISOString(),
          }

          localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave))
        }
      } catch (error) {
        console.error("Error persisting file changes:", error)
        // Continue execution even if localStorage fails
      }
    },
    [activeFile, saveToUndoStack],
  )

  /**
   * Public interface for updating files
   * Components use this to update file data
   */
  const updateFile = (updatedFile: FileData) => {
    persistFileChanges(updatedFile)
  }

  /**
   * Delete a file from the application
   */
  const deleteFile = (fileId: string) => {
    const fileToDelete = files.find((f) => f.id === fileId)
    saveToUndoStack()
    setFiles((prev) => prev.filter((f) => f.id !== fileId))

    // If we're deleting the active file, switch to another file or null
    if (activeFile?.id === fileId) {
      const remainingFiles = files.filter((f) => f.id !== fileId)
      setActiveFile(remainingFiles.length > 0 ? remainingFiles[0] : null)
    }

    if (fileToDelete) {
      toast.success(`File "${fileToDelete.name}" deleted successfully`)
    }
  }

  /**
   * Handle storage quota exceeded errors
   * Automatically removes oldest files to free up space
   */
  const handleStorageQuotaExceeded = () => {
    if (files.length > 5) {
      const sortedFiles = [...files].sort((a, b) => b.uploadDate.getTime() - a.uploadDate.getTime())
      const filesToKeep = sortedFiles.slice(0, 5)
      setFiles(filesToKeep)
      toast.info(`Removed ${files.length - 5} oldest files to free up storage space`)
    }
  }

  /**
   * Clear all file history and data
   */
  const clearAllHistory = () => {
    try {
      saveToUndoStack()
      localStorage.removeItem(STORAGE_KEY)
      setFiles([])
      setActiveFile(null)
      toast.success("All file history cleared")
    } catch (error) {
      console.error("Error clearing storage:", error)
      toast.error("Error clearing storage")
    }
  }

  /**
   * Export all stored data as a JSON file
   * Useful for backing up user data
   */
  const exportStorageData = () => {
    try {
      const savedData = localStorage.getItem(STORAGE_KEY)
      if (savedData) {
        const blob = new Blob([savedData], { type: "application/json" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `data-validation-history-${new Date().toISOString().split("T")[0]}.json`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        toast.success("Storage data exported successfully")
      } else {
        toast.info("No data to export")
      }
    } catch (error) {
      console.error("Error exporting storage data:", error)
      toast.error("Error exporting storage data")
    }
  }

  /**
   * Import previously exported data
   * Allows users to restore their data from a backup
   */
  const importStorageData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target?.result as string)
        if (importedData.version === STORAGE_VERSION && importedData.files) {
          saveToUndoStack()
          const parsedFiles = importedData.files.map((file: any) => ({
            ...file,
            uploadDate: new Date(file.uploadDate),
          }))
          setFiles(parsedFiles)
          localStorage.setItem(STORAGE_KEY, JSON.stringify(importedData))
          toast.success(`Imported ${parsedFiles.length} files successfully`)
        } else {
          toast.error("Invalid or incompatible backup file")
        }
      } catch (error) {
        console.error("Error importing storage data:", error)
        toast.error("Error importing backup file")
      }
    }
    reader.readAsText(file)
  }

  /**
   * Handle new file upload
   * Called when a user successfully uploads a new file
   */
  const handleFileUpload = (newFile: FileData) => {
    saveToUndoStack()
    setFiles((prev) => [newFile, ...prev]) // Add to beginning of array
    setActiveFile(newFile) // Make it the active file
    setActiveTab("analysis") // Switch to analysis tab
    toast.success(`File "${newFile.name}" uploaded successfully!`)
  }

  // ============================================================================
  // DATA PERSISTENCE
  // ============================================================================

  /**
   * Load saved files from localStorage on application startup
   */
  useEffect(() => {
    const loadFilesFromStorage = () => {
      try {
        const savedData = localStorage.getItem(STORAGE_KEY)
        if (savedData) {
          const parsedData = JSON.parse(savedData)

          // Check version compatibility
          if (parsedData.version === STORAGE_VERSION && parsedData.files) {
            const parsedFiles = parsedData.files.map((file: any) => ({
              ...file,
              uploadDate: new Date(file.uploadDate), // Convert string back to Date
            }))
            setFiles(parsedFiles)

            // Check URL parameters for initial state
            if (typeof window !== "undefined") {
              const urlParams = new URLSearchParams(window.location.search)
              const tabParam = urlParams.get("tab")
              const fileParam = urlParams.get("file")

              if (tabParam) {
                setActiveTab(tabParam)
              }

              if (fileParam) {
                const file = parsedFiles.find((f: FileData) => f.id === fileParam)
                if (file) {
                  setActiveFile(file)
                }
              } else if (parsedFiles.length > 0) {
                setActiveFile(parsedFiles[0])
              }
            }
          } else {
            console.warn("Storage version mismatch or invalid data, clearing storage")
            localStorage.removeItem(STORAGE_KEY)
          }
        }
      } catch (error) {
        console.error("Error loading files from localStorage:", error)
        toast.error("Error loading saved files")
        localStorage.removeItem(STORAGE_KEY)
      } finally {
        setIsLoading(false)
      }
    }

    loadFilesFromStorage()
  }, [])

  /**
   * Save files to localStorage whenever the files array changes
   */
  useEffect(() => {
    const saveFilesToStorage = () => {
      if (!isLoading && files.length >= 0) {
        try {
          const dataToSave = {
            version: STORAGE_VERSION,
            lastUpdated: new Date().toISOString(),
            files: files,
            totalFiles: files.length,
            totalSize: files.reduce((sum, file) => sum + file.size, 0),
          }

          const serializedData = JSON.stringify(dataToSave)

          // Warn if approaching localStorage limits
          if (serializedData.length > 4 * 1024 * 1024) {
            toast.warning("Storage approaching limit. Consider clearing old files.")
          }

          localStorage.setItem(STORAGE_KEY, serializedData)
        } catch (error) {
          if (error.name === "QuotaExceededError") {
            toast.error("Storage quota exceeded. Please clear some files.")
            handleStorageQuotaExceeded()
          } else {
            console.error("Error saving files to localStorage:", error)
            toast.error("Error saving files")
          }
        }
      }
    }

    saveFilesToStorage()
  }, [files, isLoading])

  // ============================================================================
  // RENDER LOADING STATE
  // ============================================================================

  // Show loading spinner while initializing
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your data...</p>
        </div>
      </div>
    )
  }

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Toast notifications for user feedback */}
      <Toaster position="top-center" />

      {/* Mobile Navigation - shown only on mobile devices */}
      <MobileNavigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
        canGoBack={historyIndex > 0}
        canGoForward={historyIndex < navigationHistory.length - 1}
        onGoBack={goBack}
        onGoForward={goForward}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={undoStack.length > 0}
        canRedo={redoStack.length > 0}
        hasActiveFile={!!activeFile}
        filesCount={files.length}
      />

      <div className="max-w-7xl mx-auto p-4 pb-20 lg:pb-4">
        {/* Application Header */}
        <div className="mb-6 lg:mb-8">
          <h1 className="text-2xl lg:text-4xl font-bold text-gray-900 mb-2">Data Validation & Analysis Tool</h1>
          <p className="text-sm lg:text-lg text-gray-600">
            Upload, analyze, validate, and remediate your data with AI-powered insights
          </p>

          {/* Statistics display when files are loaded */}
          {files.length > 0 && (
            <div className="mt-3 lg:mt-4 flex flex-wrap gap-2 lg:gap-4 text-xs lg:text-sm text-gray-600">
              <span>📁 {files.length} files uploaded</span>
              <span>
                📊 {files.reduce((sum, f) => sum + (f.analysis?.totalRows || 0), 0).toLocaleString()} total rows
                processed
              </span>
              <span className="hidden sm:inline">
                ⚡ {files.filter((f) => f.analysis?.qualityScore && f.analysis.qualityScore >= 80).length} high-quality
                files
              </span>
            </div>
          )}
        </div>

        {/* Main Tab Interface */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 lg:space-y-6">
          {/* Desktop Tab List - hidden on mobile */}
          <TabsList className="hidden lg:grid w-full grid-cols-6 lg:w-auto lg:grid-cols-6">
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Upload
            </TabsTrigger>
            <TabsTrigger value="analysis" className="flex items-center gap-2" disabled={!activeFile}>
              <BarChart3 className="h-4 w-4" />
              Analysis
            </TabsTrigger>
            <TabsTrigger value="validation" className="flex items-center gap-2" disabled={!activeFile}>
              <Settings className="h-4 w-4" />
              Validation
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              History
            </TabsTrigger>
            <TabsTrigger value="trends" className="flex items-center gap-2" disabled={files.length === 0}>
              <TrendingUp className="h-4 w-4" />
              Trends
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2" disabled={!activeFile}>
              <FileText className="h-4 w-4" />
              Reports
            </TabsTrigger>
          </TabsList>

          {/* Tab Content Areas */}

          {/* File Upload Tab */}
          <TabsContent value="upload" className="space-y-4 lg:space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg lg:text-xl">Upload Data File</CardTitle>
                <CardDescription className="text-sm lg:text-base">
                  Upload CSV or Excel files for comprehensive data analysis and validation. Supported formats: .csv,
                  .xlsx, .xls
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FileUpload onFileUpload={handleFileUpload} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Data Analysis Tab */}
          <TabsContent value="analysis" className="space-y-4 lg:space-y-6">
            {activeFile ? (
              <DataAnalysis file={activeFile} onFileUpdate={updateFile} />
            ) : (
              <Card>
                <CardContent className="flex items-center justify-center h-48 lg:h-64">
                  <div className="text-center">
                    <BarChart3 className="h-8 w-8 lg:h-12 lg:w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 text-sm lg:text-base">Please upload a file to view analysis</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Validation Rules Tab */}
          <TabsContent value="validation" className="space-y-4 lg:space-y-6">
            {activeFile ? (
              <ValidationRules file={activeFile} onFileUpdate={updateFile} />
            ) : (
              <Card>
                <CardContent className="flex items-center justify-center h-48 lg:h-64">
                  <div className="text-center">
                    <Settings className="h-8 w-8 lg:h-12 lg:w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 text-sm lg:text-base">
                      Please upload a file to configure validation rules
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* File History Tab */}
          <TabsContent value="history" className="space-y-4 lg:space-y-6">
            <FileHistory
              files={files}
              onFileSelect={(file) => {
                setActiveFile(file)
                setActiveTab("analysis")
              }}
              onFileDelete={deleteFile}
              onClearAllHistory={clearAllHistory}
              onExportStorage={exportStorageData}
              onImportStorage={importStorageData}
            />
          </TabsContent>

          {/* Trends Dashboard Tab */}
          <TabsContent value="trends" className="space-y-4 lg:space-y-6">
            <TrendDashboard files={files} />
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports" className="space-y-4 lg:space-y-6">
            {activeFile ? (
              <ReportGenerator file={activeFile} />
            ) : (
              <Card>
                <CardContent className="flex items-center justify-center h-48 lg:h-64">
                  <div className="text-center">
                    <FileText className="h-8 w-8 lg:h-12 lg:w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 text-sm lg:text-base">Please select a file to generate reports</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Credits Popup - shows attribution information */}
      <CreditsPopup />
    </div>
  )
}
