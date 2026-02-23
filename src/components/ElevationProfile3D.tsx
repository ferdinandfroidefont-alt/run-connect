import React, { useRef, useMemo, useState, useEffect, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Line } from '@react-three/drei';
import * as THREE from 'three';
import { Button } from '@/components/ui/button';
import { Play, Pause, RotateCcw, Locate } from 'lucide-react';

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
    const z = -(c.lat - centerLat) * metersPerDegLat;
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

// Route path - uniform blue with halo
const RoutePath = ({ points }: { points: THREE.Vector3[] }) => {
  const linePoints = useMemo(() => points.map(p => [p.x, p.y, p.z] as [number, number, number]), [points]);

  return (
    <>
      {/* Halo / shadow underneath */}
      <Line
        points={linePoints}
        color="#5B7CFF"
        lineWidth={12}
        transparent
        opacity={0.15}
      />
      {/* Main route line */}
      <Line
        points={linePoints}
        color="#5B7CFF"
        lineWidth={6}
      />
    </>
  );
};

// Ground plane
const Ground = ({ size }: { size: number }) => {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]} receiveShadow>
      <planeGeometry args={[size * 2.5, size * 2.5, 16, 16]} />
      <meshStandardMaterial
        color="#111118"
        transparent
        opacity={0.3}
      />
    </mesh>
  );
};

// Grid helper
const GridHelper = ({ size }: { size: number }) => {
  return <gridHelper args={[size * 2.5, 12, '#2a2a40', '#1a1a30']} position={[0, -0.5, 0]} />;
};

// Runner dot - smaller and more discreet
const RunnerDot = ({ points, progress, onPositionUpdate }: { points: THREE.Vector3[]; progress: number; onPositionUpdate?: (y: number) => void }) => {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (!meshRef.current || points.length < 2) return;
    const idx = Math.min(Math.floor(progress * (points.length - 1)), points.length - 2);
    const frac = (progress * (points.length - 1)) - idx;
    const pos = new THREE.Vector3().lerpVectors(points[idx], points[idx + 1], frac);
    meshRef.current.position.copy(pos);
    meshRef.current.position.y += 2;
    onPositionUpdate?.(pos.y);
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[2, 16, 16]} />
      <meshStandardMaterial color="#5B7CFF" emissive="#5B7CFF" emissiveIntensity={0.3} />
    </mesh>
  );
};

// Elevation markers (min/max)
const ElevationMarkers = ({ points }: { points: THREE.Vector3[] }) => {
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
      <mesh position={[maxPoint.x, maxPoint.y + 6, maxPoint.z]}>
        <coneGeometry args={[1.5, 5, 8]} />
        <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.2} />
      </mesh>
      <mesh position={[minPoint.x, minPoint.y + 6, minPoint.z]}>
        <coneGeometry args={[1.5, 5, 8]} />
        <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={0.2} />
      </mesh>
    </>
  );
};

