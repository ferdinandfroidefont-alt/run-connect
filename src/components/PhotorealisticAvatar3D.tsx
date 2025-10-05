import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import { Suspense, useRef } from 'react';
import * as THREE from 'three';

interface PhotorealisticAvatar3DProps {
  avatarModelId?: string;
  topItemId?: string;
  bottomItemId?: string;
  shoesItemId?: string;
  className?: string;
}

interface ProceduralAvatarProps {
  modelId: string;
  topItemId?: string;
  bottomItemId?: string;
  shoesItemId?: string;
}

// Avatar configurations (style Fortnite/stylisé)
const AVATAR_CONFIGS = {
  'male-athlete-01': { 
    skinTone: '#D4A574', 
    hairColor: '#2C1810', 
    build: 'athletic',
    gender: 'male'
  },
  'female-athlete-01': { 
    skinTone: '#E8B899', 
    hairColor: '#8B4513', 
    build: 'athletic',
    gender: 'female'
  },
  'male-runner-01': { 
    skinTone: '#C89664', 
    hairColor: '#1A1A1A', 
    build: 'slim',
    gender: 'male'
  },
};

const ProceduralAvatar = ({ modelId, topItemId, bottomItemId, shoesItemId }: ProceduralAvatarProps) => {
  const config = AVATAR_CONFIGS[modelId as keyof typeof AVATAR_CONFIGS] || AVATAR_CONFIGS['male-athlete-01'];
  const groupRef = useRef<THREE.Group>(null);

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {/* Head */}
      <mesh position={[0, 1.3, 0]}>
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshStandardMaterial 
          color={config.skinTone}
          roughness={0.7}
          metalness={0.1}
        />
      </mesh>
      
      {/* Hair */}
      <mesh position={[0, 1.5, 0]}>
        <sphereGeometry args={[0.52, 32, 32, 0, Math.PI * 2, 0, Math.PI * 0.6]} />
        <meshStandardMaterial 
          color={config.hairColor}
          roughness={0.9}
          metalness={0.1}
        />
      </mesh>
      
      {/* Eyes - Left */}
      <mesh position={[-0.15, 1.35, 0.4]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial color="#FFFFFF" />
      </mesh>
      <mesh position={[-0.15, 1.35, 0.42]}>
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshStandardMaterial color="#2C1810" />
      </mesh>
      
      {/* Eyes - Right */}
      <mesh position={[0.15, 1.35, 0.4]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial color="#FFFFFF" />
      </mesh>
      <mesh position={[0.15, 1.35, 0.42]}>
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshStandardMaterial color="#2C1810" />
      </mesh>

      {/* Torso/Body */}
      <mesh position={[0, 0.5, 0]}>
        <capsuleGeometry args={[0.4, 0.8, 16, 32]} />
        <meshStandardMaterial 
          color={getItemColor(topItemId || 'white-tshirt')}
          roughness={0.8}
          metalness={0.2}
        />
      </mesh>

      {/* Left Arm */}
      <mesh position={[-0.6, 0.5, 0]} rotation={[0, 0, 0.2]}>
        <capsuleGeometry args={[0.15, 0.7, 8, 16]} />
        <meshStandardMaterial 
          color={config.skinTone}
          roughness={0.7}
          metalness={0.1}
        />
      </mesh>
      
      {/* Right Arm */}
      <mesh position={[0.6, 0.5, 0]} rotation={[0, 0, -0.2]}>
        <capsuleGeometry args={[0.15, 0.7, 8, 16]} />
        <meshStandardMaterial 
          color={config.skinTone}
          roughness={0.7}
          metalness={0.1}
        />
      </mesh>

      {/* Left Leg */}
      <mesh position={[-0.2, -0.5, 0]}>
        <capsuleGeometry args={[0.18, 0.9, 8, 16]} />
        <meshStandardMaterial 
          color={getItemColor(bottomItemId || 'black-shorts')}
          roughness={0.8}
          metalness={0.2}
        />
      </mesh>
      
      {/* Right Leg */}
      <mesh position={[0.2, -0.5, 0]}>
        <capsuleGeometry args={[0.18, 0.9, 8, 16]} />
        <meshStandardMaterial 
          color={getItemColor(bottomItemId || 'black-shorts')}
          roughness={0.8}
          metalness={0.2}
        />
      </mesh>

      {/* Left Shoe */}
      <mesh position={[-0.2, -1.05, 0.05]}>
        <boxGeometry args={[0.25, 0.15, 0.35]} />
        <meshStandardMaterial 
          color={getItemColor(shoesItemId || 'sneakers-white')}
          roughness={0.6}
          metalness={0.3}
        />
      </mesh>
      
      {/* Right Shoe */}
      <mesh position={[0.2, -1.05, 0.05]}>
        <boxGeometry args={[0.25, 0.15, 0.35]} />
        <meshStandardMaterial 
          color={getItemColor(shoesItemId || 'sneakers-white')}
          roughness={0.6}
          metalness={0.3}
        />
      </mesh>
    </group>
  );
};

const LoadingFallback = () => (
  <mesh>
    <sphereGeometry args={[0.5, 32, 32]} />
    <meshStandardMaterial color="#cccccc" />
  </mesh>
);

// Helper function to get item colors
const getItemColor = (itemId?: string): string => {
  if (!itemId) return '#FFFFFF';

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

  return colorMap[itemId] || '#FFFFFF';
};

export const PhotorealisticAvatar3D = ({ 
  avatarModelId = 'male-athlete-01',
  topItemId,
  bottomItemId,
  shoesItemId,
  className = "w-full h-full"
}: PhotorealisticAvatar3DProps) => {
  return (
    <div className={className}>
      <Canvas
        camera={{ position: [0, 0, 3.5], fov: 50 }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.8} />
        <directionalLight position={[5, 5, 5]} intensity={1.2} />
        <directionalLight position={[-5, 5, -5]} intensity={0.6} />
        <pointLight position={[0, 2, 2]} intensity={0.8} />
        
        <Suspense fallback={<LoadingFallback />}>
          <ProceduralAvatar 
            modelId={avatarModelId}
            topItemId={topItemId}
            bottomItemId={bottomItemId}
            shoesItemId={shoesItemId}
          />
        </Suspense>

        <OrbitControls
          enablePan={false}
          minDistance={2}
          maxDistance={5}
          target={[0, 0, 0]}
          minPolarAngle={Math.PI / 4}
          maxPolarAngle={Math.PI / 1.5}
        />
        
        <Environment preset="city" />
      </Canvas>
    </div>
  );
};
