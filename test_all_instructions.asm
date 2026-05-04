_start:
    # I-Type Edge Immediates (-2048, 2047, -1, 0, 1)
    addi a0, a1, -2048
    addi a0, a1, 2047
    addi a0, a1, -1
    xori a0, a1, -2048
    ori a0, a1, 2047
    andi a0, a1, -1
    
    # Load Edge (-2048, 2047, 0)
    lb a0, -2048(a1)
    lh a0, 2047(a1)
    lw a0, -1(a1)
    lbu a0, 0(a1)
    lhu a0, 4(a1)
    
    # Store Edge (-2048, 2047, -1)
    sb a0, -2048(a1)
    sh a0, 2047(a1)
    sw a0, -1(a1)
    
    # U-Type Edge (0, 1048575)
    lui a0, 1048575
    lui a0, 0
    auipc a0, 524288
    
    # Pseudo-Instructions
    nop
    mv a0, a1
    not a0, a1
    neg a0, a1
    seqz a0, a1
    snez a0, a1
    sltz a0, a1
    sgtz a0, a1
    beqz a0, fw1
    bnez a0, fw1
    blez a0, fw1
    bgez a0, fw1
    bltz a0, fw1
    bgtz a0, fw1
    bgt a0, a1, fw1
    ble a0, a1, fw1
    bgtu a0, a1, fw1
    bleu a0, a1, fw1
    
    j fw1
    jr a0
    ret
    
fw1:
    addi a0, a0, 1
