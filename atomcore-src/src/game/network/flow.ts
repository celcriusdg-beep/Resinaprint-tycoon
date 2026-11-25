// Small max-flow solver (Dinic) for the plant networks. Graphs are tiny (a few
// dozen nodes), so this runs every tick without measurable cost.

const EPS = 1e-9;

export class FlowNet {
  private head: number[] = [];
  private to: number[] = [];
  private cap: number[] = [];
  private base: number[] = [];
  private next: number[] = [];
  private level: number[] = [];
  private iter: number[] = [];
  n = 0;

  node(): number {
    this.head.push(-1);
    return this.n++;
  }

  /** Directed edge u→v (rc = capacity of the reverse direction, for undirected links). Returns the edge index. */
  edge(u: number, v: number, c: number, rc = 0): number {
    const e = this.to.length;
    this.to.push(v, u);
    this.cap.push(c, rc);
    this.base.push(c, rc);
    this.next.push(this.head[u], this.head[v]);
    this.head[u] = e;
    this.head[v] = e + 1;
    return e;
  }

  /** Raise an edge's capacity (both directions for undirected edges). */
  widen(e: number, dc: number, drc = 0): void {
    this.cap[e] += dc;
    this.base[e] += dc;
    this.cap[e + 1] += drc;
    this.base[e + 1] += drc;
  }

  /** Net flow through edge e in its forward direction. */
  flow(e: number): number {
    return this.base[e] - this.cap[e];
  }

  private bfs(s: number, t: number): boolean {
    this.level = new Array(this.n).fill(-1);
    const q = [s];
    this.level[s] = 0;
    for (let i = 0; i < q.length; i++) {
      const u = q[i];
      for (let e = this.head[u]; e !== -1; e = this.next[e]) {
        const v = this.to[e];
        if (this.cap[e] > EPS && this.level[v] < 0) {
          this.level[v] = this.level[u] + 1;
          q.push(v);
        }
      }
    }
    return this.level[t] >= 0;
  }

  private dfs(u: number, t: number, f: number): number {
    if (u === t) return f;
    for (; this.iter[u] !== -1; this.iter[u] = this.next[this.iter[u]]) {
      const e = this.iter[u];
      const v = this.to[e];
      if (this.cap[e] > EPS && this.level[v] === this.level[u] + 1) {
        const d = this.dfs(v, t, Math.min(f, this.cap[e]));
        if (d > EPS) {
          this.cap[e] -= d;
          this.cap[e ^ 1] += d;
          return d;
        }
      }
    }
    return 0;
  }

  /** Push as much additional flow from s to t as the capacities allow. */
  maxflow(s: number, t: number): number {
    let total = 0;
    let guard = 0;
    while (this.bfs(s, t) && guard++ < 200) {
      this.iter = this.head.slice();
      let f: number;
      let inner = 0;
      while ((f = this.dfs(s, t, Infinity)) > EPS && inner++ < 10_000) total += f;
    }
    return total;
  }
}
