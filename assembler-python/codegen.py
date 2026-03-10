from constants import INSTRUCTIONS_TYPE, INSTRUCTIONS, OPCODES, FUNCT3, FUNCT7, PSEUDO_INSTRUCTIONS
from encoder import (
    register_to_binary, twos_complement, to_signed_binary,
    parse_funct3, parse_funct7, is_number, in_range_12bit,
    in_range_13bit, in_range_21bit, in_range_20bit, in_range_32bit,
    in_range_5bit, is_offset_format, parse_offset, has_trailing_comma,
    strip_comma,
)


def find_type(name):
    for t in INSTRUCTIONS_TYPE:
        if name in INSTRUCTIONS[t]:
            return t
    return None


def find_label_index(labels_and_index, label):
    for entry in labels_and_index:
        if entry[0] == label:
            return entry[1]
    return None


def validate_arg_count(name, args, expected, i):
    if len(args) != expected:
        raise Exception("Instruction " + name + " requires " + str(expected) + " arguments at instruction " + str(i + 1))


def validate_no_trailing_comma_1(name, args, i):
    if has_trailing_comma(args[0]):
        raise Exception("Instruction " + name + " has a trailing comma at instruction " + str(i + 1))


def validate_no_trailing_comma_last(name, args, i):
    if has_trailing_comma(args[-1]):
        raise Exception("Instruction " + name + " has a trailing comma at instruction " + str(i + 1))


def validate_commas_2arg(name, args, i):
    validate_no_trailing_comma_last(name, args, i)
    if not has_trailing_comma(args[0]):
        raise Exception("Instruction " + name + " has a missing comma at instruction " + str(i + 1))


def validate_commas_3arg(name, args, i):
    validate_no_trailing_comma_last(name, args, i)
    if not has_trailing_comma(args[0]) or not has_trailing_comma(args[1]):
        raise Exception("Instruction " + name + " has a missing comma at instruction " + str(i + 1))


def encode_pseudo_2arg_r_type(name, args, i, base_name, rs1_name, swap_rs):
    validate_arg_count(name, args, 2, i)
    validate_commas_2arg(name, args, i)
    rd, rs = strip_comma(args[0]), strip_comma(args[1])
    try:
        rd_bin = register_to_binary(rd)
        if rs1_name:
            rs1_bin = register_to_binary(rs1_name)
        else:
            rs1_bin = register_to_binary('zero')
        rs_bin = register_to_binary(rs)
        f3 = FUNCT3['TYPE_R'][base_name]
        f7 = FUNCT7['TYPE_R'][base_name]
        f3_bin = parse_funct3(f3)
        f7_bin = parse_funct7(f7)
        opcode = OPCODES[base_name]
        if swap_rs:
            return f7_bin + rs_bin + rs1_bin + f3_bin + rd_bin + opcode + "\n"
        else:
            return f7_bin + rs_bin + rs1_bin + f3_bin + rd_bin + opcode + "\n"
    except Exception as e:
        raise Exception(str(e) + " at instruction " + str(i + 1))


def encode_pseudo_branch_2arg(name, args, i, labels_and_index, base_name, swap_regs):
    validate_arg_count(name, args, 2, i)
    validate_commas_2arg(name, args, i)
    rs, label = strip_comma(args[0]), strip_comma(args[1])
    imm = (find_label_index(labels_and_index, label) - i) * 4
    if not is_number(str(imm)):
        raise Exception("Immediate value " + str(imm) + " is not a number at instruction " + str(i + 1))
    if not in_range_13bit(imm):
        raise Exception("Immediate value " + str(imm) + " is out of range at instruction " + str(i + 1))
    try:
        if swap_regs:
            rs1_bin = register_to_binary('zero')
            rs2_bin = register_to_binary(rs)
        else:
            rs1_bin = register_to_binary(rs)
            rs2_bin = register_to_binary('zero')
        f3 = FUNCT3['TYPE_B'][base_name]
        f3_bin = parse_funct3(f3)
        imm_bin = to_signed_binary(imm, 13)
        opcode = OPCODES[base_name]
        return imm_bin[0] + imm_bin[2:8] + rs2_bin + rs1_bin + f3_bin + imm_bin[8:12] + imm_bin[1] + opcode + "\n"
    except Exception as e:
        raise Exception(str(e) + " at instruction " + str(i + 1))


