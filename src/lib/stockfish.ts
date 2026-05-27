/**
 * Stockfish Chess Engine — Web Worker bridge.
 * Loads stockfish.js from the local public/ bundle (no CDN).
 */

export interface StockfishAnalysis {
  bestMove: string;
  evaluation: string;   // formatted: "+1.24" | "M5" | "-0.50"
  isMate: boolean;
  depth: number;        // actual analyzed depth (not requested)
  fen: string;
  variations: Array<{
    move: string;       // UCI (first move)
    score: number;      // centipawns or mate-in-N
    isMate: boolean;
    pv: string[];       // full PV in UCI
  }>;
  nps?: number;         // nodes per second
  nodes?: number;       // total nodes searched
}

export interface LiveAnalysisOptions {
  depth?: number;       // ignored when infinite = true
  infinite?: boolean;
  multiPV?: number;     // 1–5
}

export class StockfishEngine {
  private worker: Worker | null = null;
  private ready = false;
  private messageHandlers: Map<number, (msg: string) => void> = new Map();
  private requestId = 0;
  private sessionId = 0; // incremented on every analyzePositionLive call

  // ─── Init ─────────────────────────────────────────────────────────────────

  async initialize(): Promise<void> {
    if (this.ready) return;

    return new Promise((resolve, reject) => {
      try {
        const workerCode = `
          try { importScripts('/stockfish.js'); }
          catch (err) { self.postMessage('error: Failed to load Stockfish: ' + err); }

          let stockfish;
          self.onmessage = function(e) {
            if (e.data === 'init') {
              if (typeof STOCKFISH === 'function') {
                try {
                  stockfish = STOCKFISH();
                  stockfish.onmessage = function(line) { self.postMessage(line); };
                  self.postMessage('ready');
                } catch(err) {
                  self.postMessage('error: Stockfish init failed: ' + err);
                }
              } else {
                self.postMessage('error: STOCKFISH is not a function');
              }
            } else {
              if (stockfish) stockfish.postMessage(e.data);
            }
          };
        `;

        const blob = new Blob([workerCode], { type: 'application/javascript' });
        this.worker = new Worker(URL.createObjectURL(blob));

        this.worker.onmessage = (e) => {
          const msg: string = e.data;

          if (msg === 'ready') {
            this.ready = true;
            this.sendCommand('uci');
            setTimeout(resolve, 100);
            return;
          }
          if (msg.startsWith('error:')) {
            reject(new Error(msg.slice(6).trim()));
            return;
          }
          this.messageHandlers.forEach((h) => h(msg));
        };

        this.worker.onerror = (err) => reject(err);
        this.worker.postMessage('init');

        setTimeout(() => {
          if (!this.ready) reject(new Error('Stockfish init timeout'));
        }, 10000);
      } catch (err) {
        reject(err);
      }
    });
  }

  // ─── Commands ─────────────────────────────────────────────────────────────

  private sendCommand(cmd: string): void {
    if (!this.worker) throw new Error('Engine not initialized');
    this.worker.postMessage(cmd);
  }

  private async waitForResponse(
    predicate: (msg: string) => boolean,
    timeout = 30_000,
  ): Promise<string[]> {
    return new Promise((resolve) => {
      const responses: string[] = [];
      const id = this.requestId++;

      const timer = setTimeout(() => {
        this.messageHandlers.delete(id);
        resolve(responses);
      }, timeout);

      this.messageHandlers.set(id, (msg) => {
        responses.push(msg);
        if (predicate(msg)) {
          clearTimeout(timer);
          this.messageHandlers.delete(id);
          resolve(responses);
        }
      });
    });
  }

  // ─── One-shot analysis (for bulk analysis / game classification) ──────────

  async analyzePosition(
    fen: string,
    depth = 15,
    multiPV = 1,
  ): Promise<StockfishAnalysis> {
    if (!this.ready) await this.initialize();

    this.sendCommand(`setoption name MultiPV value ${multiPV}`);
    this.sendCommand(`position fen ${fen}`);
    this.sendCommand(`go depth ${depth}`);

    const responses = await this.waitForResponse((m) => m.startsWith('bestmove'));
    return this.parseAnalysis(responses, fen, depth);
  }

  // ─── Streaming analysis (for interactive panel) ───────────────────────────

