const SnapshotEngine = require('./public/js/SnapshotEngine.js');

let passed = 0;
let failed = 0;

function assert(condition, msg) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${msg}`);
  } else {
    failed++;
    console.log(`  ✗ ${msg}`);
  }
}

function deepEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function runTests() {
  console.log('\n=== SnapshotEngine 测试 ===\n');

  console.log('1. 基本快照记录与查询');
  {
    const engine = new SnapshotEngine({ minInterval: 0 });
    const s1 = engine.record(1000, { answers: { q1: { selected: 0 } }, currentIndex: 0 });
    const s2 = engine.record(2000, { answers: { q1: { selected: 0 }, q2: { selected: 1 } }, currentIndex: 1 });
    const s3 = engine.record(3000, { answers: { q1: { selected: 0 }, q2: { selected: 1 } }, currentIndex: 2 });

    assert(s1 !== null, '第1次快照记录成功');
    assert(s2 !== null, '第2次快照记录成功');
    assert(engine.count === 3, `快照数量为 3（实际: ${engine.count}）`);

    const found = engine.snapshotAt(2500);
    assert(found.id === s2.id, `snapshotAt(2500) 返回第2个快照（id: ${found.id}）`);

    const foundExact = engine.snapshotAt(3000);
    assert(foundExact.id === s3.id, `snapshotAt(3000) 精确匹配第3个快照`);

    const foundEarly = engine.snapshotAt(500);
    assert(foundEarly.id === s1.id, `snapshotAt(500) 目标早于所有快照，返回最早的`);
  }

  console.log('\n2. 状态深拷贝（外部修改不污染快照）');
  {
    const engine = new SnapshotEngine({ minInterval: 0 });
    const state = { answers: { q1: { selected: 0 } } };
    engine.record(1000, state);
    state.answers.q1.selected = 999;
    const snap = engine.snapshotAt(1000);
    assert(snap.state.answers.q1.selected === 0, `快照内部值不受外部修改影响（实际: ${snap.state.answers.q1.selected}）`);
  }

  console.log('\n3. 二分查找索引');
  {
    const engine = new SnapshotEngine({ minInterval: 0 });
    for (let i = 0; i < 100; i++) {
      engine.record(i * 1000, { idx: i });
    }
    const idx = engine.findIndexAt(50500);
    assert(idx === 50, `findIndexAt(50500) 返回 50（实际: ${idx}）`);

    const idx2 = engine.findIndexAt(-1);
    assert(idx2 === -1, `findIndexAt(-1) 目标早于所有快照返回 -1`);

    const idx3 = engine.findIndexAt(999999);
    assert(idx3 === 99, `findIndexAt(999999) 返回最后一个索引 99（实际: ${idx3}）`);
  }

  console.log('\n4. 快照数量上限与淘汰策略');
  {
    const engine = new SnapshotEngine({ maxSnapshots: 5, minInterval: 0 });
    for (let i = 0; i < 10; i++) {
      engine.record(i * 1000, { idx: i });
    }
    assert(engine.count === 5, `超过上限后数量保持 5（实际: ${engine.count}）`);
    const first = engine.first;
    assert(first.state.idx === 5, `最早快照为第5次记录（实际: idx=${first.state.idx}）`);
  }

  console.log('\n5. 最小间隔限流');
  {
    const engine = new SnapshotEngine({ minInterval: 500 });
    const r1 = engine.record(1000, { v: 1 });
    const r2 = engine.record(1200, { v: 2 });
    const r3 = engine.record(1600, { v: 3 });
    assert(r1 !== null, '第1次记录成功');
    assert(r2 === null, '第2次记录（间隔200ms）被限流');
    assert(r3 !== null, '第3次记录（间隔600ms）成功');
    assert(engine.count === 2, `实际快照数量为 2（实际: ${engine.count}）`);
  }

  console.log('\n6. 恢复功能');
  {
    const engine = new SnapshotEngine({ minInterval: 0 });
    engine.record(1000, { answers: { q1: { selected: 2 } }, currentIndex: 5 });
    const snap = engine.snapshotAt(1000);
    const restored = engine.restore(snap);
    assert(deepEqual(restored.answers, { q1: { selected: 2 } }), 'restore 还原 answers 正确');
    assert(restored.currentIndex === 5, `restore 还原 currentIndex 为 5（实际: ${restored.currentIndex}）`);
  }

  console.log('\n7. 事件回调');
  {
    const engine = new SnapshotEngine({ minInterval: 0 });
    let snapshotFired = false;
    let restoreFired = false;
    engine.on('snapshot', (s) => { snapshotFired = true; });
    engine.on('restore', (p) => { restoreFired = true; });
    engine.record(1000, { v: 1 });
    const snap = engine.snapshotAt(1000);
    engine.restore(snap);
    assert(snapshotFired, 'snapshot 事件触发');
    assert(restoreFired, 'restore 事件触发');
  }

  console.log('\n8. 边界情况');
  {
    const engine = new SnapshotEngine();
    assert(engine.count === 0, '初始 count 为 0');
    assert(engine.first === null, '空引擎 first 为 null');
    assert(engine.last === null, '空引擎 last 为 null');
    assert(engine.snapshotAt(1000) === null, '空引擎 snapshotAt 返回 null');
    assert(engine.restore(null) === null, 'restore(null) 返回 null');
    assert(engine.getAll().length === 0, 'getAll 返回空数组');

    engine.record(1000, { v: 1 });
    const all = engine.getAll();
    assert(all.length === 1 && all[0].state.v === 1, 'getAll 返回正确数组');

    engine.clear();
    assert(engine.count === 0, 'clear 后 count 为 0');
  }

  console.log('\n9. 复杂嵌套对象深拷贝');
  {
    const engine = new SnapshotEngine({ minInterval: 0 });
    const nested = {
      answers: {
        q1: { selected: 0, submitted: true, history: [1, 2, 3] },
        q2: { selected: -1, submitted: false, meta: { tag: 'test' } }
      },
      metadata: { startTime: 12345, tags: ['a', 'b'] }
    };
    engine.record(1000, nested);
    nested.answers.q1.history.push(999);
    nested.metadata.tags.push('c');
    const snap = engine.snapshotAt(1000);
    assert(snap.state.answers.q1.history.length === 3, `嵌套数组不受外部修改（实际长度: ${snap.state.answers.q1.history.length}）`);
    assert(snap.state.metadata.tags.length === 2, `嵌套 metadata 不受外部修改（实际长度: ${snap.state.metadata.tags.length}）`);
  }

  console.log('\n10. 大量快照性能测试');
  {
    const engine = new SnapshotEngine({ maxSnapshots: 10000, minInterval: 0 });
    const t0 = Date.now();
    for (let i = 0; i < 5000; i++) {
      engine.record(i * 1000, { idx: i });
    }
    const t1 = Date.now();
    console.log(`    写入 5000 条快照耗时: ${t1 - t0}ms`);

    const t2 = Date.now();
    for (let i = 0; i < 1000; i++) {
      engine.findIndexAt(Math.random() * 5000 * 1000);
    }
    const t3 = Date.now();
    console.log(`    二分查找 1000 次耗时: ${t3 - t2}ms`);
    assert(engine.count === 5000, `5000 条快照全部写入（实际: ${engine.count}）`);
  }

  console.log(`\n=== 测试结果: ${passed} 通过, ${failed} 失败 ===\n`);
  return failed === 0;
}

const allPassed = runTests();
process.exit(allPassed ? 0 : 1);
