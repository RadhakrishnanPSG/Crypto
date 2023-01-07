const fn = require('./blockchain');
const vari  = new Blockchain();
vari.createBlock(1,'h11','h12');
vari.createBlock(2,'h21','h22');
console.log(vari);