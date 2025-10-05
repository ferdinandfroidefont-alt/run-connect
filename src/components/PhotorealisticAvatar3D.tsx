import React, { Suspense, useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, useGLTF } from '@react-three/drei';
import { Loader2 } from 'lucide-react';

interface PhotorealisticAvatar3DProps {
  rpmAvatarUrl?: string | null;
  topItemId?: string;
  bottomItemId?: string;
  shoesItemId?: string;
  accessoryItemId?: string;
  className?: string;
  useFallback?: boolean;
}

interface AvatarModelProps {
  url: string;
  topItemId?: string;
  bottomItemId?: string;
  shoesItemId?: string;
}

function AvatarModel({ url, topItemId, bottomItemId, shoesItemId }: AvatarModelProps) {
  const { scene } = useGLTF(url);
  
  // Apply wardrobe colors to the avatar
  useEffect(() => {
    scene.traverse((child: any) => {
      if (child.isMesh) {
        // Apply colors to clothing based on wardrobe
        if (child.name?.includes('Top') || child.name?.includes('Shirt') || child.name?.includes('Outfit_Top')) {
          const color = getItemColor(topItemId);
          if (color && child.material) {
            child.material.color.set(color);
          }
        }
        if (child.name?.includes('Bottom') || child.name?.includes('Pants') || child.name?.includes('Outfit_Bottom')) {
          const color = getItemColor(bottomItemId);
          if (color && child.material) {
            child.material.color.set(color);
          }
        }
        if (child.name?.includes('Footwear') || child.name?.includes('Shoes') || child.name?.includes('Outfit_Footwear')) {
          const color = getItemColor(shoesItemId);
          if (color && child.material) {
            child.material.color.set(color);
          }
        }
      }
    });
  }, [scene, topItemId, bottomItemId, shoesItemId]);

  return <primitive object={scene} scale={2} position={[0, -1.5, 0]} />;
}

function LoadingFallback() {
  return (
    <mesh>
      <boxGeometry args={[1, 2, 1]} />
      <meshStandardMaterial color="#94a3b8" />
    </mesh>
  );
}

// Fallback cartoon avatar (simplified version)
function FallbackAvatar({ topItemId, bottomItemId, shoesItemId }: { topItemId?: string; bottomItemId?: string; shoesItemId?: string }) {
  const topColor = getItemColor(topItemId) || '#3B82F6';
  const bottomColor = getItemColor(bottomItemId) || '#1E293B';
  const shoesColor = getItemColor(shoesItemId) || '#0F172A';

  return (
    <group position={[0, -0.5, 0]}>
      {/* Head */}
      <mesh position={[0, 1.3, 0]}>
        <sphereGeometry args={[0.3, 32, 32]} />
        <meshStandardMaterial color="#FFD1A1" />
      </mesh>
      
      {/* Body */}
      <mesh position={[0, 0.6, 0]}>
        <capsuleGeometry args={[0.25, 0.6, 16, 32]} />
        <meshStandardMaterial color={topColor} />
      </mesh>
      
      {/* Legs */}
      <mesh position={[-0.12, -0.1, 0]}>
        <capsuleGeometry args={[0.1, 0.6, 16, 32]} />
        <meshStandardMaterial color={bottomColor} />
      </mesh>
      <mesh position={[0.12, -0.1, 0]}>
        <capsuleGeometry args={[0.1, 0.6, 16, 32]} />
        <meshStandardMaterial color={bottomColor} />
      </mesh>
      
      {/* Shoes */}
      <mesh position={[-0.12, -0.5, 0.05]}>
        <boxGeometry args={[0.15, 0.1, 0.25]} />
        <meshStandardMaterial color={shoesColor} />
      </mesh>
      <mesh position={[0.12, -0.5, 0.05]}>
        <boxGeometry args={[0.15, 0.1, 0.25]} />
        <meshStandardMaterial color={shoesColor} />
      </mesh>
    </group>
  );
}

