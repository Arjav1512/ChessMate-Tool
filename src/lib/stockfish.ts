/**
 * Stockfish Chess Engine Integration
 * Uses stockfish.js from CDN with Web Worker for analysis
 */

interface StockfishAnalysis {
  bestMove: string;
  evaluation: string;
  isMate: boolean;
  depth: number;
  fen: string;
  variations: Array<{
    move: string;
    score: number;
    isMate: boolean;
    pv: string[];
  }>;
}

export class StockfishEngine {
  private worker: Worker | null = null;
  private ready: boolean = false;
  private messageHandlers: Map<number, (message: string) => void> = new Map();
  private requestId: number = 0;

  /**
   * Initialize the Stockfish engine worker
   */
  async initialize(): Promise<void> {
    if (this.ready) return;

    return new Promise((resolve, reject) => {
      try {
        // Create worker with stockfish.js
        const workerCode = `
          // Import Stockfish from CDN
          importScripts('https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.2/stockfish.js');

          let stockfish;

          self.onmessage = function(e) {
            if (e.data === 'init') {
              // Initialize Stockfish
              if (typeof STOCKFISH === 'function') {
                stockfish = STOCKFISH();
                stockfish.onmessage = function(line) {
                  self.postMessage(line);
                };
                self.postMessage('ready');
              } else {
                self.postMessage('error: Stockfish not loaded');
              }
            } else {
              // Forward commands to Stockfish
              if (stockfish) {
                stockfish.postMessage(e.data);
              }
            }
          };
        `;

        const blob = new Blob([workerCode], { type: 'application/javascript' });
        const workerUrl = URL.createObjectURL(blob);

        this.worker = new Worker(workerUrl);

        this.worker.onmessage = (e) => {
          const message = e.data;

          if (message === 'ready') {
            this.ready = true;
            // Send UCI initialization commands
            this.sendCommand('uci');
            setTimeout(() => resolve(), 100);
            return;
          }

          // Notify all active handlers
          this.messageHandlers.forEach((handler) => {
            handler(message);
          });
        };

        this.worker.onerror = (error) => {
          console.error('Stockfish Worker error:', error);
          reject(error);
        };

        // Start initialization
        this.worker.postMessage('init');

        // Timeout after 10 seconds
        setTimeout(() => {
          if (!this.ready) {
            reject(new Error('Stockfish initialization timeout'));
          }
        }, 10000);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Send a command to the Stockfish engine
   */
  private sendCommand(command: string): void {
    if (!this.worker) {
      throw new Error('Stockfish worker not initialized');
    }
    this.worker.postMessage(command);
  }

  /**
   * Wait for a specific response from Stockfish
   */
  private async waitForResponse(
    predicate: (message: string) => boolean,
    timeout: number = 30000
  ): Promise<string[]> {
    return new Promise((resolve) => {
      const responses: string[] = [];
      const handlerId = this.requestId++;

      const timeoutId = setTimeout(() => {
        this.messageHandlers.delete(handlerId);
        resolve(responses);
      }, timeout);

      const handler = (message: string) => {
        responses.push(message);
        if (predicate(message)) {
          clearTimeout(timeoutId);
          this.messageHandlers.delete(handlerId);
          resolve(responses);
        }
      };

      this.messageHandlers.set(handlerId, handler);
    });
  }

  /**
   * Analyze a chess position and return evaluation with variations
   */
  async analyzePosition(
    fen: string,
    depth: number = 15,
    multiPV: number = 3
  ): Promise<StockfishAnalysis> {
    if (!this.ready) {
      await this.initialize();
    }

    // Configure analysis
    this.sendCommand(`setoption name MultiPV value ${multiPV}`);
    this.sendCommand(`setoption name UCI_AnalyseMode value true`);
    this.sendCommand(`position fen ${fen}`);
    this.sendCommand(`go depth ${depth}`);

    // Wait for analysis to complete
    const responses = await this.waitForResponse((msg) =>
      msg.startsWith('bestmove')
    );

    return this.parseAnalysis(responses, fen, depth);
  }

  /**
   * Parse Stockfish output into structured analysis
   */
  private parseAnalysis(
    responses: string[],
    fen: string,
    depth: number
  ): StockfishAnalysis {
    let bestMove = '';
    let evaluation = 0;
    let mate: number | null = null;
    const variations: Array<{
      move: string;
      score: number;
      isMate: boolean;
      pv: string[];
    }> = [];

    for (const response of responses) {
      // Parse best move
      if (response.startsWith('bestmove')) {
        const parts = response.split(' ');
        bestMove = parts[1] || 'e2e4';
      }

      // Parse info lines with multipv
      if (response.includes('depth') && response.includes('multipv')) {
        const pvMatch = response.match(/multipv (\d+)/);
        const scoreMatch = response.match(/score (cp|mate) (-?\d+)/);
        const pvMovesMatch = response.match(/pv (.+)/);

        if (pvMatch && scoreMatch && pvMovesMatch) {
          const pvNum = parseInt(pvMatch[1]);
          const scoreType = scoreMatch[1];
          const scoreValue = parseInt(scoreMatch[2]);
          const pvMoves = pvMovesMatch[1].split(' ').slice(0, 10);

          const isMate = scoreType === 'mate';
          const score = isMate ? scoreValue : scoreValue / 100;

          // Track best line's evaluation
          if (pvNum === 1) {
            evaluation = score;
            mate = isMate ? scoreValue : null;
          }

          // Update or add variation
          const existingIdx = variations.findIndex((_v, idx) => idx === pvNum - 1);
          const variation = {
            move: pvMoves[0] || 'e2e4',
            score,
            isMate,
            pv: pvMoves,
          };

          if (existingIdx >= 0) {
            variations[existingIdx] = variation;
          } else {
            variations.push(variation);
          }
        }
      }
    }

    // Format evaluation
    const evalString = mate !== null ? `M${mate}` : evaluation.toFixed(2);

    return {
      bestMove: bestMove || variations[0]?.move || 'e2e4',
      evaluation: evalString,
      isMate: mate !== null,
      depth,
      fen,
      variations: variations.slice(0, 3),
    };
  }

  /**
   * Terminate the Stockfish worker
   */
  terminate(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
      this.ready = false;
      this.messageHandlers.clear();
    }
  }
}

// Singleton instance
export const stockfish = new StockfishEngine();
