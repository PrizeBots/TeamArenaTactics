import * as THREE from 'three';

export class Bullet {
  public mesh: THREE.Mesh;
  public velocity: THREE.Vector3;
  public playerId: string;

  constructor(position: THREE.Vector3, direction: THREE.Vector3, playerId: string) {
    const geometry = new THREE.SphereGeometry(0.2);
    const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.copy(position);
    this.velocity = direction.normalize().multiplyScalar(0.5); // Speed of bullet
    this.playerId = playerId;
  }

  update(): void {
    this.mesh.position.add(this.velocity);
  }
}