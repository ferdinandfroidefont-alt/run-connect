import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, ContactShadows, useGLTF } from '@react-three/drei';
import { Suspense, useEffect, useState } from 'react';
import * as THREE from 'three';

interface PhotorealisticAvatar3DProps {
  topItemId?: string;
  bottomItemId?: string;
  shoesItemId?: string;
  accessoryItemId?: string;
  className?: string;
  avatarUrl?: string;
}

// Default Ready Player Me avatar (you can replace with your own)
const DEFAULT_AVATAR_URL = 'https://models.readyplayer.me/6747c9f3d60d05e4ed17df10.glb';

function AvatarModel({ 
  avatarUrl = DEFAULT_AVATAR_URL,
  topItemId,
  bottomItemId,
  shoesItemId,
}: PhotorealisticAvatar3DProps) {
  const gltf = useGLTF(avatarUrl);
  const [model, setModel] = useState<THREE.Group | null>(null);

  useEffect(() => {
    if (gltf && gltf.scene) {
      const clonedScene = gltf.scene.clone();
      
      // Apply clothing textures based on items
      clonedScene.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          
          // Enhanced material properties for photorealism
          if (mesh.material) {
            const material = mesh.material as THREE.MeshStandardMaterial;
            
            // Apply clothing colors based on equipped items
            if (mesh.name.toLowerCase().includes('shirt') || mesh.name.toLowerCase().includes('top')) {
              if (topItemId) {
                material.color = new THREE.Color(getItemColor(topItemId));
              }
            }
            
            if (mesh.name.toLowerCase().includes('pants') || mesh.name.toLowerCase().includes('bottom')) {
              if (bottomItemId) {
                material.color = new THREE.Color(getItemColor(bottomItemId));
              }
            }
            
            if (mesh.name.toLowerCase().includes('shoes') || mesh.name.toLowerCase().includes('foot')) {
              if (shoesItemId) {
                material.color = new THREE.Color(getItemColor(shoesItemId));
              }
            }
            
            // Enhance material for photorealism
            material.roughness = 0.8;
            material.metalness = 0.1;
            material.envMapIntensity = 1.0;
          }
        }
      });
      
      setModel(clonedScene);
    }
  }, [gltf, topItemId, bottomItemId, shoesItemId]);

  if (!model) return null;

  return <primitive object={model} scale={1} position={[0, -1, 0]} />;
}

function getItemColor(itemId: string): string {
  const ITEM_COLORS: Record<string, string> = {
    'white-tshirt': '#FFFFFF',
    'blue-tshirt': '#3B82F6',
    'red-tshirt': '#EF4444',
    'gold-tshirt': '#F59E0B',
    'diamond-tshirt': '#06B6D4',
    'blue-shorts': '#1E40AF',
    'black-pants': '#18181B',
    'sport-pants': '#7C3AED',
    'sneakers-white': '#F3F4F6',
    'sneakers-red': '#DC2626',
    'running-pro': '#8B5CF6',
  };
  
  return ITEM_COLORS[itemId] || '#FFFFFF';
}

export const PhotorealisticAvatar3D = ({ 
  topItemId,
  bottomItemId,
  shoesItemId,
  accessoryItemId,
  className = "w-full h-64",
  avatarUrl
}: PhotorealisticAvatar3DProps) => {
  return (
    <div className={className}>
      <Canvas shadows>
        <Suspense fallback={null}>
          <PerspectiveCamera makeDefault position={[0, 0.5, 2.5]} />
          <OrbitControls 
            enableZoom={true}
            minPolarAngle={Math.PI / 4}
            maxPolarAngle={Math.PI / 2}
            target={[0, 0.5, 0]}
            minDistance={1.5}
            maxDistance={4}
          />
          
          {/* Photorealistic lighting setup */}
          <ambientLight intensity={0.4} />
          <directionalLight 
            position={[5, 5, 5]} 
            intensity={1.2}
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
          />
          <pointLight position={[-5, 3, -5]} intensity={0.5} color="#ffffff" />
          <spotLight 
            position={[0, 5, 0]} 
            angle={0.3} 
            penumbra={1} 
            intensity={0.8}
            castShadow
          />
          
          {/* HDRI Environment for reflections */}
          <Environment preset="city" />
          
          {/* Avatar Model */}
          <AvatarModel 
            avatarUrl={avatarUrl}
            topItemId={topItemId}
            bottomItemId={bottomItemId}
            shoesItemId={shoesItemId}
            accessoryItemId={accessoryItemId}
          />
          
          {/* Ground shadow */}
          <ContactShadows 
            position={[0, -1, 0]} 
            opacity={0.4} 
            scale={10} 
            blur={2} 
            far={4} 
          />
        </Suspense>
      </Canvas>
    </div>
  );
};