def encode_pseudo_branch_3arg(name, args, i, labels_and_index, base_name):
    validate_arg_count(name, args, 3, i)
    validate_commas_3arg(name, args, i)
    rs, rt, label = strip_comma(args[0]), strip_comma(args[1]), strip_comma(args[2])
    imm = (find_label_index(labels_and_index, label) - i) * 4
    if not is_number(str(imm)):
        raise Exception("Immediate value " + str(imm) + " is not a number at instruction " + str(i + 1))
    if not in_range_13bit(imm):
        raise Exception("Immediate value " + str(imm) + " is out of range at instruction " + str(i + 1))
    try:
        rs1_bin = register_to_binary(rt)
        rs2_bin = register_to_binary(rs)
        f3 = FUNCT3['TYPE_B'][base_name]
        f3_bin = parse_funct3(f3)
        imm_bin = to_signed_binary(imm, 13)
        opcode = OPCODES[base_name]
        return imm_bin[0] + imm_bin[2:8] + rs2_bin + rs1_bin + f3_bin + imm_bin[8:12] + imm_bin[1] + opcode + "\n"
    except Exception as e:
        raise Exception(str(e) + " at instruction " + str(i + 1))


def encode_pseudo(name, args, i, labels_and_index):
    if name == 'la':
        validate_arg_count(name, args, 2, i)
        validate_commas_2arg(name, args, i)
        rd, symbol = strip_comma(args[0]), strip_comma(args[1])
        if not is_number(symbol):
            raise Exception("Symbol " + symbol + " is not a number at instruction " + str(i + 1))
        if not in_range_32bit(symbol):
            raise Exception("Symbol " + symbol + " is out of range at instruction " + str(i + 1))
        try:
            rd_bin = register_to_binary(rd)
            symbol_bin = to_signed_binary(symbol, 32)
            f3 = FUNCT3['TYPE_I']['addi']
            f3_bin = parse_funct3(f3)
            imm1 = symbol_bin[0:20]
            imm2 = symbol_bin[20:32]
            opcode1 = OPCODES['auipc']
            opcode2 = OPCODES['addi']
            return imm1 + rd_bin + opcode1 + "\n" + imm2 + rd_bin + f3_bin + rd_bin + opcode2 + "\n"
        except Exception as e:
            raise Exception(str(e) + " at instruction " + str(i + 1))

    elif name == 'nop':
        validate_arg_count(name, args, 0, i)
        opcode = OPCODES['addi']
        rd_bin = register_to_binary('zero')
        imm_bin = '000000000000'
        f3_bin = parse_funct3(FUNCT3['TYPE_I']['addi'])
        return imm_bin + rd_bin + f3_bin + rd_bin + opcode + "\n"

    elif name == 'li':
        validate_arg_count(name, args, 2, i)
        validate_commas_2arg(name, args, i)
        rd, imm = strip_comma(args[0]), strip_comma(args[1])
        if not is_number(imm):
            raise Exception("Immediate value " + imm + " is not a number at instruction " + str(i + 1))
        if not in_range_32bit(imm):
            raise Exception("Immediate value " + imm + " is out of range at instruction " + str(i + 1))
        if not in_range_12bit(imm):
            try:
                rd_bin = register_to_binary(rd)
                imm_bin = bin(int(imm))[2:].zfill(32)
                imm1 = imm_bin[0:20]
                imm2 = imm_bin[20:32]
                opcode1 = OPCODES['lui']
                opcode2 = OPCODES['addi']
                f3_bin = parse_funct3(FUNCT3['TYPE_I']['addi'])
                return imm1 + rd_bin + opcode1 + "\n" + imm2 + rd_bin + f3_bin + rd_bin + opcode2 + "\n"
            except Exception as e:
                raise Exception(str(e) + " at instruction " + str(i + 1))
        else:
            try:
                rd_bin = register_to_binary(rd)
                rs1_bin = register_to_binary('zero')
                imm_bin = bin(int(imm))[2:].zfill(12)
                opcode = OPCODES['addi']
                f3_bin = parse_funct3(FUNCT3['TYPE_I']['addi'])
                return imm_bin + rs1_bin + f3_bin + rd_bin + opcode + "\n"
            except Exception as e:
                raise Exception(str(e) + " at instruction " + str(i + 1))

    elif name == 'mv':
        validate_arg_count(name, args, 2, i)
        validate_commas_2arg(name, args, i)
        rd, rs = strip_comma(args[0]), strip_comma(args[1])
        try:
            rd_bin = register_to_binary(rd)
            rs_bin = register_to_binary(rs)
            imm_bin = bin(0)[2:].zfill(12)
            opcode = OPCODES['addi']
            f3_bin = parse_funct3(FUNCT3['TYPE_I']['addi'])
            return imm_bin + rs_bin + f3_bin + rd_bin + opcode + "\n"
        except Exception as e:
            raise Exception(str(e) + " at instruction " + str(i + 1))

    elif name == 'not':
        validate_arg_count(name, args, 2, i)
        validate_commas_2arg(name, args, i)
        rd, rs = strip_comma(args[0]), strip_comma(args[1])
        try:
            rd_bin = register_to_binary(rd)
            rs_bin = register_to_binary(rs)
            imm_bin = twos_complement(bin(1)[2:].zfill(12))
            opcode = OPCODES['xori']
            f3_bin = parse_funct3(FUNCT3['TYPE_I']['xori'])
            return imm_bin + rs_bin + f3_bin + rd_bin + opcode + "\n"
        except Exception as e:
            raise Exception(str(e) + " at instruction " + str(i + 1))

    elif name == 'neg':
        validate_arg_count(name, args, 2, i)
        validate_commas_2arg(name, args, i)
        rd, rs = strip_comma(args[0]), strip_comma(args[1])
        try:
            rd_bin = register_to_binary(rd)
            rs1_bin = register_to_binary('zero')
            rs_bin = register_to_binary(rs)
            f3_bin = parse_funct3(FUNCT3['TYPE_R']['sub'])
            f7_bin = parse_funct7(FUNCT7['TYPE_R']['sub'])
            opcode = OPCODES[name]
            return f7_bin + rs_bin + rs1_bin + f3_bin + rd_bin + opcode + "\n"
        except Exception as e:
            raise Exception(str(e) + " at instruction " + str(i + 1))

    elif name == 'seqz':
        validate_arg_count(name, args, 2, i)
        validate_commas_2arg(name, args, i)
        rd, rs = strip_comma(args[0]), strip_comma(args[1])
        try:
            rd_bin = register_to_binary(rd)
            rs_bin = register_to_binary(rs)
            imm_bin = bin(1)[2:].zfill(12)
            opcode = OPCODES['sltiu']
            f3_bin = parse_funct3(FUNCT3['TYPE_I']['sltiu'])
            return imm_bin + rs_bin + f3_bin + rd_bin + opcode + "\n"
        except Exception as e:
            raise Exception(str(e) + " at instruction " + str(i + 1))

    elif name == 'snez':
        validate_arg_count(name, args, 2, i)
        validate_commas_2arg(name, args, i)
        rd, rs = strip_comma(args[0]), strip_comma(args[1])
        try:
            rd_bin = register_to_binary(rd)
            rs1_bin = register_to_binary('zero')
            rs_bin = register_to_binary(rs)
            f3_bin = parse_funct3(FUNCT3['TYPE_R']['sltu'])
            f7_bin = parse_funct7(FUNCT7['TYPE_R']['sltu'])
            opcode = OPCODES['sltu']
            return f7_bin + rs_bin + rs1_bin + f3_bin + rd_bin + opcode + "\n"
        except Exception as e:
            raise Exception(str(e) + " at instruction " + str(i + 1))

    elif name == 'sltz':
        validate_arg_count(name, args, 2, i)
        validate_commas_2arg(name, args, i)
        rd, rs = strip_comma(args[0]), strip_comma(args[1])
        try:
            rd_bin = register_to_binary(rd)
            rs2_bin = register_to_binary('zero')
            rs_bin = register_to_binary(rs)
            f3_bin = parse_funct3(FUNCT3['TYPE_R']['slt'])
            f7_bin = parse_funct7(FUNCT7['TYPE_R']['slt'])
            opcode = OPCODES['sltu']
            return f7_bin + rs2_bin + rs_bin + f3_bin + rd_bin + opcode + "\n"
        except Exception as e:
            raise Exception(str(e) + " at instruction " + str(i + 1))

    elif name == 'sgtz':
        validate_arg_count(name, args, 2, i)
        validate_commas_2arg(name, args, i)
        rd, rs = strip_comma(args[0]), strip_comma(args[1])
        try:
            rd_bin = register_to_binary(rd)
            rs1_bin = register_to_binary('zero')
            rs_bin = register_to_binary(rs)
            f3_bin = parse_funct3(FUNCT3['TYPE_R']['slt'])
            f7_bin = parse_funct7(FUNCT7['TYPE_R']['slt'])
            opcode = OPCODES['sltu']
            return f7_bin + rs_bin + rs1_bin + f3_bin + rd_bin + opcode + "\n"
        except Exception as e:
            raise Exception(str(e) + " at instruction " + str(i + 1))

    elif name == 'beqz':
        return encode_pseudo_branch_2arg(name, args, i, labels_and_index, 'beq', False)
    elif name == 'bnez':
        return encode_pseudo_branch_2arg(name, args, i, labels_and_index, 'bne', False)
    elif name == 'blez':
        return encode_pseudo_branch_2arg(name, args, i, labels_and_index, 'blz', True)
    elif name == 'bgez':
        return encode_pseudo_branch_2arg(name, args, i, labels_and_index, 'bge', False)
    elif name == 'bltz':
        return encode_pseudo_branch_2arg(name, args, i, labels_and_index, 'blt', False)
    elif name == 'bgtz':
        return encode_pseudo_branch_2arg(name, args, i, labels_and_index, 'blt', True)

    elif name == 'bgt':
        return encode_pseudo_branch_3arg(name, args, i, labels_and_index, 'blt')
    elif name == 'ble':
        return encode_pseudo_branch_3arg(name, args, i, labels_and_index, 'bge')
    elif name == 'bgtu':
        return encode_pseudo_branch_3arg(name, args, i, labels_and_index, 'bltu')
    elif name == 'bleu':
        return encode_pseudo_branch_3arg(name, args, i, labels_and_index, 'bgeu')

    elif name == 'j':
        if len(args) != 1:
            raise Exception("Instruction " + name + " requires 1 argument at instruction " + str(i + 1))
        if has_trailing_comma(args[0]):
            raise Exception("Instruction " + name + " has a trailing comma at instruction " + str(i + 1))
        label = args[0]
        imm = find_label_index(labels_and_index, label) * 4
        if not is_number(str(imm)):
            raise Exception("Immediate value " + str(imm) + " is not a number at instruction " + str(i + 1))
        if not in_range_21bit(imm):
            raise Exception("Immediate value " + str(imm) + " is out of range at instruction " + str(i + 1))
        try:
            imm_bin = bin(int(imm))[2:].zfill(32)
            rd_bin = register_to_binary('zero')
            opcode = OPCODES['jal']
            return imm_bin[0] + imm_bin[10:20] + imm_bin[9] + imm_bin[1:9] + rd_bin + opcode + "\n"
        except Exception as e:
            raise Exception(str(e) + " at instruction " + str(i + 1))

    elif name == 'jr':
        if len(args) != 1:
            raise Exception("Instruction " + name + " requires 1 argument at instruction " + str(i + 1))
        if has_trailing_comma(args[0]):
            raise Exception("Instruction " + name + " has a trailing comma at instruction " + str(i + 1))
        rs = args[0]
        try:
            rd_bin = register_to_binary('zero')
            rs1_bin = register_to_binary(rs)
            f3_bin = parse_funct3(FUNCT3['TYPE_I']['jalr'])
            imm_bin = bin(0)[2:].zfill(12)
            opcode = OPCODES['jalr']
            return imm_bin + rs1_bin + f3_bin + rd_bin + opcode + "\n"
        except Exception as e:
            raise Exception(str(e) + " at instruction " + str(i + 1))

    elif name == 'ret':
        if len(args) != 0:
            raise Exception("Instruction " + name + " requires 0 arguments at instruction " + str(i + 1))
        try:
            rd_bin = register_to_binary('zero')
            rs1_bin = register_to_binary('x1')
            f3_bin = parse_funct3(FUNCT3['TYPE_I']['jalr'])
            imm_bin = bin(0)[2:].zfill(12)
            opcode = OPCODES['jalr']
            return imm_bin + rs1_bin + f3_bin + rd_bin + opcode + "\n"
        except Exception as e:
            raise Exception(str(e) + " at instruction " + str(i + 1))

    elif name == 'call':
        if len(args) != 1:
            raise Exception("Instruction " + name + " requires 1 argument at instruction " + str(i + 1))
        if has_trailing_comma(args[0]):
            raise Exception("Instruction " + name + " has a trailing comma at instruction " + str(i + 1))
        offset = args[0]
        imm = (find_label_index(labels_and_index, offset) - i) * 4
        if not is_number(str(imm)):
            raise Exception("imm " + str(imm) + " is not a number at instruction " + str(i + 1))
        if not in_range_32bit(imm):
            raise Exception("imm " + str(imm) + " is out of range at instruction " + str(i + 1))
        if not in_range_12bit(imm):
            try:
                rd_bin = register_to_binary('x1')
                rs1_bin = register_to_binary('x1')
                imm_bin = to_signed_binary(imm, 32)
                f3_bin = parse_funct3(FUNCT3['TYPE_I']['jalr'])
                imm1 = imm_bin[12:32]
                imm2 = imm_bin[0:12]
                opcode1 = OPCODES['auipc']
                opcode2 = OPCODES['jalr']
                return imm1 + rd_bin + opcode1 + "\n" + imm2 + rs1_bin + f3_bin + rd_bin + opcode2 + "\n"
            except Exception as e:
                raise Exception(str(e) + " at instruction " + str(i + 1))
        else:
            try:
                rd_bin = register_to_binary('x1')
                rs1_bin = register_to_binary('x1')
                imm_bin = to_signed_binary(imm, 32)
                f3_bin = parse_funct3(FUNCT3['TYPE_I']['jalr'])
                imm1 = bin(0)[2:].zfill(20)
                imm2 = imm_bin[20:32]
                opcode1 = OPCODES['auipc']
                opcode2 = OPCODES['jalr']
                return imm1 + rd_bin + opcode1 + "\n" + imm2 + rs1_bin + f3_bin + rd_bin + opcode2 + "\n"
            except Exception as e:
                raise Exception(str(e) + " at instruction " + str(i + 1))

    elif name == 'tail':
        if len(args) != 1:
            raise Exception("Instruction " + name + " requires 1 argument at instruction " + str(i + 1))
        if has_trailing_comma(args[0]):
            raise Exception("Instruction " + name + " has a trailing comma at instruction " + str(i + 1))
        offset = args[0]
        imm = (find_label_index(labels_and_index, offset) - i) * 4
        if not is_number(str(imm)):
            raise Exception("imm " + str(imm) + " is not a number at instruction " + str(i + 1))
        if not in_range_32bit(imm):
            raise Exception("imm " + str(imm) + " is out of range at instruction " + str(i + 1))
        if not in_range_12bit(imm):
            try:
                rd_bin1 = register_to_binary('x6')
                rd_bin2 = register_to_binary('x0')
                rs1_bin = register_to_binary('x6')
                imm_bin = to_signed_binary(imm, 32)
                f3_bin = parse_funct3(FUNCT3['TYPE_I']['jalr'])
                imm1 = imm_bin[12:32]
                imm2 = imm_bin[0:12]
                opcode1 = OPCODES['auipc']
                opcode2 = OPCODES['jalr']
                return imm1 + rd_bin1 + opcode1 + "\n" + imm2 + rs1_bin + f3_bin + rd_bin2 + opcode2 + "\n"
            except Exception as e:
                raise Exception(str(e) + " at instruction " + str(i + 1))
        else:
            try:
                rd_bin1 = register_to_binary('x6')
                rd_bin2 = register_to_binary('x0')
                rs1_bin = register_to_binary('x6')
                imm_bin = to_signed_binary(imm, 32)
                f3_bin = parse_funct3(FUNCT3['TYPE_I']['jalr'])
                imm1 = bin(0)[2:].zfill(20)
                imm2 = imm_bin[20:32]
                opcode1 = OPCODES['auipc']
                opcode2 = OPCODES['jalr']
                return imm1 + rd_bin1 + opcode1 + "\n" + imm2 + rs1_bin + f3_bin + rd_bin2 + opcode2 + "\n"
            except Exception as e:
                raise Exception(str(e) + " at instruction " + str(i + 1))

    return ''


