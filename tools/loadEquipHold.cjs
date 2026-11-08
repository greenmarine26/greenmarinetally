// 호기 보유 연막검사들이 equipHold.js 를 문자열로 읽을 때 쓰는 로더 — 4.79 부터 equipHold.js 가 workShift.js 를 import 하므로 두 파일을 export/import 없이 이어 붙인다.
const fs = require('fs');
module.exports = function loadEquipHold(root = '.') {
  const ws = fs.readFileSync(root + '/src/workShift.js', 'utf8').replace(/export /g, '');
  const eh = fs.readFileSync(root + '/src/equipHold.js', 'utf8').replace(/^import .*$/gm, '').replace(/export /g, '');
  return ws + '\n' + eh;
};
