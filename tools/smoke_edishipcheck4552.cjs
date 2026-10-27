// 4.55-02 EDI 올리기 «다른 선박 EDI» 판정 한 벌 연막검사 — 실사례 NSDC2611SKRPTK SI.edi(선박명 STASRHIP DRACO) 와 실제 선박 사전 61척 쌍 대조.
//   검수사 2026-10-27 18:19 «⛔ NSDC2611SKRPTK SI.edi: 다른 선박 EDI (선박명 STARSHIP DRACO ≠ EDI STASRHIP DRACO) — 적용 안 함.»
//   ① 공용 함수 ediShipVerdict(실소스 utils.js) 실사례·경계 ② 실제 선박 이름 쌍 대조(한 글자 허용이 다른 배를 같게 보는 쌍을 늘리지 않는다) ③ 올리기 문지기 소스 배선·매뉴얼·판 표시.
//   인자 없음. 실 Firebase 는 건드리지 않는다(utils.js 순수 함수 + 소스 글자 검사).
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
let pass = 0, fail = 0;
const ok = (c, m, extra) => { console.log((c ? '  ✓ ' : '  ✗ ') + m + (!c && extra !== undefined ? ' → ' + JSON.stringify(extra) : '')); if (c) pass++; else fail++; };

//  선박 사전(ship_ids) 이름 — 2026-10-27 실 DB 읽기 사본.
const SHIPS = ["ARTOTINA", "AS PIA", "ATLANTIC PIONEER", "BEROLINA C", "DONGJIN CONFIDENT", "DONGJIN CONTINENTAL", "ERASMUS ICON", "HEUNG-A SARAH", "HEUNG-A YOUNG", "HUI DE", "KHARIS HERITAGE", "KMTC LAEM CHABANG", "KMTC OSAKA", "KOBE TRADER", "MARSA PRIDE", "MPV URANIA", "NAGOYA TRADER", "NINGBO TRADER", "OCEAN BLUE WHALE", "PACIFIC BEIJING", "PACIFIC SHENZHEN", "PACIFIC SINGAPORE", "PEGASUS PETA", "PEGASUS PROTO", "RIZHAO ORIENT", "SAWASDEE ALTAIR", "SAWASDEE ATLANTIC", "SAWASDEE CAPELLA", "SAWASDEE DENEB", "SAWASDEE INCHEON", "SAWASDEE PACIFIC", "SAWASDEE RIGEL", "SAWASDEE SIRIUS", "SAWASDEE SPICA", "SAWASDEE SUNRISE", "SEASPAN CALICANTO", "SEASPAN GUAYAQUIL", "SHAO YUN", "SITC BUSAN", "SITC FENGHE", "SITC MOJI", "SITC SENDAI", "SITC TAICANG", "SITC YANTAI", "SITC YOKKAICHI", "SMC RIZHAO", "SMC YANTAI", "SPIL NIKEN", "STAR FRONTIER", "STARSHIP DRACO", "SUNNY KALMIA", "SUNNY ROSE", "TEN JUPITER", "TIAN HAI PING ZE", "WESTWOOD COLUMBIA", "WESTWOOD VICTORIA", "XIN HAI TONG 503", "XIN TAI PING", "XING PING", "XINQUNDAO", "YOKOHAMA TRADER"];

