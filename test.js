const path = require('path');
const os = require('os');

const TEMP_DIR = path.join(os.tmpdir(), "dyad-attachments");
console.log(TEMP_DIR);