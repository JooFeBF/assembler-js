import sys
from parser import read_source, extract_lines, filter_comments, separate_labels_and_instructions
from codegen import generate
from emitter import write_output

input_file = sys.argv[sys.argv.index('-i') + 1]
output_file = sys.argv[sys.argv.index('-o') + 1]

data = read_source(input_file)
lines = extract_lines(data)
lines_without_comments = filter_comments(lines)
instructions, labels_and_index = separate_labels_and_instructions(lines_without_comments)
bin_output = generate(instructions, labels_and_index)
write_output(output_file, bin_output)