def encode_type_r(name, args, i):
    validate_arg_count(name, args, 3, i)
    validate_commas_3arg(name, args, i)
    rd, rs1, rs2 = strip_comma(args[0]), strip_comma(args[1]), strip_comma(args[2])
    try:
        rd_bin = register_to_binary(rd)
        rs1_bin = register_to_binary(rs1)
        rs2_bin = register_to_binary(rs2)
        f3 = FUNCT3['TYPE_R'][name]
        f7 = FUNCT7['TYPE_R'][name]
        f3_bin = parse_funct3(f3)
        f7_bin = parse_funct7(f7)
        opcode = OPCODES[name]
        return f7_bin + rs2_bin + rs1_bin + f3_bin + rd_bin + opcode + "\n"
    except Exception as e:
        raise Exception(str(e) + " at instruction " + str(i + 1))


def encode_type_i(name, typ, args, i, labels_and_index):
    if name in ['lh', 'lw', 'lb'] and not is_offset_format(strip_comma(args[1]) if len(args) > 1 else ''):
        validate_arg_count(name, args, 2, i)
        validate_commas_2arg(name, args, i)
        rd, symbol = strip_comma(args[0]), strip_comma(args[1])
        if not is_number(symbol):
            raise Exception("Symbol " + symbol + " is not a number at instruction " + str(i + 1))
        if not in_range_32bit(symbol):
            raise Exception("Symbol " + symbol + " is out of range at instruction " + str(i + 1))
        try:
            rd_bin = register_to_binary(rd)
            symbol_bin = to_signed_binary(symbol, 32)
            f3 = FUNCT3[typ][name]
            f3_bin = parse_funct3(f3)
            imm1 = symbol_bin[0:12]
            imm2 = symbol_bin[12:32]
            opcode1 = OPCODES['auipc']
            opcode2 = OPCODES[name]
            return imm1 + rd_bin + opcode1 + "\n" + imm2 + rd_bin + f3_bin + rd_bin + opcode2 + "\n"
        except Exception as e:
            raise Exception(str(e) + " at instruction " + str(i + 1))

    elif name in ['ecall', 'ebreak']:
        if len(args) != 0:
            raise Exception("Instruction " + name + " requires 1 argument at instruction " + str(i + 1))
        opcode = OPCODES[name]
        if name == 'ecall':
            return '0000000000000000000000000' + opcode + "\n"
        else:
            return '0000000000010000000000000' + opcode + "\n"

    elif name in ['lw', 'lb', 'lh', 'lbu', 'lhu']:
        validate_arg_count(name, args, 2, i)
        validate_commas_2arg(name, args, i)
        rd, offset = strip_comma(args[0]), strip_comma(args[1])
        if not is_offset_format(offset):
            raise Exception("Offset " + offset + " is not in the correct format at instruction " + str(i + 1))
        imm, rs1 = parse_offset(offset)
        if not is_number(imm):
            raise Exception("Immediate value " + imm + " is not a number at instruction " + str(i + 1))
        if not in_range_12bit(imm):
            raise Exception("Immediate value " + imm + " is out of range at instruction " + str(i + 1))
        try:
            rd_bin = register_to_binary(rd)
            rs1_bin = register_to_binary(rs1)
            f3 = FUNCT3[typ][name]
            f3_bin = parse_funct3(f3)
            imm_bin = to_signed_binary(imm, 12)
            opcode = OPCODES[name]
            return imm_bin + rs1_bin + f3_bin + rd_bin + opcode + "\n"
        except Exception as e:
            raise Exception(str(e) + " at instruction " + str(i + 1))

    elif name == 'jalr':
        if len(args) == 1:
            if has_trailing_comma(args[0]):
                raise Exception("Instruction " + name + " has a trailing comma at instruction " + str(i + 1))
            rs = args[0]
            try:
                rd_bin = register_to_binary('x1')
                rs1_bin = register_to_binary(rs)
                f3 = FUNCT3[typ][name]
                f3_bin = parse_funct3(f3)
                imm_bin = bin(0)[2:].zfill(12)
                opcode = OPCODES[name]
                return imm_bin + rs1_bin + f3_bin + rd_bin + opcode + "\n"
            except Exception as e:
                raise Exception(str(e) + " at instruction " + str(i + 1))
        else:
            validate_arg_count(name, args, 2, i)
            validate_commas_2arg(name, args, i)
            rd, offset = strip_comma(args[0]), strip_comma(args[1])
            if not is_offset_format(offset):
                raise Exception("Offset " + offset + " is not in the correct format at instruction " + str(i + 1))
            imm, rs1 = parse_offset(offset)
            if not is_number(imm):
                raise Exception("Immediate value " + imm + " is not a number at instruction " + str(i + 1))
            if not in_range_12bit(imm):
                raise Exception("Immediate value " + imm + " is out of range at instruction " + str(i + 1))
            try:
                rd_bin = register_to_binary(rd)
                rs1_bin = register_to_binary(rs1)
                f3 = FUNCT3[typ][name]
                f3_bin = parse_funct3(f3)
                imm_bin = to_signed_binary(imm, 12)
                opcode = OPCODES[name]
                return imm_bin + rs1_bin + f3_bin + rd_bin + opcode + "\n"
            except Exception as e:
                raise Exception(str(e) + " at instruction " + str(i + 1))

    else:
        validate_arg_count(name, args, 3, i)
        validate_commas_3arg(name, args, i)
        if name in ['slli', 'srli', 'srai']:
            rd, rs1, imm = strip_comma(args[0]), strip_comma(args[1]), strip_comma(args[2])
            if not is_number(imm):
                raise Exception("Immediate value " + imm + " is not a number at instruction " + str(i + 1))
            if not in_range_5bit(imm):
                raise Exception("Immediate value " + imm + " is out of range at instruction " + str(i + 1))
            try:
                rd_bin = register_to_binary(rd)
                rs1_bin = register_to_binary(rs1)
                f3 = FUNCT3[typ][name]
                f3_bin = parse_funct3(f3)
                imm_bin = bin(int(imm))[2:].zfill(5)
                opcode1 = OPCODES['auipc']
                opcode2 = OPCODES[name]
                if name == 'srai':
                    return '0100000' + imm_bin + rs1_bin + f3_bin + rd_bin + opcode1 + "\n"
                else:
                    return '0000000' + imm_bin + rs1_bin + f3_bin + rd_bin + opcode2 + "\n"
            except Exception as e:
                raise Exception(str(e) + " at instruction " + str(i + 1))
        else:
            rd, rs1, imm = strip_comma(args[0]), strip_comma(args[1]), strip_comma(args[2])
            if not is_number(imm):
                raise Exception("Immediate value " + imm + " is not a number at instruction " + str(i + 1))
            if not in_range_12bit(imm):
                raise Exception("Immediate value " + imm + " is out of range at instruction " + str(i + 1))
            try:
                rd_bin = register_to_binary(rd)
                rs1_bin = register_to_binary(rs1)
                f3 = FUNCT3[typ][name]
                f3_bin = parse_funct3(f3)
                imm_bin = to_signed_binary(imm, 12)
                opcode = OPCODES[name]
                return imm_bin + rs1_bin + f3_bin + rd_bin + opcode + "\n"
            except Exception as e:
                raise Exception(str(e) + " at instruction " + str(i + 1))