// Camera controller with smooth interpolation
const CameraController = ({ 
  points, 
  isPlaying, 
  progress, 
  setProgress,
  orbitRef,
  sceneSize,
  recenterFlag,
}: {
  points: THREE.Vector3[];
  isPlaying: boolean;
  progress: number;
  setProgress: (p: number) => void;
  orbitRef: React.RefObject<any>;
  sceneSize: number;
  recenterFlag: number;
}) => {
  const { camera } = useThree();
  const targetCamPos = useRef(new THREE.Vector3());
  const targetLookAt = useRef(new THREE.Vector3());
  const isRecentering = useRef(false);
  const recenterLerp = useRef(0);

  // Compute initial position
  const initialPos = useMemo(() => {
    if (points.length < 2) return { cam: new THREE.Vector3(0, 100, 0), target: new THREE.Vector3() };
    const box = new THREE.Box3().setFromPoints(points);
    const center = new THREE.Vector3();
    box.getCenter(center);
    return {
      cam: new THREE.Vector3(center.x + sceneSize * 0.6, center.y + sceneSize * 0.5, center.z + sceneSize * 0.6),
      target: center.clone(),
    };
  }, [points, sceneSize]);

  // Recenter when flag changes
  useEffect(() => {
    if (recenterFlag > 0) {
      isRecentering.current = true;
      recenterLerp.current = 0;
    }
  }, [recenterFlag]);

  useFrame((_, delta) => {
    // Smooth recenter transition
    if (isRecentering.current) {
      recenterLerp.current = Math.min(1, recenterLerp.current + delta * 2);
      const t = recenterLerp.current;
      const ease = t * t * (3 - 2 * t); // smoothstep
      camera.position.lerp(initialPos.cam, ease * 0.08);
      if (orbitRef.current) {
        orbitRef.current.target.lerp(initialPos.target, ease * 0.08);
      }
      camera.lookAt(orbitRef.current?.target || initialPos.target);
      if (recenterLerp.current >= 1) {
        isRecentering.current = false;
      }
      return;
    }

    if (!isPlaying || points.length < 2) return;

    // Slow speed: 0.0005 base (4x slower than before)
    let newProgress = progress + 0.0005 * delta * 60;
    if (newProgress >= 1) newProgress = 0;
    setProgress(newProgress);

    const idx = Math.min(Math.floor(newProgress * (points.length - 1)), points.length - 2);
    const frac = (newProgress * (points.length - 1)) - idx;
    const pos = new THREE.Vector3().lerpVectors(points[idx], points[idx + 1], frac);

    // Look-ahead 30 points for smoother direction
    const lookAheadIdx = Math.min(idx + 30, points.length - 1);
    const direction = new THREE.Vector3().subVectors(points[lookAheadIdx], pos).normalize();
    const side = new THREE.Vector3().crossVectors(direction, new THREE.Vector3(0, 1, 0)).normalize();

    const height = pos.y + sceneSize * 0.3;
    targetCamPos.current.set(
      pos.x - direction.x * 80 + side.x * 30,
      height,
      pos.z - direction.z * 80 + side.z * 30
    );
    targetLookAt.current.copy(pos);

    // Smooth interpolation (lerp factor 0.03)
    camera.position.lerp(targetCamPos.current, 0.03);
    
    if (orbitRef.current) {
      orbitRef.current.target.lerp(targetLookAt.current, 0.03);
    }
    camera.lookAt(orbitRef.current?.target || targetLookAt.current);
  });

  return null;
};

// Scene setup
const Scene = ({ points, minElev, maxElev, exaggeration, isPlaying, progress, setProgress, onPositionUpdate, recenterFlag }: {
  points: THREE.Vector3[];
  minElev: number;
  maxElev: number;
  exaggeration: number;
  isPlaying: boolean;
  progress: number;
  setProgress: (p: number) => void;
  onPositionUpdate?: (y: number) => void;
  recenterFlag: number;
}) => {
  const orbitRef = useRef<any>(null);

  const sceneSize = useMemo(() => {
    if (points.length === 0) return 100;
    const box = new THREE.Box3().setFromPoints(points);
    const size = new THREE.Vector3();
    box.getSize(size);
    return Math.max(size.x, size.z, 100);
  }, [points]);

  // Initial camera setup - semi-isometric
  const { camera } = useThree();
  useEffect(() => {
    if (points.length < 2) return;
    const box = new THREE.Box3().setFromPoints(points);
    const center = new THREE.Vector3();
    box.getCenter(center);
    camera.position.set(
      center.x + sceneSize * 0.6,
      center.y + sceneSize * 0.5,
      center.z + sceneSize * 0.6
    );
    camera.lookAt(center);
    if (orbitRef.current) {
      orbitRef.current.target.copy(center);
    }
  }, [points, sceneSize, camera]);

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[sceneSize, sceneSize, sceneSize * 0.5]} intensity={0.8} />
      <directionalLight position={[-sceneSize * 0.3, sceneSize * 0.5, -sceneSize * 0.3]} intensity={0.3} />

      <fog attach="fog" args={['#0d0d18', sceneSize * 2.5, sceneSize * 6]} />

      <Ground size={sceneSize} />
      <GridHelper size={sceneSize} />
      <RoutePath points={points} />
      <RunnerDot points={points} progress={progress} onPositionUpdate={onPositionUpdate} />
      <ElevationMarkers points={points} />

      <CameraController
        points={points}
        isPlaying={isPlaying}
        progress={progress}
        setProgress={setProgress}
        orbitRef={orbitRef}
        sceneSize={sceneSize}
        recenterFlag={recenterFlag}
      />

      <OrbitControls
        ref={orbitRef}
        enabled={!isPlaying}
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.5}
        maxPolarAngle={Math.PI / 2.2}
        minDistance={sceneSize * 0.2}
        maxDistance={sceneSize * 3}
      />
    </>
  );
};

