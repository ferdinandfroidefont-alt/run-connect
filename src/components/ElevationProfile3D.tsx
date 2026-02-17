import React, { useRef, useMemo, useState, useEffect, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Line } from '@react-three/drei';
import * as THREE from 'three';
import { Button } from '@/components/ui/button';
import { Play, Pause, RotateCcw } from 'lucide-react';

interface ElevationProfile3DProps {
  coordinates: { lat: number; lng: number }[];
  elevations: number[];
  activityType?: string;
  autoPlay?: boolean;
  elevationExaggeration?: number;
  className?: string;
  routeStats?: {
    totalDistance: number;
    elevationGain: number;
    elevationLoss: number;
  } | null;
}

// Convert GPS to local meters relative to center
function gpsToLocal(
  coords: { lat: number; lng: number }[],
  elevations: number[],
  exaggeration: number
) {
  if (coords.length === 0) return { points: [], minElev: 0, maxElev: 0, center: { lat: 0, lng: 0 } };

  const centerLat = coords.reduce((s, c) => s + c.lat, 0) / coords.length;
  const centerLng = coords.reduce((s, c) => s + c.lng, 0) / coords.length;
  const minElev = Math.min(...elevations);
  const maxElev = Math.max(...elevations);

  const metersPerDegLat = 111320;
  const metersPerDegLng = 111320 * Math.cos((centerLat * Math.PI) / 180);

  const points = coords.map((c, i) => {
    const x = (c.lng - centerLng) * metersPerDegLng;
    const z = -(c.lat - centerLat) * metersPerDegLat; // negate for Three.js coord system
    const y = (elevations[i] - minElev) * exaggeration;
    return new THREE.Vector3(x, y, z);
  });

  return { points, minElev, maxElev, center: { lat: centerLat, lng: centerLng } };
}

// Smooth points with Catmull-Rom
function smoothPoints(points: THREE.Vector3[], segments = 4): THREE.Vector3[] {
  if (points.length < 2) return points;
  const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.5);
  return curve.getPoints(points.length * segments);
}

// Get color based on normalized elevation (0-1)
function getElevationColor(t: number): THREE.Color {
  // Green (low) -> Yellow (mid) -> Red (high)
  if (t < 0.5) {
    return new THREE.Color().setHSL(0.33 - t * 0.33, 0.85, 0.5);
  }
  return new THREE.Color().setHSL(0.17 - (t - 0.5) * 0.34, 0.85, 0.5);
}

// Route tube component
const RoutePath = ({ points, minElev, maxElev, exaggeration }: {
  points: THREE.Vector3[];
  minElev: number;
  maxElev: number;
  exaggeration: number;
}) => {
  const elevRange = maxElev - minElev || 1;

  const colors = useMemo(() => {
    return points.map(p => {
      const t = p.y / (elevRange * exaggeration);
      return getElevationColor(Math.min(1, Math.max(0, t)));
    });
  }, [points, elevRange, exaggeration]);

  const linePoints = useMemo(() => points.map(p => [p.x, p.y, p.z] as [number, number, number]), [points]);
  const lineColors = useMemo(() => colors.map(c => [c.r, c.g, c.b] as [number, number, number]), [colors]);

  return (
    <Line
      points={linePoints}
      vertexColors={lineColors}
      lineWidth={4}
    />
  );
};

// Ground plane
const Ground = ({ size }: { size: number }) => {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]} receiveShadow>
      <planeGeometry args={[size * 2.5, size * 2.5, 32, 32]} />
      <meshStandardMaterial
        color="#1a1a2e"
        transparent
        opacity={0.4}
        wireframe={false}
      />
    </mesh>
  );
};

// Grid helper
const GridHelper = ({ size }: { size: number }) => {
  return <gridHelper args={[size * 2.5, 20, '#333355', '#222244']} position={[0, -0.5, 0]} />;
};

