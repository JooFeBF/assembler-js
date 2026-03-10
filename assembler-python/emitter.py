def bin_to_hex(bin_output):
    lines = bin_output.split("\n")
    hex_lines = []
    for line in lines:
        if line:
            hex_lines.append(hex(int(line, 2))[2:].zfill(8))
    return "\n".join(hex_lines)


def write_output(filepath, bin_output):
    if filepath.endswith('.hex'):
        content = bin_to_hex(bin_output)
        with open(filepath, 'w') as f:
            f.write(content)
    elif filepath.endswith('.bin'):
        with open(filepath, 'w') as f:
            f.write(bin_output)
    else:
        raise Exception('Output file must be a .hex or .bin file')
