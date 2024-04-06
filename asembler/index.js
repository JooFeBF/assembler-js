const fs = require('node:fs')
const { argv } = process

const input = argv[3]
const output = argv[5]

const data = fs.readFileSync(input, 'utf8')

const lines = data.match(/[^\s][^\r\n#;]+([^\r\n#; ])/g)

const linesWithoutComments = lines.filter((line) => (/^[^#;]+/).test(line))

console.log(linesWithoutComments)
