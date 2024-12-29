import { Scene, WebGLRenderer, PerspectiveCamera } from 'three';
import { Socket } from 'socket.io-client';
import { InputManager } from './InputManager';
import { NetworkManager } from './NetworkManager';
import { SceneManager } from './SceneManager';
import { EntityManager } from './EntityManager';

export class GameEngine {
  private renderer: WebGLRenderer;
  private camera: PerspectiveCamera;
  private scene: Scene;
  
  public input: InputManager;
  public network: NetworkManager;
  public sceneManager: SceneManager;
  public entityManager: EntityManager;

  constructor(container: HTMLElement, socket: Socket) {
    this.scene = new Scene();
    this.camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.renderer = new WebGLRenderer({ antialias: true });
    
    this.setupRenderer(container);
    
    this.input = new InputManager();
    this.network = new NetworkManager(socket);
    this.sceneManager = new SceneManager(this.scene, this.camera);
    this.entityManager = new EntityManager(this.scene, this.network, this.camera);
    
    // Add SceneManager to scene for camera updates
    this.scene.add(this.sceneManager);
    this.sceneManager.name = 'SceneManager';
    
    this.initialize();
  }

  private setupRenderer(container: HTMLElement): void {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(this.renderer.domElement);
    
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  private initialize(): void {
    this.sceneManager.setup();
    this.network.initialize(this.entityManager);
    this.input.initialize(this.entityManager, this.camera);
    this.animate();
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);
    
    this.input.update();
    this.entityManager.update();
    this.renderer.render(this.scene, this.camera);
  };
}