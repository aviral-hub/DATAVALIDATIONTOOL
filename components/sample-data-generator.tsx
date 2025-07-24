"use client"

/* ---------------------------------------------------------------------------
   SAMPLE DATA GENERATOR
   ---------------------------------------------------------------------------
   • Generates several realistic datasets, each seeded with intentional issues
     so users can practise validation and cleaning.
   • Works completely client-side; if a Groq/AI call fails or you are offline
     the sample generator still functions.
   • Emits a FileData object (declared in app/page.tsx) via the
     onSampleDataGenerated callback.
   • Provides clear, non-technical descriptions so every user understands
     what the dataset teaches.
-----------------------------------------------------------------------------*/

import { useState } from "react"
import type React from "react"
import { Users, ShoppingCart, Briefcase, GraduationCap, RefreshCcw, Download } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardDescription, CardTitle, CardContent, CardFooter } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"

import type { FileData, DataAnalysisResult } from "@/app/page"

/* ---------------------------------------------------------------------------
   PROPS & INTERNAL TYPES
-----------------------------------------------------------------------------*/

interface SampleDataGeneratorProps {
  onSampleDataGenerated: (file: FileData) => void
}

type Difficulty = "Beginner" | "Intermediate" | "Advanced"

interface SampleDataset {
  id: string
  name: string
  description: string
  icon: React.ComponentType<any>
  difficulty: Difficulty
  learningObjectives: string[]
  commonIssues: string[]
  rowCount: number
  headers: string[]
  generateData: () => any[]
}

/* ---------------------------------------------------------------------------
   RANDOM HELPERS
-----------------------------------------------------------------------------*/

const rand = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]

const randBetween = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min

/* ---------------------------------------------------------------------------
   DATA GENERATION HELPERS (one per dataset)
-----------------------------------------------------------------------------*/

const generateCustomerData = (): any[] => {
  const firstNames = ["John", "Jane", "Mike", "Sarah", "David", "Lisa", "Tom", "Anna", "Chris", "Emma", "", "Bob"]
  const lastNames = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "", "Wilson"]
  const domains = ["gmail.com", "yahoo.com", "hotmail.com", "company.com", "invalid", "@broken", "test"]
  const cities = ["New York", "Los Angeles", "Chicago", "Houston", "Phoenix", "", "Miami", "Seattle"]
  const states = ["NY", "CA", "IL", "TX", "AZ", "FL", "WA", "", "INVALID"]

  return Array.from({ length: 500 }, (_, i) => {
    const firstName = rand(firstNames)
    const lastName = rand(lastNames)
    const domain = rand(domains)

    /* e-mail issues purposely injected */
    let email = ""
    if (firstName && lastName && domain) {
      if (domain === "invalid") email = `${firstName}.${lastName}@`
      else if (domain === "@broken") email = `${firstName}.${lastName}broken.com`
      else email = `${firstName}.${lastName}@${domain}`
    }

    /* phone numbers with mixed formats */
    const phoneFormats: Array<() => string> = [
      () => `(${randBetween(100, 999)}) ${randBetween(100, 999)}-${randBetween(1000, 9999)}`,
      () => `${randBetween(100, 999)}-${randBetween(100, 999)}-${randBetween(1000, 9999)}`,
      () => `${randBetween(1000000000, 9999999999)}`,
      () => "123", // too short
      () => "", // missing
    ]
    const phone = rand(phoneFormats)()

    /* age edge-cases */
    let age = randBetween(18, 98)
    if (Math.random() < 0.05) age = -5
    if (Math.random() < 0.03) age = 150

    return {
      customer_id: `CUST${String(i + 1).padStart(4, "0")}`,
      first_name: firstName,
      last_name: lastName,
      email,
      phone,
      age,
      city: rand(cities),
      state: rand(states),
      registration_date: new Date(2020 + Math.floor(Math.random() * 4), randBetween(0, 11), randBetween(1, 28))
        .toISOString()
        .split("T")[0],
      status: Math.random() > 0.1 ? (Math.random() > 0.5 ? "Active" : "Inactive") : "",
    }
  })
}

