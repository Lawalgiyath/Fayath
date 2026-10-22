import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useAppStore } from '../core/store';
import { NavigationController } from './camera';
import { ArchitecturalLighting } from './lighting';
import { SceneBuilder } from './scene';

export const Viewport3D: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const {
    doc,
    activeSchemeId,
    cameraMode,
    setCameraMode,
    selection,
    setSelection,
    sectionCutEnabled,
    sectionCutHeight,
    sunStudyPlaying,
    setSunTime,
  } = useAppStore();

  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const navRef = useRef<NavigationController | null>(null);
  const builderRef = useRef<SceneBuilder | null>(null);
  const lightingRef = useRef<ArchitecturalLighting | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Section cut clipping plane
  const clipPlaneRef = useRef<THREE.Plane>(new THREE.Plane(new THREE.Vector3(0, -1, 0), 1.2));

  // 1. Initialize Three.js WebGL Engine
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x16181b);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 500);
    camera.position.set(16, 12, 18);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.localClippingEnabled = true;

    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting rig
    const lighting = new ArchitecturalLighting();
    lighting.update(doc.site);
    scene.add(lighting.group);
    lightingRef.current = lighting;

    // Scene builder
    const builder = new SceneBuilder();
    builder.build(doc, activeSchemeId);
    scene.add(builder.root);
    builderRef.current = builder;

    // Navigation controller
    const nav = new NavigationController(camera, renderer.domElement);
    nav.collisionMeshes = builder.collisionMeshes;
    nav.setMode(cameraMode);

    // Initial frame on model bounds
    const bbox = new THREE.Box3().setFromObject(builder.root);
    nav.focusOnBounds(bbox);
    navRef.current = nav;

    // Resize handler
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Raycast object picking on click
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handleClick = (e: MouseEvent) => {
      if (nav.mode === 'walk') return; // in walk mode clicks are for interacting
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(builder.root.children, true);

      for (const hit of intersects) {
        let cur: THREE.Object3D | null = hit.object;
        while (cur && cur !== builder.root) {
          if (cur.userData?.type === 'wall') {
            setSelection({ kind: 'wall', id: cur.userData.id });
            return;
          }
          if (cur.userData?.type === 'opening') {
            setSelection({ kind: 'opening', id: cur.userData.id });
            return;
          }
          if (cur.userData?.type === 'object') {
            setSelection({ kind: 'object', id: cur.userData.id });
            return;
          }
          if (cur.userData?.type === 'room') {
            setSelection({ kind: 'room', key: cur.userData.key });
            return;
          }
          cur = cur.parent;
        }
      }
    };
    renderer.domElement.addEventListener('click', handleClick);

    // Render loop
    let lastTime = performance.now();
    const animate = (time: number) => {
      const delta = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      // Update camera navigation
      nav.update(delta);

      // Render frame
      renderer.render(scene, camera);
      animFrameRef.current = requestAnimationFrame(animate);
    };
    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('click', handleClick);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      nav.destroy();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Update Scene when doc or scheme changes
  useEffect(() => {
    if (!builderRef.current || !sceneRef.current) return;
    builderRef.current.build(doc, activeSchemeId);
    if (navRef.current) {
      navRef.current.collisionMeshes = builderRef.current.collisionMeshes;
    }
  }, [doc, activeSchemeId]);

  // Update Lighting when solar site params change
  useEffect(() => {
    if (lightingRef.current) {
      lightingRef.current.update(doc.site);
    }
  }, [doc.site]);

  // Update Camera Mode
  useEffect(() => {
    if (navRef.current) {
      navRef.current.setMode(cameraMode);
    }
  }, [cameraMode]);

  // Update Section Cut clipping plane
  useEffect(() => {
    if (!rendererRef.current) return;
    if (sectionCutEnabled) {
      clipPlaneRef.current.constant = sectionCutHeight;
      rendererRef.current.clippingPlanes = [clipPlaneRef.current];
    } else {
      rendererRef.current.clippingPlanes = [];
    }
  }, [sectionCutEnabled, sectionCutHeight]);

  // Sun study animation loop
  useEffect(() => {
    if (!sunStudyPlaying) return;
    const interval = setInterval(() => {
      const current = useAppStore.getState().doc.site.minutes;
      // Step 8 minutes every tick, loop 06:00 to 20:00
      let next = current + 6;
      if (next > 20 * 60) next = 6 * 60;
      setSunTime(next);
    }, 50);

    return () => clearInterval(interval);
  }, [sunStudyPlaying, setSunTime]);

  return (
    <div
      ref={containerRef}
      className="viewport-3d-container"
      style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}
    >
      {/* Walk mode crosshair and instructions HUD */}
      {cameraMode === 'walk' && (
        <>
          <div
            className="walk-crosshair"
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 8,
              height: 8,
              border: '1.5px solid rgba(255, 255, 255, 0.7)',
              borderRadius: '50%',
              pointerEvents: 'none',
            }}
          />
          <div
            className="walk-guide"
            style={{
              position: 'absolute',
              bottom: 16,
              left: '50%',
              transform: 'translateX(-50%)',
              padding: '6px 16px',
              background: 'rgba(22, 24, 27, 0.85)',
              border: '1px solid #333842',
              borderRadius: 20,
              fontFamily: '"IBM Plex Sans", Inter, sans-serif',
              fontSize: 12,
              color: '#dcdfe4',
              pointerEvents: 'none',
              display: 'flex',
              gap: 16,
            }}
          >
            <span>
              <strong style={{ color: '#d4af37' }}>W A S D</strong> Walk
            </span>
            <span>
              <strong style={{ color: '#d4af37' }}>Shift</strong> Sprint
            </span>
            <span>
              <strong style={{ color: '#d4af37' }}>Drag Mouse</strong> Look Around
            </span>
          </div>
        </>
      )}
    </div>
  );
};
