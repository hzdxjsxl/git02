/**
 * SnapshotEngine —— 答题状态快照引擎
 *
 * 一个独立的、零依赖的状态快照与时间回溯引擎。
 * 每一次答题行为都会在内部生成一个「全量快照」，
 * 记录此刻整张卷子所有题目的答题情况。
 * 调用方可以通过时间戳快速回溯到任意历史时刻，
 * 获取该时刻的完整答题状态。
 *
 * 使用方式:
 *   const engine = new SnapshotEngine({ maxSnapshots: 500 });
 *   engine.record(Date.now(), { answers: {...}, currentIndex: 3 });
 *   const snapshot = engine.snapshotAt(someTimestamp);
 *   engine.restore(snapshot);
 */

class SnapshotEngine {
  /**
   * @param {Object} options
   * @param {number} options.maxSnapshots  最多保留的快照数量，超出时移除最早的（默认 500）
   * @param {number} options.minInterval   两次快照之间的最小毫秒间隔（默认 200ms），防止高频触发
   */
  constructor(options = {}) {
    this.maxSnapshots = options.maxSnapshots !== undefined ? options.maxSnapshots : 500;
    this.minInterval = options.minInterval !== undefined ? options.minInterval : 200;

    this._snapshots = [];
    this._lastRecordTime = 0;
    this._onSnapshotListeners = [];
    this._onRestoreListeners = [];
  }

  /**
   * 记录一次全量快照。
   * 内部会自动深拷贝 state，避免外部引用污染。
   *
   * @param {number} timestamp   该快照对应的时间戳（毫秒）
   * @param {Object} state       任意可序列化对象，例如 { answers, currentIndex }
   * @returns {Object|null}      实际写入的快照，若被限流则返回 null
   */
  record(timestamp, state) {
    if (timestamp - this._lastRecordTime < this.minInterval) {
      return null;
    }
    this._lastRecordTime = timestamp;

    const snapshot = {
      id: this._snapshots.length > 0
        ? this._snapshots[this._snapshots.length - 1].id + 1
        : 1,
      timestamp,
      state: this._deepClone(state)
    };

    this._snapshots.push(snapshot);

    if (this._snapshots.length > this.maxSnapshots) {
      this._snapshots.shift();
    }

    this._emit('snapshot', snapshot);
    return snapshot;
  }

  /**
   * 在时间轴上查找最接近目标时刻的快照。
   * 优先返回 ≤ targetTime 的最新快照；若不存在则返回最早快照。
   *
   * @param {number} targetTime  目标时间戳（毫秒）
   * @returns {Object|null}
   */
  snapshotAt(targetTime) {
    if (this._snapshots.length === 0) return null;

    let bestIdx = -1;
    let bestDiff = Infinity;

    for (let i = 0; i < this._snapshots.length; i++) {
      const diff = targetTime - this._snapshots[i].timestamp;
      if (diff >= 0 && diff < bestDiff) {
        bestDiff = diff;
        bestIdx = i;
      }
    }

    if (bestIdx === -1) {
      return this._snapshots[0];
    }
    return this._snapshots[bestIdx];
  }

  /**
   * 按时间戳查找快照索引（二分查找）。
   * 性能比 snapshotAt 更好，适合大量快照场景。
   *
   * @param {number} targetTime
   * @returns {number}  快照索引，未找到返回 -1
   */
  findIndexAt(targetTime) {
    let lo = 0;
    let hi = this._snapshots.length - 1;
    let result = -1;

    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (this._snapshots[mid].timestamp <= targetTime) {
        result = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    return result;
  }

  /**
   * 将引擎恢复到某个快照所描述的状态。
   * 会触发 restore 事件。
   *
   * @param {Object} snapshot
   * @returns {Object} 该快照的 state（深拷贝）
   */
  restore(snapshot) {
    if (!snapshot) return null;
    const state = this._deepClone(snapshot.state);
    this._emit('restore', { snapshot, state });
    return state;
  }

  /**
   * 获取全部快照（只读数组）。
   * @returns {Array}
   */
  getAll() {
    return this._snapshots.slice();
  }

  /**
   * 获取快照数量。
   */
  get count() {
    return this._snapshots.length;
  }

  /**
   * 获取最早的快照。
   */
  get first() {
    return this._snapshots.length > 0 ? this._snapshots[0] : null;
  }

  /**
   * 获取最新的快照。
   */
  get last() {
    return this._snapshots.length > 0 ? this._snapshots[this._snapshots.length - 1] : null;
  }

  /** 清空所有快照。 */
  clear() {
    this._snapshots = [];
    this._lastRecordTime = 0;
  }

  /**
   * 订阅事件。
   * @param {string} event   'snapshot' | 'restore'
   * @param {Function} fn
   */
  on(event, fn) {
    if (event === 'snapshot') this._onSnapshotListeners.push(fn);
    else if (event === 'restore') this._onRestoreListeners.push(fn);
  }

  _emit(event, payload) {
    const listeners = event === 'snapshot'
      ? this._onSnapshotListeners
      : this._onRestoreListeners;
    for (const fn of listeners) {
      try { fn(payload); } catch (e) { console.error(e); }
    }
  }

  _deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj);
    if (obj instanceof Array) return obj.map(this._deepClone.bind(this));
    const result = {};
    for (const key of Object.keys(obj)) {
      result[key] = this._deepClone(obj[key]);
    }
    return result;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = SnapshotEngine;
}