  /**
   * Starts continuous analysis of a position, calling onUpdate on every new
   * depth increment.  For infinite=true, never resolves unless stopAnalysis()
   * is called externally; for fixed depth, resolves after bestmove.
   */
  async analyzePositionLive(
    fen: string,
    options: LiveAnalysisOptions,
    onUpdate: (result: StockfishAnalysis) => void,
  ): Promise<StockfishAnalysis> {
    if (!this.ready) await this.initialize();

    const multiPV = Math.max(1, Math.min(5, options.multiPV ?? 3));
    const depth = options.depth ?? 20;

    // Cancel any running analysis and drop stale handlers
    this.sendCommand('stop');
    this.messageHandlers.clear();
    await new Promise((r) => setTimeout(r, 40)); // let 'bestmove' from stop drain

    const mySession = ++this.sessionId;

    this.sendCommand(`setoption name MultiPV value ${multiPV}`);
    this.sendCommand(`position fen ${fen}`);

    if (options.infinite) {
      this.sendCommand('go infinite');
    } else {
      this.sendCommand(`go depth ${depth}`);
    }

    const responses: string[] = [];
    let lastAnalysis: StockfishAnalysis = {
      bestMove: '',
      evaluation: '0.00',
      isMate: false,
      depth: 0,
      fen,
      variations: [],
    };
    let lastNotifiedDepth = -1;

    return new Promise((resolve) => {
      const id = this.requestId++;

      const handler = (msg: string) => {
        // Session guard — ignore messages from a replaced analysis
        if (mySession !== this.sessionId) {
          this.messageHandlers.delete(id);
          resolve(lastAnalysis);
          return;
        }

        responses.push(msg);

        // Fire callback on each new depth level
        if (msg.includes('depth') && msg.includes('score')) {
          const dm = msg.match(/\bdepth (\d+)/);
          const curDepth = dm ? parseInt(dm[1]) : 0;
          if (curDepth > lastNotifiedDepth) {
            lastNotifiedDepth = curDepth;
            const analysis = this.parseAnalysis(responses, fen, curDepth);
            if (analysis.variations.length > 0) {
              lastAnalysis = analysis;
              onUpdate(analysis);
            }
          }
        }

        if (msg.startsWith('bestmove')) {
          this.messageHandlers.delete(id);
          const final = this.parseAnalysis(responses, fen, depth);
          resolve(final.variations.length > 0 ? final : lastAnalysis);
        }
      };

      this.messageHandlers.set(id, handler);

      // Safety timeout for fixed-depth (infinite has no timeout — caller calls stop())
      if (!options.infinite) {
        setTimeout(() => {
          if (this.messageHandlers.has(id)) {
            this.messageHandlers.delete(id);
            resolve(lastAnalysis);
          }
        }, 120_000);
      }
    });
  }

  /** Stop any running analysis (causes engine to emit bestmove, resolving the live promise). */
  stopAnalysis(): void {
    if (this.worker && this.ready) {
      this.sendCommand('stop');
    }
  }

  // ─── Parser ───────────────────────────────────────────────────────────────

  private parseAnalysis(
    responses: string[],
    fen: string,
    requestedDepth: number,
  ): StockfishAnalysis {
    let bestMove = '';
    let evalScore = 0;
    let mate: number | null = null;
    let maxDepth = 0;
    let nps = 0;
    let nodes = 0;

    // Track the latest variation for each PV line (overwritten on deeper depths)
    const pvMap = new Map<
      number,
      { move: string; score: number; isMate: boolean; pv: string[] }
    >();

    for (const line of responses) {
      if (line.startsWith('bestmove')) {
        bestMove = line.split(' ')[1] ?? '';
        continue;
      }

      // Parse nps / nodes from any info line
      const npsM = line.match(/\bnps (\d+)/);
      if (npsM) nps = parseInt(npsM[1]);
      const nodesM = line.match(/\bnodes (\d+)/);
      if (nodesM) nodes = parseInt(nodesM[1]);

      // Only PV info lines have both 'depth' and 'score'
      if (!line.includes('depth') || !line.includes('score')) continue;

      const depthM = line.match(/\bdepth (\d+)/);
      const pvNum = (() => {
        const m = line.match(/\bmultipv (\d+)/);
        return m ? parseInt(m[1]) : 1;
      })();
      const scoreM = line.match(/\bscore (cp|mate) (-?\d+)/);
      const pvM = line.match(/ pv (.+)/);

      if (!scoreM || !pvM) continue;

      const curDepth = depthM ? parseInt(depthM[1]) : 0;
      if (curDepth > maxDepth) maxDepth = curDepth;

      const isMate = scoreM[1] === 'mate';
      const rawScore = parseInt(scoreM[2]);
      const score = isMate ? rawScore : rawScore / 100;
      const pvMoves = pvM[1].trim().split(/\s+/).slice(0, 8);

      if (pvNum === 1) {
        evalScore = score;
        mate = isMate ? rawScore : null;
      }

      pvMap.set(pvNum, {
        move: pvMoves[0] ?? '',
        score,
        isMate,
        pv: pvMoves,
      });
    }

    const evalString =
      mate !== null
        ? `M${mate}`
        : evalScore > 0
        ? `+${evalScore.toFixed(2)}`
        : evalScore.toFixed(2);

    const variations = Array.from(pvMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([, v]) => v);

    return {
      bestMove: bestMove || variations[0]?.move || '',
      evaluation: evalString,
      isMate: mate !== null,
      depth: maxDepth || requestedDepth,
      fen,
      variations,
      nps,
      nodes,
    };
  }

  // ─── Lifecycle ────────────────────────────────────────────────────────────

  terminate(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
      this.ready = false;
      this.messageHandlers.clear();
    }
  }
}

// Singleton for legacy/bulk use — interactive panels use their own instances
export const stockfish = new StockfishEngine();
