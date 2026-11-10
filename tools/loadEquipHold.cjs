// 호기 보유 연막검사들이 equipHold.js 를 문자열로 읽을 때 쓰는 로더 — 4.79 부터 equipHold.js 가 workShift.js 를 import 하므로 두 파일을 export/import 없이 이어 붙인다.
const fs = require('fs');
module.exports = function loadEquipHold(root = '.') {
  //  ★ 일괄수리(2026-11-10): workShift.js 가 선박 성질표(shipPolicyCore.js — import 없는 순수 모듈)를 부른다 — 세 파일을 차례로 잇는다.
  const sp = fs.readFileSync(root + '/src/shipPolicyCore.js', 'utf8').replace(/export /g, '');
  const ws = fs.readFileSync(root + '/src/workShift.js', 'utf8').replace(/^import .*$/gm, '').replace(/export /g, '');
  const eh = fs.readFileSync(root + '/src/equipHold.js', 'utf8').replace(/^import .*$/gm, '').replace(/export /g, '');
  return sp + '\n' + ws + '\n' + eh;
};
