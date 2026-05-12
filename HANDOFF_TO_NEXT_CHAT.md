# M5.55 인계 - voucher 양식 영구 반영

## 완료 작업
1. **workingReport.js 완전 재작성** (370줄)
   - DJCF 0145N&0146S 양식 확정판
   - 사진 양식 정확 매칭 (DISCH 199, LOAD 255 검증)
   - A4 1페이지 강제, 굵은 선 구분
   - 셀 11.5pt, line-height 1.05, 폰트 9pt
   - Remarks 좌우 반반 (gap 0), 서명란 margin 20pt
   - PAD=45 빈 행, OPERATOR 셀 rowspan="3"
   - 양하/선적 데이터에 따라 Remarks 동적 표시

2. **선사 매핑 룰** (workingReport.js + parseListExcel)
   - CARRIER_MAP: DJSC→DJS, NSSL→NSL, HASL→HAS, SNKO→SKR, HSLI→HSL, JEON→HSL
   - 우선순위: EDI(c.op) > BL prefix > 선사부호 컬럼 > cn prefix 폴백
   - OP 표시 순서: SKR → NSL → DJS → HAS → HSL → 기타

3. **PORT 매핑 + 추출 룰**
   - 양하: PORT = POL (출발지)
   - 선적: PORT = TSPORT(환적) > PRINTPOD > POD
   - NSL JDCF: BL prefix NSSLPT[XXX]에서 추출 (BSE→PUS, HCC→SGN, LCC→LCH)

4. **사이즈/F-E 다중 양식 처리**
   - 표준 ISO 6346 (22GP, 45GP 등)
   - 비표준 DJS 양식 (D2→20, D5→HC, D4→40, R5→HC)
   - SZTY 양식 (20DC, 4HDC, 4HRF)
   - F/E 추론: c.fe → c.cargoType (F/P) → ISO 끝자리

5. **parseListExcel 컬럼 인식 보강**
   - 선사부호, TSPORT, PRINTPOD, CARGO TYPE 컬럼 추가
   - record 객체에 tsport/printpod/cargoType 필드 저장

6. **HelpModal**: voucher 매뉴얼 3개 항목 추가

## 빌드
- M5.55 버전, dist/ 생성 완료
- 1.43MB JS (gzip 297KB)

## 검증
- DJCF 0145N(199대) + 0146S(255대) 실제 데이터로 voucher 생성 → 사진 양식과 100% 일치
- 1페이지 강제 확인
- 모든 선사 정확 분류 (SKR 62, NSL 47, DJS 134, HAS 9, HSL 3)

## 미해결 (선택 작업)
- 사진의 양하 분포 일부 (NSL LCH 25 사이즈 모호, DJS BKK 7 등) — LIST1 데이터와 사진의 실제 작업 결과(수기) 차이
- 사용자 검증 후 조정 가능
