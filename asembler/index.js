import constants from './constants.js'
import fs from 'fs'

const { INSTRUCTIONS_TYPE, INSTRUCTIONS, OPCODES, ABI_REGISTERS, FUNCT3, FUNCT7, PSEUDO_INSTRUCTIONS } = constants
const { argv } = process

const input = argv[3]
const output = argv[5]

const regex32Bits = /-[1-9]|-214748364[0-8]|-?[1-9][0-9]{1,8}|-?1[0-9]{9}|-?20[0-9]{8}|-?21[0-3][0-9]{7}|-?214[0-6][0-9]{6}|-?2147[0-3][0-9]{5}|-?21474[0-7][0-9]{4}|-?214748[0-2][0-9]{3}|-?2147483[0-5][0-9]{2}|-?21474836[0-3][0-9]|[0-9]|214748364[0-7]/
const offsetRegex = /^-?\d+\([^ ]+\)$/

const data = fs.readFileSync(input, 'utf8')

const lines = data.match(/[^\s][^\r\n#;]+([^\r\n#; ])/g)

const linesWithoutComments = lines.filter((line) => (/^[^#;]+/).test(line))
const instructions = linesWithoutComments.filter((line) => {
  return (/^[^.:]+$/).test(line)
})
const labelsWithInstructionIndex = linesWithoutComments.map((line, i) => {
  if ((/^.+:$/).test(line)) {
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
    // #region Pseudo-instructions
    if (!PSEUDO_INSTRUCTIONS.includes(name)) throw new Error(`Instruction ${name} does not exist in the instruction set at instruction ${i + 1}`)
    if (name === 'la') {
      if (args.length !== 2) {
        throw new Error(`Instruction ${name} requires 2 arguments at instruction ${i + 1}`)
      } else if (/^[^,]+,$/.test(args[1])) {
        throw new Error(`Instruction ${name} has a trailing comma at instruction ${i + 1}`)
      } else if (!/^[^,]+,$/.test(args[0])) {
        throw new Error(`Instruction ${name} has a missing comma at instruction ${i + 1}`)
      }
      const [rd, symbol] = args.map((arg) => arg.replace(/,/, ''))

      if (!/^-?\d+$/.test(symbol)) {
        throw new Error(`Symbol ${symbol} is not a number at instruction ${i + 1}`)
      } else if (!regex32Bits.test(symbol)) {
        throw new Error(`Symbol ${symbol} is out of range at instruction ${i + 1}`)
      }

      try {
        const rdBinary = registerToBinary(rd)
        const symbolBinary = parseInt(symbol) < 0 ? complement2(parseInt(Math.abs(symbol)).toString(2).padStart(32, '0')) : parseInt(symbol).toString(2).padStart(32, '0')
        const funct3 = FUNCT3.TYPE_I.addi
        const funct3Binary = Number(funct3.match(/[0-7](?!x)/)).toString(2).padStart(3, '0')
        const imm1Binary = symbolBinary.slice(0, 12)
        const imm2Binary = symbolBinary.slice(12, 32)
        const opcode1 = OPCODES.auipc
        const opcode2 = OPCODES.addi

        binOutput += `${imm1Binary}${rdBinary}${opcode1}\n`
        binOutput += `${imm2Binary}${rdBinary}${funct3Binary}${rdBinary}${opcode2}\n`
      } catch (e) {
        throw new Error(e.message + ` at instruction ${i + 1}`)
      }
    } else if (name === 'nop') {
      if (args.length !== 0) {
        throw new Error(`Instruction ${name} requires 0 arguments at instruction ${i + 1}`)
      }
      const opcode = OPCODES.addi
      const rdBinary = registerToBinary('zero')
      const immBinary = '000000000000'
      const funct3 = FUNCT3.TYPE_I.addi
      const funct3Binary = Number(funct3.match(/[0-7](?!x)/)).toString(2).padStart(3, '0')
      binOutput += `${immBinary}${rdBinary}${funct3Binary}${rdBinary}${opcode}\n`
    } else if (name === 'li') {
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
      } else if (!regex32Bits.test(imm)) {
        throw new Error(`Immediate value ${imm} is out of range at instruction ${i + 1}`)
      }
      if (!/^-[1-9]$|^-204[0-8]$|^-?[1-9][0-9]{1,2}$|^-?1[0-9]{3}$|^-?20[0-3][0-9]$|^[0-9]$|^204[0-7]$/.test(imm)) {
        try {
          const rdBinary = registerToBinary(rd)
          const imm1Binary = imm.slice(0, 12).padStart(20, '0')
          const imm2Binary = imm.slice(12, 32)
          const opcode = OPCODES.addi
          const funct3 = FUNCT3.TYPE_I.addi
          const funct3Binary = Number(funct3.match(/[0-7](?!x)/)).toString(2).padStart(3, '0')
          binOutput += `${imm1Binary}${rdBinary}${opcode}\n`
          binOutput += `${imm2Binary}${rdBinary}${funct3Binary}${rdBinary}${opcode}\n`
        } catch (e) {
          throw new Error(e.message + ` at instruction ${i + 1}`)
        }
      } else {
        try {
          const rdBinary = registerToBinary(rd)
          const rs1Binary = registerToBinary('zero')
          const immBinary = parseInt(imm).toString(2).padStart(12, '0')
          const opcode = OPCODES.addi
          const funct3 = FUNCT3.TYPE_I.addi
          const funct3Binary = Number(funct3.match(/[0-7](?!x)/)).toString(2).padStart(3, '0')
          binOutput += `${immBinary}${rs1Binary}${funct3Binary}${rdBinary}${opcode}\n`
        } catch (e) {
          throw new Error(e.message + ` at instruction ${i + 1}`)
        }
      }
    } else if (name === 'mv') {
      if (args.length !== 2) {
        throw new Error(`Instruction ${name} requires 2 arguments at instruction ${i + 1}`)
      } else if (/^[^,]+,$/.test(args[1])) {
        throw new Error(`Instruction ${name} has a trailing comma at instruction ${i + 1}`)
      } else if (!/^[^,]+,$/.test(args[0])) {
        throw new Error(`Instruction ${name} has a missing comma at instruction ${i + 1}`)
      }
      const [rd, rs] = args.map((arg) => arg.replace(/,/, ''))
      try {
        const rdBinary = registerToBinary(rd)
        const rsBinary = registerToBinary(rs)
        const imm = '0'
        const immBinary = parseInt(imm).toString(2).padStart(12, '0')
        const opcode = OPCODES.addi
        const funct3 = FUNCT3.TYPE_I.addi
        const funct3Binary = Number(funct3.match(/[0-7](?!x)/)).toString(2).padStart(3, '0')
        binOutput += `${immBinary}${rsBinary}${funct3Binary}${rdBinary}${opcode}\n`
      } catch (e) {
        throw new Error(e.message + ` at instruction ${i + 1}`)
      }
    } else if (name === 'not') {
      if (args.length !== 2) {
        throw new Error(`Instruction ${name} requires 2 arguments at instruction ${i + 1}`)
      } else if (/^[^,]+,$/.test(args[1])) {
        throw new Error(`Instruction ${name} has a trailing comma at instruction ${i + 1}`)
      } else if (!/^[^,]+,$/.test(args[0])) {
        throw new Error(`Instruction ${name} has a missing comma at instruction ${i + 1}`)
      }
      const [rd, rs] = args.map((arg) => arg.replace(/,/, ''))
      try {
        const rdBinary = registerToBinary(rd)
        const rsBinary = registerToBinary(rs)
        const imm = '-1'
        const immBinary = complement2(parseInt(Math.abs(imm)).toString(2).padStart(12, '0'))
        const opcode = OPCODES.xori
        const funct3 = FUNCT3.TYPE_I.xori
        const funct3Binary = Number(funct3.match(/[0-7](?!x)/)).toString(2).padStart(3, '0')
        binOutput += `${immBinary}${rsBinary}${funct3Binary}${rdBinary}${opcode}\n`
      } catch (e) {
        throw new Error(e.message + ` at instruction ${i + 1}`)
      }
    } else if (name === 'neg') {
      if (args.length !== 2) {
        throw new Error(`Instruction ${name} requires 2 arguments at instruction ${i + 1}`)
      } else if (/^[^,]+,$/.test(args[1])) {
        throw new Error(`Instruction ${name} has a trailing comma at instruction ${i + 1}`)
      } else if (!/^[^,]+,$/.test(args[0])) {
        throw new Error(`Instruction ${name} has a missing comma at instruction ${i + 1}`)
      }
      const [rd, rs] = args.map((arg) => arg.replace(/,/, ''))
      try {
        const rdBinary = registerToBinary(rd)
        const rs1Binary = registerToBinary('zero')
        const rsBinary = registerToBinary(rs)
        const funct3 = FUNCT3.TYPE_R.sub
        const funct7 = FUNCT7.TYPE_R.sub
        const funct3Binary = Number(funct3.match(/[0-7](?!x)/)).toString(2).padStart(3, '0')
        const funct7Binary = Number(funct7.match(/20|01/)).toString(2).padStart(7, '0')
        const opcode = OPCODES[name]

        binOutput += `${funct7Binary}${rsBinary}${rs1Binary}${funct3Binary}${rdBinary}${opcode}\n`
      } catch (e) {
        throw new Error(e.message + ` at instruction ${i + 1}`)
      }
    } else if (name === 'seqz') {
      if (args.length !== 2) {
        throw new Error(`Instruction ${name} requires 2 arguments at instruction ${i + 1}`)
      } else if (/^[^,]+,$/.test(args[1])) {
        throw new Error(`Instruction ${name} has a trailing comma at instruction ${i + 1}`)
      } else if (!/^[^,]+,$/.test(args[0])) {
        throw new Error(`Instruction ${name} has a missing comma at instruction ${i + 1}`)
      }
      const [rd, rs] = args.map((arg) => arg.replace(/,/, ''))
      try {
        const rdBinary = registerToBinary(rd)
        const rsBinary = registerToBinary(rs)
        const imm = '1'
        const immBinary = parseInt(imm).toString(2).padStart(12, '0')
        const opcode = OPCODES.sltiu
        const funct3 = FUNCT3.TYPE_I.sltiu
        const funct3Binary = Number(funct3.match(/[0-7](?!x)/)).toString(2).padStart(3, '0')
        binOutput += `${immBinary}${rsBinary}${funct3Binary}${rdBinary}${opcode}\n`
      } catch (e) {
        throw new Error(e.message + ` at instruction ${i + 1}`)
      }
    } else if (name === 'snez') {
      if (args.length !== 2) {
        throw new Error(`Instruction ${name} requires 2 arguments at instruction ${i + 1}`)
      } else if (/^[^,]+,$/.test(args[1])) {
        throw new Error(`Instruction ${name} has a trailing comma at instruction ${i + 1}`)
      } else if (!/^[^,]+,$/.test(args[0])) {
        throw new Error(`Instruction ${name} has a missing comma at instruction ${i + 1}`)
      }
      const [rd, rs] = args.map((arg) => arg.replace(/,/, ''))
      try {
        const rdBinary = registerToBinary(rd)
        const rs1Binary = registerToBinary('zero')
        const rsBinary = registerToBinary(rs)
        const funct3 = FUNCT3.TYPE_R.sltu
        const funct7 = FUNCT7.TYPE_R.sltu
        const funct3Binary = Number(funct3.match(/[0-7](?!x)/)).toString(2).padStart(3, '0')
        const funct7Binary = Number(funct7.match(/20|01/)).toString(2).padStart(7, '0')
        const opcode = OPCODES.sltu

        binOutput += `${funct7Binary}${rsBinary}${rs1Binary}${funct3Binary}${rdBinary}${opcode}\n`
      } catch (e) {
        throw new Error(e.message + ` at instruction ${i + 1}`)
      }
    } else if (name === 'sltz') {
      if (args.length !== 2) {
        throw new Error(`Instruction ${name} requires 2 arguments at instruction ${i + 1}`)
      } else if (/^[^,]+,$/.test(args[1])) {
        throw new Error(`Instruction ${name} has a trailing comma at instruction ${i + 1}`)
      } else if (!/^[^,]+,$/.test(args[0])) {
        throw new Error(`Instruction ${name} has a missing comma at instruction ${i + 1}`)
      }
      const [rd, rs] = args.map((arg) => arg.replace(/,/, ''))
      try {
        const rdBinary = registerToBinary(rd)
        const rs2Binary = registerToBinary('zero')
        const rsBinary = registerToBinary(rs)
        const funct3 = FUNCT3.TYPE_R.slt
        const funct7 = FUNCT7.TYPE_R.slt
        const funct3Binary = Number(funct3.match(/[0-7](?!x)/)).toString(2).padStart(3, '0')
        const funct7Binary = Number(funct7.match(/20|01/)).toString(2).padStart(7, '0')
        const opcode = OPCODES.sltu

        binOutput += `${funct7Binary}${rs2Binary}${rsBinary}${funct3Binary}${rdBinary}${opcode}\n`
      } catch (e) {
        throw new Error(e.message + ` at instruction ${i + 1}`)
      }
    } else if (name === 'sgtz') {
      if (args.length !== 2) {
        throw new Error(`Instruction ${name} requires 2 arguments at instruction ${i + 1}`)
      } else if (/^[^,]+,$/.test(args[1])) {
        throw new Error(`Instruction ${name} has a trailing comma at instruction ${i + 1}`)
      } else if (!/^[^,]+,$/.test(args[0])) {
        throw new Error(`Instruction ${name} has a missing comma at instruction ${i + 1}`)
      }
      const [rd, rs] = args.map((arg) => arg.replace(/,/, ''))
      try {
        const rdBinary = registerToBinary(rd)
        const rs1Binary = registerToBinary('zero')
        const rsBinary = registerToBinary(rs)
        const funct3 = FUNCT3.TYPE_R.slt
        const funct7 = FUNCT7.TYPE_R.slt
        const funct3Binary = Number(funct3.match(/[0-7](?!x)/)).toString(2).padStart(3, '0')
        const funct7Binary = Number(funct7.match(/20|01/)).toString(2).padStart(7, '0')
        const opcode = OPCODES.sltu

        binOutput += `${funct7Binary}${rsBinary}${rs1Binary}${funct3Binary}${rdBinary}${opcode}\n`
      } catch (e) {
        throw new Error(e.message + ` at instruction ${i + 1}`)
      }
    } else if (name === 'beqz') {
      if (args.length !== 2) {
        throw new Error(`Instruction ${name} requires 2 arguments at instruction ${i + 1}`)
      } else if (/^[^,]+,$/.test(args[1])) {
        throw new Error(`Instruction ${name} has a trailing comma at instruction ${i + 1}`)
      } else if (!/^[^,]+,$/.test(args[0])) {
        throw new Error(`Instruction ${name} has a missing comma at instruction ${i + 1}`)
      }
      const [rs, label] = args.map((arg) => arg.replace(/,/, ''))

      const imm = (labelsAndIndex.find((labelAndIndex) => labelAndIndex[0] === label)[1] - i) * 4
      if (!/^-?\d+$/.test(imm)) {
        throw new Error(`Immediate value ${imm} is not a number at instruction ${i + 1}`)
      } else if (!/^-[1-9]|-409[0-6]|-?[1-9][0-9]{1,2}|-?[1-3][0-9]{3}|-?40[0-8][0-9]|[0-9]|409[0-5]$/.test(imm)) {
        throw new Error(`Immediate value ${imm} is out of range at instruction ${i + 1}`)
      }
      try {
        const rs1Binary = registerToBinary(rs)
        const rs2Binary = registerToBinary('zero')
        const funct3 = FUNCT3.TYPE_B.beq
        const funct3Binary = Number(funct3.match(/[0-7](?!x)/)).toString(2).padStart(3, '0')
        const immBinary = parseInt(imm) < 0 ? complement2(parseInt(Math.abs(imm)).toString(2).padStart(13, '0')) : parseInt(imm).toString(2).padStart(13, '0')
        const opcode = OPCODES.beq
        binOutput += `${immBinary[0]}${immBinary.slice(2, 8)}${rs2Binary}${rs1Binary}${funct3Binary}${immBinary.slice(8, 12)}${immBinary[1]}${opcode}\n`
      } catch (e) {
        throw new Error(e.message + ` at instruction ${i + 1}`)
      }
    } else if (name === 'bnez') {
      if (args.length !== 2) {
        throw new Error(`Instruction ${name} requires 2 arguments at instruction ${i + 1}`)
      } else if (/^[^,]+,$/.test(args[1])) {
        throw new Error(`Instruction ${name} has a trailing comma at instruction ${i + 1}`)
      } else if (!/^[^,]+,$/.test(args[0])) {
        throw new Error(`Instruction ${name} has a missing comma at instruction ${i + 1}`)
      }
      const [rs, label] = args.map((arg) => arg.replace(/,/, ''))

      const imm = (labelsAndIndex.find((labelAndIndex) => labelAndIndex[0] === label)[1] - i) * 4
      if (!/^-?\d+$/.test(imm)) {
        throw new Error(`Immediate value ${imm} is not a number at instruction ${i + 1}`)
      } else if (!/^-[1-9]|-409[0-6]|-?[1-9][0-9]{1,2}|-?[1-3][0-9]{3}|-?40[0-8][0-9]|[0-9]|409[0-5]$/.test(imm)) {
        throw new Error(`Immediate value ${imm} is out of range at instruction ${i + 1}`)
      }
      try {
        const rs1Binary = registerToBinary(rs)
        const rs2Binary = registerToBinary('zero')
        const funct3 = FUNCT3.TYPE_B.bne
        const funct3Binary = Number(funct3.match(/[0-7](?!x)/)).toString(2).padStart(3, '0')
        const immBinary = parseInt(imm) < 0 ? complement2(parseInt(Math.abs(imm)).toString(2).padStart(13, '0')) : parseInt(imm).toString(2).padStart(13, '0')
        const opcode = OPCODES.bne
        binOutput += `${immBinary[0]}${immBinary.slice(2, 8)}${rs2Binary}${rs1Binary}${funct3Binary}${immBinary.slice(8, 12)}${immBinary[1]}${opcode}\n`
      } catch (e) {
        throw new Error(e.message + ` at instruction ${i + 1}`)
      }
    } else if (name === 'blez') {
      if (args.length !== 2) {
        throw new Error(`Instruction ${name} requires 2 arguments at instruction ${i + 1}`)
      } else if (/^[^,]+,$/.test(args[1])) {
        throw new Error(`Instruction ${name} has a trailing comma at instruction ${i + 1}`)
      } else if (!/^[^,]+,$/.test(args[0])) {
        throw new Error(`Instruction ${name} has a missing comma at instruction ${i + 1}`)
      }
      const [rs, label] = args.map((arg) => arg.replace(/,/, ''))

      const imm = (labelsAndIndex.find((labelAndIndex) => labelAndIndex[0] === label)[1] - i) * 4
      if (!/^-?\d+$/.test(imm)) {
        throw new Error(`Immediate value ${imm} is not a number at instruction ${i + 1}`)
      } else if (!/^-[1-9]|-409[0-6]|-?[1-9][0-9]{1,2}|-?[1-3][0-9]{3}|-?40[0-8][0-9]|[0-9]|409[0-5]$/.test(imm)) {
        throw new Error(`Immediate value ${imm} is out of range at instruction ${i + 1}`)
      }
      try {
        const rs1Binary = registerToBinary('zero')
        const rs2Binary = registerToBinary(rs)
        const funct3 = FUNCT3.TYPE_B.blz
        const funct3Binary = Number(funct3.match(/[0-7](?!x)/)).toString(2).padStart(3, '0')
        const immBinary = parseInt(imm) < 0 ? complement2(parseInt(Math.abs(imm)).toString(2).padStart(13, '0')) : parseInt(imm).toString(2).padStart(13, '0')
        const opcode = OPCODES.blz
        binOutput += `${immBinary[0]}${immBinary.slice(2, 8)}${rs2Binary}${rs1Binary}${funct3Binary}${immBinary.slice(8, 12)}${immBinary[1]}${opcode}\n`
      } catch (e) {
        throw new Error(e.message + ` at instruction ${i + 1}`)
      }
    } else if (name === 'bgez') {
      if (args.length !== 2) {
        throw new Error(`Instruction ${name} requires 2 arguments at instruction ${i + 1}`)
      } else if (/^[^,]+,$/.test(args[1])) {
        throw new Error(`Instruction ${name} has a trailing comma at instruction ${i + 1}`)
      } else if (!/^[^,]+,$/.test(args[0])) {
        throw new Error(`Instruction ${name} has a missing comma at instruction ${i + 1}`)
      }
      const [rs, label] = args.map((arg) => arg.replace(/,/, ''))

      const imm = (labelsAndIndex.find((labelAndIndex) => labelAndIndex[0] === label)[1] - i) * 4
      if (!/^-?\d+$/.test(imm)) {
        throw new Error(`Immediate value ${imm} is not a number at instruction ${i + 1}`)
      } else if (!/^-[1-9]|-409[0-6]|-?[1-9][0-9]{1,2}|-?[1-3][0-9]{3}|-?40[0-8][0-9]|[0-9]|409[0-5]$/.test(imm)) {
        throw new Error(`Immediate value ${imm} is out of range at instruction ${i + 1}`)
      }
      try {
        const rs1Binary = registerToBinary(rs)
        const rs2Binary = registerToBinary('zero')
        const funct3 = FUNCT3.TYPE_B.bge
        const funct3Binary = Number(funct3.match(/[0-7](?!x)/)).toString(2).padStart(3, '0')
        const immBinary = parseInt(imm) < 0 ? complement2(parseInt(Math.abs(imm)).toString(2).padStart(13, '0')) : parseInt(imm).toString(2).padStart(13, '0')
        const opcode = OPCODES.bge
        binOutput += `${immBinary[0]}${immBinary.slice(2, 8)}${rs2Binary}${rs1Binary}${funct3Binary}${immBinary.slice(8, 12)}${immBinary[1]}${opcode}\n`
      } catch (e) {
        throw new Error(e.message + ` at instruction ${i + 1}`)
      }
    } else if (name === 'bltz') {
      if (args.length !== 2) {
        throw new Error(`Instruction ${name} requires 2 arguments at instruction ${i + 1}`)
      } else if (/^[^,]+,$/.test(args[1])) {
        throw new Error(`Instruction ${name} has a trailing comma at instruction ${i + 1}`)
      } else if (!/^[^,]+,$/.test(args[0])) {
        throw new Error(`Instruction ${name} has a missing comma at instruction ${i + 1}`)
      }
      const [rs, label] = args.map((arg) => arg.replace(/,/, ''))

      const imm = (labelsAndIndex.find((labelAndIndex) => labelAndIndex[0] === label)[1] - i) * 4
      if (!/^-?\d+$/.test(imm)) {
        throw new Error(`Immediate value ${imm} is not a number at instruction ${i + 1}`)
      } else if (!/^-[1-9]|-409[0-6]|-?[1-9][0-9]{1,2}|-?[1-3][0-9]{3}|-?40[0-8][0-9]|[0-9]|409[0-5]$/.test(imm)) {
        throw new Error(`Immediate value ${imm} is out of range at instruction ${i + 1}`)
      }
      try {
        const rs1Binary = registerToBinary(rs)
        const rs2Binary = registerToBinary('zero')
        const funct3 = FUNCT3.TYPE_B.blt
        const funct3Binary = Number(funct3.match(/[0-7](?!x)/)).toString(2).padStart(3, '0')
        const immBinary = parseInt(imm) < 0 ? complement2(parseInt(Math.abs(imm)).toString(2).padStart(13, '0')) : parseInt(imm).toString(2).padStart(13, '0')
        const opcode = OPCODES.blt
        binOutput += `${immBinary[0]}${immBinary.slice(2, 8)}${rs2Binary}${rs1Binary}${funct3Binary}${immBinary.slice(8, 12)}${immBinary[1]}${opcode}\n`
      } catch (e) {
        throw new Error(e.message + ` at instruction ${i + 1}`)
      }
    } else if (name === 'bgtz') {
      if (args.length !== 2) {
        throw new Error(`Instruction ${name} requires 2 arguments at instruction ${i + 1}`)
      } else if (/^[^,]+,$/.test(args[1])) {
        throw new Error(`Instruction ${name} has a trailing comma at instruction ${i + 1}`)
      } else if (!/^[^,]+,$/.test(args[0])) {
        throw new Error(`Instruction ${name} has a missing comma at instruction ${i + 1}`)
      }
      const [rs, label] = args.map((arg) => arg.replace(/,/, ''))

      const imm = (labelsAndIndex.find((labelAndIndex) => labelAndIndex[0] === label)[1] - i) * 4
      if (!/^-?\d+$/.test(imm)) {
        throw new Error(`Immediate value ${imm} is not a number at instruction ${i + 1}`)
      } else if (!/^-[1-9]|-409[0-6]|-?[1-9][0-9]{1,2}|-?[1-3][0-9]{3}|-?40[0-8][0-9]|[0-9]|409[0-5]$/.test(imm)) {
        throw new Error(`Immediate value ${imm} is out of range at instruction ${i + 1}`)
      }
      try {
        const rs1Binary = registerToBinary('zero')
        const rs2Binary = registerToBinary(rs)
        const funct3 = FUNCT3.TYPE_B.blt
        const funct3Binary = Number(funct3.match(/[0-7](?!x)/)).toString(2).padStart(3, '0')
        const immBinary = parseInt(imm) < 0 ? complement2(parseInt(Math.abs(imm)).toString(2).padStart(13, '0')) : parseInt(imm).toString(2).padStart(13, '0')
        const opcode = OPCODES.blt
        binOutput += `${immBinary[0]}${immBinary.slice(2, 8)}${rs2Binary}${rs1Binary}${funct3Binary}${immBinary.slice(8, 12)}${immBinary[1]}${opcode}\n`
      } catch (e) {
        throw new Error(e.message + ` at instruction ${i + 1}`)
      }
    } else if (name === 'bgt') {
      if (args.length !== 3) {
        throw new Error(`Instruction ${name} requires 3 arguments at instruction ${i + 1}`)
      } else if (/^[^,]+,$/.test(args[2])) {
        throw new Error(`Instruction ${name} has a trailing comma at instruction ${i + 1}`)
      } else if (!/^[^,]+,$/.test(args[0]) || !/^[^,]+,$/.test(args[1])) {
        throw new Error(`Instruction ${name} has a missing comma at instruction ${i + 1}`)
      }
      const [rs, rt, label] = args.map((arg) => arg.replace(/,/, ''))

      const imm = (labelsAndIndex.find((labelAndIndex) => labelAndIndex[0] === label)[1] - i) * 4
      if (!/^-?\d+$/.test(imm)) {
        throw new Error(`Immediate value ${imm} is not a number at instruction ${i + 1}`)
      } else if (!/^-[1-9]|-409[0-6]|-?[1-9][0-9]{1,2}|-?[1-3][0-9]{3}|-?40[0-8][0-9]|[0-9]|409[0-5]$/.test(imm)) {
        throw new Error(`Immediate value ${imm} is out of range at instruction ${i + 1}`)
      }
      try {
        const rs1Binary = registerToBinary(rt)
        const rs2Binary = registerToBinary(rs)
        const funct3 = FUNCT3.TYPE_B.blt
        const funct3Binary = Number(funct3.match(/[0-7](?!x)/)).toString(2).padStart(3, '0')
        const immBinary = parseInt(imm) < 0 ? complement2(parseInt(Math.abs(imm)).toString(2).padStart(13, '0')) : parseInt(imm).toString(2).padStart(13, '0')
        const opcode = OPCODES.blt
        binOutput += `${immBinary[0]}${immBinary.slice(2, 8)}${rs2Binary}${rs1Binary}${funct3Binary}${immBinary.slice(8, 12)}${immBinary[1]}${opcode}\n`
      } catch (e) {
        throw new Error(e.message + ` at instruction ${i + 1}`)
      }
    } else if (name === 'ble') {
      if (args.length !== 3) {
        throw new Error(`Instruction ${name} requires 3 arguments at instruction ${i + 1}`)
      } else if (/^[^,]+,$/.test(args[2])) {
        throw new Error(`Instruction ${name} has a trailing comma at instruction ${i + 1}`)
      } else if (!/^[^,]+,$/.test(args[0]) || !/^[^,]+,$/.test(args[1])) {
        throw new Error(`Instruction ${name} has a missing comma at instruction ${i + 1}`)
      }
      const [rs, rt, label] = args.map((arg) => arg.replace(/,/, ''))

      const imm = (labelsAndIndex.find((labelAndIndex) => labelAndIndex[0] === label)[1] - i) * 4
      if (!/^-?\d+$/.test(imm)) {
        throw new Error(`Immediate value ${imm} is not a number at instruction ${i + 1}`)
      } else if (!/^-[1-9]|-409[0-6]|-?[1-9][0-9]{1,2}|-?[1-3][0-9]{3}|-?40[0-8][0-9]|[0-9]|409[0-5]$/.test(imm)) {
        throw new Error(`Immediate value ${imm} is out of range at instruction ${i + 1}`)
      }
      try {
        const rs1Binary = registerToBinary(rt)
        const rs2Binary = registerToBinary(rs)
        const funct3 = FUNCT3.TYPE_B.bge
        const funct3Binary = Number(funct3.match(/[0-7](?!x)/)).toString(2).padStart(3, '0')
        const immBinary = parseInt(imm) < 0 ? complement2(parseInt(Math.abs(imm)).toString(2).padStart(13, '0')) : parseInt(imm).toString(2).padStart(13, '0')
        const opcode = OPCODES.bge
        binOutput += `${immBinary[0]}${immBinary.slice(2, 8)}${rs2Binary}${rs1Binary}${funct3Binary}${immBinary.slice(8, 12)}${immBinary[1]}${opcode}\n`
      } catch (e) {
        throw new Error(e.message + ` at instruction ${i + 1}`)
      }
    } else if (name === 'bgtu') {
      if (args.length !== 3) {
        throw new Error(`Instruction ${name} requires 3 arguments at instruction ${i + 1}`)
      } else if (/^[^,]+,$/.test(args[2])) {
        throw new Error(`Instruction ${name} has a trailing comma at instruction ${i + 1}`)
      } else if (!/^[^,]+,$/.test(args[0]) || !/^[^,]+,$/.test(args[1])) {
        throw new Error(`Instruction ${name} has a missing comma at instruction ${i + 1}`)
      }
      const [rs, rt, label] = args.map((arg) => arg.replace(/,/, ''))

      const imm = (labelsAndIndex.find((labelAndIndex) => labelAndIndex[0] === label)[1] - i) * 4
      if (!/^-?\d+$/.test(imm)) {
        throw new Error(`Immediate value ${imm} is not a number at instruction ${i + 1}`)
      } else if (!/^-[1-9]|-409[0-6]|-?[1-9][0-9]{1,2}|-?[1-3][0-9]{3}|-?40[0-8][0-9]|[0-9]|409[0-5]$/.test(imm)) {
        throw new Error(`Immediate value ${imm} is out of range at instruction ${i + 1}`)
      }
      try {
        const rs1Binary = registerToBinary(rt)
        const rs2Binary = registerToBinary(rs)
        const funct3 = FUNCT3.TYPE_B.bltu
        const funct3Binary = Number(funct3.match(/[0-7](?!x)/)).toString(2).padStart(3, '0')
        const immBinary = parseInt(imm) < 0 ? complement2(parseInt(Math.abs(imm)).toString(2).padStart(13, '0')) : parseInt(imm).toString(2).padStart(13, '0')
        const opcode = OPCODES.bltu
        binOutput += `${immBinary[0]}${immBinary.slice(2, 8)}${rs2Binary}${rs1Binary}${funct3Binary}${immBinary.slice(8, 12)}${immBinary[1]}${opcode}\n`
      } catch (e) {
        throw new Error(e.message + ` at instruction ${i + 1}`)
      }
    } else if (name === 'bleu') {
      if (args.length !== 3) {
        throw new Error(`Instruction ${name} requires 3 arguments at instruction ${i + 1}`)
      } else if (/^[^,]+,$/.test(args[2])) {
        throw new Error(`Instruction ${name} has a trailing comma at instruction ${i + 1}`)
      } else if (!/^[^,]+,$/.test(args[0]) || !/^[^,]+,$/.test(args[1])) {
        throw new Error(`Instruction ${name} has a missing comma at instruction ${i + 1}`)
      }
      const [rs, rt, label] = args.map((arg) => arg.replace(/,/, ''))

      const imm = (labelsAndIndex.find((labelAndIndex) => labelAndIndex[0] === label)[1] - i) * 4
      if (!/^-?\d+$/.test(imm)) {
        throw new Error(`Immediate value ${imm} is not a number at instruction ${i + 1}`)
      } else if (!/^-[1-9]|-409[0-6]|-?[1-9][0-9]{1,2}|-?[1-3][0-9]{3}|-?40[0-8][0-9]|[0-9]|409[0-5]$/.test(imm)) {
        throw new Error(`Immediate value ${imm} is out of range at instruction ${i + 1}`)
      }
      try {
        const rs1Binary = registerToBinary(rt)
        const rs2Binary = registerToBinary(rs)
        const funct3 = FUNCT3.TYPE_B.bgeu
        const funct3Binary = Number(funct3.match(/[0-7](?!x)/)).toString(2).padStart(3, '0')
        const immBinary = parseInt(imm) < 0 ? complement2(parseInt(Math.abs(imm)).toString(2).padStart(13, '0')) : parseInt(imm).toString(2).padStart(13, '0')
        const opcode = OPCODES.bgeu
        binOutput += `${immBinary[0]}${immBinary.slice(2, 8)}${rs2Binary}${rs1Binary}${funct3Binary}${immBinary.slice(8, 12)}${immBinary[1]}${opcode}\n`
      } catch (e) {
        throw new Error(e.message + ` at instruction ${i + 1}`)
      }
    } else if (name === 'j') {
      if (args.length !== 1) {
        throw new Error(`Instruction ${name} requires 1 argument at instruction ${i + 1}`)
      } else if (/^[^,]+,$/.test(args[0])) {
        throw new Error(`Instruction ${name} has a trailing comma at instruction ${i + 1}`)
      }
      const [label] = args
      const imm = labelsAndIndex.find((labelAndIndex) => labelAndIndex[0] === label)[1] * 4
      if (!/^-?\d+$/.test(imm)) {
        throw new Error(`Immediate value ${imm} is not a number at instruction ${i + 1}`)
      } else if (!/^-[1-9]|-104857[0-6]|-?[1-9][0-9]{1,5}|-?10[0-3][0-9]{4}|-?104[0-7][0-9]{3}|-?1048[0-4][0-9]{2}|-?10485[0-6][0-9]|[0-9]|104857[0-5]$/.test(imm)) {
        throw new Error(`Immediate value ${imm} is out of range at instruction ${i + 1}`)
      }
      try {
        const immBinary = parseInt(imm).toString(2).padStart(32, '0')
        const rdBinary = registerToBinary('zero')
        const opcode = OPCODES.jal
        binOutput += `${immBinary[0]}${immBinary.slice(10, 20)}${immBinary[9]}${immBinary.slice(1, 9)}${rdBinary}${opcode}\n`
      } catch (e) {
        throw new Error(e.message + ` at instruction ${i + 1}`)
      }
    } else if (name === 'jr') {
      if (args.length !== 1) {
        throw new Error(`Instruction ${name} requires 1 argument at instruction ${i + 1}`)
      } else if (/^[^,]+,$/.test(args[0])) {
        throw new Error(`Instruction ${name} has a trailing comma at instruction ${i + 1}`)
      }
      const [rs] = args
      try {
        const rdBinary = registerToBinary('zero')
        const rs1Binary = registerToBinary(rs)
        const funct3 = FUNCT3.TYPE_I.jalr
        const funct3Binary = Number(funct3.match(/[0-7](?!x)/)).toString(2).padStart(3, '0')
        const immBinary = Number(0).toString(2).padStart(12, '0')
        const opcode = OPCODES.jalr
        binOutput += `${immBinary}${rs1Binary}${funct3Binary}${rdBinary}${opcode}\n`
      } catch (e) {
        throw new Error(e.message + ` at instruction ${i + 1}`)
      }
    } else if (name === 'ret') {
      if (args.length !== 0) {
        throw new Error(`Instruction ${name} requires 0 arguments at instruction ${i + 1}`)
      }
      try {
        const rdBinary = registerToBinary('zero')
        const rs1Binary = registerToBinary('x1')
        const funct3 = FUNCT3.TYPE_I.jalr
        const funct3Binary = Number(funct3.match(/[0-7](?!x)/)).toString(2).padStart(3, '0')
        const immBinary = Number(0).toString(2).padStart(12, '0')
        const opcode = OPCODES.jalr
        binOutput += `${immBinary}${rs1Binary}${funct3Binary}${rdBinary}${opcode}\n`
      } catch (e) {
        throw new Error(e.message + ` at instruction ${i + 1}`)
      }
    } else if (name === 'call') {
      if (args.length !== 1) {
        throw new Error(`Instruction ${name} requires 1 argument at instruction ${i + 1}`)
      } else if (/^[^,]+,$/.test(args[0])) {
        throw new Error(`Instruction ${name} has a trailing comma at instruction ${i + 1}`)
      }
      const [offset] = args
      const imm = (labelsAndIndex.find((labelAndIndex) => labelAndIndex[0] === offset)[1] - i) * 4
      if (!/^-?\d+$/.test(imm)) {
        throw new Error(`imm ${imm} is not a number at instruction ${i + 1}`)
      } else if (!regex32Bits.test(imm)) {
        throw new Error(`imm ${imm} is out of range at instruction ${i + 1}`)
      }

      if (!/^-[1-9]$|^-204[0-8]$|^-?[1-9][0-9]{1,2}$|^-?1[0-9]{3}$|^-?20[0-3][0-9]$|^[0-9]$|^204[0-7]$/.test(imm)) {
        try {
          const rdBinary = registerToBinary('x1')
          const rs1Binary = registerToBinary('x1')
          const immBinary = parseInt(imm) < 0 ? complement2(parseInt(Math.abs(imm)).toString(2).padStart(32, '0')) : parseInt(imm).toString(2).padStart(32, '0')
          const funct3 = FUNCT3.TYPE_I.jalr
          const funct3Binary = Number(funct3.match(/[0-7](?!x)/)).toString(2).padStart(3, '0')
          const imm1Binary = immBinary.slice(0, 20)
          const imm2Binary = immBinary.slice(20, 32)
          const opcode1 = OPCODES.auipc
          const opcode2 = OPCODES.jalr

          binOutput += `${imm1Binary}${rdBinary}${opcode1}\n`
          binOutput += `${imm2Binary}${rs1Binary}${funct3Binary}${rdBinary}${opcode2}\n`
        } catch (e) {
          throw new Error(e.message + ` at instruction ${i + 1}`)
        }
      } else {
        try {
          const rdBinary = registerToBinary('x1')
          const rs1Binary = registerToBinary('x1')
          const immBinary = parseInt(imm) < 0 ? complement2(parseInt(Math.abs(imm)).toString(2).padStart(32, '0')) : parseInt(imm).toString(2).padStart(32, '0')
          const funct3 = FUNCT3.TYPE_I.jalr
          const funct3Binary = Number(funct3.match(/[0-7](?!x)/)).toString(2).padStart(3, '0')
          const imm1Binary = Number(0).toString(2).padStart(20, '0')
          const imm2Binary = immBinary.slice(20, 32)
          const opcode1 = OPCODES.auipc
          const opcode2 = OPCODES.jalr

          binOutput += `${imm1Binary}${rdBinary}${opcode1}\n`
          binOutput += `${imm2Binary}${rs1Binary}${funct3Binary}${rdBinary}${opcode2}\n`
        } catch (e) {
          throw new Error(e.message + ` at instruction ${i + 1}`)
        }
      }
    } else if (name === 'tail') {
      if (args.length !== 1) {
        throw new Error(`Instruction ${name} requires 1 argument at instruction ${i + 1}`)
      } else if (/^[^,]+,$/.test(args[0])) {
        throw new Error(`Instruction ${name} has a trailing comma at instruction ${i + 1}`)
      }
      const [offset] = args
      const imm = (labelsAndIndex.find((labelAndIndex) => labelAndIndex[0] === offset)[1] - i) * 4
      if (!/^-?\d+$/.test(imm)) {
        throw new Error(`imm ${imm} is not a number at instruction ${i + 1}`)
      } else if (!regex32Bits.test(imm)) {
        throw new Error(`imm ${imm} is out of range at instruction ${i + 1}`)
      }

      if (!/^-[1-9]$|^-204[0-8]$|^-?[1-9][0-9]{1,2}$|^-?1[0-9]{3}$|^-?20[0-3][0-9]$|^[0-9]$|^204[0-7]$/.test(imm)) {
        try {
          const rdBinary1 = registerToBinary('x6')
          const rdBinary2 = registerToBinary('x0')
          const rs1Binary = registerToBinary('x6')
          const immBinary = parseInt(imm) < 0 ? complement2(parseInt(Math.abs(imm)).toString(2).padStart(32, '0')) : parseInt(imm).toString(2).padStart(32, '0')
          const funct3 = FUNCT3.TYPE_I.jalr
          const funct3Binary = Number(funct3.match(/[0-7](?!x)/)).toString(2).padStart(3, '0')
          const imm1Binary = immBinary.slice(0, 20)
          const imm2Binary = immBinary.slice(20, 32)
          const opcode1 = OPCODES.auipc
          const opcode2 = OPCODES.jalr

          binOutput += `${imm1Binary}${rdBinary1}${opcode1}\n`
          binOutput += `${imm2Binary}${rs1Binary}${funct3Binary}${rdBinary2}${opcode2}\n`
        } catch (e) {
          throw new Error(e.message + ` at instruction ${i + 1}`)
        }
      } else {
        try {
          const rdBinary1 = registerToBinary('x6')
          const rdBinary2 = registerToBinary('x0')
          const rs1Binary = registerToBinary('x6')
          const immBinary = parseInt(imm) < 0 ? complement2(parseInt(Math.abs(imm)).toString(2).padStart(32, '0')) : parseInt(imm).toString(2).padStart(32, '0')
          const funct3 = FUNCT3.TYPE_I.jalr
          const funct3Binary = Number(funct3.match(/[0-7](?!x)/)).toString(2).padStart(3, '0')
          const imm1Binary = Number(0).toString(2).padStart(20, '0')
          const imm2Binary = immBinary.slice(20, 32)
          const opcode1 = OPCODES.auipc
          const opcode2 = OPCODES.jalr

          binOutput += `${imm1Binary}${rdBinary1}${opcode1}\n`
          binOutput += `${imm2Binary}${rs1Binary}${funct3Binary}${rdBinary2}${opcode2}\n`
        } catch (e) {
          throw new Error(e.message + ` at instruction ${i + 1}`)
        }
      }
    }
  }
  // #endregion
  // #region Instructions
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
    if (['lh', 'lw', 'lb'].includes(name) && !offsetRegex.test(args[1])) {
      if (args.length !== 2) {
        throw new Error(`Instruction ${name} requires 2 arguments at instruction ${i + 1}`)
      } else if (/^[^,]+,$/.test(args[1])) {
        throw new Error(`Instruction ${name} has a trailing comma at instruction ${i + 1}`)
      } else if (!/^[^,]+,$/.test(args[0])) {
        throw new Error(`Instruction ${name} has a missing comma at instruction ${i + 1}`)
      }
      const [rd, symbol] = args.map((arg) => arg.replace(/,/, ''))

      if (!/^-?\d+$/.test(symbol)) {
        throw new Error(`Symbol ${symbol} is not a number at instruction ${i + 1}`)
      } else if (!regex32Bits.test(symbol)) {
        throw new Error(`Symbol ${symbol} is out of range at instruction ${i + 1}`)
      }

      try {
        const rdBinary = registerToBinary(rd)
        const symbolBinary = parseInt(symbol) < 0 ? complement2(parseInt(Math.abs(symbol)).toString(2).padStart(32, '0')) : parseInt(symbol).toString(2).padStart(32, '0')
        const funct3 = FUNCT3[type][name]
        const funct3Binary = Number(funct3.match(/[0-7](?!x)/)).toString(2).padStart(3, '0')
        const imm1Binary = symbolBinary.slice(0, 12)
        const imm2Binary = symbolBinary.slice(12, 32)
        const opcode1 = OPCODES.auipc
        const opcode2 = OPCODES[name]

        binOutput += `${imm1Binary}${rdBinary}${opcode1}\n`
        binOutput += `${imm2Binary}${rdBinary}${funct3Binary}${rdBinary}${opcode2}\n`
      } catch (e) {
        throw new Error(e.message + ` at instruction ${i + 1}`)
      }
    } else if (['ecall', 'ebreak'].includes(name)) {
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
      if (args.length === 1) {
        if (/^[^,]+,$/.test(args[0])) {
          throw new Error(`Instruction ${name} has a trailing comma at instruction ${i + 1}`)
        }
        const [rs] = args
        try {
          const rdBinary = registerToBinary('x1')
          const rs1Binary = registerToBinary(rs)
          const funct3 = FUNCT3[type][name]
          const funct3Binary = Number(funct3.match(/[0-7](?!x)/)).toString(2).padStart(3, '0')
          const immBinary = Number(0).toString(2).padStart(12, '0')
          const opcode = OPCODES[name]
          binOutput += `${immBinary}${rs1Binary}${funct3Binary}${rdBinary}${opcode}\n`
        } catch (e) {
          throw new Error(e.message + ` at instruction ${i + 1}`)
        }
      } else {
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
          const opcode1 = OPCODES.auipc
          const opcode2 = OPCODES[name]

          if (name === 'srai') {
            binOutput += `0100000${immBinary}${rs1Binary}${funct3Binary}${rdBinary}${opcode1}\n`
          } else {
            binOutput += `0000000${immBinary}${rs1Binary}${funct3Binary}${rdBinary}${opcode2}\n`
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
    if (['sb', 'sh', 'sw'].includes(name) && !offsetRegex.test(args[1].replace(/,/, ''))) {
      if (args.length !== 3) {
        throw new Error(`Instruction ${name} requires 3 arguments at instruction ${i + 1}`)
      } else if (/^[^,]+,$/.test(args[2])) {
        throw new Error(`Instruction ${name} has a trailing comma at instruction ${i + 1}`)
      } else if (!/^[^,]+,$/.test(args[0]) || !/^[^,]+,$/.test(args[1])) {
        throw new Error(`Instruction ${name} has a missing comma at instruction ${i + 1}`)
      }
      const [rd, symbol, rt] = args.map((arg) => arg.replace(/,/, ''))

      if (!/^-?\d+$/.test(symbol)) {
        throw new Error(`Symbol ${symbol} is not a number at instruction ${i + 1}`)
      } else if (!regex32Bits.test(symbol)) {
        throw new Error(`Symbol ${symbol} is out of range at instruction ${i + 1}`)
      }

      try {
        const rdBinary = registerToBinary(rd)
        const rtBinary = registerToBinary(rt)
        const symbolBinary = parseInt(symbol) < 0 ? complement2(parseInt(Math.abs(symbol)).toString(2).padStart(32, '0')) : parseInt(symbol).toString(2).padStart(32, '0')
        const funct3 = FUNCT3[type][name]
        const funct3Binary = Number(funct3.match(/[0-7](?!x)/)).toString(2).padStart(3, '0')
        const imm1Binary = symbolBinary.slice(0, 12)
        const imm2Binary = symbolBinary.slice(12, 32)
        const opcode1 = OPCODES.auipc
        const opcode2 = OPCODES[name]

        binOutput += `${imm1Binary}${rtBinary}${opcode1}\n`
        binOutput += `${imm2Binary.slice(0, 7)}${rdBinary}${rtBinary}${funct3Binary}${imm2Binary.slice(7, 12)}${opcode2}\n`
      } catch (e) {
        throw new Error(e.message + ` at instruction ${i + 1}`)
      }
    } else {
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

    const imm = (labelsAndIndex.find((labelAndIndex) => labelAndIndex[0] === label)[1] - i) * 4
    if (!/^-?\d+$/.test(imm)) {
      throw new Error(`Immediate value ${imm} is not a number at instruction ${i + 1}`)
    } else if (!/^-[1-9]|-409[0-6]|-?[1-9][0-9]{1,2}|-?[1-3][0-9]{3}|-?40[0-8][0-9]|[0-9]|409[0-5]$/.test(imm)) {
      throw new Error(`Immediate value ${imm} is out of range at instruction ${i + 1}`)
    }
    try {
      const rs1Binary = registerToBinary(rs1)
      const rs2Binary = registerToBinary(rs2)
      const funct3 = FUNCT3[type][name]
      const funct3Binary = Number(funct3.match(/[0-7](?!x)/)).toString(2).padStart(3, '0')
      const immBinary = parseInt(imm) < 0 ? complement2(parseInt(Math.abs(imm)).toString(2).padStart(13, '0')) : parseInt(imm).toString(2).padStart(13, '0')
      const opcode = OPCODES[name]
      binOutput += `${immBinary[0]}${immBinary.slice(2, 8)}${rs2Binary}${rs1Binary}${funct3Binary}${immBinary.slice(8, 12)}${immBinary[1]}${opcode}\n`
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
  } else if (type === 'TYPE_J') {
    if (args.length === 1) {
      if (/^[^,]+,$/.test(args[0])) {
        throw new Error(`Instruction ${name} has a trailing comma at instruction ${i + 1}`)
      }
      const [label] = args

      const imm = (labelsAndIndex.find((labelAndIndex) => labelAndIndex[0] === label)[1] - i) * 4
      if (!/^-?\d+$/.test(imm)) {
        throw new Error(`Immediate value ${imm} is not a number at instruction ${i + 1}`)
      } else if (!/^-[1-9]|-104857[0-6]|-?[1-9][0-9]{1,5}|-?10[0-3][0-9]{4}|-?104[0-7][0-9]{3}|-?1048[0-4][0-9]{2}|-?10485[0-6][0-9]|[0-9]|104857[0-5]$/.test(imm)) {
        throw new Error(`Immediate value ${imm} is out of range at instruction ${i + 1}`)
      }
      try {
        const rdBinary = registerToBinary('x1')
        const immBinary = parseInt(imm) < 0 ? complement2(parseInt(Math.abs(imm)).toString(2).padStart(21, '0')) : parseInt(imm).toString(2).padStart(21, '0')
        const opcode = OPCODES[name]
        binOutput += `${immBinary[0]}${immBinary.slice(10, 20)}${immBinary[9]}${immBinary.slice(1, 9)}${rdBinary}${opcode}\n`
      } catch (e) {
        throw new Error(e.message + ` at instruction ${i + 1}`)
      }
    } else {
      if (args.length !== 2) {
        throw new Error(`Instruction ${name} requires 1 or 2 arguments at instruction ${i + 1}`)
      } else if (/^[^,]+,$/.test(args[1])) {
        throw new Error(`Instruction ${name} has a trailing comma at instruction ${i + 1}`)
      } else if (!/^[^,]+,$/.test(args[0])) {
        throw new Error(`Instruction ${name} has a missing comma at instruction ${i + 1}`)
      }
      const [rd, label] = args.map((arg) => arg.replace(/,/, ''))

      const imm = (labelsAndIndex.find((labelAndIndex) => labelAndIndex[0] === label)[1] - i) * 4
      if (!/^-?\d+$/.test(imm)) {
        throw new Error(`Immediate value ${imm} is not a number at instruction ${i + 1}`)
      } else if (!/^-[1-9]|-104857[0-6]|-?[1-9][0-9]{1,5}|-?10[0-3][0-9]{4}|-?104[0-7][0-9]{3}|-?1048[0-4][0-9]{2}|-?10485[0-6][0-9]|[0-9]|104857[0-5]$/.test(imm)) {
        throw new Error(`Immediate value ${imm} is out of range at instruction ${i + 1}`)
      }
      try {
        const rdBinary = registerToBinary(rd)
        const immBinary = parseInt(imm) < 0 ? complement2(parseInt(Math.abs(imm)).toString(2).padStart(21, '0')) : parseInt(imm).toString(2).padStart(21, '0')
        const opcode = OPCODES[name]
        binOutput += `${immBinary[0]}${immBinary.slice(10, 20)}${immBinary[9]}${immBinary.slice(1, 9)}${rdBinary}${opcode}\n`
      } catch (e) {
        throw new Error(e.message + ` at instruction ${i + 1}`)
      }
    }
  }
})

const hexOutput = binOutput.split(/\n/).map((line) => parseInt(line, 2).toString(16).padStart(8, '0'))
hexOutput.pop()
const hexOutputString = hexOutput.join('\n')

if (/.\.hex/.test(output)) {
  fs.writeFileSync(output, hexOutputString)
} else if (/.\.bin/.test(output)) {
  fs.writeFileSync(output, binOutput)
} else {
  throw new Error('Output file must be a .hex or .bin file')
}
