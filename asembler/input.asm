_Z6squarei:
        li x2, 12333                        # @_Z6squarei
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
        addi    sp, sp, -32
        sw      ra, 28(sp)                      # 4-byte Folded Spill
        sw      s0, 24(sp)                      # 4-byte Folded Spill
        addi    s0, sp, 32
        mv      a0, zero
        sw      a0, -12(s0)
        addi    a0, zero, 3
        sw      a0, -16(s0)
        lw      a0, -16(s0)
        call    _Z6squarei
        sw      a0, -20(s0)
        lw      a0, -20(s0)
        lw      s0, 24(sp)                      # 4-byte Folded Reload
        lw      ra, 28(sp)                      # 4-byte Folded Reload
        addi    sp, sp, 32
        ret