const generateSalesData = (): any[] => {
  const products = ["Laptop", "Mouse", "Keyboard", "Monitor", "Headphones", "", "Tablet", "Phone", "Charger"]
  const salespeople = ["Alice Johnson", "Bob Smith", "Carol Davis", "", "David Wilson", "Eve Brown"]
  const regions = ["North", "South", "East", "West", "", "Central"]

  return Array.from({ length: 800 }, (_, i) => {
    let amount = randBetween(50, 2050)
    if (Math.random() < 0.08) amount = -amount
    if (Math.random() < 0.03) amount = 0

    let saleDate = new Date(2023, randBetween(0, 11), randBetween(1, 28))
    if (Math.random() < 0.05) saleDate = new Date(2025, randBetween(0, 11), randBetween(1, 28))

    let quantity = randBetween(1, 10)
    if (Math.random() < 0.04) quantity = 0
    if (Math.random() < 0.02) quantity = -2

    return {
      transaction_id: `TXN${String(i + 1).padStart(5, "0")}`,
      product_name: rand(products),
      quantity,
      unit_price: randBetween(10, 500),
      total_amount: amount,
      sale_date: saleDate.toISOString().split("T")[0],
      salesperson: rand(salespeople),
      region: rand(regions),
      customer_id: `CUST${String(randBetween(1, 500)).padStart(4, "0")}`,
      payment_method: Math.random() > 0.1 ? (Math.random() > 0.5 ? "Credit Card" : "Cash") : "",
    }
  })
}

const generateEmployeeData = (): any[] => {
  const departments = ["Engineering", "Marketing", "Sales", "HR", "Finance", "", "Operations", "Support"]
  const positions = ["Manager", "Senior", "Junior", "Lead", "Director", "", "Analyst", "Specialist"]
  const firstNames = ["Alex", "Jordan", "Taylor", "Casey", "Morgan", "Riley", "", "Avery", "Quinn"]
  const lastNames = ["Anderson", "Thompson", "Martinez", "Robinson", "", "Clark", "Rodriguez", "Lewis"]

  return Array.from({ length: 300 }, (_, i) => {
    const firstName = rand(firstNames)
    const lastName = rand(lastNames)

    let hireDate = new Date(2015 + randBetween(0, 7), randBetween(0, 11), randBetween(1, 28))
    if (Math.random() < 0.03) hireDate = new Date(2025, randBetween(0, 11), randBetween(1, 28))

    let salary = randBetween(30000, 130000)
    if (Math.random() < 0.05) salary = -salary
    if (Math.random() < 0.02) salary = 0
    if (Math.random() < 0.01) salary = 10_000_000

    let age = randBetween(22, 62)
    if (Math.random() < 0.03) age = 16
    if (Math.random() < 0.02) age = 80

    const currentYear = new Date().getFullYear()
    const yearsAtCompany = currentYear - hireDate.getFullYear()
    let totalExperience = yearsAtCompany + randBetween(0, 9)
    if (Math.random() < 0.05) totalExperience = yearsAtCompany - 2

    return {
      employee_id: `EMP${String(i + 1).padStart(4, "0")}`,
      first_name: firstName,
      last_name: lastName,
      email: firstName && lastName ? `${firstName}.${lastName}@company.com`.toLowerCase() : "",
      department: rand(departments),
      position: rand(positions),
      hire_date: hireDate.toISOString().split("T")[0],
      salary,
      age,
      years_experience: totalExperience,
      status: Math.random() > 0.05 ? "Active" : Math.random() > 0.5 ? "Inactive" : "On Leave",
    }
  })
}

