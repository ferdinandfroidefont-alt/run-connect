import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, ContactShadows } from '@react-three/drei';
import { Suspense, useMemo } from 'react';
import * as THREE from 'three';

interface PhotorealisticAvatar3DProps {
  topItemId?: string;
  bottomItemId?: string;
  shoesItemId?: string;
  accessoryItemId?: string;
  className?: string;
}

// Créer un matériau de peau photoréaliste avec PBR
function createSkinMaterial() {
  const material = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#FFD1A9'),
    roughness: 0.6,
    metalness: 0.0,
    envMapIntensity: 0.5,
  });
  return material;
}

// Créer un matériau de vêtement avec PBR
function createClothMaterial(color: string, roughness: number = 0.8) {
  const material = new THREE.MeshStandardMaterial({
    color: new THREE.Color(color),
    roughness: roughness,
    metalness: 0.05,
    envMapIntensity: 1.0,
  });
  return material;
}

function PhotorealisticAvatarModel({ 
  topItemId,
  bottomItemId,
  shoesItemId,
}: PhotorealisticAvatar3DProps) {
  
  const topColor = useMemo(() => getItemColor(topItemId || 'white-tshirt'), [topItemId]);
  const bottomColor = useMemo(() => getItemColor(bottomItemId || 'blue-shorts'), [bottomItemId]);
  const shoesColor = useMemo(() => getItemColor(shoesItemId || 'sneakers-white'), [shoesItemId]);
  
  const skinMaterial = useMemo(() => createSkinMaterial(), []);
  const topMaterial = useMemo(() => createClothMaterial(topColor, 0.7), [topColor]);
  const bottomMaterial = useMemo(() => createClothMaterial(bottomColor, 0.8), [bottomColor]);
  const shoesMaterial = useMemo(() => createClothMaterial(shoesColor, 0.6), [shoesColor]);
  const hairMaterial = useMemo(() => createClothMaterial('#3D2817', 0.4), []);

  return (
    <group>
      {/* Tête plus détaillée */}
      <mesh position={[0, 1.65, 0]} castShadow receiveShadow material={skinMaterial}>
        <sphereGeometry args={[0.28, 64, 64]} />
      </mesh>

      {/* Cheveux */}
      <mesh position={[0, 1.82, -0.05]} castShadow material={hairMaterial}>
        <sphereGeometry args={[0.25, 32, 32]} />
      </mesh>

      {/* Cou */}
      <mesh position={[0, 1.42, 0]} castShadow receiveShadow material={skinMaterial}>
        <cylinderGeometry args={[0.10, 0.12, 0.18, 32]} />
      </mesh>

      {/* Corps / T-shirt avec détails */}
      <group>
        {/* Torse principal */}
        <mesh position={[0, 1.0, 0]} castShadow receiveShadow material={topMaterial}>
          <cylinderGeometry args={[0.28, 0.32, 0.7, 32]} />
        </mesh>
        
        {/* Col du t-shirt */}
        <mesh position={[0, 1.33, 0]} castShadow material={topMaterial}>
          <torusGeometry args={[0.12, 0.03, 16, 32]} />
        </mesh>
      </group>

      {/* Bras gauche avec articulation */}
      <group position={[-0.42, 1.15, 0]} rotation={[0, 0, 0.2]}>
        <mesh castShadow receiveShadow material={topMaterial}>
          <cylinderGeometry args={[0.09, 0.08, 0.4, 32]} />
        </mesh>
        <mesh position={[0, -0.3, 0]} castShadow receiveShadow material={skinMaterial}>
          <cylinderGeometry args={[0.08, 0.07, 0.25, 32]} />
        </mesh>
      </group>

      {/* Bras droit avec articulation */}
      <group position={[0.42, 1.15, 0]} rotation={[0, 0, -0.2]}>
        <mesh castShadow receiveShadow material={topMaterial}>
          <cylinderGeometry args={[0.09, 0.08, 0.4, 32]} />
        </mesh>
        <mesh position={[0, -0.3, 0]} castShadow receiveShadow material={skinMaterial}>
          <cylinderGeometry args={[0.08, 0.07, 0.25, 32]} />
        </mesh>
      </group>

      {/* Main gauche */}
      <mesh position={[-0.50, 0.75, 0]} castShadow receiveShadow material={skinMaterial}>
        <sphereGeometry args={[0.11, 32, 32]} />
      </mesh>

      {/* Main droite */}
      <mesh position={[0.50, 0.75, 0]} castShadow receiveShadow material={skinMaterial}>
        <sphereGeometry args={[0.11, 32, 32]} />
      </mesh>

      {/* Pantalon / Jambes avec détails */}
      <group>
        {/* Jambe gauche */}
        <group position={[-0.14, 0.25, 0]}>
          <mesh castShadow receiveShadow material={bottomMaterial}>
            <cylinderGeometry args={[0.13, 0.11, 0.85, 32]} />
          </mesh>
          {/* Genou */}
          <mesh position={[0, -0.2, 0]} castShadow material={bottomMaterial}>
            <sphereGeometry args={[0.13, 32, 32]} />
          </mesh>
        </group>
        
        {/* Jambe droite */}
        <group position={[0.14, 0.25, 0]}>
          <mesh castShadow receiveShadow material={bottomMaterial}>
            <cylinderGeometry args={[0.13, 0.11, 0.85, 32]} />
          </mesh>
          {/* Genou */}
          <mesh position={[0, -0.2, 0]} castShadow material={bottomMaterial}>
            <sphereGeometry args={[0.13, 32, 32]} />
          </mesh>
        </group>
      </group>

      {/* Chaussures détaillées */}
      <group>
        {/* Chaussure gauche */}
        <mesh position={[-0.14, -0.25, 0.08]} castShadow receiveShadow material={shoesMaterial}>
          <boxGeometry args={[0.20, 0.12, 0.32]} />
        </mesh>
        <mesh position={[-0.14, -0.23, 0.20]} castShadow material={shoesMaterial}>
          <sphereGeometry args={[0.10, 16, 16]} />
        </mesh>
        
        {/* Chaussure droite */}
        <mesh position={[0.14, -0.25, 0.08]} castShadow receiveShadow material={shoesMaterial}>
          <boxGeometry args={[0.20, 0.12, 0.32]} />
        </mesh>
        <mesh position={[0.14, -0.23, 0.20]} castShadow material={shoesMaterial}>
          <sphereGeometry args={[0.10, 16, 16]} />
        </mesh>
      </group>
    </group>
  );
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
  className = "w-full h-64"
}: PhotorealisticAvatar3DProps) => {
  return (
    <div className={className}>
      <Canvas shadows camera={{ position: [0, 1.2, 3], fov: 50 }}>
        <Suspense fallback={null}>
          <OrbitControls 
            enableZoom={true}
            minPolarAngle={Math.PI / 6}
            maxPolarAngle={Math.PI / 1.8}
            target={[0, 0.9, 0]}
            minDistance={2}
            maxDistance={4.5}
            enablePan={false}
          />
          
          {/* Éclairage photoréaliste avancé */}
          <ambientLight intensity={0.3} />
          
          {/* Lumière principale (Key Light) */}
          <directionalLight 
            position={[5, 8, 5]} 
            intensity={1.5}
            castShadow
            shadow-mapSize-width={4096}
            shadow-mapSize-height={4096}
            shadow-camera-far={50}
            shadow-camera-left={-10}
            shadow-camera-right={10}
            shadow-camera-top={10}
            shadow-camera-bottom={-10}
          />
          
          {/* Fill Light */}
          <pointLight position={[-4, 3, -3]} intensity={0.6} color="#b8d4ff" />
          
          {/* Rim Light */}
          <spotLight 
            position={[0, 6, -4]} 
            angle={0.4} 
            penumbra={1} 
            intensity={1.2}
            color="#ffe4b5"
          />
          
          {/* Lumière d'ambiance chaude */}
          <hemisphereLight 
            intensity={0.4} 
            color="#ffffff" 
            groundColor="#8b7355" 
          />
          
          {/* Environnement HDRI pour reflets réalistes */}
          <Environment preset="sunset" background={false} />
          
          {/* Avatar Model */}
          <PhotorealisticAvatarModel 
            topItemId={topItemId}
            bottomItemId={bottomItemId}
            shoesItemId={shoesItemId}
            accessoryItemId={accessoryItemId}
          />
          
          {/* Ombres de contact réalistes */}
          <ContactShadows 
            position={[0, -0.35, 0]} 
            opacity={0.5} 
            scale={3} 
            blur={2.5} 
            far={3}
            resolution={512}
          />
        </Suspense>
      </Canvas>
    </div>
  );
};
