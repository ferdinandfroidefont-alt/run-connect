import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows } from '@react-three/drei';
import { Suspense, useMemo } from 'react';
import * as THREE from 'three';

interface PhotorealisticAvatar3DProps {
  topItemId?: string;
  bottomItemId?: string;
  shoesItemId?: string;
  accessoryItemId?: string;
  className?: string;
}

// Créer un matériau stylisé Bitmoji-like avec PBR
function createSkinMaterial() {
  const material = new THREE.MeshToonMaterial({
    color: new THREE.Color('#FFD1A9'),
    gradientMap: createGradientMap(),
  });
  return material;
}

function createGradientMap() {
  const colors = new Uint8Array([0, 128, 255]);
  const gradientMap = new THREE.DataTexture(colors, colors.length, 1, THREE.RedFormat);
  gradientMap.needsUpdate = true;
  return gradientMap;
}

// Créer un matériau de vêtement avec style cartoon
function createClothMaterial(color: string) {
  const material = new THREE.MeshToonMaterial({
    color: new THREE.Color(color),
  });
  return material;
}

function BitmojiStyleAvatarModel({ 
  topItemId,
  bottomItemId,
  shoesItemId,
}: PhotorealisticAvatar3DProps) {
  
  const topColor = useMemo(() => getItemColor(topItemId || 'white-tshirt'), [topItemId]);
  const bottomColor = useMemo(() => getItemColor(bottomItemId || 'blue-shorts'), [bottomItemId]);
  const shoesColor = useMemo(() => getItemColor(shoesItemId || 'sneakers-white'), [shoesItemId]);
  
  const skinMaterial = useMemo(() => createSkinMaterial(), []);
  const topMaterial = useMemo(() => createClothMaterial(topColor), [topColor]);
  const bottomMaterial = useMemo(() => createClothMaterial(bottomColor), [bottomColor]);
  const shoesMaterial = useMemo(() => createClothMaterial(shoesColor), [shoesColor]);
  const hairMaterial = useMemo(() => createClothMaterial('#3D2817'), []);
  const eyeMaterial = useMemo(() => createClothMaterial('#1F2937'), []);
  const eyeWhiteMaterial = useMemo(() => createClothMaterial('#FFFFFF'), []);

  return (
    <group>
      {/* === TÊTE STYLE BITMOJI === */}
      <group position={[0, 1.65, 0]}>
        {/* Visage ovale stylisé */}
        <mesh castShadow receiveShadow material={skinMaterial}>
          <sphereGeometry args={[0.32, 32, 32]} />
        </mesh>
        
        {/* Yeux expressifs - gauche */}
        <group position={[-0.10, 0.08, 0.25]}>
          {/* Blanc de l'œil */}
          <mesh material={eyeWhiteMaterial}>
            <sphereGeometry args={[0.06, 16, 16]} />
          </mesh>
          {/* Pupille */}
          <mesh position={[0.02, 0, 0.04]} material={eyeMaterial}>
            <sphereGeometry args={[0.03, 16, 16]} />
          </mesh>
        </group>
        
        {/* Yeux expressifs - droit */}
        <group position={[0.10, 0.08, 0.25]}>
          {/* Blanc de l'œil */}
          <mesh material={eyeWhiteMaterial}>
            <sphereGeometry args={[0.06, 16, 16]} />
          </mesh>
          {/* Pupille */}
          <mesh position={[-0.02, 0, 0.04]} material={eyeMaterial}>
            <sphereGeometry args={[0.03, 16, 16]} />
          </mesh>
        </group>
        
        {/* Nez stylisé */}
        <mesh position={[0, -0.02, 0.28]} material={skinMaterial}>
          <sphereGeometry args={[0.04, 16, 16]} />
        </mesh>
        
        {/* Sourire léger */}
        <mesh position={[0, -0.12, 0.24]} rotation={[0, 0, 0]}>
          <torusGeometry args={[0.08, 0.02, 8, 16, Math.PI]} />
          <meshToonMaterial color="#DC2626" />
        </mesh>
        
        {/* Oreilles */}
        <mesh position={[-0.30, 0, 0.05]} rotation={[0, 0, -0.2]} material={skinMaterial}>
          <sphereGeometry args={[0.08, 16, 16]} />
        </mesh>
        <mesh position={[0.30, 0, 0.05]} rotation={[0, 0, 0.2]} material={skinMaterial}>
          <sphereGeometry args={[0.08, 16, 16]} />
        </mesh>
      </group>

      {/* === CHEVEUX COURTS MODERNES === */}
      <mesh position={[0, 1.85, -0.02]} castShadow material={hairMaterial}>
        <sphereGeometry args={[0.28, 24, 24, 0, Math.PI * 2, 0, Math.PI * 0.6]} />
      </mesh>

      {/* === COU === */}
      <mesh position={[0, 1.38, 0]} castShadow receiveShadow material={skinMaterial}>
        <cylinderGeometry args={[0.10, 0.12, 0.20, 24]} />
      </mesh>

      {/* === TORSE - T-SHIRT TECHNIQUE === */}
      <group position={[0, 0.95, 0]}>
        {/* Corps principal */}
        <mesh castShadow receiveShadow material={topMaterial}>
          <capsuleGeometry args={[0.25, 0.6, 24, 24]} />
        </mesh>
        
        {/* Col du t-shirt */}
        <mesh position={[0, 0.38, 0]} castShadow material={topMaterial}>
          <torusGeometry args={[0.12, 0.04, 16, 24]} />
        </mesh>
        
        {/* Bande réfléchissante (détail running) */}
        <mesh position={[0, 0.15, 0.26]} rotation={[0, 0, 0]}>
          <planeGeometry args={[0.35, 0.04]} />
          <meshToonMaterial color="#E5E7EB" />
        </mesh>
      </group>

      {/* === BRAS GAUCHE EN MOUVEMENT (pose running) === */}
      <group position={[-0.38, 1.05, 0]} rotation={[0.5, 0, 0.3]}>
        {/* Épaule + haut du bras */}
        <mesh castShadow receiveShadow material={topMaterial}>
          <cylinderGeometry args={[0.08, 0.07, 0.35, 20]} />
        </mesh>
        {/* Avant-bras */}
        <group position={[0, -0.25, 0]} rotation={[-0.8, 0, 0]}>
          <mesh castShadow receiveShadow material={skinMaterial}>
            <cylinderGeometry args={[0.07, 0.06, 0.25, 20]} />
          </mesh>
          {/* Main en poing (running) */}
          <mesh position={[0, -0.18, 0]} castShadow material={skinMaterial}>
            <sphereGeometry args={[0.09, 16, 16]} />
          </mesh>
        </group>
      </group>

      {/* === BRAS DROIT EN MOUVEMENT (pose running) === */}
      <group position={[0.38, 1.05, 0]} rotation={[-0.5, 0, -0.3]}>
        {/* Épaule + haut du bras */}
        <mesh castShadow receiveShadow material={topMaterial}>
          <cylinderGeometry args={[0.08, 0.07, 0.35, 20]} />
        </mesh>
        {/* Avant-bras */}
        <group position={[0, -0.25, 0]} rotation={[0.8, 0, 0]}>
          <mesh castShadow receiveShadow material={skinMaterial}>
            <cylinderGeometry args={[0.07, 0.06, 0.25, 20]} />
          </mesh>
          {/* Main en poing (running) */}
          <mesh position={[0, -0.18, 0]} castShadow material={skinMaterial}>
            <sphereGeometry args={[0.09, 16, 16]} />
          </mesh>
        </group>
      </group>

      {/* === SHORTS DE RUNNING === */}
      <mesh position={[0, 0.45, 0]} castShadow receiveShadow material={bottomMaterial}>
        <cylinderGeometry args={[0.28, 0.26, 0.35, 24]} />
      </mesh>

      {/* === JAMBE GAUCHE (légèrement levée - pose running) === */}
      <group position={[-0.12, 0.20, 0]} rotation={[0.2, 0, 0]}>
        {/* Cuisse */}
        <mesh castShadow receiveShadow material={bottomMaterial}>
          <cylinderGeometry args={[0.11, 0.10, 0.50, 20]} />
        </mesh>
        {/* Genou */}
        <mesh position={[0, -0.25, 0]} castShadow material={skinMaterial}>
          <sphereGeometry args={[0.11, 16, 16]} />
        </mesh>
        {/* Mollet */}
        <group position={[0, -0.50, 0]} rotation={[-0.3, 0, 0]}>
          <mesh castShadow receiveShadow material={skinMaterial}>
            <cylinderGeometry args={[0.09, 0.08, 0.40, 20]} />
          </mesh>
        </group>
      </group>

      {/* === JAMBE DROITE (appui au sol) === */}
      <group position={[0.12, 0.15, 0]} rotation={[-0.1, 0, 0]}>
        {/* Cuisse */}
        <mesh castShadow receiveShadow material={bottomMaterial}>
          <cylinderGeometry args={[0.11, 0.10, 0.50, 20]} />
        </mesh>
        {/* Genou */}
        <mesh position={[0, -0.25, 0]} castShadow material={skinMaterial}>
          <sphereGeometry args={[0.11, 16, 16]} />
        </mesh>
        {/* Mollet */}
        <mesh position={[0, -0.50, 0]} castShadow receiveShadow material={skinMaterial}>
          <cylinderGeometry args={[0.09, 0.08, 0.40, 20]} />
        </mesh>
      </group>

      {/* === CHAUSSURES DE RUNNING MODERNES === */}
      {/* Chaussure gauche (levée) */}
      <group position={[-0.12, -0.35, 0.05]} rotation={[0.4, 0, 0]}>
        {/* Semelle épaisse */}
        <mesh castShadow receiveShadow material={shoesMaterial}>
          <boxGeometry args={[0.18, 0.08, 0.30]} />
        </mesh>
        {/* Dessus de la chaussure */}
        <mesh position={[0, 0.08, -0.02]} castShadow material={shoesMaterial}>
          <boxGeometry args={[0.16, 0.10, 0.24]} />
        </mesh>
        {/* Avant arrondi */}
        <mesh position={[0, 0.04, 0.12]} castShadow material={shoesMaterial}>
          <sphereGeometry args={[0.09, 16, 16]} />
        </mesh>
        {/* Logo Nike/Decathlon style */}
        <mesh position={[-0.10, 0.10, 0.02]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[0.06, 0.03]} />
          <meshToonMaterial color="#FFFFFF" />
        </mesh>
      </group>

      {/* Chaussure droite (au sol) */}
      <group position={[0.12, -0.58, 0.05]}>
        {/* Semelle épaisse */}
        <mesh castShadow receiveShadow material={shoesMaterial}>
          <boxGeometry args={[0.18, 0.08, 0.30]} />
        </mesh>
        {/* Dessus de la chaussure */}
        <mesh position={[0, 0.08, -0.02]} castShadow material={shoesMaterial}>
          <boxGeometry args={[0.16, 0.10, 0.24]} />
        </mesh>
        {/* Avant arrondi */}
        <mesh position={[0, 0.04, 0.12]} castShadow material={shoesMaterial}>
          <sphereGeometry args={[0.09, 16, 16]} />
        </mesh>
        {/* Logo Nike/Decathlon style */}
        <mesh position={[0.10, 0.10, 0.02]} rotation={[0, -Math.PI / 2, 0]}>
          <planeGeometry args={[0.06, 0.03]} />
          <meshToonMaterial color="#FFFFFF" />
        </mesh>
      </group>
    </group>
  );
}

