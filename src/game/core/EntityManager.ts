import { Scene, Vector3 } from 'three';
import { Player } from '../entities/Player';
import { Bullet } from '../entities/Bullet';
import { NetworkManager } from './NetworkManager';
import { PlayerData } from '../types';

export class EntityManager {
  private scene: Scene;
  private network: NetworkManager;
  private players: Map<string, Player>;
  private bullets: Bullet[];
  private camera: PerspectiveCamera;
  private localPlayerId: string | null;
  private scores: { red: number; green: number } = { red: 0, green: 0 };

  constructor(scene: Scene, network: NetworkManager, camera: PerspectiveCamera) {
    this.scene = scene;
    this.network = network;
    this.camera = camera;
    this.players = new Map();
    this.bullets = [];
    this.localPlayerId = null;
  }

  getLocalPlayer(): Player | undefined {
    return this.players.get(this.localPlayerId!);
  }

  initializePlayers(localId: string, players: PlayerData[]): void {
    this.localPlayerId = localId;
    players.forEach(player => this.addPlayer(player));
  }

  addPlayer(playerData: PlayerData): void {
    const position = new Vector3(playerData.position.x, playerData.position.y, playerData.position.z);
    const isLocalPlayer = playerData.id === this.localPlayerId;
    const player = new Player(position, playerData.team, isLocalPlayer, () => {
      if (playerData.id === this.localPlayerId) {
        this.network.emitMove({
          x: player.mesh.position.x,
          y: player.mesh.position.y,
          z: player.mesh.position.z
        });
      }
    }, () => {
      // Drop flag when player is destroyed
      const sceneManager = this.scene.getObjectByName('SceneManager') as SceneManager;
      if (sceneManager) {
        if (sceneManager.redFlag.carriedBy === playerData.id) {
          sceneManager.redFlag.drop(player.mesh.position);
        }
        if (sceneManager.greenFlag.carriedBy === playerData.id) {
          sceneManager.greenFlag.drop(player.mesh.position);
        }
      }
    });
    this.scene.add(player.mesh);
    this.players.set(playerData.id, player);
  }

  removePlayer(id: string): void {
    const player = this.players.get(id);
    if (player) {
      player.cleanup();  // Clean up timers
      this.scene.remove(player.mesh);
      this.players.delete(id);
    }
  }

  moveLocalPlayer(movement: Vector3): void {
    const player = this.players.get(this.localPlayerId!);
    if (!player || player.isInJail) return;  // Can't move in jail
    
    // Store original position
    const originalPosition = player.mesh.position.clone();
    const newPosition = originalPosition.clone().add(movement);
    
    // Check collisions with other players
    let canMove = true;
    this.players.forEach((otherPlayer, id) => {
      if (id !== this.localPlayerId) {
        const distance = newPosition.distanceTo(otherPlayer.mesh.position);
        if (distance < 1.5) { // Collision radius
          canMove = false;
        }
      }
    });
    
    // Apply movement if no collision
    if (canMove) {
      player.mesh.position.copy(newPosition);
    }
    
    player.update();
    
    this.network.emitMove({
      x: player.mesh.position.x,
      y: player.mesh.position.y,
      z: player.mesh.position.z
    });
  }

  updatePlayerPosition(id: string, position: { x: number; y: number; z: number }): void {
    const player = this.players.get(id);
    if (player) {
      player.mesh.position.set(position.x, position.y, position.z);
      player.update();
    }
  }

  createBullet(targetPoint: Vector3): void {
    const player = this.players.get(this.localPlayerId!);
    if (!player) return;

    const playerTeam = player.team;

    const bulletPosition = player.mesh.position.clone();
    bulletPosition.y = 0.5;
    
    const direction = new Vector3()
      .subVectors(targetPoint, bulletPosition)
      .normalize();
    
    const bullet = new Bullet(bulletPosition, direction, this.localPlayerId!, playerTeam);
    this.bullets.push(bullet);
    this.scene.add(bullet.mesh);
    
    this.network.emitBulletFired(bulletPosition, direction, playerTeam);
  }

  createNetworkBullet(position: Vector3, direction: Vector3, playerId: string, team: TeamColor): void {
    const bullet = new Bullet(position, direction, playerId, team);
    this.bullets.push(bullet);
    this.scene.add(bullet.mesh);
  }

  update(): void {
    this.updateBullets();
    this.checkCollisions();
    this.updateCamera();
    this.checkFlagCapture();
  }

  private updateCamera(): void {
    const localPlayer = this.players.get(this.localPlayerId!);
    if (localPlayer) {
      this.scene.getObjectByName('SceneManager')?.updateCamera(localPlayer.mesh.position);
    }
  }

