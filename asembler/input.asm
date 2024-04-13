squareint:                             # @square(int)
        addi    sp, sp, -16
        sw      ra, 12(sp)                      # 4-byte Folded Spill
        sw      s0, 8(sp)                       # 4-byte Folded Spill
        addi    s0, sp, 16
        sw      a0, -12(s0)
        addi    a0, zero, 23
        sw      a0, -16(s0)
        lw      a0, -12(s0)
        mul     a0, a0, a0
        lw      a1, -16(s0)
        add     a0, a0, a1
        lw      s0, 8(sp)                       # 4-byte Folded Reload
        lw      ra, 12(sp)                      # 4-byte Folded Reload
        addi    sp, sp, 16
        ret
main:                                   # @main
        addi    sp, sp, -16
        sw      ra, 12(sp)                      # 4-byte Folded Spill
        sw      s0, 8(sp)                       # 4-byte Folded Spill
        addi    s0, sp, 16
        addi    a0, zero, 3
        sw      a0, -12(s0)
        lw      a0, -12(s0)
        call    squareint
        sw      a0, -16(s0)
        mv      a0, zero
        lw      s0, 8(sp)                       # 4-byte Folded Reload
        lw      ra, 12(sp)                      # 4-byte Folded Reload
        addi    sp, sp, 16
        ret