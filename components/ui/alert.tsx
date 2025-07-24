"use client"

import { useState, useCallback, useEffect } from "react"
import type { FileData } from "@/app/page"
import { groq } from "@ai-sdk/groq"
import { generateText } from "ai"
import { toast } from "sonner"

/**
 * Props for the AI Data Assistant component
 */
interface AiDataAssistantProps {
  file: FileData
  onFileUpdate: (file: FileData) => void
}

/**
 * Structure for AI-generated cleaning recommendations
 */
interface CleaningRecommendation {
  id: string
  title: string
  description: string
  userFriendlyExplanation: string
  impact: "low" | "medium" | "high"
  confidence: number
  affectedRows: number
  code: {
    python: string
    sql: string
  }
  preview: string
  category: "missing_data" | "duplicates" | "outliers" | "formatting" | "validation"
  businessImpact: string
  stepByStepGuide: string[]
  estimatedTimeToFix: string
  difficulty: "easy" | "medium" | "hard"
}

/**
 * Structure for AI business insights
 */
interface BusinessInsight {
  id: string
  title: string
  description: string
  userFriendlyExplanation: string
  impact: string
  recommendation: string
  priority: "low" | "medium" | "high" | "critical"
  metrics?: {
    before: number
    after: number
    improvement: number
  }
  actionItems: string[]
  timeline: string
  costBenefit: string
}

/**
 * Comprehensive Local Knowledge Base for offline functionality
 */
