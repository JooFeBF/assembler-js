import re


def read_source(filepath):
    with open(filepath, 'r') as f:
        data = f.read()
    return data


def extract_lines(data):
    return re.findall(r'[^\s][^\r\n#;]+[^\r\n#; ]', data)


def is_label(line):
    return line.endswith(':')


def is_instruction(line):
    return not line.startswith('.') and ':' not in line


def validate_label(line, line_number):
    name = line[:-1]
    if not name:
        raise Exception("Invalid label " + line + " at line " + str(line_number))
    first = name[0]
    if not (first.isalpha() or first == '_' or first == '.'):
        raise Exception("Invalid label " + line + " at line " + str(line_number))
    for ch in name[1:]:
        if not (ch.isalpha() or ch.isdigit() or ch == '_'):
            raise Exception("Invalid label " + line + " at line " + str(line_number))


def filter_comments(lines):
    result = []
    for line in lines:
        if not line.startswith('#') and not line.startswith(';'):
            result.append(line)
    return result


def separate_labels_and_instructions(lines):
    instructions = []
    for line in lines:
        if is_instruction(line):
            instructions.append(line)

    labels_and_index = []
    seen_labels = {}
    for i, line in enumerate(lines):
        if is_label(line):
            validate_label(line, i + 1)
            label_name = line[:-1]
            if label_name in seen_labels:
                raise Exception("Label " + label_name + " is defined more than once")
            seen_labels[label_name] = True
            next_idx = i + 1
            if next_idx < len(lines) and lines[next_idx] in instructions:
                label_index = instructions.index(lines[next_idx])
                labels_and_index.append([label_name, label_index])

    return instructions, labels_and_index


def parse_instruction(line):
    parts = line.split()
    name = parts[0]
    args = parts[1:]
    return name, args
