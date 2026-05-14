_start:
        lui     sp, 65536
        addi    sp, sp, 508
        call    main
        
inf_loop:
        beq     a0, a0, inf_loop

main:
        addi    sp, sp, -32
        sw      ra, 28(sp)
        sw      s0, 24(sp)
        addi    s0, sp, 32
        addi    a0, zero, 10
        call    fibonacci
        addi    a1, zero, 55
        beq     a0, a1, success
        addi    a0, zero, 1
        lw      ra, 28(sp)
        lw      s0, 24(sp)
        addi    sp, sp, 32
        ret

success:
        addi    a0, zero, 42
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
        lw      a0, -12(s0)
        addi    a1, zero, 1
        bge     a1, a0, base_case
        lw      a0, -12(s0)
        addi    a0, a0, -1
        call    fibonacci
        sw      a0, -16(s0)
        lw      a0, -12(s0)
        addi    a0, a0, -2
        call    fibonacci
        lw      a1, -16(s0)
        add     a0, a1, a0
        lw      s0, 8(sp)
        lw      ra, 12(sp)
        addi    sp, sp, 16
        ret

base_case:
        lw      a0, -12(s0)
        lw      s0, 8(sp)
        lw      ra, 12(sp)
        addi    sp, sp, 16
        ret