const generateStudentData = (): any[] => {
  const majors = ["Computer Science", "Business", "Engineering", "Psychology", "Biology", "", "Mathematics", "Art"]
  const grades = ["A", "B", "C", "D", "F", "", "A+", "B-", "PASS", "FAIL", "85", "92", "INVALID"]
  const firstNames = ["Emma", "Liam", "Olivia", "Noah", "Ava", "William", "", "Sophia", "James", "Isabella"]
  const lastNames = ["Johnson", "Williams", "Brown", "Jones", "Garcia", "", "Miller", "Davis", "Rodriguez"]

  return Array.from({ length: 600 }, (_, i) => {
    const firstName = rand(firstNames)
    const lastName = rand(lastNames)

    let gpa = Math.round(Math.random() * 400) / 100
    if (Math.random() < 0.05) gpa = 5.2
    if (Math.random() < 0.03) gpa = -1.5
    if (Math.random() < 0.02) gpa = null as any

    let enrollmentDate = new Date(2020 + randBetween(0, 3), randBetween(0, 11), randBetween(1, 28))
    if (Math.random() < 0.04) enrollmentDate = new Date(2025, randBetween(0, 11), randBetween(1, 28))

    let graduationDate = new Date(enrollmentDate.getFullYear() + 4, 5, 15)
    if (Math.random() < 0.06) graduationDate = new Date(enrollmentDate.getFullYear() - 1, 5, 15)

    let age = randBetween(18, 27)
    if (Math.random() < 0.03) age = 12
    if (Math.random() < 0.02) age = 65

    return {
      student_id: `STU${String(i + 1).padStart(5, "0")}`,
      first_name: firstName,
      last_name: lastName,
      email: firstName && lastName ? `${firstName}.${lastName}@university.edu`.toLowerCase() : "",
      major: rand(majors),
      gpa,
      enrollment_date: enrollmentDate.toISOString().split("T")[0],
      expected_graduation: graduationDate.toISOString().split("T")[0],
      age,
      credits_completed: randBetween(0, 120),
      current_grade: rand(grades),
      status: Math.random() > 0.08 ? (Math.random() > 0.7 ? "Enrolled" : "Graduated") : "",
    }
  })
}

/* ---------------------------------------------------------------------------
   SAMPLE DATASET DEFINITION ARRAY
-----------------------------------------------------------------------------*/

const sampleDatasets: SampleDataset[] = [
  {
    id: "customers",
    name: "Customer Database",
    description: "Contact details & demographics (great place to start)",
    icon: Users,
    difficulty: "Beginner",
    rowCount: 500,
    headers: [
      "customer_id",
      "first_name",
      "last_name",
      "email",
      "phone",
      "age",
      "city",
      "state",
      "registration_date",
      "status",
    ],
    learningObjectives: [
      "Spot invalid email formats",
      "Fill missing contact info",
      "Check age ranges",
      "Standardise phone numbers",
    ],
    commonIssues: [
      "Invalid email addresses",
      "Missing names",
      "Weird phone formatting",
      "Unrealistic ages",
      "Empty city/state",
    ],
    generateData: generateCustomerData,
  },
  {
    id: "sales",
    name: "Sales Transactions",
    description: "Amounts, dates, regions & products",
    icon: ShoppingCart,
    difficulty: "Intermediate",
    rowCount: 800,
    headers: [
      "transaction_id",
      "product_name",
      "quantity",
      "unit_price",
      "total_amount",
      "sale_date",
      "salesperson",
      "region",
      "customer_id",
      "payment_method",
    ],
    learningObjectives: [
      "Catch negative amounts",
      "Find future-dated sales",
      "Tie quantity to pricing",
      "Handle blanks",
    ],
    commonIssues: ["Negative totals", "Future dates", "Zero quantities", "Missing product names"],
    generateData: generateSalesData,
  },
  {
    id: "employees",
    name: "Employee Records",
    description: "HR salary & hiring data",
    icon: Briefcase,
    difficulty: "Advanced",
    rowCount: 300,
    headers: [
      "employee_id",
      "first_name",
      "last_name",
      "email",
      "department",
      "position",
      "hire_date",
      "salary",
      "age",
      "years_experience",
      "status",
    ],
    learningObjectives: [
      "Validate reasonable salaries",
      "Compare hire date vs experience",
      "Spot age anomalies",
      "Fill missing departments",
    ],
    commonIssues: ["Negative or zero salaries", "Future hire dates", "Experience mismatch", "Missing departments"],
    generateData: generateEmployeeData,
  },
  {
    id: "students",
    name: "Student Academic Records",
    description: "Grades, GPA & enrolment logic",
    icon: GraduationCap,
    difficulty: "Advanced",
    rowCount: 600,
    headers: [
      "student_id",
      "first_name",
      "last_name",
      "email",
      "major",
      "gpa",
      "enrollment_date",
      "expected_graduation",
      "age",
      "credits_completed",
      "current_grade",
      "status",
    ],
    learningObjectives: [
      "Keep GPA between 0 & 4",
      "Check enrol vs graduation order",
      "Normalise grade formats",
      "Flag unusual ages",
    ],
    commonIssues: ["GPA > 4 or < 0", "Grad date before enrol", "Mixed grade formats", "Missing majors"],
    generateData: generateStudentData,
  },
]