// Helper function to get item colors
const getItemColor = (itemId?: string): string | null => {
  if (!itemId) return null;

  const colorMap: Record<string, string> = {
    // T-shirts
    'white-tshirt': '#FFFFFF',
    'blue-tshirt': '#3B82F6',
    'red-tshirt': '#EF4444',
    'green-tshirt': '#10B981',
    'black-tshirt': '#1F2937',
    'gold-tshirt': '#FFD700',
    'silver-tshirt': '#C0C0C0',
    'bronze-tshirt': '#CD7F32',
    'platinum-tshirt': '#E5E4E2',
    'diamond-tshirt': '#B9F2FF',

    // Pants/Shorts
    'blue-shorts': '#1E40AF',
    'black-shorts': '#0F172A',
    'white-shorts': '#F8FAFC',
    'red-shorts': '#DC2626',
    'green-shorts': '#059669',
    'gold-shorts': '#D4AF37',
    'silver-shorts': '#B8B8B8',
    'bronze-shorts': '#B87333',
    'platinum-shorts': '#D3D3D3',
    'diamond-shorts': '#A8E4F0',

    // Shoes
    'sneakers-white': '#FFFFFF',
    'sneakers-black': '#000000',
    'sneakers-blue': '#2563EB',
    'sneakers-red': '#DC2626',
    'sneakers-green': '#16A34A',
    'running-shoes-gold': '#FFD700',
    'running-shoes-silver': '#C0C0C0',
    'running-shoes-bronze': '#CD7F32',
    'running-shoes-platinum': '#E5E4E2',
    'running-shoes-diamond': '#B9F2FF',
  };

  return colorMap[itemId] || null;
};

export const PhotorealisticAvatar3D = ({ 
  rpmAvatarUrl,
  topItemId,
  bottomItemId,
  shoesItemId,
  accessoryItemId,
  className = "",
  useFallback = false
}: PhotorealisticAvatar3DProps) => {
  const [hasError, setHasError] = useState(false);
  const shouldUseRPM = rpmAvatarUrl && !useFallback && !hasError;

  return (
    <div className={`w-full h-full relative ${className}`}>
      <Canvas
        camera={{ position: [0, 0, 3], fov: 50 }}
        shadows
        gl={{ antialias: true, alpha: true }}
      >
        <OrbitControls 
          enableZoom={true}
          enablePan={false}
          minDistance={shouldUseRPM ? 2 : 1.5}
          maxDistance={shouldUseRPM ? 6 : 5}
          target={shouldUseRPM ? [0, 0, 0] : [0, 0.5, 0]}
        />

        {/* Photorealistic lighting */}
        <ambientLight intensity={0.4} />
        <directionalLight
          position={[5, 5, 5]}
          intensity={1.2}
          castShadow
          shadow-mapSize={[2048, 2048]}
        />
        <directionalLight position={[-3, 2, -5]} intensity={0.5} />
        <spotLight
          position={[0, 5, 2]}
          angle={0.3}
          penumbra={1}
          intensity={0.8}
          castShadow
        />

        <Environment preset="studio" />

        <Suspense fallback={<LoadingFallback />}>
          {shouldUseRPM ? (
            <AvatarModel 
              url={rpmAvatarUrl}
              topItemId={topItemId}
              bottomItemId={bottomItemId}
              shoesItemId={shoesItemId}
            />
          ) : (
            <FallbackAvatar 
              topItemId={topItemId}
              bottomItemId={bottomItemId}
              shoesItemId={shoesItemId}
            />
          )}
        </Suspense>

        <ContactShadows 
          position={[0, shouldUseRPM ? -1.5 : -0.8, 0]}
          opacity={0.4}
          scale={shouldUseRPM ? 5 : 4}
          blur={2.5}
          far={3}
        />
      </Canvas>

      {!shouldUseRPM && rpmAvatarUrl && hasError && (
        <div className="absolute top-2 right-2 text-xs bg-background/80 px-2 py-1 rounded">
          Utilisation avatar de secours
        </div>
      )}
    </div>
  );
};
