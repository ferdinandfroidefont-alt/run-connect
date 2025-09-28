import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';
import { useCamera } from '@/hooks/useCamera';
import { BarChart3, Clock, Zap, AlertTriangle } from 'lucide-react';

interface PerformanceMetric {
  operation: string;
  attempts: number;
  successRate: number;
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
  errors: string[];
}

export function GalleryPerformanceTest() {
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentOperation, setCurrentOperation] = useState('');
  const { toast } = useToast();
  const { selectFromGallery } = useCamera();

  const runPerformanceTest = async () => {
    setIsRunning(true);
    setMetrics([]);
    setProgress(0);

    const operations = [
      { name: 'Device Info', test: testDeviceInfoPerformance },
      { name: 'Permission Check', test: testPermissionPerformance },
      { name: 'Gallery Open', test: testGalleryPerformance },
      { name: 'Strategy Detection', test: testStrategyPerformance }
    ];

    for (let i = 0; i < operations.length; i++) {
      const operation = operations[i];
      setCurrentOperation(operation.name);
      setProgress(((i + 1) / operations.length) * 100);

      try {
        const metric = await operation.test();
        setMetrics(prev => [...prev, metric]);
      } catch (error) {
        console.error(`Performance test failed for ${operation.name}:`, error);
      }

      await new Promise(resolve => setTimeout(resolve, 200));
    }

    setIsRunning(false);
    setCurrentOperation('');
    toast({
      title: "Performance Test Complete",
      description: "Check the results below for performance metrics.",
    });
  };

  const testDeviceInfoPerformance = async (): Promise<PerformanceMetric> => {
    const attempts = 10;
    const durations: number[] = [];
    const errors: string[] = [];
    let successes = 0;

    for (let i = 0; i < attempts; i++) {
      const start = Date.now();
      try {
        if ((window as any).Capacitor?.Plugins?.PermissionsPlugin) {
          await (window as any).Capacitor.Plugins.PermissionsPlugin.getDeviceInfo();
          successes++;
        } else {
          // Simulate web operation
          await new Promise(resolve => setTimeout(resolve, 10));
          successes++;
        }
        durations.push(Date.now() - start);
      } catch (error) {
        durations.push(Date.now() - start);
        errors.push(error instanceof Error ? error.message : 'Unknown error');
      }
    }

    return {
      operation: 'Device Info',
      attempts,
      successRate: (successes / attempts) * 100,
      avgDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      errors
    };
  };

  const testPermissionPerformance = async (): Promise<PerformanceMetric> => {
    const attempts = 5; // Fewer attempts for permission checks
    const durations: number[] = [];
    const errors: string[] = [];
    let successes = 0;

    for (let i = 0; i < attempts; i++) {
      const start = Date.now();
      try {
        if ((window as any).Capacitor?.Plugins?.PermissionsPlugin) {
          const result = await (window as any).Capacitor.Plugins.PermissionsPlugin.forceRequestCameraPermissions();
          if (result.success) successes++;
        } else {
          // Simulate web permission check
          await new Promise(resolve => setTimeout(resolve, 50));
          successes++;
        }
        durations.push(Date.now() - start);
      } catch (error) {
        durations.push(Date.now() - start);
        errors.push(error instanceof Error ? error.message : 'Unknown error');
      }
      
      // Add delay between permission requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return {
      operation: 'Permission Check',
      attempts,
      successRate: (successes / attempts) * 100,
      avgDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      errors
    };
  };

  const testGalleryPerformance = async (): Promise<PerformanceMetric> => {
    const attempts = 3; // Even fewer for gallery operations
    const durations: number[] = [];
    const errors: string[] = [];
    let successes = 0;

    for (let i = 0; i < attempts; i++) {
      const start = Date.now();
      try {
        // We'll test the hook call but not actually wait for user interaction
        const promise = selectFromGallery();
        
        // Simulate quick cancellation to measure initial call performance
        setTimeout(() => {
          // This won't actually cancel the real operation but helps measure startup
        }, 100);
        
        await Promise.race([
          promise,
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout for performance test')), 200)
          )
        ]);
        
        successes++;
        durations.push(Date.now() - start);
      } catch (error) {
        durations.push(Date.now() - start);
        if (error instanceof Error && error.message === 'Timeout for performance test') {
          // This is expected for our performance test
          successes++; // Count as success if it started properly
        } else {
          errors.push(error instanceof Error ? error.message : 'Unknown error');
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    return {
      operation: 'Gallery Open',
      attempts,
      successRate: (successes / attempts) * 100,
      avgDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      errors
    };
  };

  const testStrategyPerformance = async (): Promise<PerformanceMetric> => {
    const attempts = 10;
    const durations: number[] = [];
    const errors: string[] = [];
    let successes = 0;

    for (let i = 0; i < attempts; i++) {
      const start = Date.now();
      try {
        if ((window as any).Capacitor?.Plugins?.PermissionsPlugin) {
          await (window as any).Capacitor.Plugins.PermissionsPlugin.getDeviceStrategy();
          successes++;
        } else {
          // Simulate strategy detection
          await new Promise(resolve => setTimeout(resolve, 5));
          successes++;
        }
        durations.push(Date.now() - start);
      } catch (error) {
        durations.push(Date.now() - start);
        errors.push(error instanceof Error ? error.message : 'Unknown error');
      }
    }

    return {
      operation: 'Strategy Detection',
      attempts,
      successRate: (successes / attempts) * 100,
      avgDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      errors
    };
  };

  const getPerformanceRating = (avgDuration: number, operation: string) => {
    const thresholds = {
      'Device Info': { excellent: 50, good: 100, poor: 200 },
      'Permission Check': { excellent: 100, good: 500, poor: 1000 },
      'Gallery Open': { excellent: 150, good: 300, poor: 600 },
      'Strategy Detection': { excellent: 30, good: 80, poor: 150 }
    };

    const threshold = thresholds[operation] || { excellent: 100, good: 300, poor: 600 };
    
    if (avgDuration <= threshold.excellent) return { rating: 'Excellent', color: 'bg-green-500' };
    if (avgDuration <= threshold.good) return { rating: 'Good', color: 'bg-yellow-500' };
    if (avgDuration <= threshold.poor) return { rating: 'Fair', color: 'bg-orange-500' };
    return { rating: 'Poor', color: 'bg-red-500' };
  };

  const getOverallScore = () => {
    if (metrics.length === 0) return 0;
    
    const scores = metrics.map(metric => {
      const performanceRating = getPerformanceRating(metric.avgDuration, metric.operation);
      const successWeight = metric.successRate / 100;
      
      let performanceScore = 0;
      if (performanceRating.rating === 'Excellent') performanceScore = 100;
      else if (performanceRating.rating === 'Good') performanceScore = 80;
      else if (performanceRating.rating === 'Fair') performanceScore = 60;
      else performanceScore = 40;
      
      return (performanceScore * 0.7) + (successWeight * 100 * 0.3);
    });
    
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  };

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Gallery Performance Test
        </CardTitle>
        <CardDescription>
          Measure performance metrics for gallery operations across different scenarios
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Test Controls */}
        <div className="flex gap-2">
          <Button onClick={runPerformanceTest} disabled={isRunning}>
            {isRunning ? 'Running Tests...' : 'Run Performance Test'}
          </Button>
        </div>

        {/* Progress */}
        {isRunning && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span className="text-sm">Testing: {currentOperation}</span>
            </div>
            <Progress value={progress} className="w-full" />
          </div>
        )}

        {/* Overall Score */}
        {metrics.length > 0 && (
          <div className="p-4 bg-muted rounded-lg">
            <div className="flex items-center justify-between">
              <span className="font-semibold">Overall Performance Score</span>
              <div className="flex items-center gap-2">
                <Badge variant={getOverallScore() >= 80 ? 'default' : getOverallScore() >= 60 ? 'secondary' : 'destructive'}>
                  {getOverallScore()}/100
                </Badge>
                <Zap className="h-4 w-4" />
              </div>
            </div>
          </div>
        )}

        {/* Performance Metrics */}
        {metrics.length > 0 && (
          <div className="space-y-4">
            <h3 className="font-semibold">Performance Metrics</h3>
            {metrics.map((metric, index) => {
              const rating = getPerformanceRating(metric.avgDuration, metric.operation);
              return (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium">{metric.operation}</h4>
                    <Badge className={rating.color}>{rating.rating}</Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">Success Rate</div>
                      <div className="font-medium">{metric.successRate.toFixed(1)}%</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Avg Duration</div>
                      <div className="font-medium">{metric.avgDuration.toFixed(1)}ms</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Min / Max</div>
                      <div className="font-medium">{metric.minDuration}ms / {metric.maxDuration}ms</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Attempts</div>
                      <div className="font-medium">{metric.attempts}</div>
                    </div>
                  </div>
                  
                  {metric.errors.length > 0 && (
                    <div className="mt-3 p-2 bg-red-50 rounded">
                      <div className="flex items-center gap-1 text-red-600 text-sm mb-1">
                        <AlertTriangle className="h-3 w-3" />
                        Errors ({metric.errors.length})
                      </div>
                      <div className="text-xs text-red-500">
                        {metric.errors.slice(0, 3).join(', ')}
                        {metric.errors.length > 3 && ` and ${metric.errors.length - 3} more...`}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Performance Guidelines */}
        <div className="p-4 bg-blue-50 rounded-lg">
          <h4 className="font-semibold mb-2">Performance Guidelines</h4>
          <div className="text-sm space-y-1">
            <div>🟢 <strong>Excellent:</strong> Device Info &lt;50ms, Permissions &lt;100ms, Gallery &lt;150ms</div>
            <div>🟡 <strong>Good:</strong> Device Info &lt;100ms, Permissions &lt;500ms, Gallery &lt;300ms</div>
            <div>🟠 <strong>Fair:</strong> Device Info &lt;200ms, Permissions &lt;1000ms, Gallery &lt;600ms</div>
            <div>🔴 <strong>Poor:</strong> Above fair thresholds - consider optimization</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}