const LOCAL_KNOWLEDGE_BASE = {
  dataQualityRules: {
    missing_data: {
      title: "Missing Data",
      explanation:
        "Missing data means some cells in your spreadsheet are empty or contain no information. Think of it like having blank spaces in a form - you can't make complete decisions without all the information.",
      businessImpact:
        "Missing data can lead to incomplete analysis and wrong business decisions. For example, if customer ages are missing, you can't properly target marketing campaigns.",
      commonCauses: [
        "People skipped fields when filling out forms",
        "Computer systems had errors during data collection",
        "Optional fields that users didn't complete",
        "Problems when combining data from different sources",
        "Equipment failures or network issues during data transfer",
      ],
      solutions: [
        "Fill with average values for numbers (like using average age if someone's age is missing)",
        "Use 'Unknown' or 'Not Specified' for text fields",
        "Remove entire rows if too much information is missing",
        "Go back to original sources to collect missing information",
        "Use statistical methods to predict missing values based on other data",
      ],
      preventionTips: [
        "Make important fields required in online forms",
        "Add validation rules that check data as it's entered",
        "Train staff on proper data entry procedures",
        "Set up regular automated data quality checks",
        "Create backup systems for data collection",
      ],
      businessExamples: [
        "E-commerce: Missing customer addresses prevent order delivery",
        "Healthcare: Missing patient information can affect treatment decisions",
        "Finance: Missing transaction details can cause audit problems",
        "Marketing: Missing contact info means you can't reach customers",
      ],
    },
    duplicates: {
      title: "Duplicate Records",
      explanation:
        "Duplicate records are like having the same person's information written down twice in your address book. They're identical or very similar rows that appear multiple times in your data.",
      businessImpact:
        "Duplicates can inflate your numbers, making you think you have more customers than you actually do. They also waste storage space and can cause confusion in reports.",
      commonCauses: [
        "The same information was entered multiple times by mistake",
        "Computer glitches during data import created copies",
        "Data from different sources was merged without checking for duplicates",
        "No unique ID numbers to identify each record",
        "Multiple people entering the same customer information",
      ],
      solutions: [
        "Remove exact duplicates automatically (keep one copy, delete the rest)",
        "Merge similar records that have slight differences (like 'John Smith' and 'J. Smith')",
        "Keep the most recent or most complete version of duplicate records",
        "Create unique ID numbers for each record to prevent future duplicates",
        "Use 'fuzzy matching' to find records that are almost identical",
      ],
      preventionTips: [
        "Use unique ID numbers (like customer IDs) for each record",
        "Set up duplicate checking before saving new records",
        "Schedule regular database cleanup and maintenance",
        "Train staff on proper data entry procedures",
        "Implement 'merge' features instead of creating new records",
      ],
      businessExamples: [
        "Customer database: Same customer appears multiple times, inflating customer count",
        "Inventory: Same product listed twice, causing stock count errors",
        "Employee records: Same person in system multiple times, payroll confusion",
        "Sales data: Same transaction recorded twice, inflated revenue numbers",
      ],
    },
    outliers: {
      title: "Unusual Values (Outliers)",
      explanation:
        "Outliers are like finding a 200-year-old person in your customer database - values that are much higher or lower than what you'd normally expect. They stand out from the crowd.",
      businessImpact:
        "Outliers can indicate data entry errors, fraud, or genuinely special cases that need attention. They can also skew your analysis and make averages misleading.",
      commonCauses: [
        "Data entry mistakes (like typing an extra zero: $1000 becomes $10000)",
        "Using wrong units (entering feet instead of inches)",
        "System errors or data corruption during transfer",
        "Genuine exceptional cases (like a very large order or very old customer)",
        "Different measurement standards from various data sources",
      ],
      solutions: [
        "Verify unusual values by checking with original sources",
        "Correct obvious errors (like removing extra zeros)",
        "Keep genuine outliers but flag them for special attention",
        "Use statistical methods to automatically identify unusual values",
        "Set reasonable limits for data entry to prevent extreme values",
      ],
      preventionTips: [
        "Set minimum and maximum limits in data entry forms",
        "Add validation rules that flag unusual values for review",
        "Train staff to double-check extreme values before saving",
        "Implement automated outlier detection systems",
        "Create alerts for values outside normal ranges",
      ],
      businessExamples: [
        "Sales: $1,000,000 order when typical orders are $100 (could be error or major client)",
        "Age: 150-year-old customer (likely data entry error)",
        "Inventory: -500 items in stock (system error, can't have negative inventory)",
        "Website: 50,000 page views from one user (could be bot or system error)",
      ],
    },
    formatting: {
      title: "Inconsistent Formatting",
      explanation:
        "Formatting issues are like having some addresses written as '123 Main St' and others as '123 MAIN STREET' - the same information written in different ways, making it hard to work with.",
      businessImpact:
        "Poor formatting makes data hard to analyze and can cause errors in reports. It's like trying to organize a filing cabinet where everyone uses different filing systems.",
      commonCauses: [
        "Different people entering data in their own style",
        "Importing data from various sources with different formats",
        "No standardized guidelines for data entry",
        "Manual data entry without format validation",
        "Legacy systems with different formatting rules",
      ],
      solutions: [
        "Standardize date formats (always use MM/DD/YYYY or DD/MM/YYYY)",
        "Make text case consistent (Title Case, UPPERCASE, or lowercase)",
        "Remove extra spaces and special characters",
        "Use standard abbreviations and codes consistently",
        "Convert all similar data to the same format",
      ],
      preventionTips: [
        "Create clear data entry guidelines and share them with your team",
        "Use dropdown menus instead of free text when possible",
        "Implement format validation rules in data entry systems",
        "Provide regular training on data quality standards",
        "Use templates and standardized forms for data collection",
      ],
      businessExamples: [
        "Phone numbers: Some as (555) 123-4567, others as 555.123.4567 or 5551234567",
        "Dates: Some as 01/15/2024, others as January 15, 2024 or 15-Jan-24",
        "Names: Some as 'JOHN SMITH', others as 'john smith' or 'John Smith'",
        "Addresses: Inconsistent abbreviations like 'St' vs 'Street' vs 'ST'",
      ],
    },
    validation: {
      title: "Invalid Data",
      explanation:
        "Invalid data is information that doesn't make sense or follow expected rules - like having a birth date in the future or an email address without an @ symbol.",
      businessImpact:
        "Invalid data leads to wrong conclusions and poor business decisions. It's like trying to navigate with a broken compass - you'll end up going in the wrong direction.",
      commonCauses: [
        "Human errors during manual data entry",
        "System bugs or integration problems between different software",
        "Outdated information that's no longer accurate",
        "Lack of validation rules to check data as it's entered",
        "Data corruption during transfer or storage",
      ],
      solutions: [
        "Check that dates make logical sense (birth dates not in future, end dates after start dates)",
        "Verify email addresses have proper format (contain @ symbol and valid domain)",
        "Ensure phone numbers have the correct number of digits for your country",
        "Validate that numbers are within reasonable ranges for their purpose",
        "Cross-check related fields for consistency",
      ],
      preventionTips: [
        "Add validation rules to all data entry forms",
        "Conduct regular data quality audits and reviews",
        "Train staff on data accuracy and validation importance",
        "Implement automated validation checks in your systems",
        "Create data quality dashboards to monitor issues in real-time",
      ],
      businessExamples: [
        "Email: 'john.smith.com' (missing @ symbol, can't send emails)",
        "Date: Birth date of 01/01/2030 (future date, impossible)",
        "Phone: '123' (too short, can't contact customer)",
        "Price: -$50 (negative price, doesn't make business sense)",
      ],
    },
  },

  businessTerms: {
    data_quality: {
      term: "Data Quality",
      definition:
        "How accurate, complete, and reliable your data is for making business decisions. Think of it like the quality of ingredients when cooking - better ingredients lead to better results.",
      importance:
        "Good data quality leads to better insights, smarter business choices, and more confident decision-making.",
      measuredBy: [
        "Accuracy (how correct the data is)",
        "Completeness (how much data is missing)",
        "Consistency (how uniform the formatting is)",
        "Timeliness (how up-to-date the data is)",
      ],
    },
    data_cleaning: {
      term: "Data Cleaning",
      definition:
        "The process of fixing errors, removing duplicates, and standardizing your data. It's like organizing and cleaning your workspace to be more productive.",
      importance: "Clean data gives you confidence in your analysis and reports, leading to better business decisions.",
      steps: ["Identify problems", "Fix errors", "Remove duplicates", "Standardize formats", "Validate results"],
    },
    validation: {
      term: "Data Validation",
      definition:
        "Checking that your data follows the rules and makes sense. Like proofreading a document before sending it to your boss.",
      importance: "Validation catches errors early before they affect your business decisions and reports.",
      types: [
        "Format validation (correct email format)",
        "Range validation (reasonable ages)",
        "Logic validation (end date after start date)",
      ],
    },
    outlier: {
      term: "Outlier",
      definition:
        "A data point that is very different from the rest of your data. Like finding a luxury car in a parking lot full of economy cars.",
      importance:
        "Outliers can indicate errors, fraud, or special situations that need attention. They can also skew your analysis if not handled properly.",
      examples: [
        "Unusually large sale amount",
        "Customer much older than typical",
        "Website visitor from unexpected location",
      ],
    },
    duplicate: {
      term: "Duplicate Record",
      definition:
        "The same information appearing multiple times in your database. Like having the same contact saved twice in your phone.",
      importance: "Duplicates can inflate numbers, waste storage space, and cause confusion in analysis and reporting.",
      causes: ["Multiple data entry", "System errors", "Data merging issues"],
    },
  },

  bestPractices: [
    {
      title: "Regular Data Health Checks",
      description:
        "Schedule monthly or quarterly reviews of your data quality to catch issues before they become big problems.",
      benefits: [
        "Prevents small problems from becoming expensive disasters",
        "Maintains trust and confidence in your data",
        "Saves time and money in the long run",
        "Helps you spot trends and patterns in data quality",
      ],
      howTo: [
        "Set up automated data quality reports",
        "Review key metrics monthly",
        "Create alerts for unusual data patterns",
        "Document and track improvements over time",
      ],
      timeInvestment: "2-4 hours per month",
      roi: "Prevents costly mistakes and improves decision quality",
    },
    {
      title: "Standardize Data Entry Processes",
      description: "Create clear, consistent guidelines for how data should be entered into your systems.",
      benefits: [
        "Reduces errors and inconsistencies significantly",
        "Makes data much easier to analyze and report on",
        "Improves team efficiency and reduces training time",
        "Creates a professional, organized data environment",
      ],
      howTo: [
        "Write clear data entry guidelines",
        "Create templates and examples",
        "Use dropdown menus instead of free text",
        "Implement validation rules in forms",
      ],
      timeInvestment: "1-2 weeks initial setup",
      roi: "Dramatically reduces data quality issues going forward",
    },
    {
      title: "Train Your Team on Data Quality",
      description: "Educate all staff members on the importance of data quality and proper procedures.",
      benefits: [
        "Fewer data entry errors from the start",
        "Better understanding of why data quality matters",
        "Improved data culture throughout the organization",
        "More proactive identification and reporting of issues",
      ],
      howTo: [
        "Conduct regular training sessions",
        "Share real examples of data quality impact",
        "Create easy-to-follow reference guides",
        "Recognize and reward good data practices",
      ],
      timeInvestment: "2-3 hours per quarter per person",
      roi: "Prevents errors and builds data-conscious culture",
    },
    {
      title: "Use Technology to Prevent Errors",
      description:
        "Implement validation rules, dropdown menus, and automated checks to catch errors before they enter your system.",
      benefits: [
        "Prevents errors at the source, not after they've caused problems",
        "Saves significant time on manual data checking and correction",
        "Ensures consistency across all data entry points",
        "Provides immediate feedback to users about data issues",
      ],
      howTo: [
        "Add validation rules to all forms",
        "Use dropdown menus for standardized options",
        "Implement real-time error checking",
        "Set up automated data quality monitoring",
      ],
      timeInvestment: "1-3 weeks depending on system complexity",
      roi: "Massive reduction in data quality issues and correction time",
    },
  ],

  industrySpecificGuidance: {
    retail: {
      commonIssues: [
        "Product name inconsistencies",
        "Price formatting",
        "Inventory count errors",
        "Customer duplicate records",
      ],
      priorities: ["Product data accuracy", "Customer information completeness", "Sales data validation"],
      specificTips: [
        "Standardize product naming conventions",
        "Validate price ranges",
        "Regular inventory reconciliation",
      ],
    },
    healthcare: {
      commonIssues: [
        "Patient information accuracy",
        "Date formatting",
        "Medical code validation",
        "Insurance information",
      ],
      priorities: ["Patient safety through data accuracy", "Compliance with regulations", "Complete medical histories"],
      specificTips: ["Double-check patient identifiers", "Validate medical codes", "Ensure date consistency"],
    },
    finance: {
      commonIssues: [
        "Transaction amount accuracy",
        "Account number validation",
        "Date consistency",
        "Currency formatting",
      ],
      priorities: ["Transaction accuracy", "Regulatory compliance", "Audit trail completeness"],
      specificTips: ["Implement amount validation", "Standardize date formats", "Regular reconciliation processes"],
    },
    education: {
      commonIssues: [
        "Student information accuracy",
        "Grade data validation",
        "Enrollment status",
        "Contact information",
      ],
      priorities: ["Student record accuracy", "Academic data integrity", "Communication capability"],
      specificTips: ["Validate student IDs", "Check grade ranges", "Maintain current contact information"],
    },
  },

  quickFixes: {
    remove_extra_spaces: {
      title: "Remove Extra Spaces",
      description: "Clean up text by removing extra spaces at the beginning, end, or between words",
      difficulty: "easy",
      timeEstimate: "5 minutes",
      businessImpact: "Improves data consistency and search functionality",
    },
    standardize_case: {
      title: "Standardize Text Case",
      description: "Make all text consistently formatted (Title Case, UPPERCASE, or lowercase)",
      difficulty: "easy",
      timeEstimate: "10 minutes",
      businessImpact: "Improves data appearance and reduces duplicate detection issues",
    },
    fill_missing_with_unknown: {
      title: "Fill Missing Text with 'Unknown'",
      description: "Replace empty text fields with a standard 'Unknown' or 'Not Specified' value",
      difficulty: "easy",
      timeEstimate: "5 minutes",
      businessImpact: "Eliminates blank fields and improves report completeness",
    },
    remove_exact_duplicates: {
      title: "Remove Exact Duplicates",
      description: "Find and remove rows that are completely identical",
      difficulty: "medium",
      timeEstimate: "15 minutes",
      businessImpact: "Reduces data storage and improves accuracy of counts and analysis",
    },
  },

  faqResponses: {
    what_is_data_quality:
      "Data quality is like the cleanliness and organization of your workspace. Just as a clean, organized desk helps you work more efficiently and find things quickly, high-quality data helps you make better business decisions and get accurate insights. It means your data is accurate (correct), complete (not missing important information), consistent (formatted the same way), and up-to-date (current and relevant).",

    why_does_data_quality_matter:
      "Data quality directly impacts your business success. Poor quality data leads to wrong decisions, wasted money, missed opportunities, and lost customers. For example, if customer addresses are wrong, you can't deliver products. If sales data has errors, you might make poor inventory decisions. Good data quality gives you confidence in your analysis and helps you make smart business choices.",

    how_long_does_cleaning_take:
      "Data cleaning time depends on your data size and quality. For small datasets (under 1,000 rows), basic cleaning might take 30 minutes to 2 hours. Larger datasets or those with many issues could take several days. However, the time invested in cleaning pays off through better decision-making and fewer problems later.",

    what_should_i_fix_first:
      "Start with issues that have the biggest business impact: 1) Missing critical information (like customer contact details), 2) Obvious errors (like negative prices or future birth dates), 3) Duplicates that inflate your numbers, 4) Formatting issues that prevent analysis. Focus on data you use most frequently for important decisions.",

    how_do_i_prevent_future_problems:
      "Prevention is much easier than fixing problems later. Set up validation rules in your data entry systems, train your team on proper data entry, use dropdown menus instead of free text when possible, and schedule regular data quality checks. Think of it like maintaining your car - regular maintenance prevents expensive repairs.",

    what_if_i_delete_important_data:
      "Always make a backup copy of your original data before making any changes. Most data cleaning tools allow you to preview changes before applying them. Start with small, safe changes and gradually work up to more complex fixes. When in doubt, flag questionable data for review rather than deleting it immediately.",
  },
}

