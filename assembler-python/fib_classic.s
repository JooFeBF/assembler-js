# Classic Fibonacci program for RISC-V RV32I
# Calculates fibonacci(10) = 55 and returns 42 for success

_start:
    lui sp, 65536           # sp = 0x10000000  
    addi sp, sp, 1020       # sp = 0x100003fc (top of stack)
    call main               # Call main function

inf_loop:
    beq a0, a0, inf_loop    # Infinite loop when done

fibonacci:
    li a5, 1                # a5 = 1
    bge a5, a0, fib_return  # if n <= 1, return n
    addi sp, sp, -32        # Allocate stack frame
    sw s4, 8(sp)            # Save s4
    addi s4, a0, -2         # s4 = n-2
    sw s3, 12(sp)           # Save s3
    andi a5, s4, -2         # a5 = (n-2) & ~1
    addi s3, a0, -3         # s3 = n-3
    sw s0, 24(sp)           # Save s0
    sw s1, 20(sp)           # Save s1
    sw s2, 16(sp)           # Save s2
    sw ra, 28(sp)           # Save return address
    mv s1, a0               # s1 = n
    sub s3, s3, a5          # s3 = (n-3) - ((n-2) & ~1)
    addi s0, a0, -1         # s0 = n-1
    li s2, 0                # s2 = 0 (accumulator)

fib_loop:
    mv a0,s0                # a0 = current argument
    jal fibonacci           # Recursive call
    addi s0,s0,-2           # s0 -= 2
    add s2,s2,a0            # s2 += result
    bne s0,s3,fib_loop      # Continue loop

    lw ra,28(sp)            # Restore ra
    lw s0,24(sp)            # Restore s0
    andi s1,s1,-2           # s1 = n & ~1
    addi s1,s1,-2           # s1 = (n & ~1) - 2
    sub s4,s4,s1            # s4 = (n-2) - ((n & ~1) - 2)
    add a0,s4,s2            # a0 = s4 + s2
    lw s1,20(sp)            # Restore s1
    lw s2,16(sp)            # Restore s2
    lw s3,12(sp)            # Restore s3
    lw s4,8(sp)             # Restore s4
    addi sp,sp,32           # Deallocate stack frame
    ret                     # Return

fib_return:
    ret                     # Return n (when n <= 1)

main:
    addi sp,sp,-16          # Allocate stack frame
    li a0,10                # a0 = 10 (argument for fibonacci)
    sw ra,12(sp)            # Save return address
    jal fibonacci           # Call fibonacci(10)
    li a5,55                # a5 = 55 (expected result)
    beq a0,a5,success       # If result == 55, success
    li a0,1                 # a0 = 1 (failure code)
    lw ra,12(sp)            # Restore ra
    addi sp,sp,16           # Deallocate stack frame
    ret                     # Return

success:
    li a0,42                # a0 = 42 (success code)
    j main+28               # Jump to return sequence