#!/usr/bin/env bash
# RTDB 실항차 info 를 통째로 떠서 회귀 입력(tools/fixtures/voyages.json)을 갱신한다. 읽기 GET 만 한다.
#
# 왜 스냅샷인가.
#   2026-08-25, 「작업중」 판정을 KBTR 한 척만 보고 고쳤더니 NSFR 이 죽었고, NSFR 을 살렸더니
#   또 다른 배가 걱정됐다. 검수사 — «하나가 살면 하나가 죽고 시뮬레이션은 하는 건가요?»
#   ⇒ 검증 셋은 고친 그 배가 아니라 **그날 떠 있는 배 전부**다. 그 전부를 파일로 붙박아 둔다.
#
# 쓰는 법:  bash tools/snap_voyages.sh
# ⚠ 쓰기(PUT/PATCH)는 하지 않는다 — 작업표준 금기.
set -u
R="https://greenmarinetally-default-rtdb.asia-southeast1.firebasedatabase.app"
OUT="tools/fixtures/voyages.json"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

echo "· 항차 키 목록…"
curl -s --max-time 40 "$R/voyages.json?shallow=true" > "$TMP/keys.json" || { echo "  x 키 목록 실패"; exit 1; }
python3 -c "
import json,io,sys
ks=sorted(json.load(io.open('$TMP/keys.json')) or {})
if not ks: sys.exit('  x 항차가 없다')
io.open('$TMP/keys.txt','w').write('\n'.join(ks)); print('  ',len(ks),'건')" || exit 1

: > "$TMP/all.jsonl"
while read -r k; do
  [ -z "$k" ] && continue
  curl -s --max-time 20 "$R/voyages/$k/info.json" > "$TMP/one.json"
  python3 -c "
import json,io
try: d=json.load(io.open('$TMP/one.json',encoding='utf-8')) or {}
except Exception: d={}
if d: print(json.dumps({'key':'$k','info':d},ensure_ascii=False))" >> "$TMP/all.jsonl"
done < "$TMP/keys.txt"

python3 - "$TMP/all.jsonl" "$OUT" <<'PY'
import json,io,sys,datetime
src,dst=sys.argv[1],sys.argv[2]
rows=[json.loads(l) for l in io.open(src,encoding='utf-8') if l.strip()]
KEEP=('vsl','voy','mode','lane','planDate','planSrc','terminalStatus','workStartAt',
      'berthShift','autoStatus','termVoy','callsign','pier')
out={r['key']:{k:(r['info'] or {}).get(k,'') for k in KEEP} for r in rows if r['info']}
io.open(dst,'w',encoding='utf-8').write(json.dumps({
 '_설명':'RTDB 실항차 info 스냅샷. 작업중 판정 전수 회귀의 입력. 갱신은 tools/snap_voyages.sh (읽기 GET만).',
 '_뜬시각':datetime.datetime.now().strftime('%Y-%m-%d %H:%M')+' (스크립트 실행 시각)',
 'voyages':out}, ensure_ascii=False, indent=1))
print('  OK 고정:',len(out),'항차 ->',dst)
PY
echo "! 스냅샷을 갱신했으면 기준표도 다시 떠야 한다:  node tools/smoke_voyage_state.cjs --rebaseline"
