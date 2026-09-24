export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function generatePeaks(trackId: string, count: number): number[] {
  const seed = trackId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const peaks: number[] = [];
  
  for (let i = 0; i < count; i++) {
    const x = (seed + i * 137) % 100;
    const height = 4 + (Math.sin(x * 0.1) * 0.5 + 0.5) * 18;
    peaks.push(Math.round(height));
  }
  
  return peaks;
}

/** "1 song", "12 songs". */
export function songCount(n: number | null | undefined): string {
  const count = n ?? 0;
  return `${count} ${count === 1 ? 'song' : 'songs'}`;
}