/* ---------------------------------------------------------------------------
   ANALYSIS SIMULATION (works offline, no AI required)
-----------------------------------------------------------------------------*/

const simulateAnalysis = (data: any[], headers: string[], datasetId: string): DataAnalysisResult => {
  const totalRows = data.length
  const totalColumns = headers.length

  /* null counts */
  const nullValues: Record<string, number> = {}
  headers.forEach(
    (h) => (nullValues[h] = data.filter((r) => r[h] === "" || r[h] === null || r[h] === undefined).length),
  )

  /* fake dupes */
  const duplicates = Math.floor(totalRows * 0.02)

  /* simple data-type guesses */
  const dataTypes: Record<string, string> = {}
  headers.forEach((h) => {
    if (h.includes("id")) dataTypes[h] = "string"
    else if (h.includes("date")) dataTypes[h] = "date"
    else if (h.includes("email")) dataTypes[h] = "email"
    else if (h.includes("phone")) dataTypes[h] = "phone"
    else if (["age", "salary", "gpa", "quantity", "amount", "price", "credits"].some((t) => h.includes(t)))
      dataTypes[h] = "number"
    else dataTypes[h] = "string"
  })

  /* contextual issues – seeded from dataset definition */
  const dataset = sampleDatasets.find((d) => d.id === datasetId)!
  const contextualIssues: Array<{
    column: string
    row: number
    value: any
    issue: string
    severity: "low" | "medium" | "high"
    suggestion: string
  }> = []

  const issueCount = Math.floor(totalRows * 0.15)
  for (let i = 0; i < issueCount; i++) {
    const row = randBetween(0, totalRows - 1)
    const column = rand(headers)
    contextualIssues.push({
      column,
      row,
      value: data[row]?.[column],
      issue: rand(dataset.commonIssues),
      severity: Math.random() > 0.7 ? "high" : Math.random() > 0.4 ? "medium" : "low",
      suggestion: "Please review & correct this value.",
    })
  }

  /* crude quality score */
  let qualityScore = 100
  const nullPenalty = (Object.values(nullValues).reduce((s, c) => s + c, 0) / (totalRows * totalColumns)) * 30
  const dupPenalty = (duplicates / totalRows) * 20
  const issuePenalty = (issueCount / totalRows) * 25
  qualityScore = Math.max(0, Math.round(qualityScore - nullPenalty - dupPenalty - issuePenalty))

  return {
    totalRows,
    totalColumns,
    nullValues,
    duplicates,
    dataTypes,
    outliers: {},
    statistics: {},
    contextualIssues,
    crossFieldIssues: [],
    qualityScore,
  }
}

