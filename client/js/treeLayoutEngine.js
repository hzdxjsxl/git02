export class TreeLayoutEngine {
  constructor(persons, marriages) {
    this.persons = new Map(persons.map(p => [p.id, { ...p }]))
    this.marriages = marriages
    this.generations = new Map()
    this.layout = new Map()
    this.nodeWidth = 120
    this.nodeHeight = 60
    this.horizontalGap = 40
    this.verticalGap = 80
    this.maxGeneration = 0
    this.generationWidths = new Map()
  }

  calculateLayout() {
    this.validateAndFixGenerations()
    this.buildGenerationGroups()
    this.calculateSubtreeWidths()
    this.assignPositions()
    this.adjustForMarriages()
    return this.getLayoutResult()
  }

  validateAndFixGenerations() {
    const visited = new Set()
    const queue = []

    for (const person of this.persons.values()) {
      if (person.parentIds.length === 0) {
        queue.push({ id: person.id, expectedGen: person.generation })
      }
    }

    while (queue.length > 0) {
      const { id, expectedGen } = queue.shift()
      if (visited.has(id)) continue
      visited.add(id)

      const person = this.persons.get(id)
      if (person.generation !== expectedGen) {
        person.generation = expectedGen
      }

      for (const spouseId of person.spouseIds) {
        const spouse = this.persons.get(spouseId)
        if (spouse && !visited.has(spouseId)) {
          queue.push({ id: spouseId, expectedGen: person.generation })
        }
      }

      const children = this.getChildren(id)
      for (const child of children) {
        if (!visited.has(child.id)) {
          queue.push({ id: child.id, expectedGen: person.generation + 1 })
        }
      }
    }

    for (const person of this.persons.values()) {
      this.maxGeneration = Math.max(this.maxGeneration, person.generation)
    }
  }

  buildGenerationGroups() {
    for (let g = 0; g <= this.maxGeneration; g++) {
      this.generations.set(g, [])
    }
    for (const person of this.persons.values()) {
      const gen = this.generations.get(person.generation) || []
      gen.push(person.id)
      this.generations.set(person.generation, gen)
    }
  }

  getChildren(personId) {
    const children = []
    for (const person of this.persons.values()) {
      if (person.parentIds.includes(personId)) {
        children.push(person)
      }
    }
    return children
  }

  calculateSubtreeWidths() {
    const subtreeWidths = new Map()

    const calculate = (personId) => {
      if (subtreeWidths.has(personId)) return subtreeWidths.get(personId)

      const person = this.persons.get(personId)
      const children = this.getChildren(personId)

      if (children.length === 0) {
        const width = this.nodeWidth + this.horizontalGap
        subtreeWidths.set(personId, width)
        return width
      }

      let totalWidth = 0
      for (const child of children) {
        totalWidth += calculate(child.id)
      }

      const selfWidth = this.nodeWidth + this.horizontalGap
      const width = Math.max(totalWidth, selfWidth)
      subtreeWidths.set(personId, width)
      return width
    }

    for (const person of this.persons.values()) {
      if (person.parentIds.length === 0) {
        calculate(person.id)
      }
    }

    this.subtreeWidths = subtreeWidths
  }

  assignPositions() {
    const generationX = new Map()
    for (let g = 0; g <= this.maxGeneration; g++) {
      generationX.set(g, 50)
    }

    const placed = new Set()

    const placePerson = (personId, x, y) => {
      if (placed.has(personId)) return
      placed.add(personId)

      const person = this.persons.get(personId)

      this.layout.set(personId, {
        x,
        y,
        width: this.nodeWidth,
        height: this.nodeHeight
      })

      const children = this.getChildren(personId)
      if (children.length > 0) {
        let childX = x
        const childY = y + this.nodeHeight + this.verticalGap

        for (const child of children) {
          const childWidth = this.subtreeWidths.get(child.id) || this.nodeWidth
          placePerson(child.id, childX + childWidth / 2, childY)
          childX += childWidth
        }
      }
    }

    const gen0 = this.generations.get(0) || []
    let startX = 50

    for (const personId of gen0) {
      if (!placed.has(personId)) {
        const width = this.subtreeWidths.get(personId) || this.nodeWidth
        placePerson(personId, startX + width / 2, 50)
        startX += width + 100
      }
    }
  }

  adjustForMarriages() {
    const adjusted = new Set()

    for (const marriage of this.marriages) {
      const husbandLayout = this.layout.get(marriage.husbandId)
      const wifeLayout = this.layout.get(marriage.wifeId)

      if (husbandLayout && wifeLayout) {
        const centerX = (husbandLayout.x + wifeLayout.x) / 2
        const avgY = (husbandLayout.y + wifeLayout.y) / 2

        husbandLayout.x = centerX - this.nodeWidth / 2 - 10
        wifeLayout.x = centerX + this.nodeWidth / 2 + 10
        husbandLayout.y = avgY
        wifeLayout.y = avgY

        this.adjustDescendants(marriage.husbandId, adjusted)
        this.adjustDescendants(marriage.wifeId, adjusted)
      }
    }
  }

  adjustDescendants(personId, adjusted) {
    if (adjusted.has(personId)) return
    adjusted.add(personId)

    const personLayout = this.layout.get(personId)
    if (!personLayout) return

    const children = this.getChildren(personId)
    const childY = personLayout.y + this.nodeHeight + this.verticalGap

    for (let i = 0; i < children.length; i++) {
      const child = children[i]
      const childLayout = this.layout.get(child.id)
      if (childLayout) {
        childLayout.y = childY
        this.adjustDescendants(child.id, adjusted)
      }
    }
  }

  getLayoutResult() {
    const nodes = []
    let minX = Infinity, maxX = 0, minY = Infinity, maxY = 0

    for (const [id, pos] of this.layout.entries()) {
      const person = this.persons.get(id)
      nodes.push({
        id,
        ...person,
        x: pos.x,
        y: pos.y,
        width: pos.width,
        height: pos.height
      })

      minX = Math.min(minX, pos.x)
      maxX = Math.max(maxX, pos.x + pos.width)
      minY = Math.min(minY, pos.y)
      maxY = Math.max(maxY, pos.y + pos.height)
    }

    const edges = []

    for (const marriage of this.marriages) {
      edges.push({
        type: 'marriage',
        from: marriage.husbandId,
        to: marriage.wifeId,
        marriageId: marriage.id
      })
    }

    for (const person of this.persons.values()) {
      for (const parentId of person.parentIds) {
        edges.push({
          type: 'parent-child',
          from: parentId,
          to: person.id
        })
      }
    }

    return {
      nodes,
      edges,
      marriages: this.marriages,
      bounds: {
        minX,
        maxX,
        minY,
        maxY,
        width: maxX - minX + 100,
        height: maxY - minY + 100
      }
    }
  }
}