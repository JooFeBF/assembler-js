_start:
        li      sp, 512
        jal     main
inf_loop:
        beq     a0, a0, inf_loop

main:
        addi    sp, sp, -32
        sw      ra, 28(sp)
        sw      s0, 24(sp)
        addi    s0, sp, 32
        addi    a0, zero, 6       # Calculate fib(6) = 8
        call    fibonacci
        addi    a1, zero, 8       # Expected result
        beq     a0, a1, success
        addi    a0, zero, 1       # Error code
        lw      ra, 28(sp)
        lw      s0, 24(sp)
        addi    sp, sp, 32
        ret

success:
        addi    a0, zero, 42      # Success code
        lw      ra, 28(sp)
        lw      s0, 24(sp)
        addi    sp, sp, 32
        ret

fibonacci:
        addi    sp, sp, -16
        sw      ra, 12(sp)
        sw      s0, 8(sp)
        addi    s0, sp, 16
        sw      a0, -12(s0)
        
        # Base case: if n <= 1, return n
        lw      a0, -12(s0)
        addi    a1, zero, 1
        bge     a1, a0, base_case
        
        # Recursive case: fib(n-1) + fib(n-2)
        lw      a0, -12(s0)
        addi    a0, a0, -1
        call    fibonacci
        sw      a0, -16(s0)        # Save fib(n-1)
        
        lw      a0, -12(s0)
        addi    a0, a0, -2
        call    fibonacci          # Calculate fib(n-2)
        
        lw      a1, -16(s0)        # Load fib(n-1)
        add     a0, a1, a0         # fib(n-1) + fib(n-2)
        
        lw      s0, 8(sp)
        lw      ra, 12(sp)
        addi    sp, sp, 16
        ret

base_case:
        lw      a0, -12(s0)        # Return n
        lw      s0, 8(sp)
        lw      ra, 12(sp)
        addi    sp, sp, 16
        ret