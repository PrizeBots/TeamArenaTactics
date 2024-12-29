import { BoxGeometry, Mesh, MeshBasicMaterial, Sprite, SpriteMaterial, CanvasTexture, Vector3 } from 'three';
import { TeamColor } from '../types';

export class Player {
  public mesh: Mesh;
  public healthBar: Sprite;
  public hp: number = 100;
  public team: TeamColor;
  public isInJail: boolean = false;
  private jailTimer: number | null = null;
  private isLocalPlayer: boolean = false;
  private jailTimerDisplay: HTMLDivElement;
  private jailStartTime: number = 0;
  private maxHp: number = 100;
  private barWidth: number = 1;
  private barHeight: number = 0.1;
  private moveSpeedMultiplier: number = 1;
  private onDestroyed?: () => void;
  private respawnCallback?: () => void;
  private jailCountdownInterval: number | null = null;

  constructor(position: Vector3, team: TeamColor, isLocalPlayer: boolean, onRespawn?: () => void, onDestroyed?: () => void) {
    this.team = team;
    this.isLocalPlayer = isLocalPlayer;
    this.respawnCallback = onRespawn;
    this.onDestroyed = onDestroyed;
    this.mesh = this.createPlayerMesh(team);
    this.mesh.position.copy(position);
    this.healthBar = this.createHealthBar();
    this.mesh.add(this.healthBar);
    this.healthBar.position.set(0, 1.5, 0);
    this.updateHealthBar();
    this.jailTimerDisplay = this.createJailTimerDisplay();
    document.body.appendChild(this.jailTimerDisplay);
  }

  private createJailTimerDisplay(): HTMLDivElement {
    const display = document.createElement('div');
    display.style.position = 'fixed';
    display.style.top = '30%';
    display.style.left = '50%';
    display.style.transform = 'translate(-50%, -50%)';
    display.style.fontSize = '48px';
    display.style.fontWeight = 'bold';
    display.style.color = '#000';
    display.style.textShadow = '2px 2px 4px rgba(255,255,255,0.5)';
    display.style.display = 'none';
    display.style.zIndex = '1000';
    return display;
  }

  private createPlayerMesh(team: TeamColor): Mesh {
    const color = team === 'red' ? '#ff0000' : '#008800';
    return new Mesh(
      new BoxGeometry(1, 1, 1),
      new MeshBasicMaterial({ color })
    );
  }

  private createHealthBar(): Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 100;
    canvas.height = 10;
    
    const texture = new CanvasTexture(canvas);
    const material = new SpriteMaterial({ map: texture });
    const sprite = new Sprite(material);
    
    sprite.scale.set(this.barWidth, this.barHeight, 1);
    sprite.position.y = 1.5;
    
    return sprite;
  }

  updateHealthBar(): void {
    const canvas = (this.healthBar.material as SpriteMaterial).map!.image as HTMLCanvasElement;
    const ctx = canvas.getContext('2d')!;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Background (gray)
    ctx.fillStyle = '#666666';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Border
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, canvas.width, canvas.height);
    
    // Health bar
    const healthWidth = (this.hp / this.maxHp) * canvas.width;
    ctx.fillStyle = '#00ff00';  // Always green HP
    ctx.fillRect(1, 1, healthWidth - 2, canvas.height - 2);  // Inset to show border
    
    (this.healthBar.material as SpriteMaterial).map!.needsUpdate = true;
  }

  takeDamage(amount: number): void {
    this.hp = Math.max(0, this.hp - amount);
    this.updateHealthBar();
    
    if (this.hp <= 0 && !this.isInJail) {
      if (this.onDestroyed) {
        this.onDestroyed();
      }
      this.sendToJail();
    }
  }

  private sendToJail(): void {
    this.isInJail = true;
    this.jailStartTime = Date.now();
    if (this.isLocalPlayer) {
      this.jailTimerDisplay.style.display = 'block';
    }
    const jailX = this.team === 'red' ? -24 : 24;
    const randomOffset = Math.random() * 2 - 1;  // Random position in jail
    this.mesh.position.set(jailX, 10, 8 + randomOffset);  // Drop from above
    
    // Update timer display
    if (this.isLocalPlayer) {
      this.jailCountdownInterval = setInterval(() => {
        const timeLeft = Math.ceil((10000 - (Date.now() - this.jailStartTime)) / 1000);
        this.jailTimerDisplay.textContent = `${timeLeft}`;
      }, 100) as unknown as number;
    }

    // Start jail timer
    this.jailTimer = setTimeout(() => {
      this.respawnAtBase();
    }, 10000);  // 10 seconds
  }

  private respawnAtBase(): void {
    this.isInJail = false;
    this.hp = this.maxHp;
    this.jailTimerDisplay.style.display = 'none';
    if (this.jailCountdownInterval !== null) {
      clearInterval(this.jailCountdownInterval);
      this.jailCountdownInterval = null;
    }
    this.updateHealthBar();
    
    const baseX = this.team === 'red' ? -20 : 20;
    const randomZ = Math.random() * 6 - 3;  // Random position in base
    this.mesh.position.set(baseX, 10, randomZ);  // Drop from above
    
    if (this.respawnCallback) {
      this.respawnCallback();
    }
  }

  update(): void {
    // Apply gravity if above ground
    if (this.mesh.position.y > 0.5) {
      this.mesh.position.y = Math.max(0.5, this.mesh.position.y - 0.2);
    }
  }

  cleanup(): void {
    if (this.jailTimer !== null) {
      clearTimeout(this.jailTimer);
    }
    if (this.jailCountdownInterval !== null) {
      clearInterval(this.jailCountdownInterval);
    }
    this.jailTimerDisplay.remove();
  }

  setMoveSpeedMultiplier(multiplier: number): void {
    this.moveSpeedMultiplier = multiplier;
  }

  getMoveSpeedMultiplier(): number {
    return this.moveSpeedMultiplier;
  }
}