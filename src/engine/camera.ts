import * as THREE from 'three';

export type CameraMode = 'orbit' | 'walk' | 'fly' | 'plan';

export interface CameraState {
  mode: CameraMode;
  position: THREE.Vector3;
  target: THREE.Vector3;
}

export class NavigationController {
  public camera: THREE.PerspectiveCamera;
  public mode: CameraMode = 'orbit';

  // Orbit state
  public target = new THREE.Vector3(0, 1.2, 0);
  public spherical = new THREE.Spherical(18, Math.PI / 3, Math.PI / 4);

  // Walk & Fly state
  private moveForward = false;
  private moveBackward = false;
  private moveLeft = false;
  private moveRight = false;
  private moveUp = false;
  private moveDown = false;
  private isSprinting = false;

  private velocity = new THREE.Vector3();
  private euler = new THREE.Euler(0, 0, 0, 'YXZ');
  private eyeHeight = 1.65; // standard human eye level in meters

  // Raycaster for wall collision detection
  private raycaster = new THREE.Raycaster();
  public collisionMeshes: THREE.Mesh[] = [];

  private domElement: HTMLElement;
  private isPointerDown = false;
  private prevMouseX = 0;
  private prevMouseY = 0;

  constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement) {
    this.camera = camera;
    this.domElement = domElement;

    this.bindEvents();
    this.updateCameraTransform();
  }

  private bindEvents() {
    this.domElement.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mouseup', this.onMouseUp);
    window.addEventListener('mousemove', this.onMouseMove);
    this.domElement.addEventListener('wheel', this.onWheel, { passive: false });

    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  public destroy() {
    this.domElement.removeEventListener('mousedown', this.onMouseDown);
    window.removeEventListener('mouseup', this.onMouseUp);
    window.removeEventListener('mousemove', this.onMouseMove);
    this.domElement.removeEventListener('wheel', this.onWheel);

    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
  }

  public setMode(mode: CameraMode) {
    if (this.mode === mode) return;
    const oldMode = this.mode;
    this.mode = mode;

    if (mode === 'walk') {
      // Transitioning into walk: place camera at eye height
      this.camera.position.y = this.eyeHeight;
      this.euler.setFromQuaternion(this.camera.quaternion);
      this.euler.z = 0; // lock roll
    } else if (mode === 'plan') {
      // Top-down view
      this.camera.position.set(this.target.x, 25, this.target.z + 0.01);
      this.camera.lookAt(this.target.x, 0, this.target.z);
    } else if (mode === 'orbit') {
      // Compute spherical coords from current camera position relative to target
      const offset = this.camera.position.clone().sub(this.target);
      this.spherical.setFromVector3(offset);
    }
  }

  public focusOnBounds(box: THREE.Box3) {
    box.getCenter(this.target);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.z, size.y * 1.5, 8);
    this.spherical.radius = maxDim * 1.6;
    this.spherical.theta = Math.PI / 4;
    this.spherical.phi = Math.PI / 3.2;
    this.updateCameraTransform();
  }

  public teleportTo(x: number, z: number) {
    this.camera.position.set(x, this.eyeHeight, z);
    this.target.set(x + Math.sin(this.euler.y), this.eyeHeight, z - Math.cos(this.euler.y));
  }

  private onMouseDown = (e: MouseEvent) => {
    this.isPointerDown = true;
    this.prevMouseX = e.clientX;
    this.prevMouseY = e.clientY;
  };

  private onMouseUp = () => {
    this.isPointerDown = false;
  };

  private onMouseMove = (e: MouseEvent) => {
    if (!this.isPointerDown) return;

    const dx = e.clientX - this.prevMouseX;
    const dy = e.clientY - this.prevMouseY;
    this.prevMouseX = e.clientX;
    this.prevMouseY = e.clientY;

    if (this.mode === 'orbit') {
      if (e.buttons === 2 || e.shiftKey) {
        // Pan
        const panSpeed = 0.003 * this.spherical.radius;
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
        forward.y = 0;
        forward.normalize();
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);

        this.target.addScaledVector(right, -dx * panSpeed);
        this.target.addScaledVector(forward, dy * panSpeed);
      } else {
        // Rotate orbit
        const rotateSpeed = 0.005;
        this.spherical.theta -= dx * rotateSpeed;
        this.spherical.phi = Math.max(0.05, Math.min(Math.PI / 2 - 0.02, this.spherical.phi - dy * rotateSpeed));
      }
      this.updateCameraTransform();
    } else if (this.mode === 'walk' || this.mode === 'fly') {
      // Mouse look
      const lookSpeed = 0.0025;
      this.euler.y -= dx * lookSpeed;
      this.euler.x = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, this.euler.x - dy * lookSpeed));
      this.camera.quaternion.setFromEuler(this.euler);
    } else if (this.mode === 'plan') {
      // 2D Pan
      const panSpeed = 0.03;
      this.camera.position.x -= dx * panSpeed;
      this.camera.position.z -= dy * panSpeed;
      this.target.x = this.camera.position.x;
      this.target.z = this.camera.position.z - 0.01;
    }
  };

  private onWheel = (e: WheelEvent) => {
    e.preventDefault();
    if (this.mode === 'orbit') {
      const zoomFactor = 1 + Math.sign(e.deltaY) * 0.08;
      this.spherical.radius = Math.max(1.5, Math.min(120, this.spherical.radius * zoomFactor));
      this.updateCameraTransform();
    } else if (this.mode === 'plan') {
      const zoomFactor = 1 + Math.sign(e.deltaY) * 0.1;
      this.camera.position.y = Math.max(5, Math.min(100, this.camera.position.y * zoomFactor));
    }
  };

  private onKeyDown = (e: KeyboardEvent) => {
    switch (e.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.moveForward = true;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.moveBackward = true;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.moveLeft = true;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.moveRight = true;
        break;
      case 'KeyE':
        this.moveUp = true;
        break;
      case 'KeyQ':
        this.moveDown = true;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        this.isSprinting = true;
        break;
    }
  };

  private onKeyUp = (e: KeyboardEvent) => {
    switch (e.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.moveForward = false;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.moveBackward = false;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.moveLeft = false;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.moveRight = false;
        break;
      case 'KeyE':
        this.moveUp = false;
        break;
      case 'KeyQ':
        this.moveDown = false;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        this.isSprinting = false;
        break;
    }
  };

  public update(delta: number) {
    if (this.mode === 'walk' || this.mode === 'fly') {
      const baseSpeed = this.isSprinting ? 6.0 : 2.5; // m/s
      const speed = baseSpeed * delta;

      const moveDir = new THREE.Vector3();
      if (this.moveForward) moveDir.z -= 1;
      if (this.moveBackward) moveDir.z += 1;
      if (this.moveLeft) moveDir.x -= 1;
      if (this.moveRight) moveDir.x += 1;
      moveDir.normalize();

      if (this.mode === 'walk') {
        // Move horizontally relative to camera yaw
        const forward = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(0, this.euler.y, 0));
        const right = new THREE.Vector3(1, 0, 0).applyEuler(new THREE.Euler(0, this.euler.y, 0));

        const deltaPos = new THREE.Vector3()
          .addScaledVector(forward, -moveDir.z * speed)
          .addScaledVector(right, moveDir.x * speed);

        // Collision check against wall collision meshes
        if (deltaPos.lengthSq() > 1e-6) {
          const proposed = this.camera.position.clone().add(deltaPos);
          if (!this.checkWallCollision(this.camera.position, deltaPos)) {
            this.camera.position.copy(proposed);
          }
        }
        this.camera.position.y = this.eyeHeight;
      } else {
        // Fly mode: 3D motion
        const moveVector = moveDir.applyQuaternion(this.camera.quaternion);
        if (this.moveUp) moveVector.y += 1;
        if (this.moveDown) moveVector.y -= 1;
        this.camera.position.addScaledVector(moveVector, speed);
      }
    }
  }

  /**
   * Prevents walking through walls using 4-way radial obstacle buffer checks.
   */
  private checkWallCollision(currentPos: THREE.Vector3, delta: THREE.Vector3): boolean {
    if (this.collisionMeshes.length === 0) return false;

    const testDir = delta.clone().normalize();
    const probeDist = delta.length() + 0.35; // 350mm personal body buffer
    const origin = currentPos.clone();
    origin.y = this.eyeHeight * 0.6; // test at waist height

    this.raycaster.set(origin, testDir);
    this.raycaster.far = probeDist;
    const hits = this.raycaster.intersectObjects(this.collisionMeshes, false);

    return hits.length > 0;
  }

  private updateCameraTransform() {
    if (this.mode === 'orbit') {
      const offset = new THREE.Vector3().setFromSpherical(this.spherical);
      this.camera.position.copy(this.target).add(offset);
      this.camera.lookAt(this.target);
    }
  }
}
