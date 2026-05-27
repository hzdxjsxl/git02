export class TreeLayoutEngine {
  constructor(persons, marriages) {
    this.personMap = new Map()
    for (const p of persons) {
      this.personMap.set(p.id, {
        id: p.id,
        name: p.name,
        gender: p.gender,
        birthYear: p.birthYear,
        deathYear: p.deathYear,
        generation: p.generation,
        parentIds: p.parentIds.slice(),
        spouseIds: p.spouseIds.slice()
      })
    }
    this.marriages = marriages
    this.marriageIndex = new Map()
    for (const m of marriages) {
      this.marriageIndex.set(m.husbandId + '_' + m.wifeId, m)
      this.marriageIndex.set(m.wifeId + '_' + m.husbandId, m)
    }

    this.nodeWidth = 130
    this.nodeHeight = 70
    this.horizontalGap = 60
    this.verticalGap = 110
    this.marriageGap = 20

    this.cycleEdges = new Set()
    this.cycleList = []
    this.subtreeWidthCache = new Map()
    this.positionMap = new Map()
    this.familyGroups = []
  }

  calculateLayout() {
    console.log('[Engine] Persons: ' + this.personMap.size + ', Marriages: ' + this.marriages.length)

    this.detectCycles()
    this.computeGenerationRanks()
    this.buildFamilyGroups()
    this.computeSubtreeWidths()
    this.assignPositions()
    this.adjustMarriagePairs()
    this.resolveHorizontalOverlaps()
    this.computeBounds()

    return this.buildResult()
  }

  detectCycles() {
    console.log('[Engine] Detecting cycles...')
    const visited = new Set()
    const onStack = new Set()
    const parentTrack = new Map()
    let broken = 0

    const dfs = (id, fromId) => {
      if (onStack.has(id)) {
        const cycle = []
        let cur = fromId
        while (cur && cur !== id) {
          cycle.push(cur)
          cur = parentTrack.get(cur)
        }
        cycle.push(id)
        if (cycle.length >= 3) {
          this.cycleList.push(cycle.slice())
          const key = fromId + '_' + id
          const revKey = id + '_' + fromId
          if (!this.cycleEdges.has(key)) {
            this.cycleEdges.add(key)
            this.cycleEdges.add(revKey)
            broken++
          }
        }
        return
      }
      if (visited.has(id)) return

      visited.add(id)
      onStack.add(id)
      parentTrack.set(id, fromId)

      const person = this.personMap.get(id)
      if (!person) { onStack.delete(id); return }

      const neighbors = []
      for (const sid of person.spouseIds) {
        if (sid !== fromId) neighbors.push(sid)
      }
      for (const pid of person.parentIds) {
        if (pid !== fromId) neighbors.push(pid)
      }
      for (const other of this.personMap.values()) {
        if (other.parentIds.includes(id) && other.id !== fromId) {
          neighbors.push(other.id)
        }
      }

      for (const nb of neighbors) {
        const ek = id + '_' + nb
        if (!this.cycleEdges.has(ek)) {
          dfs(nb, id)
        }
      }

      onStack.delete(id)
    }

    for (const pid of this.personMap.keys()) {
      if (!visited.has(pid)) dfs(pid, null)
    }

    console.log('[Engine] Cycles: ' + this.cycleList.length + ', broken: ' + broken)
  }

  computeGenerationRanks() {
    console.log('[Engine] Computing generation ranks...')
    const queue = []
    const ranks = new Map()
    const settled = new Set()

    for (const p of this.personMap.values()) {
      if (p.parentIds.length === 0) {
        ranks.set(p.id, 0)
        queue.push({ id: p.id, rank: 0 })
      }
    }
    if (queue.length === 0) {
      const first = this.personMap.keys().next().value
      ranks.set(first, 0)
      queue.push({ id: first, rank: 0 })
    }

    let safety = 0
    const maxSafety = this.personMap.size * 5

    while (queue.length > 0 && safety < maxSafety) {
      safety++
      const item = queue.shift()
      if (settled.has(item.id)) continue
      settled.add(item.id)

      const person = this.personMap.get(item.id)
      if (!person) continue

      person.generation = item.rank
      ranks.set(item.id, item.rank)

      for (const sid of person.spouseIds) {
        if (!settled.has(sid) && !ranks.has(sid)) {
          ranks.set(sid, item.rank)
          queue.push({ id: sid, rank: item.rank })
        }
      }

      for (const other of this.personMap.values()) {
        if (other.parentIds.includes(item.id)) {
          if (!settled.has(other.id)) {
            const childRank = item.rank + 1
            const existing = ranks.get(other.id)
            if (existing === undefined || existing < childRank) {
              ranks.set(other.id, childRank)
              queue.push({ id: other.id, rank: childRank })
            }
          }
        }
      }

      for (const pid of person.parentIds) {
        if (!settled.has(pid)) {
          const parentRank = Math.max(0, item.rank - 1)
          const existing = ranks.get(pid)
          if (existing === undefined || existing > parentRank) {
            ranks.set(pid, parentRank)
            queue.push({ id: pid, rank: parentRank })
          }
        }
      }
    }

    let minGen = Infinity, maxGen = 0
    for (const p of this.personMap.values()) {
      if (p.generation === undefined) p.generation = 0
      minGen = Math.min(minGen, p.generation)
      maxGen = Math.max(maxGen, p.generation)
    }

    this.minGen = minGen
    this.maxGen = maxGen
    console.log('[Engine] Gen range: ' + minGen + ' ~ ' + maxGen)
  }

  buildFamilyGroups() {
    console.log('[Engine] Building family groups...')
    this.familyGroups = []
    const assigned = new Set()

    const build = (rootId) => {
      const group = {
        rootId,
        members: new Set(),
        genBins: new Map()
      }
      const q = [rootId]
      while (q.length > 0) {
        const id = q.shift()
        if (assigned.has(id)) continue
        assigned.add(id)
        group.members.add(id)

        const person = this.personMap.get(id)
        if (!person) continue

        const g = person.generation
        if (!group.genBins.has(g)) group.genBins.set(g, [])
        group.genBins.get(g).push(id)

        for (const sid of person.spouseIds) {
          if (!assigned.has(sid)) q.push(sid)
        }
        for (const other of this.personMap.values()) {
          if (other.parentIds.includes(id) && !assigned.has(other.id)) {
            q.push(other.id)
          }
        }
        for (const pid of person.parentIds) {
          if (!assigned.has(pid)) q.push(pid)
        }
      }
      return group
    }

    for (const id of this.personMap.keys()) {
      if (!assigned.has(id)) {
        this.familyGroups.push(build(id))
      }
    }

    console.log('[Engine] Family groups: ' + this.familyGroups.length)
  }

  getChildrenOf(id) {
    const result = []
    for (const p of this.personMap.values()) {
      if (p.parentIds.includes(id)) result.push(p)
    }
    return result
  }

  computeSubtreeWidths() {
    console.log('[Engine] Computing subtree widths...')
    this.subtreeWidthCache.clear()

    for (const group of this.familyGroups) {
      const gens = Array.from(group.genBins.keys()).sort((a, b) => b - a)
      for (const g of gens) {
        for (const pid of group.genBins.get(g)) {
          const children = this.getChildrenOf(pid)
          if (children.length === 0) {
            const person = this.personMap.get(pid)
            const sw = person ? person.spouseIds.length : 0
            const w = (this.nodeWidth + this.marriageGap) * (1 + sw * 0.5) + this.horizontalGap
            this.subtreeWidthCache.set(pid, w)
          } else {
            let total = 0
            for (const child of children) {
              total += this.subtreeWidthCache.get(child.id) || this.nodeWidth
            }
            const person = this.personMap.get(pid)
            const sw = person ? person.spouseIds.length : 0
            const selfW = (this.nodeWidth + this.marriageGap) * (1 + sw * 0.5) + this.horizontalGap
            this.subtreeWidthCache.set(pid, Math.max(total, selfW))
          }
        }
      }
    }
  }

  assignPositions() {
    console.log('[Engine] Assigning positions...')
    this.positionMap.clear()
    let globalX = 100

    for (const group of this.familyGroups) {
      const gens = Array.from(group.genBins.keys()).sort((a, b) => a - b)
      const placed = new Set()
      const roots = group.genBins.get(gens[0]) || []
      let groupX = globalX

      for (const rootId of roots) {
        if (placed.has(rootId)) continue
        const rootW = this.subtreeWidthCache.get(rootId) || this.nodeWidth * 3
        this.placeNode(rootId, groupX + rootW / 2, 120, placed)
        groupX += rootW + 80
      }

      globalX = groupX + 150
    }
  }

  placeNode(pid, centerX, y, placed) {
    if (placed.has(pid)) return
    placed.add(pid)

    const person = this.personMap.get(pid)
    if (!person) return

    this.positionMap.set(pid, {
      x: centerX - this.nodeWidth / 2,
      y: y,
      width: this.nodeWidth,
      height: this.nodeHeight
    })

    const children = this.getChildrenOf(pid)
    if (children.length > 0) {
      let childX = centerX
      const childY = y + this.nodeHeight + this.verticalGap
      for (const child of children) {
        const cw = this.subtreeWidthCache.get(child.id) || this.nodeWidth
        this.placeNode(child.id, childX + cw / 2, childY, placed)
        childX += cw
      }
    }
  }

  adjustMarriagePairs() {
    console.log('[Engine] Adjusting marriage pairs...')
    const adjusted = new Set()

    for (const m of this.marriages) {
      const hPos = this.positionMap.get(m.husbandId)
      const wPos = this.positionMap.get(m.wifeId)
      if (!hPos || !wPos) continue

      const cy = (hPos.y + wPos.y) / 2
      const totalW = hPos.width + wPos.width + this.marriageGap
      const cx = (hPos.x + hPos.width / 2 + wPos.x + wPos.width / 2) / 2

      hPos.x = cx - totalW / 2
      hPos.y = cy
      wPos.x = cx - totalW / 2 + hPos.width + this.marriageGap
      wPos.y = cy

      this.shiftDescendants(m.husbandId, adjusted, 0)
      this.shiftDescendants(m.wifeId, adjusted, 0)
    }
  }

  shiftDescendants(pid, adjusted, depth) {
    if (adjusted.has(pid) || depth > 12) return
    adjusted.add(pid)

    const pos = this.positionMap.get(pid)
    if (!pos) return

    const children = this.getChildrenOf(pid)
    const childY = pos.y + this.nodeHeight + this.verticalGap

    for (const child of children) {
      const cp = this.positionMap.get(child.id)
      if (cp) {
        cp.y = childY
        this.shiftDescendants(child.id, adjusted, depth + 1)
      }
    }
  }

  resolveHorizontalOverlaps() {
    console.log('[Engine] Resolving overlaps...')

    const genBins = new Map()
    for (const [id, pos] of this.positionMap) {
      const person = this.personMap.get(id)
      if (!person) continue
      const g = person.generation
      if (!genBins.has(g)) genBins.set(g, [])
      genBins.get(g).push({ id, pos })
    }

    for (const [g, entries] of genBins) {
      entries.sort((a, b) => a.pos.x - b.pos.x)
      for (let i = 1; i < entries.length; i++) {
        const prev = entries[i - 1]
        const cur = entries[i]
        const overlap = (prev.pos.x + prev.pos.width + this.horizontalGap * 0.3) - cur.pos.x
        if (overlap > 0) {
          const shift = overlap + 5
          cur.pos.x += shift
          for (let j = i + 1; j < entries.length; j++) {
            entries[j].pos.x += shift
          }
        }
      }
    }
  }

  computeBounds() {
    let minX = Infinity, maxX = -Infinity
    let minY = Infinity, maxY = -Infinity

    for (const pos of this.positionMap.values()) {
      minX = Math.min(minX, pos.x)
      maxX = Math.max(maxX, pos.x + pos.width)
      minY = Math.min(minY, pos.y)
      maxY = Math.max(maxY, pos.y + pos.height)
    }

    if (!isFinite(minX)) {
      minX = 0; maxX = 1000; minY = 0; maxY = 800
    }

    this.boundsResult = {
      minX: minX - 120,
      maxX: maxX + 120,
      minY: minY - 120,
      maxY: maxY + 120,
      width: maxX - minX + 240,
      height: maxY - minY + 240,
      centerX: (minX + maxX) / 2,
      centerY: (minY + maxY) / 2
    }
  }

  buildResult() {
    const nodes = []
    for (const [id, pos] of this.positionMap) {
      const p = this.personMap.get(id)
      if (!p) continue
      nodes.push({
        id: p.id,
        name: p.name,
        gender: p.gender,
        birthYear: p.birthYear,
        deathYear: p.deathYear,
        generation: p.generation,
        parentIds: p.parentIds,
        spouseIds: p.spouseIds,
        x: pos.x,
        y: pos.y,
        width: pos.width,
        height: pos.height
      })
    }

    const edges = []
    for (const m of this.marriages) {
      edges.push({ type: 'marriage', from: m.husbandId, to: m.wifeId })
    }
    for (const p of this.personMap.values()) {
      for (const pid of p.parentIds) {
        edges.push({ type: 'parent-child', from: pid, to: p.id })
      }
    }

    return {
      nodes,
      edges,
      marriages: this.marriages,
      bounds: this.boundsResult,
      cycles: this.cycleList
    }
  }
}