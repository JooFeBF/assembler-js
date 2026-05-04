from constants import ABI_REGISTERS


def register_to_binary(register):
    valid_x_regs = ['x' + str(i) for i in range(32)]
    valid_abi_names = list(ABI_REGISTERS.keys())

    if register in valid_x_regs:
        num = int(register[1:])
        return bin(num)[2:].zfill(5)
    elif register in valid_abi_names:
        x_reg = ABI_REGISTERS[register]
        num = int(x_reg[1:])
        return bin(num)[2:].zfill(5)
    else:
        raise Exception("Invalid register " + register)


def twos_complement(binary):
    flipped = []
    for bit in binary:
        flipped.append('1' if bit == '0' else '0')
    for i in range(len(flipped) - 1, -1, -1):
        if flipped[i] == '1':
            flipped[i] = '0'
        else:
            flipped[i] = '1'
            break
    return ''.join(flipped)


def to_signed_binary(value, width):
    n = int(value)
    if n < 0:
        return twos_complement(bin(abs(n))[2:].zfill(width))
    return bin(n)[2:].zfill(width)


def parse_funct3(hex_str):
    return bin(int(hex_str, 16))[2:].zfill(3)

def parse_funct7(hex_str):
    return bin(int(hex_str, 16))[2:].zfill(7)


def is_number(s):
    if not s:
        return False
    start = 1 if s[0] == '-' else 0
    if start >= len(s):
        return False
    for ch in s[start:]:
        if not ch.isdigit():
            return False
    return True


def in_signed_range(value, bits):
    n = int(value)
    return -(2 ** (bits - 1)) <= n <= (2 ** (bits - 1)) - 1


def in_range_12bit(value):
    n = int(value)
    return -2048 <= n <= 2047


def in_range_13bit(value):
    n = int(value)
    return -4096 <= n <= 4095


def in_range_21bit(value):
    n = int(value)
    return -1048576 <= n <= 1048575


def in_range_20bit(value):
    n = int(value)
    return -524288 <= n <= 1048575


def in_range_32bit(value):
    n = int(value)
    return -2147483648 <= n <= 2147483647


def in_range_5bit(value):
    n = int(value)
    return 0 <= n <= 31


def is_offset_format(s):
    paren_open = s.find('(')
    if paren_open < 1:
        return False
    if not s.endswith(')'):
        return False
    num_part = s[:paren_open]
    if not is_number(num_part):
        return False
    reg_part = s[paren_open + 1:-1]
    if not reg_part or ' ' in reg_part:
        return False
    return True


def parse_offset(s):
    paren_open = s.find('(')
    imm = s[:paren_open]
    reg = s[paren_open + 1:-1]
    return imm, reg


def has_trailing_comma(arg):
    return arg.endswith(',') and len(arg) > 1


def strip_comma(arg):
    if arg.endswith(','):
        return arg[:-1]
    return arg
