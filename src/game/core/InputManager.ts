import { Vector2, Raycaster, Vector3, Plane } from 'three';
import { EntityManager } from './EntityManager';
import { PerspectiveCamera } from 'three';

export class InputManager {
  private keys: { [key: string]: boolean } = {};
  private mouse: Vector2;
  private raycaster: Raycaster;
  private entityManager?: EntityManager;
  private camera?: PerspectiveCamera;

  constructor() {
    this.mouse = new Vector2();
    this.raycaster = new Raycaster();
    this.setupEventListeners();
  }

  initialize(entityManager: EntityManager, camera: PerspectiveCamera): void {
    this.entityManager = entityManager;
    this.camera = camera;
  }

  private setupEventListeners(): void {
    window.addEventListener('keydown', (e) => this.keys[e.key.toLowerCase()] = true);
    window.addEventListener('keyup', (e) => this.keys[e.key.toLowerCase()] = false);
    window.addEventListener('mousemove', this.handleMouseMove.bind(this));
    window.addEventListener('click', this.handleShoot.bind(this));
  }

  private handleMouseMove(event: MouseEvent): void {
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  }

  private handleShoot(): void {
    const player = this.entityManager?.getLocalPlayer();
    if (!this.entityManager || !this.camera || !player || player.isInJail) return;
    
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const shootPlane = new Plane(new Vector3(0, 1, 0), -0.5);
    const intersection = new Vector3();
    
    if (this.raycaster.ray.intersectPlane(shootPlane, intersection)) {
      this.entityManager.createBullet(intersection);
    }
  }

  update(): void {
    if (!this.entityManager) return;
    
    let moved = false;
    const movement = new Vector3();
    const player = this.entityManager.getLocalPlayer();
    if (!player) return;
    
    const moveSpeed = 0.1 * player.getMoveSpeedMultiplier();

    if (this.keys['w']) { movement.z -= moveSpeed; moved = true; }
    if (this.keys['s']) { movement.z += moveSpeed; moved = true; }
    if (this.keys['a']) { movement.x -= moveSpeed; moved = true; }
    if (this.keys['d']) { movement.x += moveSpeed; moved = true; }

    if (moved) {
      this.entityManager.moveLocalPlayer(movement);
    }
  }
}