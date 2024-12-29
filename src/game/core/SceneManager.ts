import { Scene, PerspectiveCamera, DirectionalLight, AmbientLight, PlaneGeometry, MeshBasicMaterial, Mesh, SphereGeometry, BackSide, Vector3, Object3D } from 'three';
import { Flag } from '../entities/Flag';

export class SceneManager extends Object3D {
  private scene: Scene;
  private camera: PerspectiveCamera;
  private cameraOffset: Vector3;
  public redFlag: Flag;
  public greenFlag: Flag;

  constructor(scene: Scene, camera: PerspectiveCamera) {
    super();
    this.scene = scene;
    this.camera = camera;
    this.cameraOffset = new Vector3(0, 8, 12);  // Camera position relative to player
  }

  setup(): void {
    this.setupLights();
    this.setupSky();
    this.setupGround();
    this.setupFlags();
  }

  private setupFlags(): void {
    // Create flags at team bases
    this.redFlag = new Flag('red', new Vector3(-20, 0, 0));
    this.greenFlag = new Flag('green', new Vector3(20, 0, 0));
    
    this.scene.add(this.redFlag.group);
    this.scene.add(this.greenFlag.group);
  }

  private setupSky(): void {
    const skyGeometry = new SphereGeometry(100, 32, 32);
    const skyMaterial = new MeshBasicMaterial({
      color: 0x87CEEB,  // Sky blue
      side: BackSide,
    });
    const sky = new Mesh(skyGeometry, skyMaterial);
    this.scene.add(sky);
  }

  updateCamera(playerPosition: Vector3): void {
    // Set camera position relative to player
    this.camera.position.copy(playerPosition).add(this.cameraOffset);
    // Make camera look at player
    this.camera.lookAt(playerPosition);
  }

  private setupLights(): void {
    const directionalLight = new DirectionalLight(0xffffff, 1);
    directionalLight.position.set(10, 20, 10);
    this.scene.add(directionalLight);
    
    const ambientLight = new AmbientLight(0x404040, 2);
    this.scene.add(ambientLight);
  }

  private setupGround(): void {
    const ground = new Mesh(
      new PlaneGeometry(50, 20),
      new MeshBasicMaterial({ color: 0x90EE90 })  // Light green field
    );
    ground.rotation.x = -Math.PI / 2;
    this.scene.add(ground);
    
    // Add jails
    const redJail = new Mesh(
      new PlaneGeometry(4, 4),
      new MeshBasicMaterial({ color: 0xff9999 })
    );
    redJail.rotation.x = -Math.PI / 2;
    redJail.position.set(-24, 0.01, 8);  // Outside the field
    this.scene.add(redJail);
    
    const greenJail = new Mesh(
      new PlaneGeometry(4, 4),
      new MeshBasicMaterial({ color: 0x99ff99 })
    );
    greenJail.rotation.x = -Math.PI / 2;
    greenJail.position.set(24, 0.01, 8);
    this.scene.add(greenJail);
    
    // Add team bases
    const redBase = new Mesh(
      new PlaneGeometry(8, 8),
      new MeshBasicMaterial({ color: 0xff6666 })
    );
    redBase.rotation.x = -Math.PI / 2;
    redBase.position.set(-20, 0.01, 0);  // Slightly above ground to prevent z-fighting
    this.scene.add(redBase);
    
    const greenBase = new Mesh(
      new PlaneGeometry(8, 8),
      new MeshBasicMaterial({ color: 0x66ff66 })
    );
    greenBase.rotation.x = -Math.PI / 2;
    greenBase.position.set(20, 0.01, 0);
    this.scene.add(greenBase);
  }
}