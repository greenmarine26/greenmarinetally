# firebase.js 메모리 스텁(tools/fb_stub_search.js) 생성기 — src 가 firebase.js 에서 가져오는 이름 전부를 무해한 함수로 낸다(3.2-01)
#   실행: python3 tools/gen_fb_stub.py  (저장소 루트에서). 새 fb* 이름이 생겨 렌더 연막 번들이 «is not exported» 로 막히면 다시 돌린다.
import re, glob
names = set()
for f in glob.glob('src/**/*.js*', recursive=True):
    s = open(f, encoding='utf-8').read()
    for m in re.finditer(r"import\s*\{([^}]*)\}\s*from\s*'(\.\./|\./)firebase\.js'", s):
        for n in re.sub(r'//[^\n]*', '', m.group(1)).split(','):   # 괄호 안 주석 제거
            n = n.strip().split(' as ')[0].strip()
            if re.fullmatch(r'[A-Za-z_$][\w$]*', n): names.add(n)
fb = open('src/firebase.js', encoding='utf-8').read()
def body(fn):
    m = re.search(r"export function " + fn + r"\([^)]*\)\s*\{", fb)
    i = m.start(); depth = 0; j = m.end() - 1
    while True:
        if fb[j] == '{': depth += 1
        elif fb[j] == '}':
            depth -= 1
            if depth == 0: break
        j += 1
    return fb[i:j + 1].replace('export function', 'function')
special = {
    'STORAGE_BAY': "export const STORAGE_BAY = '__STG__';", 'app': "export const app = {};", 'db': "export const db = {};",
    'fbCompleteContainer': "export const fbCompleteContainer = async (vk, mode, cn, by, flag, note, equip) => { window.__calls.push({ fn: 'complete', vk, mode, cn, by, equip }); return true; };",
    'fbCompleteContainersAtomic': "export const fbCompleteContainersAtomic = async (vk, mode, cns, by, equip) => { window.__calls.push({ fn: 'completeAtomic', vk, mode, cns, by, equip }); return true; };",
    'fbReassignContainerPosition': "export const fbReassignContainerPosition = async (vk, mode, cn, b, r, t, by, opts) => { window.__calls.push({ fn: 'reassign', cn, to: `${b}-${r}-${t}`, opts: opts || null }); return { ok: true }; };",
    'fbGetSimple': "export const fbGetSimple = async () => null;",
    'fbSetShipBayDictNote': "export const fbSetShipBayDictNote = async (code, note, by) => { window.__calls.push({ fn: 'note', code, note, by }); return true; };",
    'fbTrashShipBayDict': "export const fbTrashShipBayDict = async (code, by) => { window.__calls.push({ fn: 'trash', code, by }); return true; };",
    'fbSetShipBayDictSpare': "export const fbSetShipBayDictSpare = async (code, on, by) => { window.__calls.push({ fn: 'spare', code, on, by }); return true; };",
    'fbUpdateVoyageInfo': "export const fbUpdateVoyageInfo = async (vk, patch) => { window.__calls.push({ fn: 'updateInfo', vk, patch }); return true; };",
    'resolveSeqMode': body('resolveSeqMode') + "\nexport { resolveSeqMode };",
    'tallyVoyagesByShip': body('tallyVoyagesByShip') + "\nexport { tallyVoyagesByShip };",
}
out = ["// 검색·완료 렌더 연막검사용 firebase 메모리 스텁(3.2-01) — src 가 firebase.js 에서 가져오는 이름 전부를 무해한 함수로. 실제 쓰기 없음.",
       "//   fbCompleteContainer·fbCompleteContainersAtomic·fbReassignContainerPosition 만 window.__calls 에 남긴다.",
       "//   ⚠ 새 이름이 firebase.js 에 생기면 tools/gen_fb_stub.py 로 다시 만든다(빌드가 «is not exported» 로 막는다)."]
for n in sorted(names):
    out.append(special.get(n, f"export const {n} = async () => true;"))
open('tools/fb_stub_search.js', 'w', encoding='utf-8').write('\n'.join(out) + '\n')
print('fb_stub_search.js exports', len(names))