function getItemColor(itemId: string): string {
  const ITEM_COLORS: Record<string, string> = {
    'white-tshirt': '#F3F4F6',
    'blue-tshirt': '#3B82F6',
    'red-tshirt': '#EF4444',
    'gold-tshirt': '#F59E0B',
    'diamond-tshirt': '#06B6D4',
    'blue-shorts': '#1E40AF',
    'black-pants': '#18181B',
    'sport-pants': '#7C3AED',
    'sneakers-white': '#E5E7EB',
    'sneakers-red': '#DC2626',
    'running-pro': '#8B5CF6',
  };
  
  return ITEM_COLORS[itemId] || '#F3F4F6';
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
      <Canvas shadows camera={{ position: [0, 0.8, 3.5], fov: 45 }}>
        <Suspense fallback={null}>
          <OrbitControls 
            enableZoom={true}
            minPolarAngle={Math.PI / 6}
            maxPolarAngle={Math.PI / 1.6}
            target={[0, 0.7, 0]}
            minDistance={2.5}
            maxDistance={5}
            enablePan={false}
          />
          
          {/* Éclairage style Bitmoji/Memoji */}
          <ambientLight intensity={0.6} />
          
          {/* Lumière principale douce */}
          <directionalLight 
            position={[5, 8, 5]} 
            intensity={1.2}
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
          />
          
          {/* Fill light pour éviter les ombres trop dures */}
          <directionalLight 
            position={[-3, 4, -2]} 
            intensity={0.5}
            color="#b8d4ff"
          />
          
          {/* Rim light pour contour */}
          <directionalLight 
            position={[0, 4, -5]} 
            intensity={0.8}
            color="#ffe4b5"
          />
          
          {/* Environnement propre et lumineux */}
          <Environment preset="city" background={false} />
          
          {/* Avatar Bitmoji Style */}
          <BitmojiStyleAvatarModel 
            topItemId={topItemId}
            bottomItemId={bottomItemId}
            shoesItemId={shoesItemId}
            accessoryItemId={accessoryItemId}
          />
          
          {/* Ombres douces */}
          <ContactShadows 
            position={[0, -0.6, 0]} 
            opacity={0.35} 
            scale={2.5} 
            blur={2} 
            far={2}
            resolution={256}
          />
        </Suspense>
      </Canvas>
    </div>
  );
};