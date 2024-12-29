import * as THREE from 'three';
import { TeamColor } from '../types';

export class Bullet {
  public mesh: THREE.Mesh;
  public velocity: THREE.Vector3;
  public playerId: string;
  public team: TeamColor;

  constructor(position: THREE.Vector3, direction: THREE.Vector3, playerId: string, team: TeamColor) {
    const geometry = new THREE.SphereGeometry(0.2);
    const material = new THREE.MeshBasicMaterial({ color: team === 'red' ? 0xff0000 : 0x008800 });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.copy(position);
    this.velocity = direction.normalize().multiplyScalar(0.5); // Speed of bullet
    this.playerId = playerId;
    this.team = team;
  }

  update(): void {
    this.mesh.position.add(this.velocity);
  }
}