// Runner dot
const RunnerDot = ({ points, progress }: { points: THREE.Vector3[]; progress: number }) => {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (!meshRef.current || points.length < 2) return;
    const idx = Math.min(Math.floor(progress * (points.length - 1)), points.length - 2);
    const frac = (progress * (points.length - 1)) - idx;
    const pos = new THREE.Vector3().lerpVectors(points[idx], points[idx + 1], frac);
    meshRef.current.position.copy(pos);
    meshRef.current.position.y += 3;
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[3, 16, 16]} />
      <meshStandardMaterial color="#5B7CFF" emissive="#5B7CFF" emissiveIntensity={0.5} />
    </mesh>
  );
};

// Elevation markers (min/max)
const ElevationMarkers = ({ points, minElev, maxElev, exaggeration }: {
  points: THREE.Vector3[];
  minElev: number;
  maxElev: number;
  exaggeration: number;
}) => {
  const { minPoint, maxPoint } = useMemo(() => {
    let minY = Infinity, maxY = -Infinity;
    let minP = points[0], maxP = points[0];
    points.forEach(p => {
      if (p.y < minY) { minY = p.y; minP = p; }
      if (p.y > maxY) { maxY = p.y; maxP = p; }
    });
    return { minPoint: minP, maxPoint: maxP };
  }, [points]);

  return (
    <>
      {/* Max elevation marker */}
      <mesh position={[maxPoint.x, maxPoint.y + 8, maxPoint.z]}>
        <coneGeometry args={[2, 6, 8]} />
        <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.3} />
      </mesh>
      {/* Min elevation marker */}
      <mesh position={[minPoint.x, minPoint.y + 8, minPoint.z]}>
        <coneGeometry args={[2, 6, 8]} />
        <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={0.3} />
      </mesh>
    </>
  );
};

// Camera controller for flyover animation
const CameraController = ({ 
  points, 
  isPlaying, 
  progress, 
  setProgress,
  orbitRef 
}: {
  points: THREE.Vector3[];
  isPlaying: boolean;
  progress: number;
  setProgress: (p: number) => void;
  orbitRef: React.RefObject<any>;
}) => {
  const { camera } = useThree();
  const speed = 0.008; // ~12s for full loop

  useFrame((_, delta) => {
    if (!isPlaying || points.length < 2) return;

    let newProgress = progress + speed * delta * 60;
    if (newProgress >= 1) newProgress = 0;
    setProgress(newProgress);

    const idx = Math.min(Math.floor(newProgress * (points.length - 1)), points.length - 2);
    const frac = (newProgress * (points.length - 1)) - idx;
    const pos = new THREE.Vector3().lerpVectors(points[idx], points[idx + 1], frac);

    // Camera offset: above and to the side
    const lookAheadIdx = Math.min(idx + 10, points.length - 1);
    const direction = new THREE.Vector3().subVectors(points[lookAheadIdx], pos).normalize();
    const side = new THREE.Vector3().crossVectors(direction, new THREE.Vector3(0, 1, 0)).normalize();

    camera.position.set(
      pos.x - direction.x * 80 + side.x * 30,
      pos.y + 60,
      pos.z - direction.z * 80 + side.z * 30
    );
    camera.lookAt(pos.x, pos.y, pos.z);

    if (orbitRef.current) {
      orbitRef.current.target.copy(pos);
    }
  });

  return null;
};

