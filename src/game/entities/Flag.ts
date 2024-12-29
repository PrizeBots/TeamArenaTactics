import { Mesh, CylinderGeometry, BoxGeometry, MeshBasicMaterial, Group, Vector3 } from 'three';
import { TeamColor } from '../types';

export class Flag {
  public group: Group;
  public team: TeamColor;
  private basePosition: Vector3;
  public isPickedUp: boolean = false;
  public carriedBy: string | null = null;

  constructor(team: TeamColor, position: Vector3) {
    this.team = team;
    this.basePosition = position.clone();
    this.group = this.createFlag();
    this.resetPosition();
  }

  private createFlag(): Group {
    const group = new Group();

    // Create pole
    const pole = new Mesh(
      new CylinderGeometry(0.1, 0.1, 3, 8),
      new MeshBasicMaterial({ color: 0x808080 }) // Grey pole
    );
    pole.position.y = 1.5; // Center of pole
    group.add(pole);

    // Create flag
    const flag = new Mesh(
      new BoxGeometry(1, 0.8, 0.1),
      new MeshBasicMaterial({ color: this.team === 'red' ? 0xff0000 : 0x008800 })
    );
    flag.position.set(0.5, 2.5, 0); // Top of pole, extending to the right
    group.add(flag);

    return group;
  }

  resetPosition(): void {
    this.group.position.copy(this.basePosition);
    this.isPickedUp = false;
    this.carriedBy = null;
  }

  attachToPlayer(playerId: string, playerPosition: Vector3): void {
    this.isPickedUp = true;
    this.carriedBy = playerId;
    this.updatePosition(playerPosition);
  }

  updatePosition(position: Vector3): void {
    if (this.isPickedUp) {
      // Position above player when carried
      this.group.position.set(
        position.x,
        position.y + 2,
        position.z
      );
    } else {
      // Position on ground when dropped
      this.group.position.set(
        position.x,
        0,
        position.z
      );
    }
  }

  drop(position: Vector3): void {
    this.isPickedUp = false;
    this.carriedBy = null;
    this.updatePosition(position);
  }
}