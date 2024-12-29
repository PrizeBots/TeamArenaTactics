export type TeamColor = 'red' | 'green';

export interface PlayerData {
  id: string;
  position: {
    x: number;
    y: number;
    z: number;
  };
  team: TeamColor;
}