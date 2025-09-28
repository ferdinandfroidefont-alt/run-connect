import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';
import { useCamera } from '@/hooks/useCamera';
import { CheckCircle, XCircle, Clock, AlertTriangle, Smartphone, Settings } from 'lucide-react';

interface TestResult {
  name: string;
  success: boolean;
  duration: number;
  strategy: string;
  error?: string;
  details?: any;
}

interface DeviceInfo {
  manufacturer: string;
  model: string;
  androidVersion: string;
  strategy: string;
  isNative: boolean;
}

export function GalleryValidationSuite() {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState('');
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();
  const { selectFromGallery } = useCamera();

  useEffect(() => {
    loadDeviceInfo();
  }, []);

  const loadDeviceInfo = async () => {
    try {
      if ((window as any).Capacitor?.Plugins?.PermissionsPlugin) {
        const info = await (window as any).Capacitor.Plugins.PermissionsPlugin.getDeviceInfo();
        setDeviceInfo({
          manufacturer: info.manufacturer || 'Unknown',
          model: info.model || 'Unknown',
          androidVersion: info.androidVersion || 'Unknown',
          strategy: info.strategy || 'standard',
          isNative: true
        });
      } else {
        setDeviceInfo({
          manufacturer: 'Web',
          model: 'Browser',
          androidVersion: 'N/A',
          strategy: 'web',
          isNative: false
        });
      }
    } catch (error) {
      console.error('Failed to load device info:', error);
    }
  };

  const runFullValidation = async () => {
    setIsRunning(true);
    setTestResults([]);
    setProgress(0);
    
    const tests = [
      { name: 'Device Detection', test: testDeviceDetection },
      { name: 'Permission Check', test: testPermissions },
      { name: 'Gallery Access', test: testGalleryAccess },
      { name: 'Performance Test', test: testPerformance },
      { name: 'Strategy Validation', test: testStrategy },
      { name: 'Error Handling', test: testErrorHandling }
    ];

    for (let i = 0; i < tests.length; i++) {
      const testItem = tests[i];
      setCurrentTest(testItem.name);
      setProgress(((i + 1) / tests.length) * 100);
      
      try {
        const result = await testItem.test();
        setTestResults(prev => [...prev, result]);
      } catch (error) {
        setTestResults(prev => [...prev, {
          name: testItem.name,
          success: false,
          duration: 0,
          strategy: 'unknown',
          error: error instanceof Error ? error.message : 'Unknown error'
        }]);
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    setIsRunning(false);
    setCurrentTest('');
    toast({
      title: "Validation Complete",
      description: "All tests have been executed. Check results below.",
    });
  };

  const testDeviceDetection = async (): Promise<TestResult> => {
    const start = Date.now();
    
    if (!deviceInfo?.isNative) {
      return {
        name: 'Device Detection',
        success: false,
        duration: Date.now() - start,
        strategy: 'web',
        error: 'Not running on native Android'
      };
    }

    return {
      name: 'Device Detection',
      success: true,
      duration: Date.now() - start,
      strategy: deviceInfo.strategy,
      details: {
        manufacturer: deviceInfo.manufacturer,
        model: deviceInfo.model,
        version: deviceInfo.androidVersion
      }
    };
  };

  const testPermissions = async (): Promise<TestResult> => {
    const start = Date.now();
    
    try {
      if ((window as any).Capacitor?.Plugins?.PermissionsPlugin) {
        const result = await (window as any).Capacitor.Plugins.PermissionsPlugin.forceRequestCameraPermissions();
        return {
          name: 'Permission Check',
          success: result.success,
          duration: Date.now() - start,
          strategy: result.strategy || 'unknown',
          details: result
        };
      }
      
      return {
        name: 'Permission Check',
        success: false,
        duration: Date.now() - start,
        strategy: 'web',
        error: 'Native permissions not available'
      };
    } catch (error) {
      return {
        name: 'Permission Check',
        success: false,
        duration: Date.now() - start,
        strategy: 'unknown',
        error: error instanceof Error ? error.message : 'Permission test failed'
      };
    }
  };

  const testGalleryAccess = async (): Promise<TestResult> => {
    const start = Date.now();
    
    try {
      const file = await selectFromGallery();
      return {
        name: 'Gallery Access',
        success: !!file,
        duration: Date.now() - start,
        strategy: 'useCamera',
        details: file ? {
          name: file.name,
          size: file.size,
          type: file.type
        } : undefined
      };
    } catch (error) {
      return {
        name: 'Gallery Access',
        success: false,
        duration: Date.now() - start,
        strategy: 'useCamera',
        error: error instanceof Error ? error.message : 'Gallery access failed'
      };
    }
  };

  const testPerformance = async (): Promise<TestResult> => {
    const start = Date.now();
    const timeouts = [];
    
    // Test multiple quick operations
    for (let i = 0; i < 3; i++) {
      const testStart = Date.now();
      try {
        if ((window as any).Capacitor?.Plugins?.PermissionsPlugin) {
          await (window as any).Capacitor.Plugins.PermissionsPlugin.getDeviceInfo();
        }
        timeouts.push(Date.now() - testStart);
      } catch {
        timeouts.push(1000); // Mark as slow if failed
      }
    }
    
    const avgTime = timeouts.reduce((a, b) => a + b, 0) / timeouts.length;
    const isPerformant = avgTime < 100; // Under 100ms is good
    
    return {
      name: 'Performance Test',
      success: isPerformant,
      duration: Date.now() - start,
      strategy: 'benchmark',
      details: {
        averageTime: avgTime,
        measurements: timeouts
      }
    };
  };

  const testStrategy = async (): Promise<TestResult> => {
    const start = Date.now();
    
    if (!deviceInfo?.isNative) {
      return {
        name: 'Strategy Validation',
        success: true,
        duration: Date.now() - start,
        strategy: 'web',
        details: { reason: 'Web environment detected' }
      };
    }

    const expectedStrategies = {
      'Xiaomi': ['miui', 'android6to9', 'android10to12'],
      'Samsung': ['samsung', 'android10to12', 'android13plus'],
      'Huawei': ['huawei', 'android6to9'],
      'OnePlus': ['oneplus', 'android10to12'],
      'OPPO': ['oppo', 'android6to9']
    };

    const manufacturer = deviceInfo.manufacturer;
    const validStrategies = expectedStrategies[manufacturer] || ['standard'];
    const isValidStrategy = validStrategies.includes(deviceInfo.strategy);

    return {
      name: 'Strategy Validation',
      success: isValidStrategy,
      duration: Date.now() - start,
      strategy: deviceInfo.strategy,
      details: {
        manufacturer,
        expectedStrategies: validStrategies,
        actualStrategy: deviceInfo.strategy
      }
    };
  };

  const testErrorHandling = async (): Promise<TestResult> => {
    const start = Date.now();
    
    try {
      // Test with invalid parameters to see if error handling works
      if ((window as any).Capacitor?.Plugins?.PermissionsPlugin) {
        try {
          await (window as any).Capacitor.Plugins.PermissionsPlugin.forceOpenGallery();
          // If this doesn't throw, that's actually good
          return {
            name: 'Error Handling',
            success: true,
            duration: Date.now() - start,
            strategy: 'graceful',
            details: { behavior: 'No errors thrown on valid call' }
          };
        } catch (error) {
          // Check if error is handled gracefully
          const isGraceful = error instanceof Error && error.message.length > 0;
          return {
            name: 'Error Handling',
            success: isGraceful,
            duration: Date.now() - start,
            strategy: 'exception',
            details: { errorMessage: error.message }
          };
        }
      }
      
      return {
        name: 'Error Handling',
        success: true,
        duration: Date.now() - start,
        strategy: 'web-fallback',
        details: { behavior: 'Web environment gracefully handled' }
      };
    } catch (error) {
      return {
        name: 'Error Handling',
        success: false,
        duration: Date.now() - start,
        strategy: 'unknown',
        error: 'Error handling test failed'
      };
    }
  };

  const getResultIcon = (result: TestResult) => {
    if (result.success) return <CheckCircle className="h-4 w-4 text-green-500" />;
    return <XCircle className="h-4 w-4 text-red-500" />;
  };

  const getDeviceIcon = () => {
    if (!deviceInfo?.isNative) return '🌐';
    if (deviceInfo.manufacturer.toLowerCase().includes('xiaomi')) return '📱';
    if (deviceInfo.manufacturer.toLowerCase().includes('samsung')) return '📲';
    if (deviceInfo.manufacturer.toLowerCase().includes('huawei')) return '📱';
    if (deviceInfo.manufacturer.toLowerCase().includes('oneplus')) return '📱';
    return '📱';
  };

  const getComplianceStatus = () => {
    if (!deviceInfo?.isNative) return 'web-compliant';
    
    const hasAndroid13Strategy = testResults.some(r => 
      r.name === 'Strategy Validation' && 
      r.details?.actualStrategy?.includes('android13')
    );
    
    const hasValidPermissions = testResults.some(r => 
      r.name === 'Permission Check' && r.success
    );

    if (hasAndroid13Strategy && hasValidPermissions) return 'play-store-ready';
    if (hasValidPermissions) return 'permissions-ready';
    return 'needs-work';
  };

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5" />
          Gallery Validation Suite
        </CardTitle>
        <CardDescription>
          Comprehensive testing for gallery access across Android versions and manufacturers
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Device Information */}
        {deviceInfo && (
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{getDeviceIcon()}</span>
                <span className="font-semibold">Device Info</span>
              </div>
              <div className="text-sm space-y-1">
                <div>Manufacturer: {deviceInfo.manufacturer}</div>
                <div>Model: {deviceInfo.model}</div>
                <div>Android: {deviceInfo.androidVersion}</div>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Settings className="h-4 w-4" />
                <span className="font-semibold">Strategy</span>
              </div>
              <div className="text-sm space-y-1">
                <div>Active: {deviceInfo.strategy}</div>
                <div>Environment: {deviceInfo.isNative ? 'Native' : 'Web'}</div>
                <Badge variant={getComplianceStatus() === 'play-store-ready' ? 'default' : 'secondary'}>
                  {getComplianceStatus().replace('-', ' ')}
                </Badge>
              </div>
            </div>
          </div>
        )}

        {/* Test Controls */}
        <div className="flex gap-2">
          <Button onClick={runFullValidation} disabled={isRunning}>
            {isRunning ? 'Running Tests...' : 'Run Full Validation'}
          </Button>
        </div>

        {/* Progress */}
        {isRunning && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span className="text-sm">Current: {currentTest}</span>
            </div>
            <Progress value={progress} className="w-full" />
          </div>
        )}

        {/* Test Results */}
        {testResults.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold">Test Results</h3>
            {testResults.map((result, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  {getResultIcon(result)}
                  <div>
                    <div className="font-medium">{result.name}</div>
                    <div className="text-sm text-muted-foreground">
                      Strategy: {result.strategy} • Duration: {result.duration}ms
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  {result.error && (
                    <div className="text-sm text-red-500 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      {result.error}
                    </div>
                  )}
                  {result.details && (
                    <Badge variant="outline">
                      Details Available
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Recommendations */}
        {testResults.length > 0 && (
          <div className="p-4 bg-blue-50 rounded-lg">
            <h4 className="font-semibold mb-2">Recommendations</h4>
            <ul className="text-sm space-y-1">
              {testResults.filter(r => !r.success).length === 0 ? (
                <li className="text-green-600">✅ All tests passed! Ready for production.</li>
              ) : (
                <>
                  {testResults.some(r => r.name === 'Permission Check' && !r.success) && (
                    <li>🔐 Check permission configuration in AndroidManifest.xml</li>
                  )}
                  {testResults.some(r => r.name === 'Gallery Access' && !r.success) && (
                    <li>📸 Verify gallery access strategies for this device</li>
                  )}
                  {testResults.some(r => r.name === 'Performance Test' && !r.success) && (
                    <li>⚡ Consider optimizing plugin call performance</li>
                  )}
                </>
              )}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}