import * as THREE from 'three';
import * as SunCalc from 'suncalc';
import type { SiteSettings } from '../core/types';

export class ArchitecturalLighting {
  public group = new THREE.Group();
  public sunLight: THREE.DirectionalLight;
  public ambientLight: THREE.AmbientLight;
  public hemiLight: THREE.HemisphereLight;
  public skyDome: THREE.Mesh;
  public skyMat: THREE.MeshBasicMaterial;

  private target = new THREE.Object3D();

  constructor() {
    this.group.name = 'lighting_rig';

    // 1. Sun Directional Light
    this.sunLight = new THREE.DirectionalLight(0xfff8ee, 2.5);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 150;

    // Architectural shadow frustum coverage (covers 40m building radius)
    const d = 25;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.bias = -0.0004;
    this.sunLight.shadow.normalBias = 0.02;

    this.group.add(this.sunLight);
    this.group.add(this.target);
    this.sunLight.target = this.target;

    // 2. Hemisphere Light (Sky & Ground bounce)
    this.hemiLight = new THREE.HemisphereLight(0xddeeff, 0x332822, 0.6);
    this.group.add(this.hemiLight);

    // 3. Ambient Light for interior room ambient illumination
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.35);
    this.group.add(this.ambientLight);

    // 4. Procedural Sky Dome
    const skyGeo = new THREE.SphereGeometry(140, 32, 16);
    this.skyMat = new THREE.MeshBasicMaterial({
      color: 0x88bbec,
      side: THREE.BackSide,
    });
    this.skyDome = new THREE.Mesh(skyGeo, this.skyMat);
    this.group.add(this.skyDome);
  }

  public update(site: SiteSettings) {
    // Parse date and time in local solar coordinates
    const [year, month, day] = site.date.split('-').map(Number);
    const hours = Math.floor(site.minutes / 60);
    const mins = Math.floor(site.minutes % 60);

    const date = new Date(Date.UTC(year, (month || 1) - 1, day || 1, hours, mins));

    const sunPos = SunCalc.getPosition(date, site.latitude, site.longitude);
    const altitude = sunPos.altitude; // radians above horizon
    let azimuth = sunPos.azimuth; // radians from South toward West

    // Rotate azimuth by user-defined project north angle
    const northRad = ((site.northAngle || 0) * Math.PI) / 180;
    azimuth += northRad;

    // Calculate Cartesian sun position on a 60m dome
    const dist = 60;
    const phi = Math.PI / 2 - altitude;
    const theta = azimuth + Math.PI;

    const sx = dist * Math.sin(phi) * Math.sin(theta);
    const sy = Math.max(-5, dist * Math.cos(phi));
    const sz = dist * Math.sin(phi) * Math.cos(theta);

    this.sunLight.position.set(sx, sy, sz);

    // Color and intensity modulation based on solar altitude
    const isDay = altitude > -0.05;
    if (isDay) {
      const sunElevDeg = (altitude * 180) / Math.PI;
      const intensity = Math.min(3.0, Math.max(0.1, Math.sin(Math.max(0.01, altitude)) * 3.0));
      this.sunLight.intensity = intensity;

      // Color temperature shifting
      if (sunElevDeg < 12) {
        // Golden hour / sunrise / sunset
        this.sunLight.color.setRGB(1.0, 0.65, 0.38);
        this.hemiLight.color.setRGB(0.9, 0.7, 0.5);
        this.skyMat.color.setRGB(0.95, 0.65, 0.45);
        this.ambientLight.intensity = 0.25;
      } else if (sunElevDeg < 30) {
        // Morning / late afternoon
        this.sunLight.color.setRGB(1.0, 0.92, 0.82);
        this.hemiLight.color.setRGB(0.75, 0.85, 1.0);
        this.skyMat.color.setRGB(0.55, 0.75, 0.95);
        this.ambientLight.intensity = 0.35;
      } else {
        // Crisp high noon
        this.sunLight.color.setRGB(1.0, 0.98, 0.94);
        this.hemiLight.color.setRGB(0.85, 0.92, 1.0);
        this.skyMat.color.setRGB(0.4, 0.65, 0.9);
        this.ambientLight.intensity = 0.45;
      }
    } else {
      // Night time
      this.sunLight.intensity = 0.05;
      this.sunLight.color.setRGB(0.3, 0.4, 0.6);
      this.hemiLight.color.setRGB(0.1, 0.15, 0.25);
      this.skyMat.color.setRGB(0.03, 0.05, 0.1);
      this.ambientLight.intensity = 0.15;
    }
  }
}
