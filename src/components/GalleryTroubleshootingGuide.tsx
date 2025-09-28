import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { AlertTriangle, CheckCircle, Settings, BookOpen, Smartphone, Bug } from 'lucide-react';

interface ManufacturerGuide {
  name: string;
  icon: string;
  versions: string[];
  knownIssues: string[];
  solutions: string[];
  testSteps: string[];
}

const manufacturerGuides: ManufacturerGuide[] = [
  {
    name: 'Xiaomi (MIUI)',
    icon: '📱',
    versions: ['MIUI 12', 'MIUI 13', 'MIUI 14', 'MIUI 15'],
    knownIssues: [
      'Permissions may be delayed or require app restart',
      'Gallery access blocked by MIUI security features',
      'Storage access framework modifications',
      'Photo Picker may not appear on older MIUI versions'
    ],
    solutions: [
      'Enable "Display pop-up windows while running in the background"',
      'Add app to MIUI autostart list',
      'Disable MIUI optimization in Developer Options',
      'Grant permissions manually in MIUI Security app'
    ],
    testSteps: [
      'Check MIUI version in Settings > About phone',
      'Verify app permissions in Security > Permissions',
      'Test gallery access after granting all permissions',
      'Check Developer Options for MIUI optimization setting'
    ]
  },
  {
    name: 'Samsung (One UI)',
    icon: '📲',
    versions: ['One UI 4.0', 'One UI 5.0', 'One UI 6.0'],
    knownIssues: [
      'Samsung Gallery app may override standard intents',
      'Knox security can block file access',
      'Different permission flow on Galaxy devices',
      'Secure Folder apps have separate permissions'
    ],
    solutions: [
      'Ensure Samsung Gallery is updated',
      'Check Knox security settings',
      'Use Samsung-specific gallery intent as fallback',
      'Test outside of Secure Folder environment'
    ],
    testSteps: [
      'Verify One UI version in Settings',
      'Check if Knox is enabled',
      'Test with Samsung Gallery as default',
      'Verify app is not in Secure Folder'
    ]
  },
  {
    name: 'Huawei (EMUI/HarmonyOS)',
    icon: '📱',
    versions: ['EMUI 10', 'EMUI 11', 'HarmonyOS 2.0', 'HarmonyOS 3.0'],
    knownIssues: [
      'HMS services instead of Google Play Services',
      'Different permission handling',
      'Huawei Gallery app specifics',
      'Protected apps list restrictions'
    ],
    solutions: [
      'Add app to Protected Apps list',
      'Enable all permissions in Phone Manager',
      'Use Huawei-specific file access methods',
      'Check HMS Core services status'
    ],
    testSteps: [
      'Check EMUI/HarmonyOS version',
      'Verify app in Protected Apps list',
      'Test HMS Core functionality',
      'Check Phone Manager permissions'
    ]
  },
  {
    name: 'OnePlus (OxygenOS)',
    icon: '📱',
    versions: ['OxygenOS 11', 'OxygenOS 12', 'OxygenOS 13'],
    knownIssues: [
      'Battery optimization can kill background processes',
      'OnePlus Gallery modifications',
      'ColorOS integration changes'
    ],
    solutions: [
      'Disable battery optimization for the app',
      'Use standard Android methods',
      'Check for ColorOS-specific behaviors'
    ],
    testSteps: [
      'Check OxygenOS version',
      'Verify battery optimization settings',
      'Test with OnePlus Gallery',
      'Check for ColorOS elements'
    ]
  }
];

