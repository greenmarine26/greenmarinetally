# HANDOFF — M6.94.20 (매트릭스 권한 + 다기기 동기화 + user 절대보호)

## 작업 요약
PC에서 만든 user 매트릭스가 폰에 안 보이던 문제 해결. 권한자 명단 기반 단방향 배포.

## 핵심 결정 (사용자 확정)
- 수정 권한: 검수자 이름 화이트리스트 (Firebase 공유)
- 초기 권한자: 김성일 (명단 비었을 때 자동 시딩)
- 명단 수정 권한: 명단에 있는 사람만 (서로 추가 가능)
- 일반 사용자(폰): Firebase에서 자동 수신(읽기 전용). 매트릭스 저장 버튼 숨김.
- 자동본(ASC/Stowage/PDF)은 user 매트릭스를 절대 못 덮음.
- 권한자 관리 UI 위치: 매트릭스 빌더 모달 footer 내부.

## 변경 파일 (3개)
1. **src/firebase.js**
   - `fbSaveShipBayDict` 보호 로직 추가 (핵심): existingIsUser && !entryIsUser → user bayDef/source/_userOwned 보존. user↔user는 updatedAt 최신 우선.
   - 신규: `fbGetMatrixEditors` / `fbSubscribeMatrixEditors` / `fbSetMatrixEditors`. 노드 `matrix_editors`. 시드 ['김성일']. 명단 빈 값 금지(잠금 방지).
2. **src/App.jsx**
   - 구독 핸들러에서 Firebase의 source==='user' entry를 localStorage(master_user_bay_dict_v1)에 머지. 로컬 user가 더 최신이면 보존. (loadUserBayDict import 추가)
3. **src/components/ShipMatrixBuilderModal.jsx**
   - Hook(useMemo currentInspector / useState editors,showEditorMgr,editorInput,editorMsg / useEffect 구독 / useMemo canEdit) 모두 최상단 배치 (Rules of Hooks 준수, early return `if(!matrix)` 이전).
   - handleSave: canEdit 검증 + user 마킹(source/_userOwned/editorName/updatedAt) + addToUserBayDict 후 fbSaveShipBayDict 업로드(fire-and-forget).
   - footer: 권한자만 저장 버튼·권한자 관리 버튼 노출. 비권한자는 🔒 안내. 권한자 관리 패널(추가/삭제).

## 검증 (sim_m694_20.mjs — 24/24 PASS)
- A. userBayDict 절대보호 4건 (자동본/PDF가 user 못 덮음, 빈 식별자 보완)
- B. 정상 갱신 4건 (user 최신 갱신, 오래된 것 차단, 최초 저장, 자동본끼리 갱신)
- C. 폰 수신 머지 4건 (user 수신, 자동본 미수신, 로컬최신 보존, FB최신 갱신)
- D. 권한 9건 (저장권한, 차단, 로딩전 안전, 미선택, 명단수정, 시드, 추가권한자)
- E. 실제 시나리오 3건 (김성일 저장→폰수신→ASC업로드 후 user보존)
- 빌드: build.sh, APP_VERSION M6.94.20 박힘 grep 확인. 빌드본에 matrix_editors/fbSetMatrixEditors/권한자관리/동기화됨 박힘 확인.

## 사용자 테스트 우선순위 (배포 후)
1. PC(김성일 로그인)에서 선박 매트릭스 빌더 → 저장 → "☁ 동기화됨" 메시지 뜨는지
2. 폰(아무 검수자)에서 같은 선박 카고플랜 → PC에서 만든 매트릭스가 보이는지
3. 폰(김성일 아닌 검수자)에서 매트릭스 빌더 → 저장 버튼 안 보이고 🔒 안내 뜨는지
4. PC(김성일)에서 권한자 관리 → 다른 검수자 추가 → 그 사람 기기에서 저장 버튼 생기는지
5. ASC/Stowage 자동 업로드 후에도 user 매트릭스가 유지되는지 (덮어쓰기 안 됨)

## 주의
- 권한자 이름은 검수자 로그인 이름(master_active_inspector_v1)과 정확히 일치해야 함. 공백/철자 주의.
- Firebase 규칙(보안)이 matrix_editors 쓰기를 막고 있지 않은지 확인 필요 (현재 앱 레벨 권한 판정만. DB 규칙은 별도).
