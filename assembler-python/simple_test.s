_start:
        lui     sp, 65536
        addi    sp, sp, 508
        call    main
        
inf_loop:
        beq     a0, a0, inf_loop

main:
        addi    a0, zero, 42
        ret