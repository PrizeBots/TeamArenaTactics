import * as THREE from 'three';
import { Socket } from 'socket.io-client';
import { Bullet } from './Bullet';
import { Player } from './Player';

interface PlayerData {
  id: string;
  position: { x: number; y: number; z: number };
  color: string;
}

export class GameScene {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private players: Map<string, Player>;
  private socket: Socket;
  private playerId: string | null = null;
  private keys: { [key: string]: boolean } = {};
  private bullets: Bullet[] = [];
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;

  constructor(container: HTMLElement, socket: Socket) {
    this.socket = socket;
    this.players = new Map();
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    // Scene setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf0f0f0);

    // Camera setup
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 5, 10);
    this.camera.lookAt(0, 0, 0);

    // Renderer setup
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(this.renderer.domElement);

    // Add ground
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(20, 20),
      new THREE.MeshBasicMaterial({ color: 0xcccccc })
    );
    ground.rotation.x = -Math.PI / 2;
    this.scene.add(ground);

    // Event listeners
    window.addEventListener('resize', this.onWindowResize.bind(this));
    window.addEventListener('keydown', (e) => this.keys[e.key.toLowerCase()] = true);
    window.addEventListener('keyup', (e) => this.keys[e.key.toLowerCase()] = false);
    window.addEventListener('click', this.handleShoot.bind(this));
    window.addEventListener('mousemove', this.handleMouseMove.bind(this));

    // Socket event handlers
    this.setupSocketHandlers();

    // Start animation loop
    this.animate();
  }

  private setupSocketHandlers(): void {
    this.socket.on('init', ({ id, players }: { id: string; players: PlayerData[] }) => {
      this.playerId = id;
      players.forEach((player) => this.addPlayer(player));
    });

    this.socket.on('playerJoined', (player: PlayerData) => {
      this.addPlayer(player);
    });

    this.socket.on('playerLeft', (id: string) => {
      this.removePlayer(id);
    });

    this.socket.on('playerMoved', ({ id, position }) => {
      const player = this.players.get(id);
      if (player) {
        player.mesh.position.set(position.x, position.y, position.z);
        player.update(); // Update health bar position
      }
    });
    
    this.socket.on('bulletFired', ({ position, direction, playerId }) => {
      const bullet = new Bullet(
        new THREE.Vector3(position.x, position.y, position.z),
        new THREE.Vector3(direction.x, direction.y, direction.z),
        playerId
      );
      this.bullets.push(bullet);
      this.scene.add(bullet.mesh);
    });
  }

  private handleMouseMove(event: MouseEvent): void {
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  }

  private handleShoot(): void {
    const playerMesh = this.players.get(this.playerId!);
    if (!playerMesh) return;
    
    this.raycaster.setFromCamera(this.mouse, this.camera);
    
    // Create a plane at y=0.5 (cube height)
    const shootPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.5);
    const intersection = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(shootPlane, intersection);
    
    // Calculate direction from player to intersection point
    const direction = new THREE.Vector3()
      .subVectors(intersection, playerMesh.mesh.position)
      .normalize();
    
    // Ensure bullet starts at player position with y=0.5
    const bulletPosition = playerMesh.mesh.position.clone();
    bulletPosition.y = 0.5;
    
    const bullet = new Bullet(bulletPosition, direction, this.playerId!);
    this.bullets.push(bullet);
    this.scene.add(bullet.mesh);

    // Emit bullet fired event
    this.socket.emit('bulletFired', {
      position: {
        x: bulletPosition.x,
        y: bulletPosition.y,
        z: bulletPosition.z
      },
      direction: {
        x: direction.x,
        y: direction.y,
        z: direction.z
      }
    });
  }

  private addPlayer(player: PlayerData): void {
    const position = new THREE.Vector3(player.position.x, player.position.y, player.position.z);
    const gamePlayer = new Player(position, player.color);
    this.scene.add(gamePlayer.mesh);
    this.scene.add(gamePlayer.healthBar);
    this.players.set(player.id, gamePlayer);
  }

  private removePlayer(id: string): void {
    const player = this.players.get(id);
    if (player) {
      this.scene.remove(player.mesh);
      this.scene.remove(player.healthBar);
      this.players.delete(id);
    }
  }

  private handleMovement(): void {
    const playerMesh = this.players.get(this.playerId!);
    if (!playerMesh) return;
    const moveSpeed = 0.1;
    let moved = false;

    if (this.keys['w']) {
      playerMesh.mesh.position.z -= moveSpeed;
      moved = true;
    }
    if (this.keys['s']) {
      playerMesh.mesh.position.z += moveSpeed;
      moved = true;
    }
    if (this.keys['a']) {
      playerMesh.mesh.position.x -= moveSpeed;
      moved = true;
    }
    if (this.keys['d']) {
      playerMesh.mesh.position.x += moveSpeed;
      moved = true;
    }

    if (moved) {
      playerMesh.update();
      this.socket.emit('move', {
        x: playerMesh.mesh.position.x,
        y: playerMesh.mesh.position.y,
        z: playerMesh.mesh.position.z
      });
    }
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private animate(): void {
    requestAnimationFrame(this.animate.bind(this));
    this.handleMovement();
    this.checkBulletCollisions();

    // Update bullets
    this.bullets = this.bullets.filter(bullet => {
      bullet.update();
      
      // Remove bullets that have traveled too far
      if (bullet.mesh.position.length() > 50) {
        this.scene.remove(bullet.mesh);
        return false;
      }
      return true;
    });

    this.renderer.render(this.scene, this.camera);
  }

  private checkBulletCollisions(): void {
    this.bullets = this.bullets.filter(bullet => {
      let bulletHit = false;

      this.players.forEach((player, playerId) => {
        if (playerId !== bullet.playerId) { // Don't collide with shooter
          const distance = bullet.mesh.position.distanceTo(player.mesh.position);
          if (distance < 0.75) { // Collision threshold
            player.takeDamage(1);
            bulletHit = true;
          }
        }
      });

      if (bulletHit) {
        this.scene.remove(bullet.mesh);
        return false;
      }
      return true;
    });
  }
}