def encode_type_s(name, typ, args, i):
    if name in ['sb', 'sh', 'sw'] and len(args) > 1 and not is_offset_format(strip_comma(args[1])):
        validate_arg_count(name, args, 3, i)
        validate_commas_3arg(name, args, i)
        rd, symbol, rt = strip_comma(args[0]), strip_comma(args[1]), strip_comma(args[2])
        if not is_number(symbol):
            raise Exception("Symbol " + symbol + " is not a number at instruction " + str(i + 1))
        if not in_range_32bit(symbol):
            raise Exception("Symbol " + symbol + " is out of range at instruction " + str(i + 1))
        try:
            rd_bin = register_to_binary(rd)
            rt_bin = register_to_binary(rt)
            symbol_bin = to_signed_binary(symbol, 32)
            f3 = FUNCT3[typ][name]
            f3_bin = parse_funct3(f3)
            imm1 = symbol_bin[0:12]
            imm2 = symbol_bin[12:32]
            opcode1 = OPCODES['auipc']
            opcode2 = OPCODES[name]
            return imm1 + rt_bin + opcode1 + "\n" + imm2[0:7] + rd_bin + rt_bin + f3_bin + imm2[7:12] + opcode2 + "\n"
        except Exception as e:
            raise Exception(str(e) + " at instruction " + str(i + 1))
    else:
        validate_arg_count(name, args, 2, i)
        validate_commas_2arg(name, args, i)
        rs2, offset = strip_comma(args[0]), strip_comma(args[1])
        if not is_offset_format(offset):
            raise Exception("Offset " + offset + " is not in the correct format at instruction " + str(i + 1))
        imm, rs1 = parse_offset(offset)
        if not is_number(imm):
            raise Exception("Immediate value " + imm + " is not a number at instruction " + str(i + 1))
        if not in_range_12bit(imm):
            raise Exception("Immediate value " + imm + " is out of range at instruction " + str(i + 1))
        try:
            rs2_bin = register_to_binary(rs2)
            rs1_bin = register_to_binary(rs1)
            f3 = FUNCT3[typ][name]
            f3_bin = parse_funct3(f3)
            imm_bin = to_signed_binary(imm, 12)
            opcode = OPCODES[name]
            return imm_bin[0:7] + rs2_bin + rs1_bin + f3_bin + imm_bin[7:12] + opcode + "\n"
        except Exception as e:
            raise Exception(str(e) + " at instruction " + str(i + 1))