// Scene setup
const Scene = ({ points, minElev, maxElev, exaggeration, isPlaying, progress, setProgress }: {
  points: THREE.Vector3[];
  minElev: number;
  maxElev: number;
  exaggeration: number;
  isPlaying: boolean;
  progress: number;
  setProgress: (p: number) => void;
}) => {
  const orbitRef = useRef<any>(null);

  // Calculate scene scale
  const sceneSize = useMemo(() => {
    if (points.length === 0) return 100;
    const box = new THREE.Box3().setFromPoints(points);
    const size = new THREE.Vector3();
    box.getSize(size);
    return Math.max(size.x, size.z, 100);
  }, [points]);

  // Initial camera setup
  const { camera } = useThree();
  useEffect(() => {
    if (points.length < 2) return;
    const box = new THREE.Box3().setFromPoints(points);
    const center = new THREE.Vector3();
    box.getCenter(center);
    camera.position.set(center.x + sceneSize * 0.5, center.y + sceneSize * 0.4, center.z + sceneSize * 0.5);
    camera.lookAt(center);
  }, [points, sceneSize, camera]);

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[sceneSize, sceneSize, sceneSize * 0.5]} intensity={0.8} />
      <directionalLight position={[-sceneSize * 0.3, sceneSize * 0.5, -sceneSize * 0.3]} intensity={0.3} />

      <fog attach="fog" args={['#0a0a1a', sceneSize * 2, sceneSize * 5]} />

      <Ground size={sceneSize} />
      <GridHelper size={sceneSize} />
      <RoutePath points={points} minElev={minElev} maxElev={maxElev} exaggeration={exaggeration} />
      <RunnerDot points={points} progress={progress} />
      <ElevationMarkers points={points} minElev={minElev} maxElev={maxElev} exaggeration={exaggeration} />

      <CameraController
        points={points}
        isPlaying={isPlaying}
        progress={progress}
        setProgress={setProgress}
        orbitRef={orbitRef}
      />

      <OrbitControls
        ref={orbitRef}
        enabled={!isPlaying}
        enableDamping
        dampingFactor={0.05}
        maxPolarAngle={Math.PI / 2.1}
      />
    </>
  );
};

export const ElevationProfile3D: React.FC<ElevationProfile3DProps> = ({
  coordinates,
  elevations,
  autoPlay = true,
  elevationExaggeration = 2,
  className = '',
  routeStats,
}) => {
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [progress, setProgress] = useState(0);

  const { points, minElev, maxElev } = useMemo(
    () => gpsToLocal(coordinates, elevations, elevationExaggeration),
    [coordinates, elevations, elevationExaggeration]
  );

  const smoothed = useMemo(() => smoothPoints(points, 3), [points]);

  const handleReset = useCallback(() => {
    setProgress(0);
    setIsPlaying(true);
  }, []);

  if (coordinates.length < 2 || elevations.length < 2) {
    return (
      <div className={`flex items-center justify-center h-64 bg-muted/20 rounded-lg ${className}`}>
        <p className="text-sm text-muted-foreground">Pas assez de points pour la vue 3D</p>
      </div>
    );
  }

  return (
    <div className={`relative rounded-lg overflow-hidden ${className}`} style={{ minHeight: 300 }}>
      <Canvas
        style={{ background: '#0a0a1a' }}
        camera={{ fov: 60, near: 0.1, far: 50000 }}
        gl={{ antialias: true }}
      >
        <Scene
          points={smoothed}
          minElev={minElev}
          maxElev={maxElev}
          exaggeration={elevationExaggeration}
          isPlaying={isPlaying}
          progress={progress}
          setProgress={setProgress}
        />
      </Canvas>

      {/* Controls overlay */}
      <div className="absolute bottom-3 left-3 flex items-center gap-2">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setIsPlaying(!isPlaying)}
          className="bg-background/80 backdrop-blur-sm border border-border/50 h-8 w-8 p-0"
        >
          {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={handleReset}
          className="bg-background/80 backdrop-blur-sm border border-border/50 h-8 w-8 p-0"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Stats overlay */}
      {routeStats && (
        <div className="absolute top-3 right-3 bg-background/70 backdrop-blur-sm border border-border/50 rounded-lg px-3 py-2 text-xs space-y-1">
          <div className="text-foreground font-medium">{(routeStats.totalDistance / 1000).toFixed(1)} km</div>
          <div className="text-green-400">↑ {routeStats.elevationGain}m</div>
          <div className="text-red-400">↓ {routeStats.elevationLoss}m</div>
        </div>
      )}

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted/30">
        <div
          className="h-full bg-primary transition-all duration-100"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
    </div>
  );
};
