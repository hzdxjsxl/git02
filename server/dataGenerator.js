const surnames = ['李', '王', '张', '刘', '陈', '杨', '赵', '黄', '周', '吴']
const maleNames = ['文', '武', '明', '德', '忠', '信', '仁', '义', '礼', '智', '信', '谦', '和', '顺', '康', '宁', '福', '寿', '昌', '盛']
const femaleNames = ['婉', '淑', '娴', '静', '秀', '美', '丽', '芳', '芬', '燕', '玲', '敏', '霞', '月', '华', '桂', '莲', '菊', '梅', '兰']

function randomName(gender) {
  const surname = surnames[Math.floor(Math.random() * surnames.length)]
  const nameList = gender === 'male' ? maleNames : femaleNames
  const name = nameList[Math.floor(Math.random() * nameList.length)] + nameList[Math.floor(Math.random() * nameList.length)]
  return surname + name
}

function randomYear(base, range) {
  return base + Math.floor(Math.random() * range)
}

export function generateFamilyData() {
  const persons = []
  const marriages = []
  let idCounter = 1

  function createPerson(gender, generation, birthYearBase, parentIds = []) {
    const person = {
      id: `p${idCounter++}`,
      name: randomName(gender),
      gender,
      birthYear: randomYear(birthYearBase, 10),
      deathYear: null,
      generation,
      parentIds,
      spouseIds: []
    }
    if (Math.random() > 0.3) {
      person.deathYear = person.birthYear + 60 + Math.floor(Math.random() * 30)
    }
    persons.push(person)
    return person
  }

  function createMarriage(husbandId, wifeId) {
    const marriage = {
      id: `m${husbandId}-${wifeId}`,
      husbandId,
      wifeId
    }
    marriages.push(marriage)
    const husband = persons.find(p => p.id === husbandId)
    const wife = persons.find(p => p.id === wifeId)
    if (husband && !husband.spouseIds.includes(wifeId)) husband.spouseIds.push(wifeId)
    if (wife && !wife.spouseIds.includes(husbandId)) wife.spouseIds.push(husbandId)
    return marriage
  }

  const gen0Men = []
  const gen0Women = []
  for (let i = 0; i < 5; i++) {
    gen0Men.push(createPerson('male', 0, 1800))
    gen0Women.push(createPerson('female', 0, 1802))
  }
  for (let i = 0; i < 5; i++) {
    createMarriage(gen0Men[i].id, gen0Women[i].id)
  }

  for (let gen = 0; gen < 6; gen++) {
    const genMen = persons.filter(p => p.gender === 'male' && p.generation === gen)
    const genWomen = persons.filter(p => p.gender === 'female' && p.generation === gen)
    
    for (const man of genMen) {
      for (const wifeId of man.spouseIds) {
        const childCount = 2 + Math.floor(Math.random() * 4)
        for (let c = 0; c < childCount; c++) {
          const gender = Math.random() > 0.5 ? 'male' : 'female'
          createPerson(gender, gen + 1, man.birthYear + 25, [man.id, wifeId])
        }
      }
    }

    const nextGenMen = persons.filter(p => p.gender === 'male' && p.generation === gen + 1)
    const nextGenWomen = persons.filter(p => p.gender === 'female' && p.generation === gen + 1)
    
    const shuffledWomen = [...nextGenWomen].sort(() => Math.random() - 0.5)
    const marrigeCount = Math.min(nextGenMen.length, shuffledWomen.length)
    
    for (let i = 0; i < marrigeCount; i++) {
      if (Math.random() > 0.2) {
        createMarriage(nextGenMen[i].id, shuffledWomen[i].id)
      }
    }

    for (let i = 0; i < Math.floor(persons.length * 0.05); i++) {
      const man = genMen[Math.floor(Math.random() * genMen.length)]
      const woman = genWomen[Math.floor(Math.random() * genWomen.length)]
      if (man && woman && man.id !== woman.id && !man.spouseIds.includes(woman.id)) {
        createMarriage(man.id, woman.id)
      }
    }
  }

  const allWomen = persons.filter(p => p.gender === 'female')
  const allMen = persons.filter(p => p.gender === 'male')
  
  for (let i = 0; i < 15; i++) {
    const woman = allWomen[Math.floor(Math.random() * allWomen.length)]
    const availableMen = allMen.filter(m => 
      m.generation <= woman.generation + 1 && 
      m.generation >= woman.generation - 1 &&
      !m.spouseIds.includes(woman.id) &&
      !woman.parentIds.includes(m.id) &&
      !m.parentIds.includes(woman.id)
    )
    if (availableMen.length > 0 && Math.random() > 0.5) {
      const man = availableMen[Math.floor(Math.random() * availableMen.length)]
      createMarriage(man.id, woman.id)
    }
  }

  return {
    persons,
    marriages,
    metadata: {
      totalPersons: persons.length,
      totalMarriages: marriages.length,
      generations: 7
    }
  }
}