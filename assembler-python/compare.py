import sys

def bin_to_hex(binary_str):
    binary_str = binary_str.strip()
    if not binary_str: return None
    hex_str = f"{int(binary_str, 2):08x}"
    return hex_str

with open('../test_out.bin', 'r') as f:
    py_out = [bin_to_hex(line) for line in f.readlines() if line.strip()]

import subprocess
out = subprocess.check_output("riscv64-elf-objdump -d ../ref.o", shell=True).decode('utf-8')

ref_out = []
for line in out.split('\n'):
    parts = line.split('\t')
    if len(parts) > 1 and parts[0].strip().endswith(':'):
        hex_code = parts[1].strip().split()[0]
        if len(hex_code) == 8:
            ref_out.append(hex_code)

if len(py_out) != len(ref_out):
    print(f"Length mismatch! Python: {len(py_out)}, Ref: {len(ref_out)}")

failures = 0
for i, (py, ref) in enumerate(zip(py_out, ref_out)):
    if py != ref:
        print(f"Line {i}: Python {py} != Ref {ref}")
        failures += 1

if failures == 0:
    print("100% exact match!")
else:
    print(f"{failures} differences found.")
