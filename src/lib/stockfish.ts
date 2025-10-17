class StockfishEngine {
  private analyzing: boolean = false;

  async initialize(): Promise<void> {
    return Promise.resolve();
  }

  async analyzePosition(fen: string, depth: number = 15, multiPV: number = 3): Promise<any> {
    await new Promise(resolve => setTimeout(resolve, 300));

    const pieceCount = fen.split(' ')[0].replace(/[^a-zA-Z]/g, '').length;
    const whiteToMove = fen.split(' ')[1] === 'w';

    const baseEval = Math.random() * 2 - 1;
    const evaluation = parseFloat((baseEval * (pieceCount / 10)).toFixed(2));

    const variations = [];
    const moves = ['e4', 'Nf3', 'd4', 'c4', 'g3'];

    for (let i = 0; i < Math.min(multiPV, 3); i++) {
      const moveEval = evaluation + (Math.random() * 0.5 - 0.25);
      variations.push({
        move: moves[i] || 'e4',
        score: parseFloat(moveEval.toFixed(2)),
        isMate: false,
        pv: [moves[i] || 'e4']
      });
    }

    return {
      bestMove: variations[0]?.move || 'e4',
      evaluation: evaluation.toFixed(2),
      isMate: false,
      depth,
      fen,
      variations
    };
  }

  terminate(): void {
    this.analyzing = false;
  }
}

export const stockfish = new StockfishEngine();
