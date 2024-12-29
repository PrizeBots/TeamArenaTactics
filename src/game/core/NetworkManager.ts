import { Socket } from 'socket.io-client';
import { Vector3 } from 'three';
import { EntityManager } from './EntityManager';
import { PlayerData } from '../types';

export class NetworkManager {
  private socket: Socket;
  private entityManager?: EntityManager;

  constructor(socket: Socket) {
    this.socket = socket;
  }

  initialize(entityManager: EntityManager): void {
    this.entityManager = entityManager;
    this.setupSocketHandlers();
  }

  private setupSocketHandlers(): void {
    if (!this.entityManager) return;

    this.socket.on('init', ({ id, players }: { id: string; players: PlayerData[] }) => {
      this.entityManager?.initializePlayers(id, players);
    });

    this.socket.on('playerJoined', (player: PlayerData) => {
      this.entityManager?.addPlayer(player);
    });

    this.socket.on('playerLeft', (id: string) => {
      this.entityManager?.removePlayer(id);
    });

    this.socket.on('playerMoved', ({ id, position }) => {
      this.entityManager?.updatePlayerPosition(id, position);
    });

    this.socket.on('bulletFired', ({ position, direction, playerId, team }) => {
      this.entityManager?.createNetworkBullet(
        new Vector3(...position),
        new Vector3(...direction),
        playerId,
        team
      );
    });
  }

  emitMove(position: { x: number; y: number; z: number }): void {
    this.socket.emit('move', position);
  }

  emitBulletFired(position: Vector3, direction: Vector3, team: TeamColor): void {
    this.socket.emit('bulletFired', {
      position: position.toArray(),
      direction: direction.toArray(),
      team
    });
  }
}