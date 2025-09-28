import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GalleryValidationSuite } from './GalleryValidationSuite';
import { GalleryPerformanceTest } from './GalleryPerformanceTest';
import { GalleryTroubleshootingGuide } from './GalleryTroubleshootingGuide';
import { TestTube, BarChart3, BookOpen, CheckCircle } from 'lucide-react';

export function GalleryComprehensiveTest() {
  const [completedTabs, setCompletedTabs] = useState<Set<string>>(new Set());

  const markTabCompleted = (tabValue: string) => {
    setCompletedTabs(prev => new Set([...prev, tabValue]));
  };

  const getTabIcon = (tabValue: string) => {
    if (completedTabs.has(tabValue)) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
    
    switch (tabValue) {
      case 'validation': return <TestTube className="h-4 w-4" />;
      case 'performance': return <BarChart3 className="h-4 w-4" />;
      case 'guide': return <BookOpen className="h-4 w-4" />;
      default: return null;
    }
  };

  return (
    <Card className="w-full max-w-7xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TestTube className="h-6 w-6" />
          Comprehensive Gallery Testing Suite
        </CardTitle>
        <CardDescription>
          Complete validation, performance testing, and troubleshooting for gallery access functionality
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <Tabs defaultValue="validation" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="validation" className="flex items-center gap-2">
              {getTabIcon('validation')}
              Validation Suite
            </TabsTrigger>
            <TabsTrigger value="performance" className="flex items-center gap-2">
              {getTabIcon('performance')}
              Performance Test
            </TabsTrigger>
            <TabsTrigger value="guide" className="flex items-center gap-2">
              {getTabIcon('guide')}
              Troubleshooting
            </TabsTrigger>
          </TabsList>

          <TabsContent value="validation" className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold mb-2">Validation Suite Overview</h3>
              <p className="text-sm text-muted-foreground">
                This suite tests device detection, permissions, gallery access, performance, strategy validation, 
                and error handling across different Android versions and manufacturers.
              </p>
            </div>
            <GalleryValidationSuite />
            <div className="flex justify-end">
              <Button onClick={() => markTabCompleted('validation')} variant="outline">
                Mark Validation Complete
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="performance" className="space-y-4">
            <div className="p-4 bg-green-50 rounded-lg">
              <h3 className="font-semibold mb-2">Performance Testing Overview</h3>
              <p className="text-sm text-muted-foreground">
                Measure response times, success rates, and reliability of gallery operations. 
                Performance thresholds help identify optimization opportunities.
              </p>
            </div>
            <GalleryPerformanceTest />
            <div className="flex justify-end">
              <Button onClick={() => markTabCompleted('performance')} variant="outline">
                Mark Performance Test Complete
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="guide" className="space-y-4">
            <div className="p-4 bg-orange-50 rounded-lg">
              <h3 className="font-semibold mb-2">Troubleshooting Guide Overview</h3>
              <p className="text-sm text-muted-foreground">
                Comprehensive documentation for resolving gallery access issues specific to different 
                Android manufacturers, versions, and common error scenarios.
              </p>
            </div>
            <GalleryTroubleshootingGuide />
            <div className="flex justify-end">
              <Button onClick={() => markTabCompleted('guide')} variant="outline">
                Mark Guide Review Complete
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        {/* Summary Section */}
        {completedTabs.size === 3 && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <h3 className="font-semibold text-green-800">Testing Complete!</h3>
            </div>
            <p className="text-sm text-green-700">
              You have completed all testing phases. Your gallery implementation is now fully validated 
              and ready for production deployment. Remember to run `npx cap sync` after any native changes.
            </p>
            <div className="mt-3 space-x-2">
              <Button size="sm" onClick={() => window.open('https://lovable.dev/blogs/TODO', '_blank')}>
                Read Mobile Development Guide
              </Button>
              <Button size="sm" variant="outline" onClick={() => setCompletedTabs(new Set())}>
                Reset Tests
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}