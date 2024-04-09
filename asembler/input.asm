main:                       ; primera etiqueta
    addi x4, zero, 520      ; primera instrucción
    addi x5, zero, 1550     ; segunda instrucción
    beq x4, x5, label1      ; tercera instrucción
    addi x6, zero, 80       ; cuarta instrucción
    beq zero, zero, label2  ; quinta instrucción
    

label1:                     ; segunda etiqueta
    addi x6, zero, 100      ; sexta instrucción

label2:                     ; tercera etiqueta
    add zero, zero, zero    ; séptima instrucción