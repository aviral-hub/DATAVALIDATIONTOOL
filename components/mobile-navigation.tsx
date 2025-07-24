"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import {
  ArrowLeft,
  ArrowRight,
  Menu,
  Upload,
  BarChart3,
  Settings,
  History,
  TrendingUp,
  FileText,
  Undo2,
  Redo2,
  Home,
} from "lucide-react"

interface MobileNavigationProps {
  activeTab: string
  onTabChange: (tab: string) => void
  canGoBack: boolean
  canGoForward: boolean
  onGoBack: () => void
  onGoForward: () => void
  onUndo: () => void
  onRedo: () => void
  canUndo: boolean
  canRedo: boolean
  hasActiveFile: boolean
  filesCount: number
}

export function MobileNavigation({
  activeTab,
  onTabChange,
  canGoBack,
  canGoForward,
  onGoBack,
  onGoForward,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  hasActiveFile,
  filesCount,
}: MobileNavigationProps) {
  const [isOpen, setIsOpen] = useState(false)

  const tabs = [
    { id: "upload", label: "Upload", icon: Upload, disabled: false },
    { id: "analysis", label: "Analysis", icon: BarChart3, disabled: !hasActiveFile },
    { id: "validation", label: "Validation", icon: Settings, disabled: !hasActiveFile },
    { id: "history", label: "History", icon: History, disabled: false },
    { id: "trends", label: "Trends", icon: TrendingUp, disabled: filesCount === 0 },
    { id: "reports", label: "Reports", icon: FileText, disabled: !hasActiveFile },
  ]

  const currentTab = tabs.find((tab) => tab.id === activeTab)

  return (
    <>
      {/* Mobile Top Bar */}
      <div className="lg:hidden sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="p-2">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <Home className="h-5 w-5" />
                    Navigation
                  </SheetTitle>
                  <SheetDescription>Choose a section to navigate to</SheetDescription>
                </SheetHeader>
                <div className="mt-6 space-y-2">
                  {tabs.map((tab) => {
                    const Icon = tab.icon
                    return (
                      <Button
                        key={tab.id}
                        variant={activeTab === tab.id ? "default" : "ghost"}
                        className="w-full justify-start gap-3 h-12"
                        disabled={tab.disabled}
                        onClick={() => {
                          onTabChange(tab.id)
                          setIsOpen(false)
                        }}
                      >
                        <Icon className="h-5 w-5" />
                        {tab.label}
                        {tab.id === "history" && filesCount > 0 && (
                          <Badge variant="secondary" className="ml-auto">
                            {filesCount}
                          </Badge>
                        )}
                      </Button>
                    )
                  })}
                </div>
              </SheetContent>
            </Sheet>

            <div className="flex items-center gap-2">
              {currentTab && (
                <>
                  <currentTab.icon className="h-5 w-5 text-blue-600" />
                  <span className="font-medium text-gray-900">{currentTab.label}</span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="p-2" disabled={!canGoBack} onClick={onGoBack} title="Go Back">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="p-2"
              disabled={!canGoForward}
              onClick={onGoForward}
              title="Go Forward"
            >
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Action Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-sm border-t shadow-lg">
        <div className="flex items-center justify-center px-4 py-2 gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 flex flex-col gap-1 h-12"
            disabled={!canUndo}
            onClick={onUndo}
          >
            <Undo2 className="h-4 w-4" />
            <span className="text-xs">Undo</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 flex flex-col gap-1 h-12"
            disabled={!canRedo}
            onClick={onRedo}
          >
            <Redo2 className="h-4 w-4" />
            <span className="text-xs">Redo</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 flex flex-col gap-1 h-12"
            disabled={!canGoBack}
            onClick={onGoBack}
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-xs">Back</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 flex flex-col gap-1 h-12"
            disabled={!canGoForward}
            onClick={onGoForward}
          >
            <ArrowRight className="h-4 w-4" />
            <span className="text-xs">Forward</span>
          </Button>
        </div>
      </div>
    </>
  )
}
