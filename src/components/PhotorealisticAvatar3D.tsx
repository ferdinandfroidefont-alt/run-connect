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
      {/* === TÊTE PROPORTIONS RÉALISTES === */}
      <group position={[0, 1.55, 0]}>
        {/* Visage ovale (plus réaliste) */}
        <OutlinedMesh outlineThickness={1.03}>
          <mesh castShadow receiveShadow material={skinMaterial}>
            <sphereGeometry args={[0.35, 32, 32, 0, Math.PI * 2, 0, Math.PI * 0.95]} />
          </mesh>
        </OutlinedMesh>
        
        {/* Mâchoire définie */}
        <OutlinedMesh outlineThickness={1.03}>
          <mesh position={[0, -0.25, 0]} castShadow receiveShadow material={skinMaterial}>
            <boxGeometry args={[0.40, 0.18, 0.30]} />
          </mesh>
        </OutlinedMesh>
        
        {/* === YEUX RÉALISTES MAIS EXPRESSIFS === */}
        {/* Œil gauche */}
        <group position={[-0.12, 0.08, 0.30]}>
          {/* Blanc de l'œil */}
          <OutlinedMesh outlineThickness={1.04}>
            <mesh material={eyeWhiteMaterial}>
              <sphereGeometry args={[0.055, 16, 16]} />
            </mesh>
          </OutlinedMesh>
          {/* Iris coloré */}
          <mesh position={[0.015, 0, 0.04]} material={createToonMaterial('#4A90E2')}>
            <sphereGeometry args={[0.025, 16, 16]} />
          </mesh>
          {/* Pupille */}
          <mesh position={[0.02, 0, 0.05]} material={eyeMaterial}>
            <sphereGeometry args={[0.015, 16, 16]} />
          </mesh>
          {/* Reflet brillant */}
          <mesh position={[0.015, 0.015, 0.055]} material={eyeWhiteMaterial}>
            <sphereGeometry args={[0.008, 8, 8]} />
          </mesh>
          {/* Paupière supérieure */}
          <mesh position={[0, 0.04, 0.04]} rotation={[-0.2, 0, 0]}>
            <boxGeometry args={[0.08, 0.02, 0.02]} />
            <meshBasicMaterial color="#E5B299" />
          </mesh>
        </group>
        
        {/* Œil droit */}
        <group position={[0.12, 0.08, 0.30]}>
          {/* Blanc de l'œil */}
          <OutlinedMesh outlineThickness={1.04}>
            <mesh material={eyeWhiteMaterial}>
              <sphereGeometry args={[0.055, 16, 16]} />
            </mesh>
          </OutlinedMesh>
          {/* Iris coloré */}
          <mesh position={[-0.015, 0, 0.04]} material={createToonMaterial('#4A90E2')}>
            <sphereGeometry args={[0.025, 16, 16]} />
          </mesh>
          {/* Pupille */}
          <mesh position={[-0.02, 0, 0.05]} material={eyeMaterial}>
            <sphereGeometry args={[0.015, 16, 16]} />
          </mesh>
          {/* Reflet brillant */}
          <mesh position={[-0.015, 0.015, 0.055]} material={eyeWhiteMaterial}>
            <sphereGeometry args={[0.008, 8, 8]} />
          </mesh>
          {/* Paupière supérieure */}
          <mesh position={[0, 0.04, 0.04]} rotation={[-0.2, 0, 0]}>
            <boxGeometry args={[0.08, 0.02, 0.02]} />
            <meshBasicMaterial color="#E5B299" />
          </mesh>
        </group>
        
        {/* === SOURCILS NATURELS === */}
        {/* Sourcil gauche */}
        <mesh position={[-0.12, 0.16, 0.32]} rotation={[0.1, 0, -0.1]}>
          <capsuleGeometry args={[0.015, 0.08, 4, 8]} />
          <meshBasicMaterial color="#2D1810" />
        </mesh>
        
        {/* Sourcil droit */}
        <mesh position={[0.12, 0.16, 0.32]} rotation={[0.1, 0, 0.1]}>
          <capsuleGeometry args={[0.015, 0.08, 4, 8]} />
          <meshBasicMaterial color="#2D1810" />
        </mesh>
        
        {/* Nez défini style Bitmoji */}
        <OutlinedMesh outlineThickness={1.02}>
          <mesh position={[0, -0.02, 0.32]} rotation={[0.3, 0, 0]} material={skinMaterial}>
            <boxGeometry args={[0.06, 0.10, 0.08]} />
          </mesh>
        </OutlinedMesh>
        {/* Narines */}
        <mesh position={[-0.02, -0.08, 0.34]}>
          <sphereGeometry args={[0.012, 8, 8]} />
          <meshBasicMaterial color="#D4A088" />
        </mesh>
        <mesh position={[0.02, -0.08, 0.34]}>
          <sphereGeometry args={[0.012, 8, 8]} />
          <meshBasicMaterial color="#D4A088" />
        </mesh>
        
        {/* === BOUCHE RÉALISTE === */}
        {/* Lèvres supérieures */}
        <mesh position={[0, -0.18, 0.30]} rotation={[0.2, 0, 0]}>
          <capsuleGeometry args={[0.01, 0.08, 4, 8]} />
          <meshToonMaterial color="#DC8B7C" />
        </mesh>
        {/* Lèvres inférieures */}
        <mesh position={[0, -0.21, 0.30]} rotation={[0.15, 0, 0]}>
          <capsuleGeometry args={[0.012, 0.09, 4, 8]} />
          <meshToonMaterial color="#E59B8C" />
        </mesh>
        {/* Sourire léger */}
        <mesh position={[0, -0.20, 0.31]} rotation={[0.5, 0, 0]}>
          <torusGeometry args={[0.06, 0.008, 6, 12, Math.PI]} />
          <meshBasicMaterial color="#DC8B7C" />
        </mesh>
        
        {/* Oreilles détaillées */}
        <OutlinedMesh outlineThickness={1.03}>
          <mesh position={[-0.34, -0.02, 0.08]} rotation={[0, 0.3, -0.3]} material={skinMaterial}>
            <capsuleGeometry args={[0.04, 0.06, 4, 8]} />
          </mesh>
        </OutlinedMesh>
        <OutlinedMesh outlineThickness={1.03}>
          <mesh position={[0.34, -0.02, 0.08]} rotation={[0, -0.3, 0.3]} material={skinMaterial}>
            <capsuleGeometry args={[0.04, 0.06, 4, 8]} />
          </mesh>
        </OutlinedMesh>
      </group>

      {/* === CHEVEUX STYLE BITMOJI (volume modéré) === */}
      {/* Base des cheveux */}
      <OutlinedMesh outlineThickness={1.03}>
        <mesh position={[0, 1.75, 0]} castShadow material={hairMaterial}>
          <sphereGeometry args={[0.32, 24, 24, 0, Math.PI * 2, 0, Math.PI * 0.6]} />
        </mesh>
      </OutlinedMesh>
      
      {/* Mèche avant gauche */}
      <OutlinedMesh outlineThickness={1.03}>
        <mesh position={[-0.20, 1.70, 0.18]} rotation={[0, 0, -0.3]} castShadow material={hairMaterial}>
          <capsuleGeometry args={[0.06, 0.12, 4, 8]} />
        </mesh>
      </OutlinedMesh>
      
      {/* Mèche avant droite */}
      <OutlinedMesh outlineThickness={1.03}>
        <mesh position={[0.20, 1.70, 0.18]} rotation={[0, 0, 0.3]} castShadow material={hairMaterial}>
          <capsuleGeometry args={[0.06, 0.12, 4, 8]} />
        </mesh>
      </OutlinedMesh>
      
      {/* Volume dessus */}
      <OutlinedMesh outlineThickness={1.03}>
        <mesh position={[0, 1.88, 0.05]} castShadow material={hairMaterial}>
          <sphereGeometry args={[0.18, 16, 16]} />
        </mesh>
      </OutlinedMesh>

      {/* === COU PROPORTIONNÉ === */}
      <OutlinedMesh outlineThickness={1.03}>
        <mesh position={[0, 1.32, 0]} castShadow receiveShadow material={skinMaterial}>
          <cylinderGeometry args={[0.10, 0.12, 0.25, 24]} />
        </mesh>
      </OutlinedMesh>

      {/* === TORSE RÉALISTE === */}
      <OutlinedMesh outlineThickness={1.03}>
        <mesh position={[0, 0.88, 0]} castShadow receiveShadow material={topMaterial}>
          <capsuleGeometry args={[0.26, 0.60, 24, 24]} />
        </mesh>
      </OutlinedMesh>
      
      {/* Pectoraux suggérés */}
      <mesh position={[-0.10, 0.98, 0.22]} castShadow material={topMaterial}>
        <sphereGeometry args={[0.08, 16, 16]} />
      </mesh>
      <mesh position={[0.10, 0.98, 0.22]} castShadow material={topMaterial}>
        <sphereGeometry args={[0.08, 16, 16]} />
      </mesh>

      {/* === BRAS PROPORTIONNÉS AVEC DÉTAILS === */}
      {/* Bras gauche */}
      <group position={[-0.38, 1.00, 0]} rotation={[0.4, 0, 0.2]}>
        {/* Épaule */}
        <OutlinedMesh outlineThickness={1.03}>
          <mesh castShadow receiveShadow material={topMaterial}>
            <sphereGeometry args={[0.09, 16, 16]} />
          </mesh>
        </OutlinedMesh>
        {/* Biceps */}
        <OutlinedMesh outlineThickness={1.03}>
          <mesh position={[0, -0.15, 0]} castShadow receiveShadow material={topMaterial}>
            <capsuleGeometry args={[0.07, 0.20, 8, 16]} />
          </mesh>
        </OutlinedMesh>
        {/* Coude */}
        <mesh position={[0, -0.26, 0]} castShadow material={skinMaterial}>
          <sphereGeometry args={[0.07, 12, 12]} />
        </mesh>
        {/* Avant-bras */}
        <group position={[0, -0.26, 0]} rotation={[-0.6, 0, 0]}>
          <OutlinedMesh outlineThickness={1.03}>
            <mesh position={[0, -0.12, 0]} castShadow receiveShadow material={skinMaterial}>
              <capsuleGeometry args={[0.06, 0.18, 8, 16]} />
            </mesh>
          </OutlinedMesh>
          {/* Main fermée */}
          <OutlinedMesh outlineThickness={1.03}>
            <mesh position={[0, -0.24, 0]} castShadow material={skinMaterial}>
              <boxGeometry args={[0.10, 0.08, 0.10]} />
            </mesh>
          </OutlinedMesh>
        </group>
      </group>
      
      {/* Bras droit */}
      <group position={[0.38, 1.00, 0]} rotation={[-0.4, 0, -0.2]}>
        {/* Épaule */}
        <OutlinedMesh outlineThickness={1.03}>
          <mesh castShadow receiveShadow material={topMaterial}>
            <sphereGeometry args={[0.09, 16, 16]} />
          </mesh>
        </OutlinedMesh>
        {/* Biceps */}
        <OutlinedMesh outlineThickness={1.03}>
          <mesh position={[0, -0.15, 0]} castShadow receiveShadow material={topMaterial}>
            <capsuleGeometry args={[0.07, 0.20, 8, 16]} />
          </mesh>
        </OutlinedMesh>
        {/* Coude */}
        <mesh position={[0, -0.26, 0]} castShadow material={skinMaterial}>
          <sphereGeometry args={[0.07, 12, 12]} />
        </mesh>
        {/* Avant-bras */}
        <group position={[0, -0.26, 0]} rotation={[0.6, 0, 0]}>
          <OutlinedMesh outlineThickness={1.03}>
            <mesh position={[0, -0.12, 0]} castShadow receiveShadow material={skinMaterial}>
              <capsuleGeometry args={[0.06, 0.18, 8, 16]} />
            </mesh>
          </OutlinedMesh>
          {/* Main fermée */}
          <OutlinedMesh outlineThickness={1.03}>
            <mesh position={[0, -0.24, 0]} castShadow material={skinMaterial}>
              <boxGeometry args={[0.10, 0.08, 0.10]} />
            </mesh>
          </OutlinedMesh>
        </group>
      </group>

      {/* === SHORT RUNNING === */}
      <OutlinedMesh outlineThickness={1.03}>
        <mesh position={[0, 0.42, 0]} castShadow receiveShadow material={bottomMaterial}>
          <cylinderGeometry args={[0.28, 0.26, 0.35, 24]} />
        </mesh>
      </OutlinedMesh>

      {/* === JAMBES DÉTAILLÉES === */}
      {/* Jambe gauche */}
      <group position={[-0.12, 0.18, 0]} rotation={[0.2, 0, 0]}>
        {/* Cuisse */}
        <OutlinedMesh outlineThickness={1.03}>
          <mesh castShadow receiveShadow material={bottomMaterial}>
            <capsuleGeometry args={[0.10, 0.42, 8, 16]} />
          </mesh>
        </OutlinedMesh>
        {/* Genou */}
        <mesh position={[0, -0.26, 0]} castShadow material={skinMaterial}>
          <sphereGeometry args={[0.10, 12, 12]} />
        </mesh>
        {/* Mollet */}
        <group position={[0, -0.26, 0]} rotation={[-0.25, 0, 0]}>
          <OutlinedMesh outlineThickness={1.03}>
            <mesh position={[0, -0.18, 0]} castShadow receiveShadow material={skinMaterial}>
              <capsuleGeometry args={[0.08, 0.30, 8, 16]} />
            </mesh>
          </OutlinedMesh>
        </group>
      </group>
      
      {/* Jambe droite */}
      <group position={[0.12, 0.15, 0]} rotation={[-0.1, 0, 0]}>
        {/* Cuisse */}
        <OutlinedMesh outlineThickness={1.03}>
          <mesh castShadow receiveShadow material={bottomMaterial}>
            <capsuleGeometry args={[0.10, 0.42, 8, 16]} />
          </mesh>
        </OutlinedMesh>
        {/* Genou */}
        <mesh position={[0, -0.26, 0]} castShadow material={skinMaterial}>
          <sphereGeometry args={[0.10, 12, 12]} />
        </mesh>
        {/* Mollet */}
        <OutlinedMesh outlineThickness={1.03}>
          <mesh position={[0, -0.48, 0]} castShadow receiveShadow material={skinMaterial}>
            <capsuleGeometry args={[0.08, 0.30, 8, 16]} />
          </mesh>
        </OutlinedMesh>
      </group>

      {/* === CHAUSSURES RUNNING DÉTAILLÉES === */}
      {/* Chaussure gauche (levée) */}
      <group position={[-0.12, -0.62, 0.05]} rotation={[0.3, 0, 0]}>
        {/* Semelle running */}
        <OutlinedMesh outlineThickness={1.03}>
          <mesh castShadow receiveShadow material={shoesMaterial}>
            <boxGeometry args={[0.18, 0.08, 0.30]} />
          </mesh>
        </OutlinedMesh>
        {/* Corps de la chaussure */}
        <OutlinedMesh outlineThickness={1.03}>
          <mesh position={[0, 0.08, -0.02]} castShadow material={shoesMaterial}>
            <boxGeometry args={[0.16, 0.10, 0.24]} />
          </mesh>
        </OutlinedMesh>
        {/* Avant arrondi */}
        <OutlinedMesh outlineThickness={1.03}>
          <mesh position={[0, 0.06, 0.12]} castShadow material={shoesMaterial}>
            <sphereGeometry args={[0.09, 12, 12]} />
          </mesh>
        </OutlinedMesh>
        {/* Logo */}
        <mesh position={[-0.10, 0.10, 0.02]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[0.06, 0.03]} />
          <meshBasicMaterial color="#FFFFFF" />
        </mesh>
        {/* Lacets */}
        <mesh position={[0, 0.12, 0.05]}>
          <boxGeometry args={[0.12, 0.01, 0.01]} />
          <meshBasicMaterial color="#FFFFFF" />
        </mesh>
        <mesh position={[0, 0.11, 0.02]}>
          <boxGeometry args={[0.12, 0.01, 0.01]} />
          <meshBasicMaterial color="#FFFFFF" />
        </mesh>
      </group>

      {/* Chaussure droite */}
      <group position={[0.12, -0.78, 0.05]}>
        {/* Semelle running */}
        <OutlinedMesh outlineThickness={1.03}>
          <mesh castShadow receiveShadow material={shoesMaterial}>
            <boxGeometry args={[0.18, 0.08, 0.30]} />
          </mesh>
        </OutlinedMesh>
        {/* Corps de la chaussure */}
        <OutlinedMesh outlineThickness={1.03}>
          <mesh position={[0, 0.08, -0.02]} castShadow material={shoesMaterial}>
            <boxGeometry args={[0.16, 0.10, 0.24]} />
          </mesh>
        </OutlinedMesh>
        {/* Avant arrondi */}
        <OutlinedMesh outlineThickness={1.03}>
          <mesh position={[0, 0.06, 0.12]} castShadow material={shoesMaterial}>
            <sphereGeometry args={[0.09, 12, 12]} />
          </mesh>
        </OutlinedMesh>
        {/* Logo */}
        <mesh position={[0.10, 0.10, 0.02]} rotation={[0, -Math.PI / 2, 0]}>
          <planeGeometry args={[0.06, 0.03]} />
          <meshBasicMaterial color="#FFFFFF" />
        </mesh>
        {/* Lacets */}
        <mesh position={[0, 0.12, 0.05]}>
          <boxGeometry args={[0.12, 0.01, 0.01]} />
          <meshBasicMaterial color="#FFFFFF" />
        </mesh>
        <mesh position={[0, 0.11, 0.02]}>
          <boxGeometry args={[0.12, 0.01, 0.01]} />
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
          
          {/* Ombres douces */}
          <ContactShadows 
            position={[0, -0.8, 0]} 
            opacity={0.4} 
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