  private updateBullets(): void {
    this.bullets = this.bullets.filter(bullet => {
      bullet.update();
      if (bullet.mesh.position.length() > 50) {
        this.scene.remove(bullet.mesh);
        return false;
      }
      return true;
    });
  }

  private checkFlagCapture(): void {
    const sceneManager = this.scene.getObjectByName('SceneManager') as SceneManager;
    if (!sceneManager) return;

    this.players.forEach((player, playerId) => {
      const redFlag = sceneManager.redFlag;
      const greenFlag = sceneManager.greenFlag;

      if (!player.isInJail) {
        // Check enemy flag pickup
        if (player.team === 'red' && !greenFlag.isPickedUp && greenFlag.carriedBy === null) {
          const distance = player.mesh.position.distanceTo(greenFlag.group.position);
          if (distance < 1.5) {
            greenFlag.attachToPlayer(playerId, player.mesh.position);
            player.setMoveSpeedMultiplier(0.5); // Slow down flag carrier
          }
        } else if (player.team === 'green' && !redFlag.isPickedUp && redFlag.carriedBy === null) {
          const distance = player.mesh.position.distanceTo(redFlag.group.position);
          if (distance < 1.5) {
            redFlag.attachToPlayer(playerId, player.mesh.position);
            player.setMoveSpeedMultiplier(0.5); // Slow down flag carrier
          }
        }

        // Check own flag pickup and return
        if (player.team === 'red' && redFlag.isPickedUp && redFlag.carriedBy === null) {
          const distance = player.mesh.position.distanceTo(redFlag.group.position);
          if (distance < 1.5) {
            redFlag.attachToPlayer(playerId, player.mesh.position);
            player.setMoveSpeedMultiplier(0.5);
          }
        } else if (player.team === 'green' && greenFlag.isPickedUp && greenFlag.carriedBy === null) {
          const distance = player.mesh.position.distanceTo(greenFlag.group.position);
          if (distance < 1.5) {
            greenFlag.attachToPlayer(playerId, player.mesh.position);
            player.setMoveSpeedMultiplier(0.5);
          }
        }

        // Check flag return to base
        if (player.team === 'red' && redFlag.carriedBy === playerId) {
          const distance = player.mesh.position.distanceTo(new Vector3(-20, 0, 0));
          if (distance < 2) {
            redFlag.resetPosition();
            player.setMoveSpeedMultiplier(1);
          }
        } else if (player.team === 'green' && greenFlag.carriedBy === playerId) {
          const distance = player.mesh.position.distanceTo(new Vector3(20, 0, 0));
          if (distance < 2) {
            greenFlag.resetPosition();
            player.setMoveSpeedMultiplier(1);
          }
        }

        // Check scoring
        if (player.team === 'red' && greenFlag.carriedBy === playerId) {
          const distance = player.mesh.position.distanceTo(new Vector3(-20, 0, 0));
          if (distance < 2) {
            this.scores.red++;
            greenFlag.resetPosition();
            player.setMoveSpeedMultiplier(1); // Reset speed after scoring
            console.log('Score:', this.scores);
          }
        } else if (player.team === 'green' && redFlag.carriedBy === playerId) {
          const distance = player.mesh.position.distanceTo(new Vector3(20, 0, 0));
          if (distance < 2) {
            this.scores.green++;
            redFlag.resetPosition();
            player.setMoveSpeedMultiplier(1); // Reset speed after scoring
            console.log('Score:', this.scores);
          }
        }
      }

      // Update carried flag position
      if (redFlag.carriedBy === playerId) {
        redFlag.updatePosition(player.mesh.position);
      }
      if (greenFlag.carriedBy === playerId) {
        greenFlag.updatePosition(player.mesh.position);
      }
      
      // Reset speed if no longer carrying flag
      if (player.getMoveSpeedMultiplier() === 0.5 && 
          redFlag.carriedBy !== playerId && 
          greenFlag.carriedBy !== playerId) {
        player.setMoveSpeedMultiplier(1);
      }
    });
  }

  private checkCollisions(): void {
    this.bullets = this.bullets.filter(bullet => {
      let bulletHit = false;
      
      this.players.forEach((player, playerId) => {
        const distance = bullet.mesh.position.distanceTo(player.mesh.position);
        if (playerId !== bullet.playerId && distance < 0.75) {
          if (player.team !== bullet.team) {
            player.takeDamage(5);
          }
          bulletHit = true;  // Bullet collides with all players
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