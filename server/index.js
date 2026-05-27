import express from 'express'
import cors from 'cors'
import { generateFamilyData } from './dataGenerator.js'

const app = express()
const PORT = 3002

app.use(cors())
app.use(express.json())

app.get('/api/family', (req, res) => {
  const familyData = generateFamilyData()
  res.json(familyData)
})

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})