export const ElevationProfile3D: React.FC<ElevationProfile3DProps> = ({
  coordinates,
  elevations,
  autoPlay = false,
  elevationExaggeration = 2,
  className = '',
  routeStats,
}) => {
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [progress, setProgress] = useState(0);
  const [currentElevY, setCurrentElevY] = useState(0);
  const [recenterFlag, setRecenterFlag] = useState(0);

  const { points, minElev, maxElev } = useMemo(
    () => gpsToLocal(coordinates, elevations, elevationExaggeration),
    [coordinates, elevations, elevationExaggeration]
  );

  const smoothed = useMemo(() => smoothPoints(points, 3), [points]);

  const totalRouteDistance = useMemo(() => {
    if (routeStats?.totalDistance) return routeStats.totalDistance;
    let d = 0;
    for (let i = 1; i < coordinates.length; i++) {
      const dlat = (coordinates[i].lat - coordinates[i - 1].lat) * 111320;
      const dlng = (coordinates[i].lng - coordinates[i - 1].lng) * 111320 * Math.cos((coordinates[i].lat * Math.PI) / 180);
      d += Math.sqrt(dlat * dlat + dlng * dlng);
    }
    return d;
  }, [coordinates, routeStats]);

  const currentKm = (progress * totalRouteDistance / 1000).toFixed(2);
  const currentAltitude = Math.round(minElev + currentElevY / elevationExaggeration);

  const handleReset = useCallback(() => {
    setProgress(0);
    setIsPlaying(false);
  }, []);

  const handleRecenter = useCallback(() => {
    setRecenterFlag(f => f + 1);
    setIsPlaying(false);
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
        style={{ background: '#0d0d18' }}
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
          onPositionUpdate={setCurrentElevY}
          recenterFlag={recenterFlag}
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
        <Button
          size="sm"
          variant="secondary"
          onClick={handleRecenter}
          className="bg-background/80 backdrop-blur-sm border border-border/50 h-8 w-8 p-0"
        >
          <Locate className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Live stats overlay */}
      <div className="absolute top-3 right-3 bg-background/80 backdrop-blur-sm border border-border/50 rounded-lg px-3 py-2 text-xs space-y-1.5">
        <div className="text-primary font-bold text-sm">{currentKm} km</div>
        <div className="text-foreground">⛰️ {currentAltitude} m</div>
        {routeStats && (
          <>
            <div className="border-t border-border/30 pt-1 mt-1 text-muted-foreground">
              Total : {(routeStats.totalDistance / 1000).toFixed(1)} km
            </div>
            <div className="text-green-400">↑ {routeStats.elevationGain}m</div>
            <div className="text-red-400">↓ {routeStats.elevationLoss}m</div>
          </>
        )}
        <div className="text-muted-foreground">{Math.round(progress * 100)}%</div>
      </div>

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
