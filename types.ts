
export enum AppStatus {
  IDLE = 'IDLE',
  CONNECTING = 'CONNECTING',
  LISTENING = 'LISTENING',
  SPEAKING = 'SPEAKING',
}

export interface TranscriptEntry {
  speaker: 'user' | 'rabbit';
  text: string;
}
