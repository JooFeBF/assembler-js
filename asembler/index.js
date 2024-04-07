import constants from './constants.js'
import fs from 'fs'

const { INSTRUCTIONS_TYPE, INSTRUCTIONS, OPCODES } = constants
const { argv } = process

const input = argv[3]
const output = argv[5]

const data = fs.readFileSync(input, 'utf8')

const lines = data.match(/[^\s][^\r\n#;]+([^\r\n#; ])/g)

const linesWithoutComments = lines.filter((line) => (/^[^#;]+/).test(line))

const instructions = linesWithoutComments.filter((line) => {
  console.log((/[^\.][^:]+\s/).test(line))
  return (/[^\.][^:]+\s/).test(line)
})

let binOutput = ''

instructions.forEach((instruction) => {
  const [name, ...args] = instruction.split(' ')
  const type = INSTRUCTIONS_TYPE.find((type) => INSTRUCTIONS[type].includes(name))
  const opcode = OPCODES[type]

  binOutput += `0000000000000000000000000${opcode}\n`
})

fs.writeFileSync(output, binOutput)
