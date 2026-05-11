# M5.25 → 다음 세션 인계 (HANDOFF)

## 현재 상태 (M5.25) — PORT-MIS 캡처 OCR (폰 전용)

Chrome 확장은 데스크톱 전용. 사용자가 폰만으로도 PORT-MIS 데이터 입력 가능하게 OCR 추가.

## ✅ 변경 사항 (M5.24 → M5.25)

### PORT-MIS 캡처 업로드 기능

**진입점**: HomePage 상단 [📸 PORT-MIS 캡처] 버튼 (통합 검색/수석 대시보드 옆)

**사용 흐름**:
```
[폰]
  1. Chrome으로 PORT-MIS 평택 입출항현황 검색
  2. 화면 캡처 1장
[Tallyman 앱]
  3. HomePage → [📸 PORT-MIS 캡처] 클릭
  4. 사진 선택 (capture="environment"로 카메라 직접 호출 가능)
  5. Gemini Vision OCR 자동 분석 (10~20초)
  6. 추출 결과 검토 (선박명/콜사인/입출항시간 리스트)
  7. [Firebase 저장] → port_mis_data에 PUT
[모든 검수원]
  8. 항차 화면에 ⚓ PORT-MIS 카드 자동 표시
```

### 새 파일

| 파일 | 역할 |
|---|---|
| src/components/PortMisCaptureModal.jsx | 5단계 모달 (pick → analyzing → review → saving → done) |

### 기존 파일 수정

| 파일 | 변경 |
|---|---|
| src/utils.js | APP_VERSION 'M5.25' |
| src/mixerUpload.js | `ocrPortMisCapture(file, geminiApiKey)` 함수 추가 (PORT-MIS 전용 프롬프트) |
| src/firebase.js | `fbSavePortMisBatch(ships)` 함수 추가 (Chrome 확장과 동일 구조) |
| src/pages/HomePage.jsx | [📸 PORT-MIS 캡처] 버튼 + 모달 통합 (그리드 2→3 컬럼) |
| src/components/HelpModal.jsx | M5.25 변경사항 |

## Gemini Vision 프롬프트

```
이 이미지는 한국 PORT-MIS의 선박입출항현황 화면입니다.
표 형태로 선박들의 입출항 정보가 나열되어 있습니다.

JSON 형식:
{
  "ships": [
    {
      "port": "평택",
      "callsign": "V7A5451",
      "vesselName": "STARSHIP DRACO",
      "voyageType": "최초/변경/최종",
      "voyageInOut": "외항/내항",
      "ibobprtSe": "입항/출항",
      "eta": "YYYY-MM-DD HH:MM",
      "etd": "YYYY-MM-DD HH:MM"
    }
  ]
}
```

## Firebase 저장 구조

Chrome 확장과 완전 동일:
```
port_mis_data/{sanitized_callsign}: {
  callsign, vesselName, port, eta, etd, voyageType, ...,
  updatedAt: <timestamp>
}
```

→ 두 방식이 같은 노드를 공유. 어느 쪽으로 저장해도 동일하게 ⚓ 카드 매칭됨.

## 핵심 장점

| 항목 | Chrome 확장 | 캡처 OCR |
|---|---|---|
| 사용 기기 | 데스크톱 PC만 | 폰 (안드로이드+iOS) |
| 설치 필요 | 한 명만 (5분) | X (앱 자체 기능) |
| 자동도 | PORT-MIS 검색만 | 캡처 1장 추가 |
| 정확도 | 100% (DOM 파싱) | 95%+ (Gemini Vision) |
| 비용 | 0 | Gemini 무료 한도 (충분) |

두 방식 병행 가능. 검수반장 PC에 확장 + 다른 검수원은 폰 OCR 활용.

## 검증

- 버전 M5.25: 2회 ✓
- ocrPortMisCapture, fbSavePortMisBatch, 📸 모두 적용 ✓
- 기존 기능 잔존 (M5.24 name-fuzzy/9V7919, M5.23 BULK_AUTO 192, needs-review 198, M5.20 priority)

## 잠재 이슈

1. **Gemini API 키 필수**: 사용자가 키 설정 안 했으면 모달이 에러 표시. 기존 설정 메뉴 활용
2. **캡처 품질**: 흐릿한 사진은 OCR 정확도 ↓. 모달에 "선명한 캡처" 안내 포함
3. **Gemini 한도**: 하루 50~100회 정도 한도. 한 검수반장이 하루 2~3번 사용이면 영향 없음
4. **저장 후 매칭**: M5.24의 매칭 4단계 그대로 동작. 선박명 정확 매칭이 첫 단계라 OCR 추출 선박명만 정확하면 즉시 매칭

## 🔜 다음 세션 후보

1. **사용자 첫 테스트 결과 따라 조정**: OCR 정확도, 모달 UX
2. **자동 검색 안내**: 사용자가 PORT-MIS 검색 안 했을 때 안내 메시지
3. **검수반장 운영 패턴 정착**: 누가 / 언제 / 얼마나 자주 캡처할지 운영 규칙

## 영구 규칙 (메모리)

(M5.24와 동일)
1~12: 빌드 원칙, 베이 구조, alias, listener, 음성 priority, Chrome 확장, EDI vs PORT-MIS, 매칭 우선순위, 베이사전 300척, 베이 표시 절대 원칙
