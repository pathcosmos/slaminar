export class PhaseTimer {
  private verbose: boolean;
  private startTime: number = 0;

  constructor(verbose: boolean) {
    this.verbose = verbose;
  }

  start(phase: string): void {
    if (!this.verbose) return;
    this.startTime = Date.now();
    process.stdout.write(`  ${phase}...`);
  }

  end(detail?: string): void {
    if (!this.verbose) return;
    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(1);
    const suffix = detail ? ` (${detail})` : '';
    console.log(` done ${elapsed}s${suffix}`);
  }
}