(async () => {
  const U = await import(path.join(ROOT, 'src/utils.js'));
  const V = U.ediShipVerdict;

  console.log('① 실사례 — NSDC2611SKRPTK SI.edi');
  //  실파일의 TDT 줄 그대로(파서 실소스로 읽는다).
  const edi = U.parseBAPLIE("UNH+1+BAPLIE:D:95B:UN:SMDG20'TDT+20+2611S+++NSS:172:20+++V7A5451:103::STASRHIP DRACO'");
  ok(edi.callsign === 'V7A5451' && edi.vsl === 'STASRHIP DRACO' && edi.voy === '2611S', '파서가 실파일 TDT 줄을 콜사인 V7A5451 · STASRHIP DRACO · 2611S 로 읽는다', { cs: edi.callsign, vsl: edi.vsl, voy: edi.voy });
  const nsdc = { vsl: 'NSDC', vslFull: 'STARSHIP DRACO', callsign: '' };
  let v = V(nsdc, { callsign: 'V7A5451' }, edi);
  ok(v.bad === '' && v.basis === 'callsign' && /STASRHIP DRACO/.test(v.note) && /V7A5451/.test(v.note), '항차 콜사인이 비어도 선박 사전 콜사인(V7A5451)이 같으면 같은 배 — 막지 않고 알림 줄을 남긴다', v);
  v = V(nsdc, { callsign: '' }, edi);
  ok(v.bad === '' && v.basis === 'nameTypo' && /한 글자 차이/.test(v.note), '사전에도 콜사인이 없으면 선박명 한 글자(자리 바뀜) 차이로 같은 배 — 알림 줄에 «파일이 맞는지 봐 주세요»', v);
  v = V({ ...nsdc, callsign: 'V7A5451' }, { callsign: 'V7A5451' }, edi);
  ok(v.bad === '' && v.basis === 'callsign' && /저장되는 선박명은 등록된 이름/.test(v.note), '항차 콜사인이 있고 EDI 와 같고 이름이 한 글자 오타면 통과(종전엔 이름 비교에서 막혔다) — 알림에 «저장되는 선박명은 등록된 이름»', v);
  //  실제 신원 함수(shipIdentityOf)를 거쳐 사전 콜사인이 오는지 — 선박 사전(window.__fbShipBayDict)에 NSDC 항목을 넣어 본다.
  globalThis.window = { __fbShipBayDict: { NSDC: { code: 'NSDC', name: 'STARSHIP DRACO', callsign: 'V7A5451', imo: '9939292' } } };
  globalThis.localStorage = { getItem: () => null, setItem: () => {} };
  const PM = await import(path.join(ROOT, 'src/portMisMatch.js'));
  const idn = PM.shipIdentityOf(nsdc);
  ok(idn.callsign === 'V7A5451', '신원 함수가 선박 사전에서 NSDC 의 콜사인을 가져온다(항차 콜사인이 비어 있을 때)', idn);
  v = V(nsdc, idn, edi);
  ok(v.bad === '' && v.basis === 'callsign', '실제 신원 함수 결과를 넣어도 NSDC 실사건은 통과 — 콜사인으로 확인', v);
  delete globalThis.window;

  console.log('② 막는 것은 종전 그대로');
  v = V({ ...nsdc, callsign: 'V7A5451' }, { callsign: 'V7A5451' }, { callsign: 'V7A9999', vsl: 'STARSHIP DRACO' });
  ok(/콜사인 V7A5451 ≠ EDI V7A9999/.test(v.bad), '항차 콜사인과 EDI 콜사인이 둘 다 있는데 다르면 막는다', v);
  v = V(nsdc, { callsign: '' }, { callsign: '', vsl: 'SAWASDEE THAILAND' });
  ok(/선박명 STARSHIP DRACO ≠ EDI SAWASDEE THAILAND/.test(v.bad), '이름이 크게 다른 배(STARSHIP DRACO ↔ SAWASDEE THAILAND)는 콜사인 정보가 없으면 막는다', v);
  v = V({ vslFull: 'SMC YANTAI', callsign: '' }, {}, { callsign: '', vsl: 'SITC YANTAI' });
  ok(!!v.bad, '두 글자 차이(SMC YANTAI ↔ SITC YANTAI — 다른 선사의 배)는 막는다', v);
  v = V({ vslFull: 'STARSHIP DRACO', callsign: '' }, { callsign: 'V7A9999' }, { callsign: 'V7A5451', vsl: 'STARSHIP DRACO' });
  ok(v.bad === '' && v.basis === 'name', '사전 콜사인이 EDI 와 다르다는 이유로는 새로 막지 않는다(사전이 낡았을 수 있다 — «받는» 근거로만 쓴다)', v);
  v = V({ vslFull: 'STARSHIP DRACO', callsign: '' }, { callsign: 'V7A9999' }, { callsign: 'V7A5451', vsl: 'SAWASDEE THAILAND' });
  ok(/선박명/.test(v.bad), '사전 콜사인이 다르고 이름도 크게 다르면 이름 판정대로 막는다', v);
  v = V({ vslFull: 'PEGASUS PROTO', callsign: '' }, { callsign: 'V7A5451' }, edi);
  ok(/선박명 PEGASUS PROTO ≠ EDI STASRHIP DRACO/.test(v.bad) && /콜사인 V7A5451 은 같지만 이름이 크게 다름/.test(v.bad), '사전 콜사인이 EDI 와 같아도 이름이 크게 다르면 막는다 — 사전 콜사인이 자매선·옛 배 것으로 오염된 경우(감사 중 1)', v);
  v = V({ vslFull: 'PEGASUS PROTO', callsign: 'V7A5451' }, { callsign: 'V7A5451' }, edi);
  ok(/이름이 크게 다름/.test(v.bad), '항차 콜사인이 EDI 와 같아도 이름이 크게 다르면 종전처럼 막는다', v);

  console.log('③ 경계');
  ok(V({ vslFull: 'CNYNT', callsign: '' }, {}, { callsign: '', vsl: 'STARSHIP DRACO' }).bad === '', '코드형 짧은 값(CNYNT)은 이름 비교에서 뺀다(종전 그대로)');
  ok(V(nsdc, {}, { callsign: '', vsl: '' }).bad === '' && V({ vslFull: '', callsign: '' }, {}, edi).bad === '', '이름이 한쪽이라도 비어 있으면 비교하지 않는다');
  ok(V(null, null, null).bad === '' && V(undefined, undefined, {}).bad === '', 'null·undefined 도 던지지 않는다');
  v = V({ vslFull: 'ATLANTIC PIONEER', callsign: '' }, {}, { callsign: '', vsl: 'ATLNTIC PIONEER' });
  ok(v.bad === '' && v.basis === 'nameTypo', '한 글자 빠짐(ATLANTIC → ATLNTIC)도 같은 배', v);
  v = V({ vslFull: 'ATLNTIC PIONEER', callsign: '' }, {}, { callsign: '', vsl: 'ATLANTIC PIONEER' });
  ok(v.bad === '' && v.basis === 'nameTypo', '한 글자 더함도 같은 배', v);
  v = V({ vslFull: 'KOBE TRADER', callsign: '' }, {}, { callsign: '', vsl: 'MOBE TRADER' });
  ok(v.bad === '' && v.basis === 'nameTypo', '한 글자 틀림(KOBE → MOBE)도 같은 배', v);
  v = V({ vslFull: 'KOBE TRADER', callsign: '' }, {}, { callsign: '', vsl: 'KOBE TRADER' });
  ok(v.bad === '' && v.basis === 'name' && v.note === '', '이름이 같으면 알림 줄 없이 통과', v);
  v = V({ vslFull: 'ABC DEFG', callsign: '' }, {}, { callsign: '', vsl: 'XBC DEFG' });
  ok(v.bad === '' && v.basis === 'nameTypo', '정규화한 이름이 정확히 7자(ABCDEFG)면 한 글자 틀림을 받는다', v);
  v = V({ vslFull: 'AB CDEF', callsign: '' }, {}, { callsign: '', vsl: 'XB CDEF' });
  ok(/선박명/.test(v.bad), '정규화한 이름이 6자(ABCDEF)면 한 글자 틀림도 막는다(짧은 이름은 한 글자가 다른 배를 가른다)', v);
  v = V({ vslFull: 'AB-CDEFGH', callsign: '' }, {}, { callsign: '', vsl: 'ABCDEFGH' });
  ok(v.bad === '' && v.basis === 'name', '하이픈은 이름 비교에서 뺀다(AB-CDEFGH = ABCDEFGH — 오타 규칙이 아니라 이름 같음)', v);
  //  keepName — 한 글자 오타로 받았을 때만 «등록된 이름을 저장» (EDI 의 오타 이름을 선박 사전·보관소에 넣지 않는다)
  ok(V(nsdc, { callsign: 'V7A5451' }, edi).keepName === true && V(nsdc, {}, edi).keepName === true, '오타로 받은 NSDC 실사건은 콜사인 확인이든 이름 오타든 keepName(등록된 이름 저장)');
  v = V({ vslFull: 'STARSHIP DRACO', callsign: '' }, {}, { callsign: '', vsl: 'STARSHIP DRAKO' });
  ok(v.bad === '' && v.basis === 'name' && v.keepName === true && /한 글자 차이/.test(v.note), '앞 5글자가 같은 뒤쪽 오타(DRACO → DRAKO)도 막지 않고 알림 + 등록된 이름 저장(감사 재확인 하 2)', v);
  v = V({ vslFull: 'CNYNT', callsign: '' }, { callsign: 'V7A5451' }, { callsign: 'V7A5451', vsl: 'STARSHIP DRACO' });
  ok(v.bad === '' && v.keepName === false && v.note === '', '등록 이름이 코드형(CNYNT)이면 이름 비교 불가 — 등록 이름을 저장하지 않고 EDI 이름을 저장(종전 그대로 · 알림 없음)', v);
  v = V({ vslFull: 'SAWASDEE SPICA', callsign: '' }, { callsign: 'V7A6129' }, { callsign: 'V7A6129', vsl: 'SAWASDEE RIGEL' });
  ok(v.bad === '' && v.keepName === false && /다릅니다/.test(v.note) && /한 번 봐 주세요/.test(v.note) && !/같은 배로 확인/.test(v.note), '앞 5글자만 같은 다른 낱말(자매선 SPICA ↔ RIGEL)은 콜사인이 같아도 «같은 배로 확인» 이라 하지 않고 경고 어조 · 저장 이름은 안 바꿈(감사 재확인 하 3)', v);
  v = V({ vslFull: 'KOBE TRADER', callsign: '' }, {}, { callsign: '', vsl: 'KOBE TRADER' });
  ok(v.keepName === false && v.note === '', '이름이 같으면 keepName 도 알림도 없다', v);
  //  감사 3차 하 1 — 번호 계열 배(305 ↔ 306): 사전 콜사인이 EDI 와 다르면 «오타» 라 하지 않고 경고 어조(받기는 한다)
  v = V({ vslFull: 'WAN HAI 305', callsign: '' }, { callsign: 'AAAA1' }, { callsign: 'BBBB2', vsl: 'WAN HAI 306' });
  ok(v.bad === '' && v.basis === 'name' && v.keepName === true && /달라 다른 배일 수 있습니다/.test(v.note) && /한 번 봐 주세요/.test(v.note) && !/오타로 봄/.test(v.note) && /AAAA1/.test(v.note) && /BBBB2/.test(v.note), '사전 콜사인이 EDI 와 다르고 이름이 한 글자 차이(305 ↔ 306)면 «오타로 봄» 이 아니라 경고 어조 — 두 콜사인 값을 문구에 넣고 받되 등록 이름 저장', v);
  v = V({ vslFull: 'STARSHIP DRACO', callsign: '' }, { callsign: 'V7A5451' }, { callsign: '', vsl: 'STARSHIP DRAKO' });
  ok(v.bad === '' && v.basis === 'name' && v.keepName === true && /오타로 봄/.test(v.note) && !/달라 다른 배/.test(v.note), 'EDI 에 콜사인이 없으면(사전에만 있음) 비교할 콜사인이 없으니 경고 어조가 아니라 종전 «오타로 봄» 어조(DRACO → DRAKO)', v);
  v = V({ vslFull: 'WAN HAI 305', callsign: '' }, {}, { callsign: 'BBBB2', vsl: 'WAN HAI 306' });
  ok(v.bad === '' && v.keepName === true && /오타로 봄/.test(v.note), '사전에 콜사인이 없으면(다르다는 증거 없음) 종전 오타 어조', v);
  //  감사 3차 하 3 — 항차 콜사인만 같고 사전은 비었거나 다른 경우도 «콜사인 일치»
  v = V({ vslFull: 'STARSHIP DRACO', callsign: 'V7A5451' }, { callsign: '' }, edi);
  ok(v.bad === '' && v.basis === 'callsign' && v.keepName === true, '항차 콜사인만 EDI 와 같고 사전 콜사인이 비어도 «콜사인 일치»(오타 → 등록 이름 저장)', v);
  v = V({ vslFull: 'STARSHIP DRACO', callsign: 'V7A5451' }, { callsign: 'V7A9999' }, edi);
  ok(v.bad === '' && v.basis === 'callsign' && v.keepName === true, '항차 콜사인이 EDI 와 같으면 사전 콜사인이 달라도 «콜사인 일치»(사전은 «받는» 근거로만 쓰고 항차 콜사인이 우선)', v);
  //  감사 3차 하 3 — 한 글자 오타의 길이 경계(정규화 6자 이하는 keepName 거짓, 7자 이상은 참)
  v = V({ vslFull: 'AB CDEF', callsign: 'X1' }, {}, { callsign: 'X1', vsl: 'AB CDEG' });
  ok(v.bad === '' && v.keepName === false && /다릅니다/.test(v.note) && /한 번 봐 주세요/.test(v.note) && !/같은 배로 확인/.test(v.note), '정규화 6자 이름은 콜사인이 같고 마지막 글자만 달라도 오타로 보지 않는다(keepName 거짓 · «같은 배로 확인» 이라 하지 않고 경고 어조)', v);
  v = V({ vslFull: 'AB CDEF', callsign: '' }, {}, { callsign: '', vsl: 'AB CDEG' });
  ok(v.bad === '' && v.basis === 'name' && v.keepName === false && v.note === '', '정규화 6자 이름 마지막 글자 차이 + 콜사인 정보 없음은 종전 앞 5글자 규칙 그대로 조용히 통과(감사 하 2 — 종전부터 · 실데이터 가능성 사실상 없음 · 기록만)', v);
  v = V({ vslFull: 'AB CDEFG', callsign: 'X1' }, {}, { callsign: 'X1', vsl: 'AB CDEFH' });
  ok(v.bad === '' && v.keepName === true && /한 글자 달라도 콜사인/.test(v.note), '정규화 7자 이름은 한 글자 틀림이면 오타로 보고 keepName 참', v);
  v = V({ vslFull: 'SAWASDEE THAILAND', callsign: '' }, {}, { callsign: '', vsl: 'SAWASDEE SUNRISE' });
  ok(v.bad === '' && v.basis === 'name', '종전 앞 5글자 규칙은 그대로(SAWASDEE 계열끼리 통과 — 항차 번호·콜사인이 실제 문지기)', v);

  console.log(`④ 실제 선박 이름 쌍 대조 — ${SHIPS.length}척`);
  let nPrefix = 0, nTypo = 0, nBad = 0, pairs = 0;
  const typoPairs = [];
  for (let i = 0; i < SHIPS.length; i++) for (let j = i + 1; j < SHIPS.length; j++) {
    pairs++;
    const r = V({ vslFull: SHIPS[i], callsign: '' }, {}, { callsign: '', vsl: SHIPS[j] });
    if (r.bad) nBad++; else if (r.basis === 'nameTypo') { nTypo++; typoPairs.push(SHIPS[i] + ' ↔ ' + SHIPS[j]); } else if (r.basis === 'name') nPrefix++;
  }
  console.log(`     쌍 ${pairs} · 앞 5글자로 같다고 본 쌍 ${nPrefix} · 한 글자 허용으로 새로 같다고 본 쌍 ${nTypo} · 막힌 쌍 ${nBad}`);
  ok(nPrefix === 60, '종전 앞 5글자 규칙이 같다고 본 쌍은 60 그대로(SAWASDEE 계열 · WESTWOOD 계열 등)', nPrefix);
  ok(nTypo === 0, '한 글자 허용이 서로 다른 배를 새로 같게 보는 쌍은 0 — 늘면 여기서 멈추고 규칙을 다시 본다', typoPairs);

  console.log('⑤ 올리기 문지기 배선 · 매뉴얼 · 판 표시');
  const vp = fs.readFileSync(path.join(ROOT, 'src/pages/VoyagePage.jsx'), 'utf8');
  const ut = fs.readFileSync(path.join(ROOT, 'src/utils.js'), 'utf8');
  const hd = fs.readFileSync(path.join(ROOT, 'src/data/helpData.js'), 'utf8');
  ok(/ediShipVerdict\(voyage\.info, shipIdentityOf\(voyage\.info\), r\)/.test(vp) && /if \(_shipV\.bad\)/.test(vp) && /if \(_shipV\.note\) results\.push\(`ℹ️ \$\{file\.name\}: \$\{_shipV\.note\}`\)/.test(vp), '올리기 문지기가 공용 판정 한 벌(ediShipVerdict)을 부르고 알림 줄을 결과에 싣는다');
  ok(/if \(_shipV\.bad\) \{\s*results\.push\([^;]*\);\s*continue;\s*\}/.test(vp), '막힌 EDI 는 결과 줄을 남기고 continue 로 이 파일을 건너뛴다(적용되지 않는다)');
  const guardEnd = vp.indexOf('// ===== 가드 끝 =====');
  const guardBody = vp.slice(vp.indexOf('// ===== V8.24-03'), guardEnd);
  ok(guardEnd > 0 && !/ℹ️/.test(guardBody) && /가드 끝 =====\s*\/\/[^\n]*\n\s*if \(_shipV\.note\) results\.push\(`ℹ️/.test(vp), '알림 줄은 가드(선박·항차 번호 확인)를 다 통과한 뒤에만 찍는다 — 항차 번호에서 거절된 EDI 에 «적용합니다» 가 찍히지 않는다');
  ok(/const _storeVsl = \(_shipV\.keepName && voyage\.info\.vslFull\) \? voyage\.info\.vslFull : r\.vsl;/.test(vp) && /name: _storeVsl,/.test(vp) && /if \(shipInfo && _shipV\.keepName && voyage\.info\.vslFull\) shipInfo = \{ \.\.\.shipInfo, name: voyage\.info\.vslFull \}/.test(vp), '한 글자 오타로 받은 EDI 는 선박 사전·선박 보관소에 등록된 이름을 저장한다(EDI 의 오타 이름은 저장하지 않는다)');
  ok(/fbSaveShipStructure\(shipStoreKey, \{\s*imo: shipInfo\.imo,\s*name: shipInfo\.name,/.test(vp) && /fbAddShipVoyage\(shipStoreKey, voyageKey, \{[\s\S]{0,420}?vsl: shipInfo\.name,/.test(vp), '선박 보관소(ships/) 저장 두 곳(fbSaveShipStructure · fbAddShipVoyage)은 shipInfo.name 을 쓴다 — 그래서 위 덮기가 두 곳에 같이 먹는다');
  ok(/베이사전 자동 등록 \(\$\{code\} · \$\{r\.callsign \|\| '\(콜사인없음\)'\} · \$\{_storeVsl\}\)/.test(vp), '선박 사전 자동 등록 결과 줄도 저장한 이름(_storeVsl)을 말한다');
  ok(/_shipV\.basis === 'nameTypo' \? `선박명 한 글자 차이로 같은 배로 봄/.test(vp), '항차 번호 흡수 창의 근거 줄에 «한 글자 차이로 같은 배로 봄» 가지가 있다');
  ok(/저장되는 선박명은 등록된 이름을 씁니다/.test(ut) && (ut.match(/keepName: true/g) || []).length === 3, '알림 문구에 «저장되는 선박명은 등록된 이름» 이 있고 keepName 이 참인 갈래는 셋(콜사인 확인 · 앞 5글자 오타 · 이름 오타)');
  ok(!/name: r\.vsl,\s*callsign: r\.callsign/.test(vp), '선박 사전 자동 등록에 EDI 이름을 그대로 넘기는 자리가 남아 있지 않다');
  ok(!/_shipBad|_looksName|_ediNm\.slice\(0, 5\)/.test(vp), '문지기 안에 옛 판정 사본(_shipBad · _looksName · 앞 5글자)이 남아 있지 않다 — 판정은 utils.js 한 곳');
  ok(/import \{ matchPortMis, shipIdentityOf \} from '\.\.\/portMisMatch\.js'/.test(vp) && /ediShipVerdict\} from '\.\.\/utils\.js'/.test(vp), '두 함수를 가져온다');
  ok(/_shipV\.basis === 'callsign' \? `같은 배 \(콜사인 \$\{r\.callsign\} — 선박 사전\)`/.test(vp), '항차 번호 흡수 창의 식별 근거 줄이 «콜사인 — 선박 사전» 을 말한다');
  ok((ut.match(/export function ediShipVerdict\(/g) || []).length === 1, '공용 함수는 utils.js 에 한 벌');
  ok((hd.match(/4\.55-02~/g) || []).length === 2, '매뉴얼 두 곳에 새 규칙(4.55-02~)이 적혀 있다');
  ok(/^TallyOne 4\.(55-(0[2-9]|[1-9]\d)|5[6-9]|[6-9]\d)/.test((ut.match(/APP_VERSION = '([^']*)'/) || [])[1] || ''), '버전 TallyOne 4.55-02 이상');
  const note = (ut.match(/APP_NOTE = '([^']*)'/) || [])[1] || '';
  ok(note.length < 120 && (note.match(/\./g) || []).length <= 3 && !/[\\/']/.test(note), 'APP_NOTE — 두 문장 이내 · 120자 미만 · 작은따옴표·슬래시 없음', note);
  ok(/APP_NOTE = '4\.55-02 [^']*오타[^']*'/.test(ut) || !/APP_VERSION = 'TallyOne 4\.55-02'/.test(ut), 'APP_NOTE «오타»(4.55-02 판일 때 — 뒤 판은 자기 문구)');

  console.log(`\n결과: ${pass} 통과 / ${fail} 실패`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('연막검사가 던졌다', e); process.exit(1); });
