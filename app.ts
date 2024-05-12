import { Mutex } from 'async-mutex'
import express from 'express'
import * as fs from 'fs'
import { z } from 'zod'

const app = express()

const mutex = new Mutex()
const resourcePath = './src/mock-resource.json'
const resourceSchema = z.object({
  count: z.number()
})
const setCount = async (value: number): Promise<number> => {
  return await new Promise<number>((resolve, reject) => {
    fs.writeFile(resourcePath, JSON.stringify({ count: value }), 'utf8', () => {
      const newValue = fs.readFileSync(resourcePath, 'utf8')
      const result = resourceSchema.parse(JSON.parse(newValue))
      resolve(result.count)
    })
  })
}

app.get('/', async (req, res) => {
  await mutex.runExclusive(async () => {
    const jsonFile = await fs.readFileSync(resourcePath, 'utf8')
    const parseResult = resourceSchema.safeParse(JSON.parse(jsonFile))
    if (parseResult.success === false) {
      return res.status(500).send(parseResult.error)
    }

    const resource = parseResult.data

    console.log(`Count: ${resource.count as number}`)

    const newCount = await setCount(resource.count as number + 1)

    console.log(`New Count: ${newCount}`)
    res.send(`Count: ${newCount}`)
  })
})

// Initial Set Value
setCount(0).catch(console.error)

app.listen(3000).on('listening', () => {
  console.log('Server is running on port 3000')
})
