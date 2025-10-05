import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { Suspense } from 'react';
import * as THREE from 'three';

interface Avatar3DProps {
  topItemId?: string;
  bottomItemId?: string;
  shoesItemId?: string;
  accessoryItemId?: string;
  className?: string;
}

// Couleurs pour les vêtements selon les points
const ITEM_COLORS: Record<string, string> = {
  // T-shirts (débloqués progressivement)
  'white-tshirt': '#FFFFFF',
  'blue-tshirt': '#3B82F6',
  'red-tshirt': '#EF4444',
  'gold-tshirt': '#F59E0B',
  'diamond-tshirt': '#06B6D4',
  
  // Pantalons
  'blue-shorts': '#1E40AF',
  'black-pants': '#18181B',
  'sport-pants': '#7C3AED',
  
  // Chaussures
  'sneakers-white': '#F3F4F6',
  'sneakers-red': '#DC2626',
  'running-pro': '#8B5CF6',
};

function AvatarMesh({ 
  topItemId = 'white-tshirt',
  bottomItemId,
  shoesItemId,
}: Avatar3DProps) {
  const topColor = ITEM_COLORS[topItemId] || '#FFFFFF';
  const bottomColor = bottomItemId ? ITEM_COLORS[bottomItemId] : '#2563EB';
  const shoesColor = shoesItemId ? ITEM_COLORS[shoesItemId] : '#F3F4F6';

  return (
    <group>
      {/* Tête */}
      <mesh position={[0, 1.7, 0]}>
        <sphereGeometry args={[0.25, 32, 32]} />
        <meshStandardMaterial color="#FFD1A9" />
      </mesh>

      {/* Corps / T-shirt */}
      <mesh position={[0, 1, 0]}>
        <cylinderGeometry args={[0.25, 0.35, 0.8, 32]} />
        <meshStandardMaterial color={topColor} />
      </mesh>

      {/* Bras gauche */}
      <mesh position={[-0.4, 1.1, 0]} rotation={[0, 0, 0.3]}>
        <cylinderGeometry args={[0.08, 0.08, 0.6, 16]} />
        <meshStandardMaterial color={topColor} />
      </mesh>

      {/* Bras droit */}
      <mesh position={[0.4, 1.1, 0]} rotation={[0, 0, -0.3]}>
        <cylinderGeometry args={[0.08, 0.08, 0.6, 16]} />
        <meshStandardMaterial color={topColor} />
      </mesh>

      {/* Main gauche */}
      <mesh position={[-0.5, 0.7, 0]}>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshStandardMaterial color="#FFD1A9" />
      </mesh>

      {/* Main droite */}
      <mesh position={[0.5, 0.7, 0]}>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshStandardMaterial color="#FFD1A9" />
      </mesh>

      {/* Pantalon / Jambes */}
      <mesh position={[-0.12, 0.2, 0]}>
        <cylinderGeometry args={[0.12, 0.1, 0.9, 16]} />
        <meshStandardMaterial color={bottomColor} />
      </mesh>
      <mesh position={[0.12, 0.2, 0]}>
        <cylinderGeometry args={[0.12, 0.1, 0.9, 16]} />
        <meshStandardMaterial color={bottomColor} />
      </mesh>

      {/* Chaussures */}
      <mesh position={[-0.12, -0.3, 0.05]}>
        <boxGeometry args={[0.18, 0.1, 0.25]} />
        <meshStandardMaterial color={shoesColor} />
      </mesh>
      <mesh position={[0.12, -0.3, 0.05]}>
        <boxGeometry args={[0.18, 0.1, 0.25]} />
        <meshStandardMaterial color={shoesColor} />
      </mesh>
    </group>
  );
}

export const Avatar3D = ({ 
  topItemId,
  bottomItemId,
  shoesItemId,
  accessoryItemId,
  className = "w-full h-64"
}: Avatar3DProps) => {
  return (
    <div className={className}>
      <Canvas>
        <Suspense fallback={null}>
          <PerspectiveCamera makeDefault position={[0, 1.5, 3]} />
          <OrbitControls 
            enableZoom={false}
            minPolarAngle={Math.PI / 4}
            maxPolarAngle={Math.PI / 2}
            target={[0, 1, 0]}
          />
          
          <ambientLight intensity={0.5} />
          <directionalLight position={[5, 5, 5]} intensity={1} />
          <pointLight position={[-5, 5, -5]} intensity={0.5} />
          
          <AvatarMesh 
            topItemId={topItemId}
            bottomItemId={bottomItemId}
            shoesItemId={shoesItemId}
            accessoryItemId={accessoryItemId}
          />
        </Suspense>
      </Canvas>
    </div>
  );
};