/**
 * AI Data Assistant Component with Comprehensive Local Knowledge Base
 */
export function AiDataAssistant({ file, onFileUpdate }: AiDataAssistantProps) {
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisProgress, setAnalysisProgress] = useState(0)
  const [cleaningRecommendations, setCleaningRecommendations] = useState<CleaningRecommendation[]>([])
  const [businessInsights, setBusinessInsights] = useState<BusinessInsight[]>([])
  const [selectedRecommendations, setSelectedRecommendations] = useState<Set<string>>(new Set())
  const [customPrompt, setCustomPrompt] = useState("")
  const [customAnalysis, setCustomAnalysis] = useState("")
  const [isCustomAnalyzing, setIsCustomAnalyzing] = useState(false)
  const [activeTab, setActiveTab] = useState("recommendations")
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [useLocalKnowledge, setUseLocalKnowledge] = useState(false)
  const [selectedIndustry, setSelectedIndustry] = useState<string>("")

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  // ============================================================================
  // LOCAL KNOWLEDGE BASE FUNCTIONS
  // ============================================================================

  /**
   * Generate recommendations using comprehensive local knowledge base
   */
  const generateLocalRecommendations = useCallback((dataSummary: any): CleaningRecommendation[] => {
    const recommendations: CleaningRecommendation[] = []

    // Check for missing data
    const totalNulls = Object.values(dataSummary.nullValues).reduce((sum: number, count: any) => sum + count, 0)
    if (totalNulls > 0) {
      const knowledge = LOCAL_KNOWLEDGE_BASE.dataQualityRules.missing_data
      const nullPercentage = Math.round((totalNulls / (dataSummary.totalRows * dataSummary.totalColumns)) * 100)
      
      recommendations.push({
        id: "local_missing_data",
        title: "Fix Missing Information",
        description: "Your data has empty cells that need attention.",
        userFriendlyExplanation: `${knowledge.explanation} In your file, ${totalNulls} cells are empty (${nullPercentage}% of your data). This is like having ${nullPercentage}% of a puzzle missing - you can't see the complete picture.`,
        impact: totalNulls > dataSummary.totalRows * 0.1 ? "high" : totalNulls > dataSummary.totalRows * 0.05 ? "medium" : "low",
        confidence: 0.95,
        affectedRows: totalNulls,
        category: "missing_data",
        businessImpact: knowledge.businessImpact,
        stepByStepGuide: [
          "1. Look at which columns have the most missing data - these are your priorities",
          "2. Decide for each column: Should you fill the blanks or remove incomplete rows?",
          "3. For number columns (like age, price), consider using the average value",
          "4. For text columns (like names, categories), use 'Unknown' or 'Not Specified'",
          "5. For critical business data, try to collect the missing information from original sources",
          "6. Document your decisions so your team knows what you did and why"
        ],
        estimatedTimeToFix: totalNulls < 100 ? "15-30 minutes" : totalNulls < 1000 ? "1-2 hours" : "Half day",
        difficulty: "easy",
        code: {
          python: `# Fill missing values with appropriate defaults
import pandas as pd

# For numeric columns, fill with median (middle value)
numeric_columns = df.select_dtypes(include=['number']).columns
df[numeric_columns] = df[numeric_columns].fillna(df[numeric_columns].median())

# For text columns, fill with 'Unknown'
text_columns = df.select_dtypes(include=['object']).columns
df[text_columns] = df[text_columns].fillna('Unknown')

print(f"Filled {totalNulls} missing values")`,
          sql: `-- Fill missing numeric values with median
UPDATE your_table 
SET numeric_column = (
  SELECT PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY numeric_column) 
  FROM your_table 
  WHERE numeric_column IS NOT NULL
)
WHERE numeric_column IS NULL;

-- Fill missing text values
UPDATE your_table 
SET text_column = 'Unknown' 
WHERE text_column IS NULL OR text_column = '';`
        },
        preview: `Will fill ${totalNulls} empty cells with appropriate default values, making your data complete and ready for analysis`
      })
    }

    // Check for duplicates
    if (dataSummary.duplicates > 0) {
      const knowledge = LOCAL_KNOWLEDGE_BASE.dataQualityRules.duplicates
      const duplicatePercentage = Math.round((dataSummary.duplicates / dataSummary.totalRows) * 100)
      
      recommendations.push({
        id: "local_duplicates",
        title: "Remove Duplicate Records",
        description: "Your data contains identical or very similar records.",
        userFriendlyExplanation: `${knowledge.explanation} Your file has ${dataSummary.duplicates} duplicate records (${duplicatePercentage}% of your data). This is like having ${duplicatePercentage}% of your customer list repeated - it makes your numbers look bigger than they really are.`,
        impact: dataSummary.duplicates > dataSummary.totalRows * 0.05 ? "high" : "medium",
        confidence: 0.9,
        affectedRows: dataSummary.duplicates,
        category: "duplicates",
        businessImpact: knowledge.businessImpact,
        stepByStepGuide: [
          "1. First, make a backup copy of your data - always do this before removing anything",
          "2. Look at a few duplicate records to understand if they're truly identical",
          "3. Decide which version to keep: usually the most recent or most complete one",
          "4. Remove the duplicate copies, keeping only one version of each record",
          "5. Check your results to make sure you didn't accidentally remove important data",
          "6. Set up processes to prevent duplicates in the future"
        ],
        estimatedTimeToFix: dataSummary.duplicates < 50 ? "10-20 minutes" : dataSummary.duplicates < 500 ? "30-60 minutes" : "2-3 hours",
        difficulty: "medium",
        code: {
          python: `# Remove duplicate rows safely
import pandas as pd

# Show duplicates before removing them
print(f"Found {df.duplicated().sum()} duplicate rows")
print("Sample duplicates:")
print(df[df.duplicated()].head())

# Remove exact duplicates, keeping the first occurrence
df_cleaned = df.drop_duplicates()

print(f"Removed {len(df) - len(df_cleaned)} duplicate rows")
print(f"Your data now has {len(df_cleaned)} unique records")`,
          sql: `-- Safely remove duplicates using ROW_NUMBER()
WITH numbered_rows AS (
  SELECT *, 
    ROW_NUMBER() OVER (
      PARTITION BY column1, column2, column3 
      ORDER BY date_column DESC
    ) as row_num
  FROM your_table
)
-- First, see what will be deleted
SELECT COUNT(*) as duplicates_to_remove
FROM numbered_rows 
WHERE row_num > 1;

-- Then delete the duplicates
DELETE FROM your_table 
WHERE id IN (
  SELECT id FROM numbered_rows WHERE row_num > 1
);`
        },
        preview: `Will remove ${dataSummary.duplicates} duplicate records, giving you accurate counts and cleaner data`
      })
    }

    // Check for formatting issues
    const hasFormattingIssues = dataSummary.contextualIssues?.some(
      (issue: any) => issue.issue.toLowerCase().includes("format") || 
                     issue.issue.toLowerCase().includes("inconsistent") ||
                     issue.issue.toLowerCase().includes("case")
    )

    if (hasFormattingIssues || dataSummary.headers.some((h: string) => 
      dataSummary.sampleData.some((row: any) => 
        typeof row[h] === 'string' && (
          row[h]?.includes('  ') || // multiple spaces
          row[h] !== row[h]?.trim() || // leading/trailing spaces
          /[A-Z]/.test(row[h]) && /[a-z]/.test(row[h]) // mixed case
        )
      )
    )) {
      const knowledge = LOCAL_KNOWLEDGE_BASE.dataQualityRules.formatting
      
      recommendations.push({
        id: "local_formatting",
        title: "Standardize Data Formatting",
        description: "Your data has inconsistent formatting that should be standardized.",
        userFriendlyExplanation: `${knowledge.explanation} This makes your data harder to work with and can cause errors in analysis. It's like having a filing cabinet where some files are labeled 'Smith, John' and others 'JOHN SMITH' - you might miss important information when searching.`,
        impact: "medium",
        confidence: 0.85,
        affectedRows: dataSummary.contextualIssues?.length || Math.floor(dataSummary.totalRows * 0.3),
        category: "formatting",
        businessImpact: knowledge.businessImpact,
        stepByStepGuide: [
          "1. Identify which columns have formatting problems (look for mixed cases, extra spaces, inconsistent abbreviations)",
          "2. Choose a standard format for each type of data (like 'Title Case' for names, 'lowercase' for emails)",
          "3. Clean up extra spaces at the beginning and end of text",
          "4. Make text case consistent throughout each column",
          "5. Standardize abbreviations (decide on 'St' or 'Street', stick with one)",
          "6. Create formatting guidelines for future data entry"
        ],
        estimatedTimeToFix: "20-45 minutes",
        difficulty: "easy",
        code: {
          python: `# Standardize text formatting
import pandas as pd

# Remove extra whitespace from all text columns
text_columns = df.select_dtypes(include=['object']).columns
for col in text_columns:
    df[col] = df[col].astype(str).str.strip()

# Standardize specific formatting
df['name'] = df['name'].str.title()  # Title Case for names
df['email'] = df['email'].str.lower()  # lowercase for emails
df['city'] = df['city'].str.title()   # Title Case for cities

# Remove multiple spaces between words
for col in text_columns:
    df[col] = df[col].str.replace(r'\\s+', ' ', regex=True)

print("Formatting standardized across all text fields")`,
          sql: `-- Standardize formatting in SQL
UPDATE your_table 
SET 
  name = TRIM(INITCAP(name)),           -- Title Case, remove spaces
  email = TRIM(LOWER(email)),           -- lowercase emails
  city = TRIM(INITCAP(city)),           -- Title Case cities
  phone = REGEXP_REPLACE(phone, '[^0-9]', '', 'g'); -- numbers only

-- Remove multiple spaces
UPDATE your_table 
SET text_column = REGEXP_REPLACE(text_column, '\\s+', ' ', 'g')
WHERE text_column IS NOT NULL;`
        },
        preview: "Will standardize formatting across all text fields, making your data consistent and professional-looking"
      })
    }

    // Check for validation issues
    const hasValidationIssues = dataSummary.contextualIssues?.some(
      (issue: any) => issue.issue.toLowerCase().includes("invalid") || 
                     issue.issue.toLowerCase().includes("error") ||
                     issue.issue.toLowerCase().includes("wrong")
    )

    if (hasValidationIssues) {
      const knowledge = LOCAL_KNOWLEDGE_BASE.dataQualityRules.validation
      
      recommendations.push({
        id: "local_validation",
        title: "Fix Invalid Data",
        description: "Your data contains values that don't make sense or follow expected rules.",
        userFriendlyExplanation: `${knowledge.explanation} This is like having directions that tell you to turn left on a one-way street going right - the information doesn't make sense and will lead you astray.`,
        impact: "high",
        confidence: 0.9,
        affectedRows: dataSummary.contextualIssues?.length || 0,
        category: "validation",
        businessImpact: knowledge.businessImpact,
        stepByStepGuide: [
          "1. Review the specific validation errors identified in your data",
          "2. Check dates to make sure they're logical (birth dates not in future, end dates after start dates)",
          "3. Verify email addresses have @ symbols and proper domain names",
          "4. Ensure phone numbers have the right number of digits",
          "5. Check that numbers are within reasonable ranges for their purpose",
          "6. Cross-check related fields to make sure they're consistent with each other"
        ],
        estimatedTimeToFix: "30-90 minutes",
        difficulty: "medium",
        code: {
          python: `# Fix common validation issues
import pandas as pd
from datetime import datetime

# Fix email addresses (must contain @)
invalid_emails = df[~df['email'].str.contains('@', na=False)]
print(f"Found {len(invalid_emails)} invalid email addresses")
df.loc[~df['email'].str.contains('@', na=False), 'email'] = 'invalid@example.com'

# Fix future birth dates
today = datetime.now()
future_births = df[pd.to_datetime(df['birth_date'], errors='coerce') > today]
print(f"Found {len(future_births)} future birth dates")
df.loc[pd.to_datetime(df['birth_date'], errors='coerce') > today, 'birth_date'] = None

# Fix negative prices
negative_prices = df[df['price'] < 0]
print(f"Found {len(negative_prices)} negative prices")
df.loc[df['price'] < 0, 'price'] = abs(df.loc[df['price'] < 0, 'price'])

print("Validation issues fixed")`,
          sql: `-- Fix common validation issues
-- Fix invalid email addresses
UPDATE your_table 
SET email = 'invalid@example.com' 
WHERE email NOT LIKE '%@%' OR email IS NULL;

-- Fix future birth dates
UPDATE your_table 
SET birth_date = NULL 
WHERE birth_date > CURRENT_DATE;

-- Fix negative prices
UPDATE your_table 
SET price = ABS(price) 
WHERE price < 0;

-- Fix phone numbers (keep only digits)
UPDATE your_table 
SET phone = REGEXP_REPLACE(phone, '[^0-9]', '', 'g')
WHERE LENGTH(REGEXP_REPLACE(phone, '[^0-9]', '', 'g')) BETWEEN 10 AND 15;`
        },
        preview: "Will fix invalid data entries, making your data logically consistent and reliable for analysis"
      })
    }

    return recommendations
  }, [])

  /**
   * Generate business insights using local knowledge
   */
  const generateLocalInsights = useCallback((dataSummary: any): BusinessInsight[] => {
    const insights: BusinessInsight[] = []

    // Data quality insight
    const qualityScore = dataSummary.qualityScore || 0
    let qualityLevel = "Poor"
    let priority: "low" | "medium" | "high" | "critical" = "critical"
    let timeline = "Immediate action needed"
    let costBenefit = "High cost of poor decisions vs. low cost of data cleaning"

    if (qualityScore >= 90) {
      qualityLevel = "Excellent"
      priority = "low"
      timeline = "Maintain current standards"
      costBenefit = "Continue current practices to maintain competitive advantage"
    } else if (qualityScore >= 70) {
      qualityLevel = "Good"
      priority = "medium"
      timeline = "Improve over next 2-4 weeks"
      costBenefit = "Moderate investment for significant improvement in decision quality"
    } else if (qualityScore >= 50) {
      qualityLevel = "Fair"
      priority = "high"
      timeline = "Address within 1-2 weeks"
      costBenefit = "Essential investment to prevent costly mistakes"
    }

    insights.push({
      id: "local_quality_insight",
      title: `Data Quality Health Check: ${qualityLevel} (${qualityScore}%)`,
      description: `Your overall data quality score is ${qualityScore}%, indicating ${qualityLevel.toLowerCase()} data quality.`,
      userFriendlyExplanation: `Think of data quality like your credit score - it tells you how trustworthy your data is for making important decisions. A score of ${qualityScore}% means your data is ${qualityLevel.toLowerCase()}. ${qualityScore >= 70 ? "This gives you good confidence in making business decisions based on your data." : "This means you should be cautious about making important decisions based on this data until you improve its quality."}`,
      impact: qualityScore >= 70 
        ? "Your analysis and reports should be reliable, giving you confidence in business decisions"
        : "Poor data quality increases the risk of wrong business decisions, wasted resources, and missed opportunities",
      recommendation: qualityScore >= 70
        ? "Maintain current data quality standards and continue monitoring"
        : "Immediate action needed to improve data quality before making important business decisions",
      priority,
      timeline,
      costBenefit,
      actionItems: qualityScore >= 70 ? [
        "Continue regular data quality monitoring",
        "Document current best practices for your team",
        "Train new team members on your data standards",
        "Set up automated alerts for quality drops"
      ] : [
        "Address missing data and duplicates immediately",
        "Implement data validation rules in your systems",
        "Create clear data entry guidelines for your team",
        "Schedule weekly data quality reviews until improvement",
        "Consider data cleaning tools or professional help"
      ]
    })

    // Missing data insight
    const totalNulls = Object.values(dataSummary.nullValues).reduce((sum: number, count: any) => sum + count, 0)
    const nullPercentage = Math.round((totalNulls / (dataSummary.totalRows * dataSummary.totalColumns)) * 100)

    if (nullPercentage > 5) {
      insights.push({
        id: "local_missing_insight",
        title: `Missing Data Impact: ${nullPercentage}% of Your Data is Incomplete`,
        description: `${nullPercentage}% of your data is missing, which significantly impacts business decision reliability.`,
        userFriendlyExplanation: `Imagine trying to complete a jigsaw puzzle with ${nullPercentage}% of the pieces missing - you can't see the full picture. That's what missing data does to your business analysis. With ${nullPercentage}% missing data, you're making decisions with incomplete information, which increases the risk of poor outcomes.`,
        impact: nullPercentage > 20 
          ? "Critical impact: Analysis is unreliable, decisions may be seriously flawed"
          : nullPercentage > 10
            ? "High impact: Significant gaps in analysis, increased risk of wrong decisions"
            : "Moderate impact: Some analysis limitations, but manageable with proper handling",
        recommendation: nullPercentage > 20
          ? "Stop using this data for important decisions until missing data is addressed"
          : "Prioritize filling critical missing data and implement prevention processes",
        priority: nullPercentage > 20 ? "critical" : nullPercentage > 10 ? "high" : "medium",
        timeline: nullPercentage > 20 ? "Within 1 week" : nullPercentage > 10 ? "Within 2-3 weeks" : "Within 1 month",
        costBenefit: "Cost of data collection vs. cost of wrong decisions due to incomplete information",
        metrics: {
          before: nullPercentage,
          after: Math.max(2, nullPercentage - 15),
          improvement: Math.min(15, nullPercentage - 2)
        },
        actionItems: [
          "Identify which missing data is most critical for your key business decisions",
          "Reach out to original data sources to fill the most important gaps",
          "Implement required fields in data collection forms going forward",
          "Create backup data collection methods for critical information",
          "Set up alerts when data completeness drops below acceptable levels"
        ]
      })
    }

    // Duplicate data insight
    if (dataSummary.duplicates > 0) {
      const duplicatePercentage = Math.round((dataSummary.duplicates / dataSummary.totalRows) * 100)
      
      insights.push({
        id: "local_duplicate_insight",
        title: `Duplicate Records: ${duplicatePercentage}% Inflation in Your Numbers`,
        description: `${dataSummary.duplicates} duplicate records are inflating your counts and potentially skewing analysis.`,
        userFriendlyExplanation: `Having ${duplicatePercentage}% duplicate records is like counting the same customers ${duplicatePercentage}% more than once - it makes your business look bigger than it actually is. This can lead to overestimating demand, ordering too much inventory, or making other decisions based on inflated numbers.`,
        impact: duplicatePercentage > 10
          ? "High impact: Significantly inflated numbers affecting business planning and resource allocation"
          : "Moderate impact: Some inflation in numbers, but manageable with awareness",
        recommendation: "Remove duplicates to get accurate counts and reliable analysis",
        priority: duplicatePercentage > 10 ? "high" : "medium",
        timeline: "Within 1-2 weeks",
        costBenefit: "Small time investment for significantly more accurate business metrics",
        metrics: {
          before: dataSummary.totalRows,
          after: dataSummary.totalRows - dataSummary.duplicates,
          improvement: duplicatePercentage
        },
        actionItems: [
          "Remove duplicate records to get accurate counts",
          "Review processes that might be creating duplicates",
          "Implement duplicate prevention in data entry systems",
          "Set up regular duplicate detection and removal",
          "Train team on recognizing and preventing duplicate entry"
        ]
      })
    }

    return insights
  }, [])

  /**
   * Get contextual response from local knowledge base
   */
  const getLocalResponse = useCallback((prompt: string): string => {
    const lowerPrompt = prompt.toLowerCase()
    
    // Check for FAQ matches
    for (const [key, response] of Object.entries(LOCAL_KNOWLEDGE_BASE.faqResponses)) {
      if (lowerPrompt.includes(key.replace(/_/g, ' ')) || 
          (key === 'what_is_data_quality' && (lowerPrompt.includes('data quality') || lowerPrompt.includes('quality'))) ||
          (key === 'why_does_data_quality_matter' && (lowerPrompt.includes('why') && lowerPrompt.includes('matter'))) ||
          (key === 'how_long_does_cleaning_take' && (lowerPrompt.includes('how long') || lowerPrompt.includes('time'))) ||
          (key === 'what_should_i_fix_first' && (lowerPrompt.includes('first') || lowerPrompt.includes('priority'))) ||
          (key === 'how_do_i_prevent_future_problems' && (lowerPrompt.includes('prevent') || lowerPrompt.includes('future'))) ||
          (key === 'what_if_i_delete_important_data' && (lowerPrompt.includes('delete') || lowerPrompt.includes('remove')))) {
        return response
      }
    }
    
    // Check for specific data quality issues
    if (lowerPrompt.includes('missing') || lowerPrompt.includes('null') || lowerPrompt.includes('empty')) {
      const knowledge = LOCAL_KNOWLEDGE_BASE.dataQualityRules.missing_data
      return `${knowledge.explanation}\n\nFor your dataset with ${file.data.length} rows:\n\n**Common causes:** ${knowledge.commonCauses.slice(0, 3).join(', ')}\n\n**Solutions:** ${knowledge.solutions.slice(0, 3).join(', ')}\n\n**Prevention:** ${knowledge.preventionTips.slice(0, 2).join(', ')}`
    }
    
    if (lowerPrompt.includes('duplicate') || lowerPrompt.includes('repeated')) {
      const knowledge = LOCAL_KNOWLEDGE_BASE.dataQualityRules.duplicates
      return `${knowledge.explanation}\n\n**Business Impact:** ${knowledge.businessImpact}\n\n**Solutions:** ${knowledge.solutions.slice(0, 3).join(', ')}\n\n**Prevention:** ${knowledge.preventionTips.slice(0, 2).join(', ')}`
    }
    
    if (lowerPrompt.includes('format') || lowerPrompt.includes('consistent') || lowerPrompt.includes('standard')) {
      const knowledge = LOCAL_KNOWLEDGE_BASE.dataQualityRules.formatting
      return `${knowledge.explanation}\n\n**Business Impact:** ${knowledge.businessImpact}\n\n**Solutions:** ${knowledge.solutions.slice(0, 3).join(', ')}\n\n**Examples:** ${knowledge.businessExamples.slice(0, 2).join(', ')}`
    }
    
    if (lowerPrompt.includes('invalid') || lowerPrompt.includes('error') || lowerPrompt.includes('wrong')) {
      const knowledge = LOCAL_KNOWLEDGE_BASE.dataQualityRules.validation
      return `${knowledge.explanation}\n\n**Business Impact:** ${knowledge.businessImpact}\n\n**Solutions:** ${knowledge.solutions.slice(0, 3).join(', ')}\n\n**Examples:** ${knowledge.businessExamples.slice(0, 2).join(', ')}`
    }
    
    // General response
    return `Based on your question about "${prompt}" and your dataset with ${file.data.length} rows and ${file.headers.length} columns:\n\nI recommend starting with a comprehensive data quality analysis to identify the most impactful issues. The most common problems are:\n\n1. **Missing Data** - Empty cells that prevent complete analysis\n2. **Duplicates** - Repeated records that inflate numbers\n3. **Formatting Issues** - Inconsistent data that's hard to work with\n4. **Invalid Data** - Information that doesn't make sense\n\nWould you like me to run a full analysis to provide specific recommendations for your data?`
  }, [file])

  // ============================================================================
  // AI ANALYSIS FUNCTIONS
  // ============================================================================

  /**
   * Generate comprehensive AI analysis of the dataset
   */
  const generateAiAnalysis = useCallback(async () => {
    if (isAnalyzing) return

    setIsAnalyzing(true)
    setAnalysisProgress(0)

    try {
      // Step 1: Prepare data summary for analysis
      setAnalysisProgress(20)

      const dataSummary = {
        fileName: file.name,
        totalRows: file.analysis?.totalRows || file.data.length,
        totalColumns: file.analysis?.totalColumns || file.headers.length,
        headers: file.headers,
        dataTypes: file.analysis?.dataTypes || {},
        nullValues: file.analysis?.nullValues || {},
        duplicates: file.analysis?.duplicates || 0,
        qualityScore: file.analysis?.qualityScore || 0,
        sampleData: file.data.slice(0, 5),
        contextualIssues: file.analysis?.contextualIssues?.slice(0, 10) || [],
        crossFieldIssues: file.analysis?.crossFieldIssues?.slice(0, 5) || []
      }

      // Check if we should use local knowledge or AI
      if (!isOnline || useLocalKnowledge) {
        setAnalysisProgress(50)
        const localRecommendations = generateLocalRecommendations(dataSummary)
        setCleaningRecommendations(localRecommendations)

        setAnalysisProgress(80)
        const localInsights = generateLocalInsights(dataSummary)
        setBusinessInsights(localInsights)

        setAnalysisProgress(100)
        toast.success("Analysis completed using local knowledge base!")
      } else {
        // Use AI analysis
        setAnalysisProgress(40)
        await generateCleaningRecommendations(dataSummary)

        setAnalysisProgress(70)
        await generateBusinessInsights(dataSummary)

        setAnalysisProgress(100)
        toast.success("AI analysis completed successfully!")
      }
    } catch (error) {
      console.error("Error in analysis:", error)
      // Fallback to local knowledge
      const dataSummary = {
        fileName: file.name,
        totalRows: file.analysis?.totalRows || file.data.length,
        totalColumns: file.analysis?.totalColumns || file.headers.length,
        headers: file.headers,
        dataTypes: file.analysis?.dataTypes || {},
        nullValues: file.analysis?.nullValues || {},
        duplicates: file.analysis?.duplicates || 0,
        qualityScore: file.analysis?.qualityScore || 0,
        contextualIssues: file.analysis?.contextualIssues || []
      }

      const localRecommendations = generateLocalRecommendations(dataSummary)
      setCleaningRecommendations(localRecommendations)

      const localInsights = generateLocalInsights(dataSummary)
      setBusinessInsights(localInsights)

      toast.info("Using local knowledge base due to connection issues")
    } finally {
      setIsAnalyzing(false)
      setAnalysisProgress(0)
    }
  }, [file, isAnalyzing, isOnline, useLocalKnowledge, generateLocalRecommendations, generateLocalInsights])

  /**
   * Generate AI-powered cleaning recommendations with user-friendly explanations
   */
  const generateCleaningRecommendations = useCallback(async (dataSummary: any) => {
    const prompt = `You are a friendly data consultant explaining to a business owner (not a technical person) how to improve their data. Use simple, clear language and focus on business impact.

Dataset: ${dataSummary.fileName}
- ${dataSummary.totalRows} rows of data
- ${dataSummary.totalColumns} different types of information
- Current quality score: ${dataSummary.qualityScore}%

Problems found:
${Object.entries(dataSummary.nullValues).map(([col, count]) => `- ${col}: ${count} missing values`).join('\n')}
${dataSummary.duplicates > 0 ? `- ${dataSummary.duplicates} duplicate records` : ''}

Provide 4-6 recommendations in JSON format. For each recommendation, explain:
1. What the problem is in simple terms (like explaining to a friend)
2. Why it matters for business success
3. How to fix it step-by-step
4. What the result will look like
5. How long it will take and how difficult it is

Format:
{
  "recommendations": [
    {
      "id": "unique_id",
      "title": "Simple, clear title",
      "description": "Brief technical description",
      "userFriendlyExplanation": "Explain like talking to a business owner who isn't technical - use analogies and simple language",
      "impact": "low|medium|high",
      "confidence": 0.95,
      "affectedRows": 150,
      "category": "missing_data|duplicates|outliers|formatting|validation",
      "businessImpact": "How this affects business decisions, revenue, customers, etc.",
      "stepByStepGuide": ["Step 1: Clear action", "Step 2: Clear action", "Step 3: Clear action"],
      "estimatedTimeToFix": "15 minutes|1 hour|half day",
      "difficulty": "easy|medium|hard",
      "pythonCode": "# Code with clear comments explaining what each line does",
      "sqlCode": "-- SQL with explanations",
      "preview": "What will change after applying this fix"
    }
  ]
}

Focus on practical, business-focused explanations that anyone can understand. Use analogies and real-world examples.`

    try {
      const { text } = await generateText({
        model: groq("llama-3.1-8b-instant"),
        prompt,
        maxTokens: 3000,
      })

      const aiResponse = JSON.parse(text)
      const recommendations: CleaningRecommendation[] = aiResponse.recommendations.map((rec: any) => ({
        id: rec.id || `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: rec.title,
        description: rec.description,
        userFriendlyExplanation: rec.userFriendlyExplanation,
        impact: rec.impact,
        confidence: rec.confidence,
        affectedRows: rec.affectedRows,
        category: rec.category,
        businessImpact: rec.businessImpact,
        stepByStepGuide: rec.stepByStepGuide || [],
        estimatedTimeToFix: rec.estimatedTimeToFix || "30 minutes",
        difficulty: rec.difficulty || "medium",
        code: {
          python: rec.pythonCode,
          sql: rec.sqlCode
        },
        preview: rec.preview
      }))

      setCleaningRecommendations(recommendations)
    } catch (error) {
      console.error("Error generating AI recommendations:", error)
      throw error
    }
  }, [])

  /**
   * Generate business insights with user-friendly explanations
   */
  const generateBusinessInsights = useCallback(async (dataSummary: any) => {
    const prompt = `You are a business consultant explaining data insights to a company owner. Use simple language and focus on business impact, not technical details.

Dataset: ${dataSummary.fileName}
- ${dataSummary.totalRows} records
- Quality score: ${dataSummary.qualityScore}%
- ${Object.values(dataSummary.nullValues).reduce((sum: number, count: any) => sum + count, 0)} missing values
- ${dataSummary.duplicates} duplicates

Provide 4-5 business insights in JSON format:
{
  "insights": [
    {
      "id": "unique_id",
      "title": "Business-focused insight title",
      "description": "Brief technical description",
      "userFriendlyExplanation": "Explain the business impact in simple terms with analogies",
      "impact": "How this affects the business (revenue, customers, operations, etc.)",
      "recommendation": "What the business should do about it",
      "priority": "low|medium|high|critical",
      "timeline": "When this should be addressed",
      "costBenefit": "Cost of fixing vs cost of not fixing",
      "actionItems": ["Specific action 1", "Specific action 2", "Specific action 3"],
      "metrics": {
        "before": 75,
        "after": 90,
        "improvement": 15
      }
    }
  ]
}

Focus on:
- Revenue impact and cost savings
- Customer satisfaction and retention
- Operational efficiency improvements
- Risk management and compliance
- Competitive advantages from better data`

    try {
      const { text } = await generateText({
        model: groq("llama-3.1-8b-instant"),
        prompt,
        maxTokens: 2500,
      })

      const aiResponse = JSON.parse(text)
      const insights: BusinessInsight[] = aiResponse.insights.map((insight: any) => ({
        id: insight.id || `insight_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: insight.title,
        description: insight.description,
        userFriendlyExplanation: insight.userFriendlyExplanation,
        impact: insight.impact,
        recommendation: insight.recommendation,
        priority: insight.priority,
        timeline: insight.timeline || "Within 1 month",
        costBenefit: insight.costBenefit || "Investment in data quality pays off through better decisions",
        metrics: insight.metrics,
        actionItems: insight.actionItems || []
      }))

      setBusinessInsights(insights)
    } catch (error) {
      console.error("Error generating business insights:", error)
      throw error
    }
  }, [])

  /**
   * Generate custom analysis based on user prompt
   */
  const generateCustomAnalysis = useCallback(async () => {
    if (!customPrompt.trim() || isCustomAnalyzing) return

    setIsCustomAnalyzing(true)

    try {
      if (!isOnline) {
        // Use local knowledge-based response
        const localResponse = getLocalResponse(customPrompt)
        setCustomAnalysis(localResponse)
        toast.success("Response generated using local knowledge!")
        return
      }

      const dataSummary = {
        fileName: file.name,
        totalRows: file.data.length,
        headers: file.headers,
        sampleData: file.data.slice(0, 3),
        qualityScore: file.analysis?.qualityScore || 0
      }

      const prompt = `You are a friendly data consultant. A business owner asked: "${customPrompt}"

Their dataset:
- File: ${dataSummary.fileName}
- ${dataSummary.totalRows} rows
- Columns: ${dataSummary.headers.join(', ')}
- Quality Score: ${dataSummary.qualityScore}%

Provide a helpful, easy-to-understand response that:
1. Answers their question directly in simple terms
2. Explains any technical concepts using analogies and real-world examples
3. Gives practical, actionable advice they can implement
4. Includes specific examples relevant to their data when possible
5. Focuses on business impact and benefits
6. Uses encouraging, supportive language

Use friendly, conversational language as if you're talking to a colleague who trusts your expertise but isn't technical.`

      const { text } = await generateText({
        model: groq("llama-3.1-8b-instant"),
        prompt,
        maxTokens: 1500,
      })

      setCustomAnalysis(text)
      toast.success("Custom analysis generated!")
    } catch (error) {
      console.error("Error generating custom analysis:", error)
      // Fallback to local knowledge
      const localResponse = getLocalResponse(customPrompt)
      setCustomAnalysis(localResponse)
      toast.info("Using local knowledge due to connection issues")
    } finally {
      setIsCustomAnalyzing(false)
    }
  }, [customPrompt, file, isCustomAnalyzing, isOnline, getLocalResponse])

  /**
   * Apply selected cleaning recommendations
   */
  const applySelectedRecommendations = useCallback(async () => {
    if (selectedRecommendations.size === 0) {
      toast.error("Please select recommendations to apply")
      return
    }

    try {
      let updatedData = [...file.data]
      let totalChanges = 0

      for (const recId of selectedRecommendations) {
        const recommendation = cleaningRecommendations.find(r => r.id === recId)
        if (!recommendation) continue

        switch (recommendation.category) {
          case "missing_data":
            updatedData = updatedData.map(row => {
              const newRow = { ...row }
              Object.keys(newRow).forEach(key => {
                if (newRow[key] === null || newRow[key] === undefined || newRow[key] === "") {
                  const dataType = file.analysis?.dataTypes?.[key]
                  if (dataType === "number") {
                    newRow[key] = 0
                  } else if (dataType === "string") {
                    newRow[key] = "Unknown"
                  } else {
                    newRow[key] = ""
                  }
                  totalChanges++
                }
              })
              return newRow
            })
            break

          case "duplicates":
            const seen = new Set()
            const originalLength = updatedData.length
            updatedData = updatedData.filter(row => {
              const rowString = JSON.stringify(row)
              if (seen.has(rowString)) {
                return false
              }
              seen.add(rowString)
              return true
            })
            totalChanges += originalLength - updatedData.length
            break

          case "formatting":
            updatedData = updatedData.map(row => {
              const newRow = { ...row }
              Object.keys(newRow).forEach(key => {
                if (typeof newRow[key] === "string") {
                  // Trim whitespace
                  newRow[key] = newRow[key].trim()
                  
                  // Standardize case based on field type
                  if (key.toLowerCase().includes("email")) {
                    newRow[key] = newRow[key].toLowerCase()
                  } else if (key.toLowerCase().includes("name") || key.toLowerCase().includes("city")) {
                    newRow[key] = newRow[key].replace(/\w\S*/g, (txt) => 
                      txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
                    )
                  }
                  
                  // Remove multiple spaces
                  newRow[key] = newRow[key].replace(/\s+/g, ' ')
                  totalChanges++
                }
              })
              return newRow
            })
            break

          case "validation":
            updatedData = updatedData.map(row => {
              const newRow = { ...row }
              Object.keys(newRow).forEach(key => {
                // Fix common validation issues
                if (key.toLowerCase().includes("email") && typeof newRow[key] === "string") {
                  if (!newRow[key].includes("@")) {
                    newRow[key] = "invalid@example.com"
                    totalChanges++
                  }
                }
                if (key.toLowerCase().includes("phone") && typeof newRow[key] === "string") {
                  newRow[key] = newRow[key].replace(/[^0-9]/g, '')
                  totalChanges++
                }
                if (key.toLowerCase().includes("price") && typeof newRow[key] === "number") {
                  if (newRow[key] < 0) {
                    newRow[key] = Math.abs(newRow[key])
                    totalChanges++
                  }
                }
              })
              return newRow
            })
            break
        }
      }

      const updatedFile = {
        ...file,
        data: updatedData,
        efficiency: {
          ...file.efficiency!,
          fixesApplied: (file.efficiency?.fixesApplied || 0) + totalChanges,
          dataQualityImprovement: 20
        }
      }

      onFileUpdate(updatedFile)
      set