def encode_type_b(name, typ, args, i, labels_and_index):
    validate_arg_count(name, args, 3, i)
    validate_commas_3arg(name, args, i)
    rs1, rs2, label = strip_comma(args[0]), strip_comma(args[1]), strip_comma(args[2])
    imm = (find_label_index(labels_and_index, label) - i) * 4
    if not is_number(str(imm)):
        raise Exception("Immediate value " + str(imm) + " is not a number at instruction " + str(i + 1))
    if not in_range_13bit(imm):
        raise Exception("Immediate value " + str(imm) + " is out of range at instruction " + str(i + 1))
    try:
        rs1_bin = register_to_binary(rs1)
        rs2_bin = register_to_binary(rs2)
        f3 = FUNCT3[typ][name]
        f3_bin = parse_funct3(f3)
        imm_bin = to_signed_binary(imm, 13)
        opcode = OPCODES[name]
        return imm_bin[0] + imm_bin[2:8] + rs2_bin + rs1_bin + f3_bin + imm_bin[8:12] + imm_bin[1] + opcode + "\n"
    except Exception as e:
        raise Exception(str(e) + " at instruction " + str(i + 1))


def encode_type_u(name, typ, args, i):
    validate_arg_count(name, args, 2, i)
    validate_commas_2arg(name, args, i)
    rd, imm = strip_comma(args[0]), strip_comma(args[1])
    if not is_number(imm):
        raise Exception("Immediate value " + imm + " is not a number at instruction " + str(i + 1))
    if not in_range_20bit(imm):
        raise Exception("Immediate value " + imm + " is out of range at instruction " + str(i + 1))
    try:
        rd_bin = register_to_binary(rd)
        imm_bin = bin(int(imm))[2:].zfill(20)
        opcode = OPCODES[name]
        return imm_bin + rd_bin + opcode + "\n"
    except Exception as e:
        raise Exception(str(e) + " at instruction " + str(i + 1))


