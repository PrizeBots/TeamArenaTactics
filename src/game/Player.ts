import * as THREE from 'three';

export class Player {
  public mesh: THREE.Mesh;
  public healthBar: THREE.Sprite;
  public hp: number = 100;
  private maxHp: number = 100;
  private barWidth: number = 1;
  private barHeight: number = 0.1;

  constructor(position: THREE.Vector3, color: string) {
    // Create player cube
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshBasicMaterial({ color });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.copy(position);

    // Create health bar
    const canvas = document.createElement('canvas');
    canvas.width = 100;
    canvas.height = 10;
    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
    this.healthBar = new THREE.Sprite(spriteMaterial);
    this.healthBar.scale.set(this.barWidth, this.barHeight, 1);
    this.healthBar.position.y = 1.5; // Position above player

    this.updateHealthBar();
  }

  updateHealthBar(): void {
    const canvas = (this.healthBar.material as THREE.SpriteMaterial).map!.image as HTMLCanvasElement;
    const ctx = canvas.getContext('2d')!;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw background (red)
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw health (green)
    const healthWidth = (this.hp / this.maxHp) * canvas.width;
    ctx.fillStyle = '#00ff00';
    ctx.fillRect(0, 0, healthWidth, canvas.height);
    
    // Update texture
    (this.healthBar.material as THREE.SpriteMaterial).map!.needsUpdate = true;
  }

  takeDamage(amount: number): void {
    this.hp = Math.max(0, this.hp - amount);
    this.updateHealthBar();
  }

  update(): void {
    // Update health bar position to follow player
    this.healthBar.position.copy(this.mesh.position);
    this.healthBar.position.y += 1.5;
  }
}