/* ---------------------------------------------------------------------------
   MAIN COMPONENT
-----------------------------------------------------------------------------*/

export function SampleDataGenerator({ onSampleDataGenerated }: SampleDataGeneratorProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  const { toast } = useToast()

  const selectedDataset = sampleDatasets.find((d) => d.id === selectedId)

  /* kick off generation */
  const handleGenerate = async () => {
    if (!selectedDataset) {
      toast({ title: "Choose a dataset first", variant: "destructive" })
      return
    }

    setIsGenerating(true)
    try {
      /* generate rows */
      const data = selectedDataset.generateData()

      /* create CSV text (simple, no quotes) */
      const csvLines = [
        selectedDataset.headers.join(","),
        ...data.map((row) =>
          selectedDataset.headers
            .map((h) => {
              const val = row[h] ?? ""
              return typeof val === "string" ? `"${val.replace(/"/g, '""')}"` : val
            })
            .join(","),
        ),
      ]
      const csvBlob = new Blob([csvLines.join("\n")], { type: "text/csv" })

      /* fake analysis */
      const analysis = simulateAnalysis(data, selectedDataset.headers, selectedDataset.id)

      /* build FileData object expected by parent page */
      const file: FileData = {
        id: `${selectedDataset.id}-${Date.now()}`,
        name: `${selectedDataset.name}.csv`,
        blob: csvBlob as any, // parent likely casts/uses
        rawRows: data,
        headers: selectedDataset.headers,
        analysis,
      }

      onSampleDataGenerated(file)
      toast({ title: "Sample data ready!", description: "Check the analysis panel." })
    } catch (err) {
      console.error(err)
      toast({
        title: "Generation failed",
        description: "Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
    }
  }

  /* -----------------------------------------------------------------------
     RENDER
  -----------------------------------------------------------------------*/
  return (
    <section className="space-y-6">
      <h2 className="text-xl font-semibold">Practice with Sample Data</h2>
      <p className="text-muted-foreground">
        Pick a dataset and generate it instantly. Each set hides common data quality problems so you can test the
        validator. All descriptions are plain-English&mdash;no technical jargon!
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {sampleDatasets.map((ds) => {
          const Icon = ds.icon
          const isActive = ds.id === selectedId
          return (
            <Card
              key={ds.id}
              onClick={() => setSelectedId(ds.id)}
              className={`cursor-pointer transition border-2 ${
                isActive ? "border-foreground ring-2 ring-foreground/30" : "border-transparent hover:border-muted"
              }`}
            >
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Icon className="h-6 w-6 text-primary" />
                  <CardTitle className="text-base">{ds.name}</CardTitle>
                </div>
                <CardDescription className="mt-1 text-sm leading-relaxed">{ds.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <p>
                  <strong>Rows:</strong> {ds.rowCount}
                </p>
                <p>
                  <strong>Level:</strong> {ds.difficulty}
                </p>
              </CardContent>
              <CardFooter>
                {isActive ? (
                  <span className="text-sm font-medium text-primary">Selected</span>
                ) : (
                  <span className="text-sm text-muted-foreground">Click to choose</span>
                )}
              </CardFooter>
            </Card>
          )
        })}
      </div>

      <Separator />

      <div className="flex items-center gap-3">
        <Button onClick={handleGenerate} disabled={isGenerating || !selectedId}>
          {isGenerating ? (
            <>
              <RefreshCcw className="mr-2 h-4 w-4 animate-spin" />
              Generating…
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Generate Dataset
            </>
          )}
        </Button>
        {!selectedId && <p className="text-sm text-muted-foreground">Select a dataset card first.</p>}
      </div>

      {isGenerating && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-6">
          {Array.from({ length: 3 }).map((_, idx) => (
            <Skeleton key={idx} className="h-24 w-full" />
          ))}
        </div>
      )}
    </section>
  )
}
