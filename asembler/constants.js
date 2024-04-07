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
  TYPE_R: '0110011',
  TYPE_I: '0010011',
  TYPE_S: '0100011',
  TYPE_B: '1100011',
  TYPE_U: '0110111',
  TYPE_J: '1101111'
}

export default { INSTRUCTIONS_TYPE, INSTRUCTIONS, OPCODES }
