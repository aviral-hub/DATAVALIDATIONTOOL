"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import {
  Plus,
  Play,
  Pause,
  Download,
  CheckCircle,
  AlertTriangle,
  Settings,
  Zap,
  Sparkles,
  Wand2,
  Eye,
} from "lucide-react"
import { toast } from "sonner"
import type { FileData, ValidationResult, CustomRule } from "@/app/page"
import { AiDataAssistant } from "./ai-data-assistant"
import InteractiveDataCleaner from "./interactive-data-cleaner"

interface ValidationRulesProps {
  file: FileData
  onFileUpdate: (file: FileData) => void
}

export function ValidationRules({ file, onFileUpdate }: ValidationRulesProps) {
  const [customRules, setCustomRules] = useState<CustomRule[]>(file.customRules || [])
  const [validationResults, setValidationResults] = useState<ValidationResult[]>(file.validationResults || [])
  const [isValidating, setIsValidating] = useState(false)
  const [validationProgress, setValidationProgress] = useState(0)
  const [newRule, setNewRule] = useState<Partial<CustomRule>>({
    name: "",
    description: "",
    condition: "",
    severity: "medium",
    columns: [],
    active: true,
  })
  const [selectedTemplate, setSelectedTemplate] = useState("")
  const [showRuleBuilder, setShowRuleBuilder] = useState(false)
  const [activeTab, setActiveTab] = useState("overview")

  // Predefined validation rule templates
  const ruleTemplates = [
    {
      id: "email-validation",
      name: "Email Format Validation",
      description: "Validates email addresses using standard format",
      condition: "email format is valid",
      severity: "medium" as const,
      category: "Format Validation",
    },
    {
      id: "phone-validation",
      name: "Phone Number Validation",
      description: "Validates phone numbers with country codes",
      condition: "phone number format is valid",
      severity: "medium" as const,
      category: "Format Validation",
    },
    {
      id: "date-range",
      name: "Date Range Validation",
      description: "Ensures dates fall within acceptable range",
      condition: "date is between 1900-01-01 and today",
      severity: "high" as const,
      category: "Business Logic",
    },
    {
      id: "positive-numbers",
      name: "Positive Number Validation",
      description: "Ensures numeric values are positive",
      condition: "value > 0",
      severity: "high" as const,
      category: "Data Integrity",
    },
    {
      id: "required-fields",
      name: "Required Field Validation",
      description: "Ensures critical fields are not empty",
      condition: "value is not null or empty",
      severity: "critical" as const,
      category: "Data Completeness",
    },
    {
      id: "text-length",
      name: "Text Length Validation",
      description: "Validates text field length constraints",
      condition: "text length between 1 and 255 characters",
      severity: "medium" as const,
      category: "Format Validation",
    },
  ]

  // Built-in validation functions
  const builtInValidations = {
    emailFormat: (value: any) => {
      if (!value) return true
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      return emailRegex.test(String(value))
    },
    phoneFormat: (value: any) => {
      if (!value) return true
      const phoneRegex = /^[+]?[1-9][\d]{0,15}$/
      return phoneRegex.test(String(value).replace(/[\s\-()]/g, ""))
    },
    dateRange: (value: any) => {
      if (!value) return true
      const date = new Date(value)
      const minDate = new Date("1900-01-01")
      const maxDate = new Date()
      return date >= minDate && date <= maxDate
    },
    positiveNumber: (value: any) => {
      if (!value) return true
      const num = Number(value)
      return !isNaN(num) && num > 0
    },
    requiredField: (value: any) => {
      return value !== null && value !== undefined && String(value).trim() !== ""
    },
    textLength: (value: any, min = 1, max = 255) => {
      if (!value) return true
      const length = String(value).length
      return length >= min && length <= max
    },
  }

  // Add new custom rule
  const addCustomRule = () => {
    if (!newRule.name || !newRule.condition) {
      toast.error("Please fill in rule name and condition")
      return
    }

    const rule: CustomRule = {
      id: `custom-${Date.now()}`,
      name: newRule.name,
      description: newRule.description || "",
      condition: newRule.condition,
      severity: newRule.severity || "medium",
      columns: newRule.columns || [],
      active: newRule.active !== false,
    }

    const updatedRules = [...customRules, rule]
    setCustomRules(updatedRules)

    // Update file with new rules
    const updatedFile = { ...file, customRules: updatedRules }
    onFileUpdate(updatedFile)

    // Reset form
    setNewRule({
      name: "",
      description: "",
      condition: "",
      severity: "medium",
      columns: [],
      active: true,
    })

    setShowRuleBuilder(false)
    toast.success("Custom rule added successfully!")
  }

  // Apply rule template
  const applyTemplate = (templateId: string) => {
    const template = ruleTemplates.find((t) => t.id === templateId)
    if (!template) return

    setNewRule({
      name: template.name,
      description: template.description,
      condition: template.condition,
      severity: template.severity,
      columns: [],
      active: true,
    })
    setShowRuleBuilder(true)
  }

  // Run validation on all rules
  const runValidation = async () => {
    setIsValidating(true)
    setValidationProgress(0)
    const results: ValidationResult[] = []

    try {
      const totalRules = customRules.filter((rule) => rule.active).length
      let processedRules = 0

      for (const rule of customRules.filter((rule) => rule.active)) {
        const ruleResults = await validateRule(rule)
        results.push(...ruleResults)

        processedRules++
        setValidationProgress((processedRules / totalRules) * 100)

        // Small delay to show progress
        await new Promise((resolve) => setTimeout(resolve, 100))
      }

      setValidationResults(results)

      // Update file with validation results
      const updatedFile = { ...file, validationResults: results }
      onFileUpdate(updatedFile)

      toast.success(`Validation complete! Found ${results.length} issues.`)
    } catch (error) {
      toast.error("Validation failed. Please try again.")
      console.error("Validation error:", error)
    } finally {
      setIsValidating(false)
      setValidationProgress(0)
    }
  }

  // Validate a single rule against the data
  const validateRule = async (rule: CustomRule): Promise<ValidationResult[]> => {
    const results: ValidationResult[] = []
    const affectedRows: number[] = []

    // Simple condition parsing and validation
    for (let rowIndex = 0; rowIndex < file.data.length; rowIndex++) {
      const row = file.data[rowIndex]

      // If rule specifies columns, check only those columns
      const columnsToCheck = rule.columns.length > 0 ? rule.columns : file.headers

      for (const column of columnsToCheck) {
        const value = row[column]
        let isValid = true

        // Basic condition evaluation
        try {
          if (rule.condition.includes("email format")) {
            isValid = builtInValidations.emailFormat(value)
          } else if (rule.condition.includes("phone number format")) {
            isValid = builtInValidations.phoneFormat(value)
          } else if (rule.condition.includes("date is between")) {
            isValid = builtInValidations.dateRange(value)
          } else if (rule.condition.includes("value > 0")) {
            isValid = builtInValidations.positiveNumber(value)
          } else if (rule.condition.includes("not null or empty")) {
            isValid = builtInValidations.requiredField(value)
          } else if (rule.condition.includes("text length")) {
            isValid = builtInValidations.textLength(value)
          }

          if (!isValid) {
            affectedRows.push(rowIndex)
          }
        } catch (error) {
          console.warn(`Error validating rule ${rule.name}:`, error)
        }
      }
    }

    if (affectedRows.length > 0) {
      results.push({
        id: `${rule.id}-${Date.now()}`,
        rule: rule.name,
        severity: rule.severity,
        affectedRows,
        description: `${rule.name}: ${affectedRows.length} rows failed validation`,
        suggestion: `Review and fix the ${affectedRows.length} rows that don't meet the condition: ${rule.condition}`,
        canAutoFix: false,
      })
    }

    return results
  }

  // Toggle rule active status
  const toggleRule = (ruleId: string) => {
    const updatedRules = customRules.map((rule) => (rule.id === ruleId ? { ...rule, active: !rule.active } : rule))
    setCustomRules(updatedRules)

    const updatedFile = { ...file, customRules: updatedRules }
    onFileUpdate(updatedFile)
  }

  // Delete rule
  const deleteRule = (ruleId: string) => {
    const updatedRules = customRules.filter((rule) => rule.id !== ruleId)
    setCustomRules(updatedRules)

    const updatedFile = { ...file, customRules: updatedRules }
    onFileUpdate(updatedFile)

    toast.success("Rule deleted successfully")
  }

  // Export validation results
  const exportResults = () => {
    const exportData = {
      fileName: file.name,
      validationDate: new Date().toISOString(),
      totalRules: customRules.length,
      activeRules: customRules.filter((r) => r.active).length,
      totalIssues: validationResults.length,
      results: validationResults,
      rules: customRules,
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `validation-results-${file.name.replace(/\.[^/.]+$/, "")}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast.success("Validation results exported!")
  }

  // Get severity color
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "text-red-600 bg-red-50 border-red-200"
      case "high":
        return "text-orange-600 bg-orange-50 border-orange-200"
      case "medium":
        return "text-yellow-600 bg-yellow-50 border-yellow-200"
      case "low":
        return "text-blue-600 bg-blue-50 border-blue-200"
      default:
        return "text-gray-600 bg-gray-50 border-gray-200"
    }
  }

  // Initialize rules from file data
  useEffect(() => {
    if (file.customRules) {
      setCustomRules(file.customRules)
    }
    if (file.validationResults) {
      setValidationResults(file.validationResults)
    }
  }, [file])

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Data Validation & Cleaning
              </CardTitle>
              <CardDescription>Create custom validation rules and clean your data interactively</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={exportResults} disabled={validationResults.length === 0}>
                <Download className="h-4 w-4 mr-2" />
                Export Results
              </Button>
              <Button onClick={runValidation} disabled={isValidating || customRules.length === 0}>
                {isValidating ? (
                  <>
                    <Pause className="h-4 w-4 mr-2" />
                    Validating...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Run Validation
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>

        {/* Validation Progress */}
        {isValidating && (
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Running validation rules...</span>
                <span>{Math.round(validationProgress)}%</span>
              </div>
              <Progress value={validationProgress} />
            </div>
          </CardContent>
        )}
      </Card>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="cleaning">
            <Sparkles className="h-4 w-4 mr-2" />
            Data Cleaning
          </TabsTrigger>
          <TabsTrigger value="rules">Custom Rules</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
          <TabsTrigger value="assistant">AI Assistant</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Validation Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm">Total Rules:</span>
                  <Badge variant="outline">{customRules.length}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Active Rules:</span>
                  <Badge variant="secondary">{customRules.filter((r) => r.active).length}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Issues Found:</span>
                  <Badge variant={validationResults.length > 0 ? "destructive" : "default"}>
                    {validationResults.length}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Data Quality</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm">Total Rows:</span>
                  <Badge variant="outline">{file.data?.length || 0}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Affected Rows:</span>
                  <Badge variant="secondary">{new Set(validationResults.flatMap((r) => r.affectedRows)).size}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Quality Score:</span>
                  <Badge
                    variant={file.analysis?.qualityScore && file.analysis.qualityScore > 80 ? "default" : "destructive"}
                  >
                    {file.analysis?.qualityScore || 0}%
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full bg-transparent"
                  onClick={() => setShowRuleBuilder(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Rule
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full bg-transparent"
                  onClick={() => setActiveTab("cleaning")}
                >
                  <Wand2 className="h-4 w-4 mr-2" />
                  Clean Data
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full bg-transparent"
                  onClick={() => setActiveTab("assistant")}
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  AI Help
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Rule Templates */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Start Templates</CardTitle>
              <CardDescription>
                Use these pre-built templates to get started with common validation scenarios
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {ruleTemplates.map((template) => (
                  <div key={template.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-sm">{template.name}</h4>
                      <Badge variant="outline" className="text-xs">
                        {template.category}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-600 mb-3">{template.description}</p>
                    <div className="flex items-center justify-between">
                      <Badge
                        variant={
                          template.severity === "critical"
                            ? "destructive"
                            : template.severity === "high"
                              ? "destructive"
                              : "secondary"
                        }
                        className="text-xs"
                      >
                        {template.severity}
                      </Badge>
                      <Button size="sm" variant="outline" onClick={() => applyTemplate(template.id)}>
                        Use Template
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Data Cleaning Tab */}
        <TabsContent value="cleaning" className="space-y-4">
          <InteractiveDataCleaner file={file} onFileUpdate={onFileUpdate} />
        </TabsContent>

        {/* Custom Rules Tab */}
        <TabsContent value="rules" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Custom Validation Rules</h3>
            <Button onClick={() => setShowRuleBuilder(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Rule
            </Button>
          </div>

          {customRules.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center h-64">
                <div className="text-center">
                  <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Custom Rules</h3>
                  <p className="text-gray-600 mb-4">Create your first validation rule to get started</p>
                  <Button onClick={() => setShowRuleBuilder(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Rule
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {customRules.map((rule) => (
                <Card key={rule.id} className={rule.active ? "" : "opacity-60"}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium">{rule.name}</h4>
                          <Badge
                            variant={
                              rule.severity === "critical"
                                ? "destructive"
                                : rule.severity === "high"
                                  ? "destructive"
                                  : "secondary"
                            }
                          >
                            {rule.severity}
                          </Badge>
                          {!rule.active && <Badge variant="outline">Inactive</Badge>}
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{rule.description}</p>
                        <p className="text-xs text-gray-500">
                          Condition: <code className="bg-gray-100 px-1 rounded">{rule.condition}</code>
                        </p>
                        {rule.columns.length > 0 && (
                          <p className="text-xs text-gray-500 mt-1">Columns: {rule.columns.join(", ")}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <Switch checked={rule.active} onCheckedChange={() => toggleRule(rule.id)} />
                        <Button variant="outline" size="sm" onClick={() => deleteRule(rule.id)}>
                          Delete
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Rule Builder Dialog */}
          <Dialog open={showRuleBuilder} onOpenChange={setShowRuleBuilder}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create Custom Validation Rule</DialogTitle>
                <DialogDescription>
                  Define a custom rule to validate your data according to your business requirements
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="rule-name">Rule Name</Label>
                    <Input
                      id="rule-name"
                      value={newRule.name || ""}
                      onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                      placeholder="e.g., Email Validation"
                    />
                  </div>
                  <div>
                    <Label htmlFor="rule-severity">Severity</Label>
                    <Select
                      value={newRule.severity}
                      onValueChange={(value: any) => setNewRule({ ...newRule, severity: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="rule-description">Description</Label>
                  <Textarea
                    id="rule-description"
                    value={newRule.description || ""}
                    onChange={(e) => setNewRule({ ...newRule, description: e.target.value })}
                    placeholder="Describe what this rule validates..."
                  />
                </div>
                <div>
                  <Label htmlFor="rule-condition">Validation Condition</Label>
                  <Input
                    id="rule-condition"
                    value={newRule.condition || ""}
                    onChange={(e) => setNewRule({ ...newRule, condition: e.target.value })}
                    placeholder="e.g., email format is valid, value > 0, not null or empty"
                  />
                </div>
                <div>
                  <Label>Apply to Columns (leave empty for all columns)</Label>
                  <div className="grid grid-cols-3 gap-2 max-h-32 overflow-y-auto border rounded p-2">
                    {file.headers?.map((header) => (
                      <div key={header} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`column-${header}`}
                          checked={newRule.columns?.includes(header) || false}
                          onChange={(e) => {
                            const columns = newRule.columns || []
                            if (e.target.checked) {
                              setNewRule({ ...newRule, columns: [...columns, header] })
                            } else {
                              setNewRule({ ...newRule, columns: columns.filter((c) => c !== header) })
                            }
                          }}
                        />
                        <Label htmlFor={`column-${header}`} className="text-xs truncate">
                          {header}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowRuleBuilder(false)}>
                    Cancel
                  </Button>
                  <Button onClick={addCustomRule}>Add Rule</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Results Tab */}
        <TabsContent value="results" className="space-y-4">
          {validationResults.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center h-64">
                <div className="text-center">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Issues Found</h3>
                  <p className="text-gray-600 mb-4">
                    {customRules.length === 0
                      ? "Create some validation rules to check your data quality"
                      : "Your data passes all validation rules!"}
                  </p>
                  {customRules.length === 0 && (
                    <Button onClick={() => setActiveTab("rules")}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Rules
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Results Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-orange-500" />
                    Validation Results Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">
                        {validationResults.filter((r) => r.severity === "critical").length}
                      </div>
                      <div className="text-sm text-gray-600">Critical Issues</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">
                        {validationResults.filter((r) => r.severity === "high").length}
                      </div>
                      <div className="text-sm text-gray-600">High Priority</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-600">
                        {validationResults.filter((r) => r.severity === "medium").length}
                      </div>
                      <div className="text-sm text-gray-600">Medium Priority</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {validationResults.filter((r) => r.severity === "low").length}
                      </div>
                      <div className="text-sm text-gray-600">Low Priority</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Detailed Results */}
              <Card>
                <CardHeader>
                  <CardTitle>Detailed Issues</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-96">
                    <div className="space-y-3">
                      {validationResults.map((result) => (
                        <div key={result.id} className={`border rounded-lg p-4 ${getSeverityColor(result.severity)}`}>
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{result.severity}</Badge>
                              <h4 className="font-medium">{result.rule}</h4>
                            </div>
                            <Badge variant="secondary">{result.affectedRows.length} rows</Badge>
                          </div>
                          <p className="text-sm mb-2">{result.description}</p>
                          <p className="text-xs text-gray-600 mb-2">{result.suggestion}</p>
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4 mr-1" />
                              View Rows
                            </Button>
                            {result.canAutoFix && (
                              <Button size="sm">
                                <Zap className="h-4 w-4 mr-1" />
                                Auto Fix
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* AI Assistant Tab */}
        <TabsContent value="assistant" className="space-y-4">
          <AiDataAssistant file={file} onFileUpdate={onFileUpdate} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
