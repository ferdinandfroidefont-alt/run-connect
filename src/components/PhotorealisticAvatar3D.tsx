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

// Créer un matériau avec contour noir (cell-shading style Bitmoji)
function createOutlineMaterial() {
  return new THREE.MeshBasicMaterial({
    color: '#000000',
    side: THREE.BackSide,
  });
}

// Créer un matériau style Bitmoji avec cell-shading
function createToonMaterial(color: string) {
  const material = new THREE.MeshToonMaterial({
    color: new THREE.Color(color),
    gradientMap: createCellShadingGradient(),
  });
  return material;
}

function createCellShadingGradient() {
  // 3 niveaux de shading pour l'effet cartoon
  const colors = new Uint8Array([0, 128, 255]);
  const gradientMap = new THREE.DataTexture(colors, colors.length, 1, THREE.RedFormat);
  gradientMap.needsUpdate = true;
  return gradientMap;
}

// Wrapper pour ajouter un contour noir à n'importe quel mesh
function OutlinedMesh({ 
  children, 
  outlineThickness = 1.03 
}: { 
  children: React.ReactElement; 
  outlineThickness?: number;
}) {
  const outlineMaterial = useMemo(() => createOutlineMaterial(), []);
  
  return (
    <group>
      {/* Contour noir */}
      <mesh material={outlineMaterial} scale={outlineThickness}>
        {children.props.children}
      </mesh>
      {/* Mesh principal */}
      {children}
    </group>
  );
}