def encode_type_j(name, typ, args, i, labels_and_index):
    if len(args) == 1:
        if has_trailing_comma(args[0]):
            raise Exception("Instruction " + name + " has a trailing comma at instruction " + str(i + 1))
        label = args[0]
        imm = (find_label_index(labels_and_index, label) - i) * 4
        if not is_number(str(imm)):
            raise Exception("Immediate value " + str(imm) + " is not a number at instruction " + str(i + 1))
        if not in_range_21bit(imm):
            raise Exception("Immediate value " + str(imm) + " is out of range at instruction " + str(i + 1))
        try:
            rd_bin = register_to_binary('x1')
            imm_bin = to_signed_binary(imm, 21)
            opcode = OPCODES[name]
            return imm_bin[0] + imm_bin[10:20] + imm_bin[9] + imm_bin[1:9] + rd_bin + opcode + "\n"
        except Exception as e:
            raise Exception(str(e) + " at instruction " + str(i + 1))
    else:
        if len(args) != 2:
            raise Exception("Instruction " + name + " requires 1 or 2 arguments at instruction " + str(i + 1))
        validate_commas_2arg(name, args, i)
        rd, label = strip_comma(args[0]), strip_comma(args[1])
        imm = (find_label_index(labels_and_index, label) - i) * 4
        if not is_number(str(imm)):
            raise Exception("Immediate value " + str(imm) + " is not a number at instruction " + str(i + 1))
        if not in_range_21bit(imm):
            raise Exception("Immediate value " + str(imm) + " is out of range at instruction " + str(i + 1))
        try:
            rd_bin = register_to_binary(rd)
            imm_bin = to_signed_binary(imm, 21)
            opcode = OPCODES[name]
            return imm_bin[0] + imm_bin[10:20] + imm_bin[9] + imm_bin[1:9] + rd_bin + opcode + "\n"
        except Exception as e:
            raise Exception(str(e) + " at instruction " + str(i + 1))


def generate(instructions, labels_and_index):
    bin_output = ''
    for i, instruction in enumerate(instructions):
        name, args = instruction.split()[0], instruction.split()[1:]
        typ = find_type(name)

        if not typ:
            if name not in PSEUDO_INSTRUCTIONS:
                raise Exception("Instruction " + name + " does not exist in the instruction set at instruction " + str(i + 1))
            bin_output += encode_pseudo(name, args, i, labels_and_index)
            continue

        if typ == 'TYPE_R':
            bin_output += encode_type_r(name, args, i)
        elif typ == 'TYPE_I':
            bin_output += encode_type_i(name, typ, args, i, labels_and_index)
        elif typ == 'TYPE_S':
            bin_output += encode_type_s(name, typ, args, i)
        elif typ == 'TYPE_B':
            bin_output += encode_type_b(name, typ, args, i, labels_and_index)
        elif typ == 'TYPE_U':
            bin_output += encode_type_u(name, typ, args, i)
        elif typ == 'TYPE_J':
            bin_output += encode_type_j(name, typ, args, i, labels_and_index)

    return bin_output
