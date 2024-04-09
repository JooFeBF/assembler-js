import constants from './constants.js'
import fs from 'fs'

const { INSTRUCTIONS_TYPE, INSTRUCTIONS, OPCODES, ABI_REGISTERS, FUNCT3, FUNCT7 } = constants
const { argv } = process

const input = argv[3]
const output = argv[5]

const data = fs.readFileSync(input, 'utf8')

const lines = data.match(/[^\s][^\r\n#;]+([^\r\n#; ])/g)

const linesWithoutComments = lines.filter((line) => (/^[^#;]+/).test(line))
const instructions = linesWithoutComments.filter((line) => {
  return (/^[^.:]+$/).test(line)
})
const labelsWithInstructionIndex = linesWithoutComments.map((line, i) => {
  if ((/^.+:$/).test(line)) {
    console.log(line)
    if (!/^[\w._][\w_\d]*:$/.test(line)) {
      throw new Error(`Invalid label ${line} at line ${i + 1}`)
    }
    const labelIndex = instructions.includes(linesWithoutComments[i + 1]) ? instructions.indexOf(linesWithoutComments[i + 1]) : null
    if (labelIndex === null) return null
    return [line.slice(0, -1), labelIndex]
  } else return null
})

const labelsAndIndex = labelsWithInstructionIndex.filter((label) => {
  if (label !== null) {
    if (labelsWithInstructionIndex.filter((l) => l !== null && l[0] === label[0]).length > 1) {
      throw new Error(`Label ${label[0]} is defined more than once`)
    }
  }
  return label !== null
})

console.log(labelsAndIndex)

let binOutput = ''

const registerToBinary = (register) => {
  if (/(^x([0-9]|[12][0-9]|3[01])$)|^zero$|^ra$|^sp$|^gp$|^tp$|^t[0-6]$|^s([0-9]|1[01])$|^fp$|^a[0-7]$/.test(register)) {
    if (/(^x([0-9]|[12][0-9]|3[01])$)/.test(register)) {
      const rdNumber = parseInt(/\d+/.exec(register)[0])
      const rdNumberBinary = rdNumber.toString(2)
      return rdNumberBinary.padStart(5, '0')
    } else {
      const rdNumber = parseInt(/\d+/.exec(ABI_REGISTERS[register])[0])
      const rdNumberBinary = rdNumber.toString(2)
      return rdNumberBinary.padStart(5, '0')
    }
  } else throw new Error(`Invalid register ${register}`)
}

const complement2 = (binary) => {
  const flippedBinary = binary.split('').map((bit) => /0/.test(bit) ? '1' : '0')
  for (let i = flippedBinary.length - 1; i >= 0; i--) {
    if (/1/.test(flippedBinary[i])) {
      flippedBinary[i] = '0'
    } else {
      flippedBinary[i] = '1'
      break
    }
  }
  const complementBinary = flippedBinary.join('')
  return complementBinary
}

instructions.forEach((instruction, i) => {
  const [name, ...args] = instruction.split(/\s+/)
  const type = INSTRUCTIONS_TYPE.find((type) => INSTRUCTIONS[type].includes(name))

  if (!type) {
    throw new Error(`Instruction ${name} does not exist in the instruction set at instruction ${i + 1}`)
  }
  if (type === 'TYPE_R') {
    if (args.length !== 3) {
      throw new Error(`Instruction ${name} requires 3 arguments at instruction ${i + 1}`)
    } else if (/^[^,]+,$/.test(args[2])) {
      throw new Error(`Instruction ${name} has a trailing comma at instruction ${i + 1}`)
    } else if (!/^[^,]+,$/.test(args[0]) || !/^[^,]+,$/.test(args[1])) {
      throw new Error(`Instruction ${name} has a missing comma at instruction ${i + 1}`)
    }
    const [rd, rs1, rs2] = args.map((arg) => arg.replace(/,/, ''))
    try {
      const rdBinary = registerToBinary(rd)
      const rs1Binary = registerToBinary(rs1)
      const rs2Binary = registerToBinary(rs2)
      const funct3 = FUNCT3[type][name]
      const funct7 = FUNCT7[type][name]
      const funct3Binary = Number(funct3.match(/[0-7](?!x)/)).toString(2).padStart(3, '0')
      const funct7Binary = Number(funct7.match(/20|01/)).toString(2).padStart(7, '0')
      const opcode = OPCODES[name]

      binOutput += `${funct7Binary}${rs2Binary}${rs1Binary}${funct3Binary}${rdBinary}${opcode}\n`
    } catch (e) {
      throw new Error(e.message + ` at instruction ${i + 1}`)
    }
  } else if (type === 'TYPE_I') {
    if (['ecall', 'ebreak'].includes(name)) {
      if (args.length !== 0) {
        throw new Error(`Instruction ${name} requires 1 argument at instruction ${i + 1}`)
      }
      const opcode = OPCODES[name]
      if (name === 'ecall') {
        binOutput += `0000000000000000000000000${opcode}\n`
      } else {
        binOutput += `0000000000010000000000000${opcode}\n`
      }
    } else if (['lw', 'lb', 'lh', 'lbu', 'lhu'].includes(name)) {
      if (args.length !== 2) {
        throw new Error(`Instruction ${name} requires 2 arguments at instruction ${i + 1}`)
      } else if (/^[^,]+,$/.test(args[1])) {
        throw new Error(`Instruction ${name} has a trailing comma at instruction ${i + 1}`)
      } else if (!/^[^,]+,$/.test(args[0])) {
        throw new Error(`Instruction ${name} has a missing comma at instruction ${i + 1}`)
      }
      const [rd, offset] = args.map((arg) => arg.replace(/,/, ''))
      const offsetRegex = /^-?\d+\([^ ]+\)$/
      if (!offsetRegex.test(offset)) {
        throw new Error(`Offset ${offset} is not in the correct format at instruction ${i + 1}`)
      }
      const imm = offset.match(/-?\d+/)[0]
      if (!/^-?\d+$/.test(imm)) {
        throw new Error(`Immediate value ${imm} is not a number at instruction ${i + 1}`)
      } else if (!/^-[1-9]$|^-204[0-8]$|^-?[1-9][0-9]{1,2}$|^-?1[0-9]{3}$|^-?20[0-3][0-9]$|^[0-9]$|^204[0-7]$/.test(imm)) {
        throw new Error(`Immediate value ${imm} is out of range at instruction ${i + 1}`)
      }
      const rs1 = offset.match(/\([^ ]+\)/)[0].replace(/[()]/g, '')
      try {
        const rdBinary = registerToBinary(rd)
        const rs1Binary = registerToBinary(rs1)
        const funct3 = FUNCT3[type][name]
        const funct3Binary = Number(funct3.match(/[0-7](?!x)/)).toString(2).padStart(3, '0')
        const immBinary = parseInt(imm) < 0 ? complement2(parseInt(Math.abs(imm)).toString(2).padStart(12, '0')) : parseInt(imm).toString(2).padStart(12, '0')
        const opcode = OPCODES[name]
        binOutput += `${immBinary}${rs1Binary}${funct3Binary}${rdBinary}${opcode}\n`
      } catch (e) {
        throw new Error(e.message + ` at instruction ${i + 1}`)
      }
    } else if (name === 'jalr') {
      if (args.length !== 2) {
        throw new Error(`Instruction ${name} requires 2 arguments at instruction ${i + 1}`)
      } else if (/^[^,]+,$/.test(args[1])) {
        throw new Error(`Instruction ${name} has a trailing comma at instruction ${i + 1}`)
      } else if (!/^[^,]+,$/.test(args[0])) {
        throw new Error(`Instruction ${name} has a missing comma at instruction ${i + 1}`)
      }
      const [rd, offset] = args.map((arg) => arg.replace(/,/, ''))
      const offsetRegex = /^-?\d+\([^ ]+\)$/
      if (!offsetRegex.test(offset)) {
        throw new Error(`Offset ${offset} is not in the correct format at instruction ${i + 1}`)
      }
      const imm = offset.match(/-?\d+/)[0]
      if (!/^-?\d+$/.test(imm)) {
        throw new Error(`Immediate value ${imm} is not a number at instruction ${i + 1}`)
      } else if (!/^-[1-9]$|^-204[0-8]$|^-?[1-9][0-9]{1,2}$|^-?1[0-9]{3}$|^-?20[0-3][0-9]$|^[0-9]$|^204[0-7]$/.test(imm)) {
        throw new Error(`Immediate value ${imm} is out of range at instruction ${i + 1}`)
      }
      const rs1 = offset.match(/\([^ ]+\)/)[0].replace(/[()]/g, '')
      try {
        const rdBinary = registerToBinary(rd)
        const rs1Binary = registerToBinary(rs1)
        const funct3 = FUNCT3[type][name]
        const funct3Binary = Number(funct3.match(/[0-7](?!x)/)).toString(2).padStart(3, '0')
        const immBinary = parseInt(imm) < 0 ? complement2(parseInt(Math.abs(imm)).toString(2).padStart(12, '0')) : parseInt(imm).toString(2).padStart(12, '0')
        const opcode = OPCODES[name]
        binOutput += `${immBinary}${rs1Binary}${funct3Binary}${rdBinary}${opcode}\n`
      } catch (e) {
        throw new Error(e.message + ` at instruction ${i + 1}`)
      }
    } else {
      if (args.length !== 3) {
        throw new Error(`Instruction ${name} requires 3 arguments at instruction ${i + 1}`)
      } else if (/^[^,]+,$/.test(args[2])) {
        throw new Error(`Instruction ${name} has a trailing comma at instruction ${i + 1}`)
      } else if (!/^[^,]+,$/.test(args[0]) || !/^[^,]+,$/.test(args[1])) {
        throw new Error(`Instruction ${name} has a missing comma at instruction ${i + 1}`)
      } else if (['slli', 'srli', 'srai'].includes(name)) {
        const [rd, rs1, imm] = args.map((arg) => arg.replace(/,/, ''))

        if (!/^-?\d+$/.test(imm)) {
          throw new Error(`Immediate value ${imm} is not a number at instruction ${i + 1}`)
        } else if (!/[0-9]|[12][0-9]|3[01]/.test(imm)) {
          throw new Error(`Immediate value ${imm} is out of range at instruction ${i + 1}`)
        }
        try {
          const rdBinary = registerToBinary(rd)
          const rs1Binary = registerToBinary(rs1)
          const funct3 = FUNCT3[type][name]
          const funct3Binary = Number(funct3.match(/[0-7](?!x)/)).toString(2).padStart(3, '0')
          const immBinary = parseInt(imm).toString(2).padStart(5, '0')
          const opcode = OPCODES[name]

          if (name === 'srai') {
            binOutput += `0100000${immBinary}${rs1Binary}${funct3Binary}${rdBinary}${opcode}\n`
          } else {
            binOutput += `0000000${immBinary}${rs1Binary}${funct3Binary}${rdBinary}${opcode}\n`
          }
        } catch (e) {
          throw new Error(e.message + ` at instruction ${i + 1}`)
        }
      } else {
        const [rd, rs1, imm] = args.map((arg) => arg.replace(/,/, ''))

        if (!/^-?\d+$/.test(imm)) {
          throw new Error(`Immediate value ${imm} is not a number at instruction ${i + 1}`)
        } else if (!/^-[1-9]$|^-204[0-8]$|^-?[1-9][0-9]{1,2}$|^-?1[0-9]{3}$|^-?20[0-3][0-9]$|^[0-9]$|^204[0-7]$/.test(imm)) {
          throw new Error(`Immediate value ${imm} is out of range at instruction ${i + 1}`)
        }

        try {
          const rdBinary = registerToBinary(rd)
          const rs1Binary = registerToBinary(rs1)
          const funct3 = FUNCT3[type][name]
          const funct3Binary = Number(funct3.match(/[0-7](?!x)/)).toString(2).padStart(3, '0')
          const immBinary = parseInt(imm) < 0 ? complement2(parseInt(Math.abs(imm)).toString(2).padStart(12, '0')) : parseInt(imm).toString(2).padStart(12, '0')
          const opcode = OPCODES[name]

          binOutput += `${immBinary}${rs1Binary}${funct3Binary}${rdBinary}${opcode}\n`
        } catch (e) {
          throw new Error(e.message + ` at instruction ${i + 1}`)
        }
      }
    }
  } else if (type === 'TYPE_S') {
    if (args.length !== 2) {
      throw new Error(`Instruction ${name} requires 2 arguments at instruction ${i + 1}`)
    } else if (/^[^,]+,$/.test(args[1])) {
      throw new Error(`Instruction ${name} has a trailing comma at instruction ${i + 1}`)
    } else if (!/^[^,]+,$/.test(args[0])) {
      throw new Error(`Instruction ${name} has a missing comma at instruction ${i + 1}`)
    }
    const [rs2, offset] = args.map((arg) => arg.replace(/,/, ''))
    const offsetRegex = /^-?\d+\([^ ]+\)$/
    if (!offsetRegex.test(offset)) {
      throw new Error(`Offset ${offset} is not in the correct format at instruction ${i + 1}`)
    }
    const imm = offset.match(/-?\d+/)[0]
    if (!/^-?\d+$/.test(imm)) {
      throw new Error(`Immediate value ${imm} is not a number at instruction ${i + 1}`)
    } else if (!/^-[1-9]$|^-204[0-8]$|^-?[1-9][0-9]{1,2}$|^-?1[0-9]{3}$|^-?20[0-3][0-9]$|^[0-9]$|^204[0-7]$/.test(imm)) {
      throw new Error(`Immediate value ${imm} is out of range at instruction ${i + 1}`)
    }
    const rs1 = offset.match(/\([^ ]+\)/)[0].replace(/[()]/g, '')
    try {
      const rs2Binary = registerToBinary(rs2)
      const rs1Binary = registerToBinary(rs1)
      const funct3 = FUNCT3[type][name]
      const funct3Binary = Number(funct3.match(/[0-7](?!x)/)).toString(2).padStart(3, '0')
      const immBinary = parseInt(imm) < 0 ? complement2(parseInt(Math.abs(imm)).toString(2).padStart(12, '0')) : parseInt(imm).toString(2).padStart(12, '0')
      const opcode = OPCODES[name]
      binOutput += `${immBinary.slice(0, 7)}${rs2Binary}${rs1Binary}${funct3Binary}${immBinary.slice(7, 12)}${opcode}\n`
    } catch (e) {
      throw new Error(e.message + ` at instruction ${i + 1}`)
    }
  } else if (type === 'TYPE_B') {
    if (args.length !== 3) {
      throw new Error(`Instruction ${name} requires 3 arguments at instruction ${i + 1}`)
    } else if (/^[^,]+,$/.test(args[2])) {
      throw new Error(`Instruction ${name} has a trailing comma at instruction ${i + 1}`)
    } else if (!/^[^,]+,$/.test(args[0]) || !/^[^,]+,$/.test(args[1])) {
      throw new Error(`Instruction ${name} has a missing comma at instruction ${i + 1}`)
    }
    const [rs1, rs2, label] = args.map((arg) => arg.replace(/,/, ''))

    const imm = label
    if (!/^-?\d+$/.test(imm)) {
      throw new Error(`Immediate value ${imm} is not a number at instruction ${i + 1}`)
    } else if (!/^-[1-9]$|^-204[0-8]$|^-?[1-9][0-9]{1,2}$|^-?1[0-9]{3}$|^-?20[0-3][0-9]$|^[0-9]$|^204[0-7]$/.test(imm)) {
      throw new Error(`Immediate value ${imm} is out of range at instruction ${i + 1}`)
    }
    console.log(imm)
    try {
      const rs1Binary = registerToBinary(rs1)
      const rs2Binary = registerToBinary(rs2)
      const funct3 = FUNCT3[type][name]
      const funct3Binary = Number(funct3.match(/[0-7](?!x)/)).toString(2).padStart(3, '0')
      const immBinary = parseInt(imm) < 0 ? complement2(parseInt(Math.abs(imm)).toString(2).padStart(12, '0')) : parseInt(imm).toString(2).padStart(12, '0')
      const opcode = OPCODES[name]
      console.log({ immBinary, immBinary0: immBinary[0], immBinary2: immBinary.slice(2, 7), immBinary3: immBinary.slice(7, 11), immBinary1: immBinary[1] })
      binOutput += `${immBinary[0]}${immBinary.slice(2, 7)}${rs2Binary}${rs1Binary}${funct3Binary}${immBinary.slice(7, 11)}${immBinary[1]}${opcode}\n`
    } catch (e) {
      throw new Error(e.message + ` at instruction ${i + 1}`)
    }
  } else if (type === 'TYPE_U') {
    if (args.length !== 2) {
      throw new Error(`Instruction ${name} requires 2 arguments at instruction ${i + 1}`)
    } else if (/^[^,]+,$/.test(args[1])) {
      throw new Error(`Instruction ${name} has a trailing comma at instruction ${i + 1}`)
    } else if (!/^[^,]+,$/.test(args[0])) {
      throw new Error(`Instruction ${name} has a missing comma at instruction ${i + 1}`)
    }
    const [rd, imm] = args.map((arg) => arg.replace(/,/, ''))
    if (!/^-?\d+$/.test(imm)) {
      throw new Error(`Immediate value ${imm} is not a number at instruction ${i + 1}`)
    } else if (!/^-[1-9]|-52428[0-8]|-?[1-9][0-9]{1,4}|-?[1-4][0-9]{5}|-?5[01][0-9]{4}|-?52[0-3][0-9]{3}|-?524[01][0-9]{2}|-?5242[0-7][0-9]|[0-9]|52428[0-7]$/.test(imm)) {
      throw new Error(`Immediate value ${imm} is out of range at instruction ${i + 1}`)
    }
    try {
      const rdBinary = registerToBinary(rd)
      const immBinary = parseInt(imm).toString(2).padStart(20, '0')
      const opcode = OPCODES[name]
      binOutput += `${immBinary}${rdBinary}${opcode}\n`
    } catch (e) {
      throw new Error(e.message + ` at instruction ${i + 1}`)
    }
  }
})

fs.writeFileSync(output, binOutput)