function BitmojiStyleAvatarModel({ 
  topItemId,
  bottomItemId,
  shoesItemId,
}: PhotorealisticAvatar3DProps) {
  
  const topColor = useMemo(() => getItemColor(topItemId || 'white-tshirt'), [topItemId]);
  const bottomColor = useMemo(() => getItemColor(bottomItemId || 'blue-shorts'), [bottomItemId]);
  const shoesColor = useMemo(() => getItemColor(shoesItemId || 'sneakers-white'), [shoesItemId]);
  
  const skinMaterial = useMemo(() => createToonMaterial('#FFD1A9'), []);
  const topMaterial = useMemo(() => createToonMaterial(topColor), [topColor]);
  const bottomMaterial = useMemo(() => createToonMaterial(bottomColor), [bottomColor]);
  const shoesMaterial = useMemo(() => createToonMaterial(shoesColor), [shoesColor]);
  const hairMaterial = useMemo(() => createToonMaterial('#3D2817'), []);
  const eyeMaterial = useMemo(() => createToonMaterial('#1F2937'), []);
  const eyeWhiteMaterial = useMemo(() => createToonMaterial('#FFFFFF'), []);
  const teethMaterial = useMemo(() => createToonMaterial('#FFFFFF'), []);
  const mouthMaterial = useMemo(() => createToonMaterial('#DC2626'), []);
  const eyebrowMaterial = useMemo(() => createToonMaterial('#2D1810'), []);

  return (
    <group>
      {/* === TÊTE STYLE BITMOJI (GROSSE TÊTE CHIBI) === */}
      <group position={[0, 1.2, 0]}>
        {/* Visage - taille augmentée pour style chibi */}
        <OutlinedMesh outlineThickness={1.04}>
          <mesh castShadow receiveShadow material={skinMaterial}>
            <sphereGeometry args={[0.45, 32, 32]} />
          </mesh>
        </OutlinedMesh>
        
        {/* === YEUX EXPRESSIFS STYLE BITMOJI === */}
        {/* Œil gauche */}
        <group position={[-0.14, 0.12, 0.35]}>
          {/* Blanc de l'œil - plus grand */}
          <OutlinedMesh outlineThickness={1.05}>
            <mesh material={eyeWhiteMaterial}>
              <sphereGeometry args={[0.09, 16, 16]} />
            </mesh>
          </OutlinedMesh>
          {/* Pupille */}
          <mesh position={[0.02, -0.01, 0.06]} material={eyeMaterial}>
            <sphereGeometry args={[0.045, 16, 16]} />
          </mesh>
          {/* Reflet brillant 1 */}
          <mesh position={[0.01, 0.025, 0.08]} material={eyeWhiteMaterial}>
            <sphereGeometry args={[0.015, 8, 8]} />
          </mesh>
          {/* Reflet brillant 2 */}
          <mesh position={[0.03, 0.01, 0.08]} material={eyeWhiteMaterial}>
            <sphereGeometry args={[0.008, 8, 8]} />
          </mesh>
          {/* Cils supérieurs */}
          <mesh position={[0, 0.08, 0.05]} rotation={[0, 0, -0.1]}>
            <boxGeometry args={[0.02, 0.05, 0.01]} />
            <meshBasicMaterial color="#000000" />
          </mesh>
          <mesh position={[0.04, 0.075, 0.05]} rotation={[0, 0, 0.15]}>
            <boxGeometry args={[0.02, 0.04, 0.01]} />
            <meshBasicMaterial color="#000000" />
          </mesh>
        </group>
        
        {/* Œil droit */}
        <group position={[0.14, 0.12, 0.35]}>
          {/* Blanc de l'œil - plus grand */}
          <OutlinedMesh outlineThickness={1.05}>
            <mesh material={eyeWhiteMaterial}>
              <sphereGeometry args={[0.09, 16, 16]} />
            </mesh>
          </OutlinedMesh>
          {/* Pupille */}
          <mesh position={[-0.02, -0.01, 0.06]} material={eyeMaterial}>
            <sphereGeometry args={[0.045, 16, 16]} />
          </mesh>
          {/* Reflet brillant 1 */}
          <mesh position={[-0.01, 0.025, 0.08]} material={eyeWhiteMaterial}>
            <sphereGeometry args={[0.015, 8, 8]} />
          </mesh>
          {/* Reflet brillant 2 */}
          <mesh position={[-0.03, 0.01, 0.08]} material={eyeWhiteMaterial}>
            <sphereGeometry args={[0.008, 8, 8]} />
          </mesh>
          {/* Cils supérieurs */}
          <mesh position={[0, 0.08, 0.05]} rotation={[0, 0, 0.1]}>
            <boxGeometry args={[0.02, 0.05, 0.01]} />
            <meshBasicMaterial color="#000000" />
          </mesh>
          <mesh position={[-0.04, 0.075, 0.05]} rotation={[0, 0, -0.15]}>
            <boxGeometry args={[0.02, 0.04, 0.01]} />
            <meshBasicMaterial color="#000000" />
          </mesh>
        </group>
        
        {/* === SOURCILS EXPRESSIFS === */}
        {/* Sourcil gauche */}
        <mesh position={[-0.14, 0.24, 0.36]} rotation={[0, 0, -0.15]}>
          <boxGeometry args={[0.12, 0.025, 0.02]} />
          <meshBasicMaterial color="#2D1810" />
        </mesh>
        
        {/* Sourcil droit */}
        <mesh position={[0.14, 0.24, 0.36]} rotation={[0, 0, 0.15]}>
          <boxGeometry args={[0.12, 0.025, 0.02]} />
          <meshBasicMaterial color="#2D1810" />
        </mesh>
        
        {/* Nez simplifié (deux petits points) */}
        <mesh position={[-0.02, 0, 0.42]}>
          <sphereGeometry args={[0.015, 8, 8]} />
          <meshBasicMaterial color="#E5B299" />
        </mesh>
        <mesh position={[0.02, 0, 0.42]}>
          <sphereGeometry args={[0.015, 8, 8]} />
          <meshBasicMaterial color="#E5B299" />
        </mesh>
        
        {/* === GRAND SOURIRE AVEC DENTS === */}
        {/* Bouche rouge */}
        <mesh position={[0, -0.12, 0.38]} rotation={[0.3, 0, 0]}>
          <torusGeometry args={[0.12, 0.03, 8, 16, Math.PI]} />
          <meshToonMaterial color="#DC2626" />
        </mesh>
        {/* Dents visibles */}
        <mesh position={[0, -0.11, 0.40]} rotation={[0.2, 0, 0]}>
          <boxGeometry args={[0.15, 0.025, 0.02]} />
          <meshBasicMaterial color="#FFFFFF" />
        </mesh>
        
        {/* Oreilles */}
        <OutlinedMesh outlineThickness={1.04}>
          <mesh position={[-0.42, 0, 0.05]} rotation={[0, 0, -0.2]} material={skinMaterial}>
            <sphereGeometry args={[0.10, 16, 16]} />
          </mesh>
        </OutlinedMesh>
        <OutlinedMesh outlineThickness={1.04}>
          <mesh position={[0.42, 0, 0.05]} rotation={[0, 0, 0.2]} material={skinMaterial}>
            <sphereGeometry args={[0.10, 16, 16]} />
          </mesh>
        </OutlinedMesh>
      </group>

      {/* === CHEVEUX VOLUMIEUX STYLE BITMOJI === */}
      {/* Couche principale */}
      <OutlinedMesh outlineThickness={1.03}>
        <mesh position={[0, 1.50, 0]} castShadow material={hairMaterial}>
          <sphereGeometry args={[0.40, 24, 24, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
        </mesh>
      </OutlinedMesh>
      
      {/* Mèches sur le côté gauche */}
      <OutlinedMesh outlineThickness={1.03}>
        <mesh position={[-0.28, 1.45, 0.15]} rotation={[0, 0, -0.4]} castShadow material={hairMaterial}>
          <sphereGeometry args={[0.18, 16, 16]} />
        </mesh>
      </OutlinedMesh>
      
      {/* Mèches sur le côté droit */}
      <OutlinedMesh outlineThickness={1.03}>
        <mesh position={[0.28, 1.45, 0.15]} rotation={[0, 0, 0.4]} castShadow material={hairMaterial}>
          <sphereGeometry args={[0.18, 16, 16]} />
        </mesh>
      </OutlinedMesh>
      
      {/* Volume sur le dessus */}
      <OutlinedMesh outlineThickness={1.03}>
        <mesh position={[0, 1.62, 0]} castShadow material={hairMaterial}>
          <sphereGeometry args={[0.22, 16, 16]} />
        </mesh>
      </OutlinedMesh>

      {/* === COU CHIBI (plus court) === */}
      <OutlinedMesh outlineThickness={1.04}>
        <mesh position={[0, 0.82, 0]} castShadow receiveShadow material={skinMaterial}>
          <cylinderGeometry args={[0.12, 0.14, 0.15, 24]} />
        </mesh>
      </OutlinedMesh>

      {/* === CORPS CHIBI (petit et trapu) === */}
      <OutlinedMesh outlineThickness={1.03}>
        <mesh position={[0, 0.48, 0]} castShadow receiveShadow material={topMaterial}>
          <capsuleGeometry args={[0.22, 0.35, 24, 24]} />
        </mesh>
      </OutlinedMesh>

      {/* === BRAS COURTS STYLE CHIBI === */}
      {/* Bras gauche levé (pose running cute) */}
      <group position={[-0.30, 0.56, 0]} rotation={[0.6, 0, 0.4]}>
        <OutlinedMesh outlineThickness={1.04}>
          <mesh castShadow receiveShadow material={topMaterial}>
            <cylinderGeometry args={[0.07, 0.06, 0.25, 20]} />
          </mesh>
        </OutlinedMesh>
        {/* Main ronde (pas de doigts) */}
        <OutlinedMesh outlineThickness={1.04}>
          <mesh position={[0, -0.16, 0]} castShadow material={skinMaterial}>
            <sphereGeometry args={[0.08, 16, 16]} />
          </mesh>
        </OutlinedMesh>
      </group>
      
      {/* Bras droit (pose running cute) */}
      <group position={[0.30, 0.56, 0]} rotation={[-0.6, 0, -0.4]}>
        <OutlinedMesh outlineThickness={1.04}>
          <mesh castShadow receiveShadow material={topMaterial}>
            <cylinderGeometry args={[0.07, 0.06, 0.25, 20]} />
          </mesh>
        </OutlinedMesh>
        {/* Main ronde */}
        <OutlinedMesh outlineThickness={1.04}>
          <mesh position={[0, -0.16, 0]} castShadow material={skinMaterial}>
            <sphereGeometry args={[0.08, 16, 16]} />
          </mesh>
        </OutlinedMesh>
      </group>

      {/* === SHORT SIMPLIFIÉ === */}
      <OutlinedMesh outlineThickness={1.03}>
        <mesh position={[0, 0.20, 0]} castShadow receiveShadow material={bottomMaterial}>
          <cylinderGeometry args={[0.24, 0.22, 0.25, 24]} />
        </mesh>
      </OutlinedMesh>

      {/* === JAMBES COURTES STYLE CHIBI === */}
      {/* Jambe gauche (légèrement levée - pose cute) */}
      <group position={[-0.10, 0.05, 0]} rotation={[0.25, 0, 0]}>
        <OutlinedMesh outlineThickness={1.04}>
          <mesh castShadow receiveShadow material={skinMaterial}>
            <cylinderGeometry args={[0.08, 0.07, 0.30, 20]} />
          </mesh>
        </OutlinedMesh>
      </group>
      
      {/* Jambe droite */}
      <group position={[0.10, 0.00, 0]} rotation={[-0.1, 0, 0]}>
        <OutlinedMesh outlineThickness={1.04}>
          <mesh castShadow receiveShadow material={skinMaterial}>
            <cylinderGeometry args={[0.08, 0.07, 0.30, 20]} />
          </mesh>
        </OutlinedMesh>
      </group>

      {/* === CHAUSSURES CARTOON STYLE BITMOJI === */}
      {/* Chaussure gauche (levée) */}
      <group position={[-0.10, -0.22, 0.03]} rotation={[0.3, 0, 0]}>
        {/* Semelle épaisse cartoon */}
        <OutlinedMesh outlineThickness={1.04}>
          <mesh castShadow receiveShadow material={shoesMaterial}>
            <boxGeometry args={[0.16, 0.10, 0.26]} />
          </mesh>
        </OutlinedMesh>
        {/* Dessus arrondi */}
        <OutlinedMesh outlineThickness={1.04}>
          <mesh position={[0, 0.08, -0.02]} rotation={[0, 0, Math.PI / 2]} castShadow material={shoesMaterial}>
            <capsuleGeometry args={[0.06, 0.12, 4, 16]} />
          </mesh>
        </OutlinedMesh>
        {/* Logo cartoon */}
        <mesh position={[-0.09, 0.09, 0]} rotation={[0, Math.PI / 2, 0]}>
          <circleGeometry args={[0.025, 16]} />
          <meshBasicMaterial color="#FFFFFF" />
        </mesh>
        {/* Lacets stylisés */}
        <mesh position={[0, 0.10, 0.04]}>
          <boxGeometry args={[0.10, 0.01, 0.01]} />
          <meshBasicMaterial color="#FFFFFF" />
        </mesh>
        <mesh position={[0, 0.10, 0]}>
          <boxGeometry args={[0.10, 0.01, 0.01]} />
          <meshBasicMaterial color="#FFFFFF" />
        </mesh>
      </group>

      {/* Chaussure droite */}
      <group position={[0.10, -0.28, 0.03]}>
        {/* Semelle épaisse cartoon */}
        <OutlinedMesh outlineThickness={1.04}>
          <mesh castShadow receiveShadow material={shoesMaterial}>
            <boxGeometry args={[0.16, 0.10, 0.26]} />
          </mesh>
        </OutlinedMesh>
        {/* Dessus arrondi */}
        <OutlinedMesh outlineThickness={1.04}>
          <mesh position={[0, 0.08, -0.02]} rotation={[0, 0, Math.PI / 2]} castShadow material={shoesMaterial}>
            <capsuleGeometry args={[0.06, 0.12, 4, 16]} />
          </mesh>
        </OutlinedMesh>
        {/* Logo cartoon */}
        <mesh position={[0.09, 0.09, 0]} rotation={[0, -Math.PI / 2, 0]}>
          <circleGeometry args={[0.025, 16]} />
          <meshBasicMaterial color="#FFFFFF" />
        </mesh>
        {/* Lacets stylisés */}
        <mesh position={[0, 0.10, 0.04]}>
          <boxGeometry args={[0.10, 0.01, 0.01]} />
          <meshBasicMaterial color="#FFFFFF" />
        </mesh>
        <mesh position={[0, 0.10, 0]}>
          <boxGeometry args={[0.10, 0.01, 0.01]} />
          <meshBasicMaterial color="#FFFFFF" />
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
      <Canvas shadows camera={{ position: [0, 0.5, 2.8], fov: 50 }}>
        <Suspense fallback={null}>
          <OrbitControls 
            enableZoom={true}
            minPolarAngle={Math.PI / 6}
            maxPolarAngle={Math.PI / 1.6}
            target={[0, 0.4, 0]}
            minDistance={2}
            maxDistance={4}
            enablePan={false}
          />
          
          {/* Éclairage style cartoon/Bitmoji */}
          <ambientLight intensity={0.8} />
          
          {/* Lumière principale forte (cell-shading) */}
          <directionalLight 
            position={[5, 8, 5]} 
            intensity={1.5}
            castShadow
            shadow-mapSize-width={1024}
            shadow-mapSize-height={1024}
          />
          
          {/* Fill light */}
          <directionalLight 
            position={[-3, 3, -2]} 
            intensity={0.4}
          />
          
          {/* Environnement simple et lumineux */}
          <Environment preset="city" background={false} />
          
          {/* Avatar Bitmoji Style */}
          <BitmojiStyleAvatarModel 
            topItemId={topItemId}
            bottomItemId={bottomItemId}
            shoesItemId={shoesItemId}
            accessoryItemId={accessoryItemId}
          />
          
          {/* Ombres nettes (cell-shading) */}
          <ContactShadows 
            position={[0, -0.3, 0]} 
            opacity={0.5} 
            scale={1.8} 
            blur={1} 
            far={1.5}
            resolution={256}
          />
        </Suspense>
      </Canvas>
    </div>
  );
};