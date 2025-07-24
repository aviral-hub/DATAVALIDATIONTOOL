"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import type { FileData } from "@/app/page"
import { Search, Eye, Trash2, Calendar, FileText, BarChart3, Settings, Upload, Download } from "lucide-react"
import { format } from "date-fns"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface FileHistoryProps {
  files: FileData[]
  onFileSelect: (file: FileData) => void
  onFileDelete: (fileId: string) => void
  onClearAllHistory?: () => void
  onExportStorage?: () => void
  onImportStorage?: (event: React.ChangeEvent<HTMLInputElement>) => void
}

export function FileHistory({
  files,
  onFileSelect,
  onFileDelete,
  onClearAllHistory,
  onExportStorage,
  onImportStorage,
}: FileHistoryProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedFile, setSelectedFile] = useState<FileData | null>(null)
  const [storageInfo, setStorageInfo] = useState<{
    used: number
    total: number
    percentage: number
  } | null>(null)

  useEffect(() => {
    const calculateStorageUsage = () => {
      try {
        const storageData = localStorage.getItem("dataValidationTool_fileHistory")
        if (storageData) {
          const used = new Blob([storageData]).size
          const total = 5 * 1024 * 1024 // Assume 5MB limit for localStorage
          const percentage = (used / total) * 100
          setStorageInfo({ used, total, percentage })
        }
      } catch (error) {
        console.error("Error calculating storage usage:", error)
      }
    }

    calculateStorageUsage()
  }, [files])

  const formatStorageSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const filteredFiles = files.filter((file) => file.name.toLowerCase().includes(searchTerm.toLowerCase()))

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const getQualityScore = (file: FileData) => {
    if (!file.analysis) return 0

    const totalRows = file.analysis.totalRows
    const totalIssues = file.analysis.contextualIssues.length + file.analysis.crossFieldIssues.length
    const nullPercentage =
      Object.values(file.analysis.nullValues).reduce((sum, count) => sum + count, 0) / (totalRows * file.headers.length)

    let score = 100
    score -= (totalIssues / totalRows) * 50 // Deduct for issues
    score -= nullPercentage * 30 // Deduct for null values
    score -= (file.analysis.duplicates / totalRows) * 20 // Deduct for duplicates

    return Math.max(0, Math.round(score))
  }

  const getQualityBadgeVariant = (score: number) => {
    if (score >= 80) return "default"
    if (score >= 60) return "secondary"
    if (score >= 40) return "outline"
    return "destructive"
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">File History</h2>
          <p className="text-gray-600">View and manage your uploaded files</p>
          {storageInfo && (
            <div className="mt-2 flex items-center gap-4 text-sm">
              <span className="text-gray-500">
                Storage: {formatStorageSize(storageInfo.used)} / {formatStorageSize(storageInfo.total)}(
                {storageInfo.percentage.toFixed(1)}%)
              </span>
              <div className="w-32 bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    storageInfo.percentage > 80
                      ? "bg-red-500"
                      : storageInfo.percentage > 60
                        ? "bg-yellow-500"
                        : "bg-green-500"
                  }`}
                  style={{ width: `${Math.min(storageInfo.percentage, 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search files..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
            />
          </div>

          {/* Storage Management Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Settings className="h-4 w-4 mr-2" />
                Storage
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={onExportStorage}>
                <Download className="h-4 w-4 mr-2" />
                Export Backup
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <label className="flex items-center cursor-pointer">
                  <Upload className="h-4 w-4 mr-2" />
                  Import Backup
                  <input type="file" accept=".json" onChange={onImportStorage} className="hidden" />
                </label>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear All History
                  </DropdownMenuItem>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Clear All History</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete all uploaded files and their analysis data from your local storage.
                      This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={onClearAllHistory} className="bg-red-600 hover:bg-red-700">
                      Clear All
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </DropdownMenuContent>
          </DropdownMenu>

          <Badge variant="outline">{files.length} files total</Badge>
        </div>
      </div>

      {filteredFiles.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center h-64">
            <div className="text-center">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">
                {files.length === 0 ? "No files uploaded yet" : "No files match your search"}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Upload History</CardTitle>
            <CardDescription>Click on a file to view its analysis or use the actions to manage files</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>File Name</TableHead>
                    <TableHead>Upload Date</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Rows</TableHead>
                    <TableHead>Columns</TableHead>
                    <TableHead>Quality Score</TableHead>
                    <TableHead>Processing Time</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFiles.map((file) => (
                    <TableRow
                      key={file.id}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => onFileSelect(file)}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-gray-400" />
                          {file.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          {format(file.uploadDate, "MMM dd, yyyy HH:mm")}
                        </div>
                      </TableCell>
                      <TableCell>{formatFileSize(file.size)}</TableCell>
                      <TableCell>{file.analysis ? file.analysis.totalRows.toLocaleString() : "-"}</TableCell>
                      <TableCell>{file.analysis ? file.analysis.totalColumns : file.headers.length}</TableCell>
                      <TableCell>
                        {file.analysis && (
                          <Badge variant={getQualityBadgeVariant(getQualityScore(file))}>
                            {getQualityScore(file)}%
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{file.efficiency ? `${file.efficiency.processingTime}ms` : "-"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setSelectedFile(file)
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>File Details: {selectedFile?.name}</DialogTitle>
                                <DialogDescription>Detailed information about the uploaded file</DialogDescription>
                              </DialogHeader>
                              {selectedFile && (
                                <div className="space-y-4">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <h4 className="font-medium mb-2">File Information</h4>
                                      <div className="space-y-1 text-sm">
                                        <p>
                                          <strong>Name:</strong> {selectedFile.name}
                                        </p>
                                        <p>
                                          <strong>Size:</strong> {formatFileSize(selectedFile.size)}
                                        </p>
                                        <p>
                                          <strong>Upload Date:</strong> {format(selectedFile.uploadDate, "PPpp")}
                                        </p>
                                        <p>
                                          <strong>Rows:</strong> {selectedFile.analysis?.totalRows.toLocaleString()}
                                        </p>
                                        <p>
                                          <strong>Columns:</strong> {selectedFile.analysis?.totalColumns}
                                        </p>
                                      </div>
                                    </div>
                                    <div>
                                      <h4 className="font-medium mb-2">Quality Metrics</h4>
                                      <div className="space-y-1 text-sm">
                                        <p>
                                          <strong>Quality Score:</strong> {getQualityScore(selectedFile)}%
                                        </p>
                                        <p>
                                          <strong>Duplicates:</strong> {selectedFile.analysis?.duplicates}
                                        </p>
                                        <p>
                                          <strong>Issues Found:</strong>{" "}
                                          {(selectedFile.analysis?.contextualIssues.length || 0) +
                                            (selectedFile.analysis?.crossFieldIssues.length || 0)}
                                        </p>
                                        <p>
                                          <strong>Processing Time:</strong> {selectedFile.efficiency?.processingTime}ms
                                        </p>
                                      </div>
                                    </div>
                                  </div>

                                  <div>
                                    <h4 className="font-medium mb-2">Column Information</h4>
                                    <div className="max-h-32 overflow-y-auto">
                                      <Table>
                                        <TableHeader>
                                          <TableRow>
                                            <TableHead>Column</TableHead>
                                            <TableHead>Type</TableHead>
                                            <TableHead>Null Count</TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {selectedFile.headers.map((header) => (
                                            <TableRow key={header}>
                                              <TableCell className="font-medium">{header}</TableCell>
                                              <TableCell>
                                                <Badge variant="outline">
                                                  {selectedFile.analysis?.dataTypes[header] || "unknown"}
                                                </Badge>
                                              </TableCell>
                                              <TableCell>{selectedFile.analysis?.nullValues[header] || 0}</TableCell>
                                            </TableRow>
                                          ))}
                                        </TableBody>
                                      </Table>
                                    </div>
                                  </div>

                                  <div className="flex justify-end gap-2">
                                    <Button
                                      onClick={() => onFileSelect(selectedFile)}
                                      className="flex items-center gap-2"
                                    >
                                      <BarChart3 className="h-4 w-4" />
                                      View Analysis
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </DialogContent>
                          </Dialog>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              onFileDelete(file.id)
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Files</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{files.length}</div>
            <p className="text-xs text-muted-foreground">Files uploaded to date</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Rows Processed</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {files.reduce((sum, file) => sum + (file.analysis?.totalRows || 0), 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Across all files</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Quality Score</CardTitle>
            <Badge className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {files.length > 0
                ? Math.round(files.reduce((sum, file) => sum + getQualityScore(file), 0) / files.length)
                : 0}
              %
            </div>
            <p className="text-xs text-muted-foreground">Data quality average</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
