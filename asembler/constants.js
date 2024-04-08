const INSTRUCTIONS_TYPE = ['TYPE_R', 'TYPE_I', 'TYPE_S', 'TYPE_B', 'TYPE_U', 'TYPE_J']

const INSTRUCTIONS = {
  TYPE_R: ['add', 'sub', 'xor', 'or', 'and', 'sll', 'srl', 'sra', 'slt', 'sltu', 'mul', 'mulh', 'mulsu', 'mulu', 'div', 'divu', 'rem', 'remu'],
  TYPE_I: ['addi', 'xori', 'ori', 'andi', 'slli', 'srli', 'srai', 'slti', 'sltiu', 'lb', 'lh', 'lw', 'lbu', 'lhu', 'jalr', 'ecall', 'ebreak'],
  TYPE_S: ['sb', 'sh', 'sw'],
  TYPE_B: ['beq', 'bne', 'blt', 'bge', 'bltu', 'bgeu'],
  TYPE_U: ['lui', 'auipc'],
  TYPE_J: ['jal']
}

const OPCODES = {
  add: '0110011',
  sub: '0110011',
  xor: '0110011',
  or: '0110011',
  and: '0110011',
  sll: '0110011',
  srl: '0110011',
  sra: '0110011',
  slt: '0110011',
  sltu: '0110011',
  addi: '0010011',
  xori: '0010011',
  ori: '0010011',
  andi: '0010011',
  slli: '0010011',
  srli: '0010011',
  srai: '0010011',
  slti: '0010011',
  sltiu: '0010011',
  lb: '0000011',
  lh: '0000011',
  lw: '0000011',
  lbu: '0000011',
  lhu: '0000011',
  sb: '0100011',
  sh: '0100011',
  sw: '0100011',
  beq: '1100011',
  bne: '1100011',
  blt: '1100011',
  bge: '1100011',
  bltu: '1100011',
  bgeu: '1100011',
  jal: '1101111',
  jalr: '1100111',
  lui: '0110111',
  auipc: '0010111',
  ecall: '1110011',
  ebreak: '1110011',
  mul: '0110011',
  mulh: '0110011',
  mulsu: '0110011',
  mulu: '0110011',
  div: '0110011',
  divu: '0110011',
  rem: '0110011',
  remu: '0110011'
}

const ABI_REGISTERS = {
  zero: 'x0',
  ra: 'x1',
  sp: 'x2',
  gp: 'x3',
  tp: 'x4',
  t0: 'x5',
  t1: 'x6',
  t2: 'x7',
  s0: 'x8',
  fp: 'x8',
  s1: 'x9',
  a0: 'x10',
  a1: 'x11',
  a2: 'x12',
  a3: 'x13',
  a4: 'x14',
  a5: 'x15',
  a6: 'x16',
  a7: 'x17',
  s2: 'x18',
  s3: 'x19',
  s4: 'x20',
  s5: 'x21',
  s6: 'x22',
  s7: 'x23',
  s8: 'x24',
  s9: 'x25',
  s10: 'x26',
  s11: 'x27',
  t3: 'x28',
  t4: 'x29',
  t5: 'x30',
  t6: 'x31'
}

const FUNCT3 = {
  TYPE_R: {
    add: '0x0',
    sub: '0x0',
    xor: '0x4',
    or: '0x6',
    and: '0x7',
    sll: '0x1',
    srl: '0x5',
    sra: '0x5',
    slt: '0x2',
    sltu: '0x3',
    mul: '0x0',
    mulh: '0x1',
    mulsu: '0x2',
    mulu: '0x3',
    div: '0x4',
    divu: '0x5',
    rem: '0x6',
    remu: '0x7'

  },
  TYPE_I: {
    addi: '0x0',
    xori: '0x4',
    ori: '0x6',
    andi: '0x7',
    slli: '0x1',
    srli: '0x5',
    srai: '0x5',
    slti: '0x2',
    sltiu: '0x3',
    lb: '0x0',
    lh: '0x1',
    lw: '0x2',
    lbu: '0x4',
    lhu: '0x5',
    jalr: '0x0',
    ecall: '0x0',
    ebreak: '0x0'
  },
  TYPE_S: {
    sb: '0x0',
    sh: '0x1',
    sw: '0x2'
  },
  TYPE_B: {
    beq: '0x0',
    bne: '0x1',
    blt: '0x4',
    bge: '0x5',
    bltu: '0x6',
    bgeu: '0x7'
  }
}

const FUNCT7 = {
  TYPE_R: {
    add: '0x00',
    sub: '0x20',
    xor: '0x00',
    or: '0x00',
    and: '0x00',
    sll: '0x00',
    srl: '0x00',
    sra: '0x20',
    slt: '0x00',
    sltu: '0x00',
    mul: '0x01',
    mulh: '0x01',
    mulsu: '0x01',
    mulu: '0x01',
    div: '0x01',
    divu: '0x01',
    rem: '0x01',
    remu: '0x01'

  }
}

export default { INSTRUCTIONS_TYPE, INSTRUCTIONS, OPCODES, ABI_REGISTERS, FUNCT3, FUNCT7 }
