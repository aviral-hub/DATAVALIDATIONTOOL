"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Info, Users, GraduationCap } from "lucide-react"

export function CreditsPopup() {
  const [isOpen, setIsOpen] = useState(false)

  const teamMembers = [
    {
      name: "Aviral Pathak",
      rollNo: "A-33",
      role: "Lead Developer & Data Analysis",
      avatar: "AP",
      color: "bg-blue-500",
    },
    {
      name: "Harsh Selukar",
      rollNo: "A-41",
      role: "Frontend Development & UI/UX",
      avatar: "HS",
      color: "bg-green-500",
    },
    {
      name: "Kedar Thakare",
      rollNo: "A-44",
      role: "Backend Development & Validation Logic",
      avatar: "KT",
      color: "bg-purple-500",
    },
    {
      name: "Parth Yadav",
      rollNo: "A-47",
      role: "Testing & Documentation",
      avatar: "PY",
      color: "bg-orange-500",
    },
  ]

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="fixed bottom-4 right-4 lg:bottom-4 lg:right-4 bg-white/90 backdrop-blur-sm border shadow-lg hover:shadow-xl transition-all duration-200 text-xs z-30"
        >
          <Info className="h-3 w-3 mr-1" />
          <span className="hidden sm:inline">About</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[95vw] max-h-[90vh] w-full lg:max-w-2xl overflow-y-auto mx-4">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg lg:text-xl">
            <GraduationCap className="h-5 w-5 text-blue-600" />
            College Project Credits
          </DialogTitle>
          <DialogDescription className="text-sm">
            Data Validation & Analysis Tool - A comprehensive solution for data quality assessment
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 lg:space-y-6">
          {/* Project Guide */}
          <Card className="border-2 border-blue-100 bg-blue-50/50">
            <CardContent className="pt-4 lg:pt-6">
              <div className="text-center">
                <div className="w-12 h-12 lg:w-16 lg:h-16 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm lg:text-lg mx-auto mb-2 lg:mb-3">
                  SW
                </div>
                <h3 className="font-semibold text-base lg:text-lg text-blue-900">Prof. Sampada Wazalwar</h3>
                <p className="text-blue-700 text-xs lg:text-sm">Project Guide & Mentor</p>
                <Badge variant="outline" className="mt-2 border-blue-300 text-blue-700 text-xs">
                  Faculty Supervisor
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Team Members */}
          <div>
            <div className="flex items-center gap-2 mb-3 lg:mb-4">
              <Users className="h-4 w-4 lg:h-5 lg:w-5 text-gray-600" />
              <h3 className="font-semibold text-base lg:text-lg">Development Team</h3>
            </div>

            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:gap-4">
              {teamMembers.map((member, index) => (
                <Card key={index} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-3 lg:pt-4">
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-10 h-10 lg:w-12 lg:h-12 ${member.color} rounded-full flex items-center justify-center text-white font-bold text-xs lg:text-sm flex-shrink-0`}
                      >
                        {member.avatar}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 text-sm lg:text-base">{member.name}</h4>
                        <p className="text-xs lg:text-sm text-gray-600 mb-1">Roll No: {member.rollNo}</p>
                        <p className="text-xs text-gray-500 leading-relaxed">{member.role}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Project Information */}
          <Card className="bg-gray-50">
            <CardContent className="pt-4 lg:pt-6">
              <h3 className="font-semibold text-base lg:text-lg mb-2 lg:mb-3">Project Overview</h3>
              <div className="space-y-1 lg:space-y-2 text-xs lg:text-sm text-gray-700">
                <p>
                  <strong>Project Type:</strong> Final Year College Project
                </p>
                <p>
                  <strong>Technology Stack:</strong> Next.js, React, TypeScript, Tailwind CSS
                </p>
                <p>
                  <strong>Features:</strong> Data Validation, Statistical Analysis, Quality Scoring, Report Generation
                </p>
                <p>
                  <strong>Academic Year:</strong> 2024-2025
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Key Features */}
          <div>
            <h3 className="font-semibold text-base lg:text-lg mb-2 lg:mb-3">Key Features Implemented</h3>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-1 lg:gap-2">
              {[
                "File Upload & Processing",
                "Data Type Detection",
                "Quality Scoring Algorithm",
                "Statistical Analysis",
                "Contextual Validation",
                "Cross-field Validation",
                "Outlier Detection",
                "Custom Rule Engine",
                "Interactive Visualizations",
                "Report Generation",
                "Trend Analysis",
                "Local Storage Management",
              ].map((feature, index) => (
                <Badge key={index} variant="secondary" className="text-xs justify-center py-1">
                  {feature}
                </Badge>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="text-center pt-3 lg:pt-4 border-t">
            <p className="text-xs lg:text-sm text-gray-600">Built with ❤️ as part of our academic curriculum</p>
            <p className="text-xs text-gray-500 mt-1">© 2024 Data Validation Team. All rights reserved.</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