export function GalleryTroubleshootingGuide() {
  const [selectedManufacturer, setSelectedManufacturer] = useState<string>('');

  const androidVersionIssues = [
    {
      version: 'Android 13+ (API 33+)',
      issues: [
        'Photo Picker replaces traditional gallery access',
        'Granular media permissions (READ_MEDIA_IMAGES)',
        'Storage access changes'
      ],
      solutions: [
        'Use MediaStore.ACTION_PICK_IMAGES intent',
        'Request READ_MEDIA_IMAGES permission',
        'Implement Photo Picker fallback'
      ]
    },
    {
      version: 'Android 10-12 (API 29-32)',
      issues: [
        'Scoped Storage enforcement',
        'Legacy external storage deprecation',
        'Storage Access Framework required'
      ],
      solutions: [
        'Use ACTION_OPEN_DOCUMENT intent',
        'Request appropriate media permissions',
        'Implement SAF for file access'
      ]
    },
    {
      version: 'Android 6-9 (API 23-28)',
      issues: [
        'Runtime permissions required',
        'Different manufacturer implementations',
        'Legacy storage access methods'
      ],
      solutions: [
        'Request READ_EXTERNAL_STORAGE permission',
        'Use manufacturer-specific intents',
        'Implement permission request flow'
      ]
    }
  ];

  const commonErrorSolutions = [
    {
      error: 'Permission denied',
      causes: ['Missing permissions in manifest', 'User denied permission', 'MIUI/Knox restrictions'],
      solutions: [
        'Check AndroidManifest.xml permissions',
        'Implement permission request flow',
        'Guide user to manual permission grant',
        'Check manufacturer-specific permission settings'
      ]
    },
    {
      error: 'Gallery not opening',
      causes: ['Missing gallery app', 'Intent not handled', 'Security restrictions'],
      solutions: [
        'Check for installed gallery apps',
        'Use multiple intent strategies',
        'Implement web fallback',
        'Check manufacturer security settings'
      ]
    },
    {
      error: 'File access denied',
      causes: ['Scoped storage restrictions', 'Invalid URI', 'App sandboxing'],
      solutions: [
        'Use Storage Access Framework',
        'Implement proper URI handling',
        'Request appropriate permissions',
        'Use content resolver for file access'
      ]
    },
    {
      error: 'Plugin not available',
      causes: ['Capacitor not initialized', 'Plugin not registered', 'Native code not built'],
      solutions: [
        'Check Capacitor initialization',
        'Verify plugin registration in MainActivity',
        'Run npx cap sync',
        'Rebuild native project'
      ]
    }
  ];

  const playStoreCompliance = [
    {
      requirement: 'Target API Level',
      description: 'App must target Android 13 (API 33) or higher',
      implementation: 'Set targetSdkVersion to 33+ in build.gradle'
    },
    {
      requirement: 'Permission Declarations',
      description: 'Only request necessary permissions',
      implementation: 'Use READ_MEDIA_IMAGES instead of READ_EXTERNAL_STORAGE for Android 13+'
    },
    {
      requirement: 'Scoped Storage',
      description: 'Comply with scoped storage requirements',
      implementation: 'Set requestLegacyExternalStorage="false"'
    },
    {
      requirement: 'Photo Picker',
      description: 'Use Photo Picker for media selection on Android 13+',
      implementation: 'Implement MediaStore.ACTION_PICK_IMAGES'
    }
  ];

  return (
    <Card className="w-full max-w-6xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          Gallery Troubleshooting Guide
        </CardTitle>
        <CardDescription>
          Comprehensive guide for resolving gallery access issues across Android versions and manufacturers
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <Tabs defaultValue="manufacturers" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="manufacturers">Manufacturers</TabsTrigger>
            <TabsTrigger value="android-versions">Android Versions</TabsTrigger>
            <TabsTrigger value="common-errors">Common Errors</TabsTrigger>
            <TabsTrigger value="compliance">Play Store</TabsTrigger>
          </TabsList>

          <TabsContent value="manufacturers" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {manufacturerGuides.map((guide) => (
                <Card key={guide.name} className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => setSelectedManufacturer(selectedManufacturer === guide.name ? '' : guide.name)}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <span className="text-lg">{guide.icon}</span>
                      {guide.name}
                    </CardTitle>
                    <CardDescription>
                      Supported versions: {guide.versions.join(', ')}
                    </CardDescription>
                  </CardHeader>
                  
                  {selectedManufacturer === guide.name && (
                    <CardContent className="space-y-4">
                      <div>
                        <h4 className="font-semibold mb-2 flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-orange-500" />
                          Known Issues
                        </h4>
                        <ul className="text-sm space-y-1">
                          {guide.knownIssues.map((issue, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <span className="text-orange-500 mt-1">•</span>
                              {issue}
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      <div>
                        <h4 className="font-semibold mb-2 flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          Solutions
                        </h4>
                        <ul className="text-sm space-y-1">
                          {guide.solutions.map((solution, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <span className="text-green-500 mt-1">•</span>
                              {solution}
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      <div>
                        <h4 className="font-semibold mb-2 flex items-center gap-2">
                          <Bug className="h-4 w-4 text-blue-500" />
                          Test Steps
                        </h4>
                        <ol className="text-sm space-y-1">
                          {guide.testSteps.map((step, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <span className="text-blue-500 font-medium">{index + 1}.</span>
                              {step}
                            </li>
                          ))}
                        </ol>
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="android-versions" className="space-y-4">
            <Accordion type="single" collapsible className="w-full">
              {androidVersionIssues.map((versionInfo, index) => (
                <AccordionItem key={index} value={`version-${index}`}>
                  <AccordionTrigger className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4" />
                    {versionInfo.version}
                  </AccordionTrigger>
                  <AccordionContent className="space-y-3">
                    <div>
                      <h4 className="font-semibold mb-2 text-orange-600">Common Issues</h4>
                      <ul className="text-sm space-y-1">
                        {versionInfo.issues.map((issue, issueIndex) => (
                          <li key={issueIndex} className="flex items-start gap-2">
                            <span className="text-orange-500 mt-1">•</span>
                            {issue}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2 text-green-600">Recommended Solutions</h4>
                      <ul className="text-sm space-y-1">
                        {versionInfo.solutions.map((solution, solutionIndex) => (
                          <li key={solutionIndex} className="flex items-start gap-2">
                            <span className="text-green-500 mt-1">•</span>
                            {solution}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </TabsContent>

          <TabsContent value="common-errors" className="space-y-4">
            {commonErrorSolutions.map((errorInfo, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-600">
                    <AlertTriangle className="h-5 w-5" />
                    {errorInfo.error}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <h4 className="font-semibold mb-2">Possible Causes</h4>
                    <div className="flex flex-wrap gap-2">
                      {errorInfo.causes.map((cause, causeIndex) => (
                        <Badge key={causeIndex} variant="outline">{cause}</Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Solutions</h4>
                    <ul className="text-sm space-y-1">
                      {errorInfo.solutions.map((solution, solutionIndex) => (
                        <li key={solutionIndex} className="flex items-start gap-2">
                          <span className="text-green-500 mt-1">•</span>
                          {solution}
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="compliance" className="space-y-4">
            <div className="grid gap-4">
              {playStoreCompliance.map((item, index) => (
                <Card key={index}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="h-5 w-5" />
                      {item.requirement}
                    </CardTitle>
                    <CardDescription>{item.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="p-3 bg-muted rounded-lg">
                      <div className="font-mono text-sm">{item.implementation}</div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-semibold mb-2">Compliance Checklist</h4>
              <ul className="text-sm space-y-1">
                <li>✅ Target Android 13+ (API 33+)</li>
                <li>✅ Use appropriate media permissions</li>
                <li>✅ Implement Photo Picker for Android 13+</li>
                <li>✅ Remove legacy storage permissions</li>
                <li>✅ Test on multiple devices and versions</li>
                <li>✅ Handle permission denial gracefully</li>
              </ul>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}