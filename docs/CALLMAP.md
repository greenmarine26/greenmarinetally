# 함수 호출 지도 (자동 생성 — 손으로 고치지 않는다)

> `node tools/callmap.cjs --md > docs/CALLMAP.md` 로 다시 만든다. 한 함수만 보려면 `node tools/callmap.cjs 함수이름`.
> «여러 곳에 걸친 함수» = 정의 파일 밖 검수앱 파일 + 콘앱·번들 파일이 3개 이상이거나, 검수앱과 콘앱·번들 양쪽에서 쓰는 것. 이런 함수를 고치면 호출처를 전부 봐야 한다.
> 이름 문자열로 부르는 경우(문자열 안의 이름)는 잡지 못한다 — 그때는 grep 도 같이 한다.

총 정의 1648개 · 여러 곳에 걸친 함수 327개

| 함수 | 정의 | 검수앱 쓰는 곳 | 콘앱·번들 | 시험 |
|---|---|---|---|---|
| `isoToLabel` | src/utils.js:840 | 29개 파일 | - | 9개 |
| `isPyeongtaekPort` | src/utils.js:5330 | 25개 파일 | cone.html, mir-core.js, public/cone.html, public/mir-core.js | 9개 |
| `isReeferContainer` | src/utils.js:1370 | 19개 파일 | cone.html, mir-core.js, public/cone.html, public/mir-core.js | 5개 |
| `isChief` | src/staffList.js:180 | 17개 파일 | mir-core.js, public/mir-core.js | 17개 |
| `isoShown` | src/utils.js:1033 | 19개 파일 | - | 2개 |
| `isPtk` | src/utils.js:5370 | 17개 파일 | cone.html, public/cone.html | 5개 |
| `speak` | src/voice.js:100 | 14개 파일 | cone.html, mir-core.js, public/cone.html, public/mir-core.js | 41개 |
| `getShipBayDictData` | src/shipStructure.js:465 | 17개 파일 | - | 1개 |
| `canWorkNow` | src/workChoice.js:138 | 16개 파일 | - | 3개 |
| `getEquipNumber` | src/utils.js:4216 | 16개 파일 | - | 5개 |
| `isFullReefer` | src/utils.js:1378 | 13개 파일 | mir-core.js, public/mir-core.js | 2개 |
| `ptkDischargeUnitsOf` | src/utils.js:9669 | 12개 파일 | mir-core.js, public/mir-core.js | 9개 |
| `getBayPairs` | src/twin.js:119 | 13개 파일 | - | 2개 |
| `render` | cone.html:3126 | 6개 파일 | bulk_tally.html, cone-cargoplan.js, cone.html, intro.html, public/cone-cargoplan.js, public/cone.html, public/intro.html | 89개 |
| `APP_VERSION` | src/utils.js:57 | 9개 파일 | bulk_tally.html, helper_entry.js, merge_entry.js | 26개 |
| `workGateText` | src/workChoice.js:141 | 12개 파일 | - | 3개 |
| `fmtPos` | src/utils.js:760 | 11개 파일 | - | 2개 |
| `isOwnerName` | src/adminGuard.js:86 | 11개 파일 | - | 4개 |
| `matchPortMis` | src/portMisMatch.js:44 | 9개 파일 | mir-core.js, public/mir-core.js | 3개 |
| `sealCheckOf` | src/utils.js:9871 | 11개 파일 | - | 2개 |
| `useConfirm` | src/components/ConfirmModal.jsx:78 | 11개 파일 | - | **없음** |
| `_storage` | src/utils.js:648 | 8개 파일 | cone-cargoplan.js, public/cone-cargoplan.js | 1개 |
| `ediIso` | src/loadingEdiExport.js:112 | 6개 파일 | cone-cargoplan.js, mir-core.js, public/cone-cargoplan.js, public/mir-core.js | 1개 |
| `isEmptyReefer` | src/utils.js:1386 | 8개 파일 | mir-core.js, public/mir-core.js | **없음** |
| `isFlatRackContainer` | src/utils.js:1458 | 8개 파일 | cone.html, public/cone.html | 3개 |
| `isoPickOog` | src/utils.js:1454 | 6개 파일 | cone.html, mir-core.js, public/cone.html, public/mir-core.js | 1개 |
| `isReeferIso` | src/utils.js:1329 | 10개 파일 | - | 3개 |
| `parseNaturalQuery` | src/nlSearch.js:120 | 6개 파일 | cone.html, mir-core.js, public/cone.html, public/mir-core.js | 29개 |
| `parseViewCommand` | src/planCommand.js:19 | 6개 파일 | cone.html, mir-core.js, public/cone.html, public/mir-core.js | 4개 |
| `pickCarrierOp` | src/utils.js:5194 | 8개 파일 | cone.html, public/cone.html | 1개 |
| `stopSpeak` | src/voice.js:258 | 6개 파일 | cone.html, mir-core.js, public/cone.html, public/mir-core.js | 1개 |
| `answerOneRaw` | src/mir.js:2137 | 5개 파일 | cone.html, mir-core.js, public/cone.html, public/mir-core.js | 28개 |
| `buildBayPagesFromSummary` | src/cargoPlanCore.js:1078 | 9개 파일 | - | 11개 |
| `effectivePos` | src/utils.js:10949 | 9개 파일 | - | 4개 |
| `isShiftOffPtk` | src/utils.js:9642 | 9개 파일 | - | **없음** |
| `isWorkingNow` | src/utils.js:8806 | 5개 파일 | cone.html, mir-core.js, public/cone.html, public/mir-core.js | 5개 |
| `mirThreadAlive` | src/mir.js:3612 | 5개 파일 | cone.html, mir-core.js, public/cone.html, public/mir-core.js | 1개 |
| `mirThreadCommit` | src/mir.js:3867 | 5개 파일 | cone.html, mir-core.js, public/cone.html, public/mir-core.js | 6개 |
| `mirTone` | src/mir.js:250 | 5개 파일 | cone.html, mir-core.js, public/cone.html, public/mir-core.js | 3개 |
| `applySwapFix` | src/utils.js:9122 | 6개 파일 | cone.html, public/cone.html | 6개 |
| `bayGroupCenter` | src/swapGrade.js:27 | 8개 파일 | - | 4개 |
| `completedByLabel` | src/utils.js:226 | 8개 파일 | - | 3개 |
| `computeTallyData` | src/tallyReport.js:1016 | 6개 파일 | mir-core.js, public/mir-core.js | 8개 |
| `fbUpdateVoyageInfo` | src/firebase.js:191 | 8개 파일 | - | 5개 |
| `getPierFromBerth` | src/utils.js:4313 | 8개 파일 | - | 2개 |
| `inspectionSealOf` | src/utils.js:9971 | 8개 파일 | - | 3개 |
| `isDone` | src/mailboxFs.js:227 | 8개 파일 | - | **없음** |
| `parseBAPLIE` | src/utils.js:1969 | 5개 파일 | cone.html, merge_entry.js, public/cone.html | 5개 |
| `swapFixList` | src/utils.js:9110 | 6개 파일 | cone.html, public/cone.html | 6개 |
| `YARD_SPEAK` | src/mir.js:4456 | 4개 파일 | cone.html, mir-core.js, public/cone.html, public/mir-core.js | 1개 |
| `applyNLFilter` | src/nlSearch.js:976 | 5개 파일 | mir-core.js, public/mir-core.js | 4개 |
| `applySpecialMarks` | src/utils.js:10352 | 7개 파일 | - | 3개 |
| `dropFilledBookingSlots` | src/utils.js:1628 | 7개 파일 | - | 1개 |
| `emptySplitLabel` | src/utils.js:1392 | 7개 파일 | - | **없음** |
| `enrichBayDef` | src/bayDictAutoEnrich.js:36 | 7개 파일 | - | **없음** |
| `ensureMirPhotoCss` | src/components/mirPhotoArt.js:105 | 3개 파일 | cone.html, mir-core.js, public/cone.html, public/mir-core.js | 1개 |
| `equipGateText` | src/workChoice.js:129 | 7개 파일 | - | 3개 |
| `equipNumbersForPier` | src/utils.js:4419 | 7개 파일 | - | 1개 |
| `fbCompleteContainer` | src/firebase.js:1043 | 7개 파일 | - | 9개 |
| `formatWt` | src/utils.js:814 | 7개 파일 | - | **없음** |
| `isLoloShip` | cone.html:3628 | 3개 파일 | cone.html, mir-core.js, public/cone.html, public/mir-core.js | 2개 |
| `isUserOwnedBayDict` | src/utils.js:5444 | 7개 파일 | - | **없음** |
| `knownShipCodes` | src/utils.js:7349 | 3개 파일 | cone.html, mir-core.js, public/cone.html, public/mir-core.js | 1개 |
| `loadSheetJS` | src/utils.js:2575 | 6개 파일 | merge_entry.js | 3개 |
| `mirMoodEvent` | src/mir.js:4424 | 3개 파일 | cone.html, mir-core.js, public/cone.html, public/mir-core.js | 2개 |
| `normalizeBay` | src/utils.js:750 | 7개 파일 | - | **없음** |
| `normPortCode` | src/utils.js:8900 | 5개 파일 | cone.html, public/cone.html | 1개 |
| `parseAscFile` | src/utils.js:2334 | 4개 파일 | cone.html, merge_entry.js, public/cone.html | 3개 |
| `pickDischargePol` | src/utils.js:5243 | 7개 파일 | - | 1개 |
| `pushState` | src/push.js:35 | 5개 파일 | cone.html, public/cone.html | 2개 |
| `reeferTempExempt` | src/utils.js:1487 | 7개 파일 | - | 1개 |
| `voyageDoneAts` | src/nlSearch.js:3444 | 5개 파일 | mir-core.js, public/mir-core.js | 4개 |
| `applyDischargeUnits` | src/utils.js:9756 | 2개 파일 | cone.html, mir-core.js, public/cone.html, public/mir-core.js | 8개 |
| `askMir` | src/mir.js:3519 | 2개 파일 | cone.html, mir-core.js, public/cone.html, public/mir-core.js | 7개 |
| `buildPosMap` | src/cargoPlanCore.js:396 | 6개 파일 | - | 3개 |
| `canOpenChief` | src/staffList.js:221 | 6개 파일 | - | 3개 |
| `computeShiftingMapCached` | src/utils.js:10047 | 6개 파일 | - | 5개 |
| `CONE_QA_HELP` | src/coneKnowledge.js:18 | 2개 파일 | cone.html, mir-core.js, public/cone.html, public/mir-core.js | **없음** |
| `currentMirMood` | src/mir.js:4428 | 2개 파일 | cone.html, mir-core.js, public/cone.html, public/mir-core.js | 1개 |
| `dischargeUnitBareRow` | src/utils.js:9741 | 6개 파일 | - | **없음** |
| `ensureTermBoardCss` | src/termBoard.js:176 | 2개 파일 | cone.html, mir-core.js, public/cone.html, public/mir-core.js | 1개 |
| `fbAddWorkReport` | src/firebase.js:3069 | 6개 파일 | - | 6개 |
| `fbReassignContainerPosition` | src/firebase.js:1636 | 6개 파일 | - | 4개 |
| `flattenVoyages` | src/mir.js:599 | 4개 파일 | mir-core.js, public/mir-core.js | 18개 |
| `fmtShiftPos` | src/utils.js:9267 | 6개 파일 | - | 3개 |
| `getMirConfig` | src/mir.js:3062 | 4개 파일 | mir-core.js, public/mir-core.js | 5개 |
| `hatchReportTs` | src/utils.js:8255 | 6개 파일 | - | **없음** |
| `isBookingSlot` | src/utils.js:1561 | 6개 파일 | - | **없음** |
| `isLoloShipByPolicy` | src/shipPolicyCore.js:81 | 6개 파일 | - | **없음** |
| `koJosa` | src/utils.js:7366 | 6개 파일 | - | **없음** |
| `matchShipPolicy` | src/shipPolicyCore.js:50 | 6개 파일 | - | **없음** |
| `mirPhotoHtml` | src/components/mirPhotoArt.js:25 | 2개 파일 | cone.html, mir-core.js, public/cone.html, public/mir-core.js | 1개 |
| `noteMirAsk` | src/mir.js:4408 | 2개 파일 | cone.html, mir-core.js, public/cone.html, public/mir-core.js | 1개 |
| `noteMirOpen` | src/mir.js:4409 | 2개 파일 | cone.html, mir-core.js, public/cone.html, public/mir-core.js | 1개 |
| `pickVoyageKey` | src/planCommand.js:78 | 2개 파일 | cone.html, mir-core.js, public/cone.html, public/mir-core.js | 1개 |
| `resolveCrewSides` | src/utils.js:7462 | 6개 파일 | - | 3개 |
| `runDeviceCmd` | src/utils.js:11327 | 4개 파일 | mir-core.js, public/mir-core.js | 5개 |
| `setMirYard` | src/mir.js:4452 | 2개 파일 | cone.html, mir-core.js, public/cone.html, public/mir-core.js | 1개 |
| `shiftCnSetOf` | src/utils.js:10030 | 6개 파일 | - | 14개 |
| `shiftSetForUnitsOf` | src/utils.js:9752 | 2개 파일 | cone.html, mir-core.js, public/cone.html, public/mir-core.js | 4개 |
| `sideCancelled` | src/utils.js:6918 | 6개 파일 | - | 1개 |
| `speakDone` | src/voice.js:251 | 6개 파일 | - | **없음** |
| `subscribeMirMood` | src/mir.js:4425 | 2개 파일 | cone.html, mir-core.js, public/cone.html, public/mir-core.js | **없음** |
| `termBoardHtml` | src/termBoard.js:186 | 2개 파일 | cone.html, mir-core.js, public/cone.html, public/mir-core.js | 1개 |
| `angryReasons` | src/mir.js:4303 | 1개 파일 | cone.html, mir-core.js, public/cone.html, public/mir-core.js | 4개 |
| `answerOne` | src/mir.js:2959 | 1개 파일 | cone.html, mir-core.js, public/cone.html, public/mir-core.js | 6개 |
| `askMirModel` | src/mir.js:3408 | 3개 파일 | mir-core.js, public/mir-core.js | 3개 |
| `buildContainerColorMap` | src/utils.js:5274 | 5개 파일 | - | **없음** |
| `crewShiftKey` | src/utils.js:7225 | 5개 파일 | - | 3개 |
| `ediSealMapOf` | src/utils.js:11390 | 3개 파일 | mir-core.js, public/mir-core.js | 3개 |
| `extractShipMetaFromVoyage` | src/shipMatrixBuilder.js:18 | 5개 파일 | - | **없음** |
| `fbGetSimple` | src/firebase.js:67 | 5개 파일 | - | 2개 |
| `fbSetActualPosition` | src/firebase.js:1377 | 5개 파일 | - | 7개 |
| `getContainerColorKey` | src/utils.js:5253 | 5개 파일 | - | **없음** |
| `isAlphaOpenTopIso` | src/utils.js:1425 | 3개 파일 | cone.html, public/cone.html | 1개 |
| `isKeepShift` | src/cargoPlanCore.js:1060 | 5개 파일 | - | 4개 |
| `isListOriginRecord` | src/utils.js:9595 | 5개 파일 | - | 1개 |
| `isMadeUnitCn` | src/utils.js:9787 | 3개 파일 | mir-core.js, public/mir-core.js | 1개 |
| `isUpcomingWork` | src/mir.js:4251 | 1개 파일 | cone.html, mir-core.js, public/cone.html, public/mir-core.js | 1개 |
| `isVirtualCn` | src/utils.js:273 | 5개 파일 | - | **없음** |
| `isWeakAnswer` | src/mir.js:3029 | 3개 파일 | mir-core.js, public/mir-core.js | 15개 |
| `keepOnboardOf` | src/utils.js:9399 | 5개 파일 | - | 4개 |
| `loadingSlotOf` | src/utils.js:11166 | 5개 파일 | - | 1개 |
| `markDischargeUnit` | src/utils.js:9733 | 5개 파일 | - | **없음** |
| `mirHeroHtml` | src/components/mirPhotoArt.js:48 | 1개 파일 | cone.html, mir-core.js, public/cone.html, public/mir-core.js | 1개 |
| `mirIsDeferred` | src/mir.js:4162 | 3개 파일 | mir-core.js, public/mir-core.js | 1개 |
| `mirSmallTalk` | src/mir.js:451 | 3개 파일 | mir-core.js, public/mir-core.js | 3개 |
| `mirThreadResolve` | src/mir.js:3618 | 3개 파일 | mir-core.js, public/mir-core.js | 2개 |
| `NUM_INPUT_PROPS` | src/inputUtils.js:33 | 5개 파일 | - | **없음** |
| `parseListExcel` | src/utils.js:3050 | 4개 파일 | merge_entry.js | 9개 |
| `pickShipCtx` | src/mir.js:1131 | 3개 파일 | mir-core.js, public/mir-core.js | 3개 |
| `plausibleListWtKg` | src/utils.js:2874 | 5개 파일 | - | 3개 |
| `progressOf` | src/utils.js:9614 | 5개 파일 | - | 12개 |
| `reeferTempSummary` | src/utils.js:1519 | 5개 파일 | - | 3개 |
| `resolveAiKey` | src/gemini.js:53 | 5개 파일 | - | 2개 |
| `sealFormatAnomalies` | src/utils.js:11398 | 3개 파일 | mir-core.js, public/mir-core.js | 4개 |
| `setEquipNumber` | src/utils.js:4226 | 5개 파일 | - | 7개 |
| `shareText` | src/kakaoShare.js:6 | 4개 파일 | bulk_tally.html | **없음** |
| `shiftingMapForDisplay` | src/utils.js:9379 | 5개 파일 | - | 9개 |
| `shipCodeInQuery` | src/utils.js:7328 | 1개 파일 | cone.html, mir-core.js, public/cone.html, public/mir-core.js | 1개 |
| `sizeOf` | src/ediGap.js:12 | 5개 파일 | - | 1개 |
| `useCarrierContacts` | src/useCarrierContacts.js:6 | 5개 파일 | - | **없음** |
| `validate` | src/planEditCore.js:196 | 3개 파일 | cone-cargoplan.js, public/cone-cargoplan.js | **없음** |
| `workPauseOf` | src/mir.js:4044 | 3개 파일 | mir-core.js, public/mir-core.js | 3개 |
| `allStaffNames` | src/staffList.js:78 | 4개 파일 | - | 2개 |
| `applyAutoSwap` | src/utils.js:10833 | 2개 파일 | cone.html, public/cone.html | 13개 |
| `applyCatosPos` | src/utils.js:10729 | 2개 파일 | cone.html, public/cone.html | 14개 |
| `autoPairBays` | src/cargoPlanCore.js:36 | 4개 파일 | - | 2개 |
| `BayBoxV2` | src/components/PrintableCargoPlanV2.jsx:400 | 4개 파일 | - | **없음** |
| `buildBayGrid` | src/cargoPlanCore.js:1103 | 4개 파일 | - | 1개 |
| `buildEmptyBayRenderData` | src/cargoPlanCore.js:1164 | 4개 파일 | - | **없음** |
| `buildGangShift` | src/chiefAnswers.js:321 | 4개 파일 | - | 4개 |
| `buildHatchMessage` | src/kakaoShare.js:198 | 4개 파일 | - | **없음** |
| `canCompleteContainer` | src/utils.js:5323 | 4개 파일 | - | 1개 |
| `CARGO_V2_CSS` | src/components/PrintableCargoPlanV2.jsx:131 | 4개 파일 | - | 1개 |
| `computeStats` | bulk_tally.html:1590 | 3개 파일 | bulk_tally.html | 8개 |
| `coneAnswer` | src/coneKnowledge.js:216 | 2개 파일 | mir-core.js, public/mir-core.js | 2개 |
| `coneBriefing` | src/coneKnowledge.js:57 | 2개 파일 | mir-core.js, public/mir-core.js | **없음** |
| `currentShift` | src/utils.js:7035 | 4개 파일 | - | 2개 |
| `deckCoordMap` | src/rzorPlan.js:359 | 4개 파일 | - | 5개 |
| `diffChanges` | src/planEditCore.js:223 | 4개 파일 | - | **없음** |
| `EDI_EMPTY_FILL_KEYS` | src/utils.js:5218 | 4개 파일 | - | 1개 |
| `ediCoreEmpty` | src/utils.js:5219 | 4개 파일 | - | 1개 |
| `expectedWorkTimeOf` | src/mir.js:874 | 2개 파일 | mir-core.js, public/mir-core.js | 3개 |
| `fbCancelComplete` | src/firebase.js:1304 | 4개 파일 | - | 5개 |
| `fbSetVoyageCraneCrew` | src/firebase.js:305 | 4개 파일 | - | 4개 |
| `fbSetXraySeal` | src/firebase.js:887 | 4개 파일 | - | 5개 |
| `fmtShiftTime` | src/utils.js:9280 | 4개 파일 | - | **없음** |
| `formatBerth` | src/utils.js:4835 | 4개 파일 | - | **없음** |
| `formatHatchBays` | src/utils.js:6113 | 4개 파일 | - | **없음** |
| `fullEdiMapOf` | src/utils.js:9085 | 4개 파일 | - | 3개 |
| `generateBriefing` | src/nlSearch.js:2220 | 2개 파일 | mir-core.js, public/mir-core.js | 4개 |
| `generateLocalAnswer` | src/nlSearch.js:4199 | 2개 파일 | mir-core.js, public/mir-core.js | 11개 |
| `healthSummary` | src/health.js:47 | 4개 파일 | - | **없음** |
| `heartbeatState` | src/health.js:54 | 4개 파일 | - | **없음** |
| `inferDischargePos` | src/utils.js:10789 | 2개 파일 | cone.html, public/cone.html | 2개 |
| `isConeQuery` | src/coneKnowledge.js:331 | 2개 파일 | mir-core.js, public/mir-core.js | **없음** |
| `isISO403` | src/utils.js:1676 | 4개 파일 | - | 3개 |
| `isISO403PhotoTaken` | src/utils.js:1701 | 4개 파일 | - | **없음** |
| `isRfListSrc` | src/utils.js:9830 | 4개 파일 | - | 2개 |
| `isTermOtL` | src/utils.js:830 | 4개 파일 | - | **없음** |
| `keepShiftForecastOf` | src/utils.js:9501 | 2개 파일 | cone.html, public/cone.html | 4개 |
| `logQuerySettled` | src/activityLog.js:87 | 4개 파일 | - | 1개 |
| `MIR_MOODS` | src/mir.js:3981 | 2개 파일 | mir-core.js, public/mir-core.js | 1개 |
| `mirDoneUpWhy` | src/mir.js:4413 | 2개 파일 | mir-core.js, public/mir-core.js | 1개 |
| `mirGotoRequest` | src/guideGoto.js:17 | 4개 파일 | - | 1개 |
| `mirHeroSrc` | src/components/mirPhotoArt.js:42 | 2개 파일 | mir-core.js, public/mir-core.js | 1개 |
| `mirPhotoKey` | src/components/mirPhotoArt.js:22 | 2개 파일 | mir-core.js, public/mir-core.js | 1개 |
| `ownDirCns` | src/utils.js:5426 | 4개 파일 | - | 2개 |
| `parsePortMisDateTime` | src/utils.js:4872 | 4개 파일 | - | **없음** |
| `parseSpokenDigits` | src/voice.js:87 | 4개 파일 | - | **없음** |
| `pierOf` | cone.html:2705 | 2개 파일 | cone.html, public/cone.html | 1개 |
| `reeferTempOf` | src/utils.js:1494 | 4개 파일 | - | 3개 |
| `resolveShipKey` | src/utils.js:476 | 4개 파일 | - | **없음** |
| `sealConflictOf` | src/utils.js:9834 | 4개 파일 | - | 2개 |
| `sealPredictOf` | src/nlSearch.js:2004 | 2개 파일 | mir-core.js, public/mir-core.js | 3개 |
| `seqFullConfirmText` | src/utils.js:10597 | 4개 파일 | - | 1개 |
| `setLaneRoutes` | src/utils.js:6425 | 2개 파일 | cone.html, public/cone.html | 5개 |
| `shiftEvidenceOf` | src/utils.js:10179 | 4개 파일 | - | 5개 |
| `shiftGangKey` | src/utils.js:8666 | 4개 파일 | - | 1개 |
| `shiftSplitOf` | src/utils.js:9984 | 4개 파일 | - | 5개 |
| `shipIdentityOf` | src/portMisMatch.js:28 | 4개 파일 | - | 2개 |
| `shipPickChips` | src/mir.js:1033 | 2개 파일 | mir-core.js, public/mir-core.js | 1개 |
| `spellKo` | src/voice.js:56 | 4개 파일 | - | **없음** |
| `summarize` | src/planEditCore.js:292 | 4개 파일 | - | **없음** |
| `toMirContainers` | src/mirCore.entry.js:43 | 0개 파일 | cone.html, mir-core.js, public/cone.html, public/mir-core.js | 18개 |
| `useChoice` | src/components/ChoiceModal.jsx:81 | 4개 파일 | - | **없음** |
| `useShipSpeed` | src/useCarrierContacts.js:17 | 4개 파일 | - | **없음** |
| `xraySealerOf` | src/utils.js:11247 | 4개 파일 | - | 2개 |
| `_mirDeferReset` | src/mir.js:4163 | 1개 파일 | mir-core.js, public/mir-core.js | 1개 |
| `_mirThreadReset` | src/mir.js:3614 | 1개 파일 | mir-core.js, public/mir-core.js | 9개 |
| `_planEnd` | cone.html:1092 | 1개 파일 | cone.html, public/cone.html | **없음** |
| `_planMs` | cone.html:1087 | 1개 파일 | cone.html, public/cone.html | **없음** |
| `activeHeldOf` | src/utils.js:8541 | 3개 파일 | - | 1개 |
| `aiCall` | src/gemini.js:167 | 3개 파일 | - | 3개 |
| `answerYard` | src/mir.js:4500 | 1개 파일 | mir-core.js, public/mir-core.js | 1개 |
| `anxiousReasons` | src/mir.js:4278 | 1개 파일 | mir-core.js, public/mir-core.js | 1개 |
| `applyPolicyToContainer` | src/shipPolicies.js:22 | 3개 파일 | - | **없음** |
| `bayParityError` | src/utils.js:10228 | 3개 파일 | - | **없음** |
| `bookingFillOfSec` | src/utils.js:1658 | 3개 파일 | - | 2개 |
| `buildOccupancy` | src/utils.js:11110 | 3개 파일 | - | **없음** |
| `buildPrintModel` | src/rzorPrintModel.js:136 | 3개 파일 | - | 3개 |
| `bundleDocOffText` | src/tallyReport.js:346 | 3개 파일 | - | 1개 |
| `bundleKeyOf` | src/tallyReport.js:371 | 3개 파일 | - | 4개 |
| `canEditReport` | src/utils.js:8277 | 3개 파일 | - | 2개 |
| `compressForReport` | src/mixerUpload.js:325 | 3개 파일 | - | **없음** |
| `computeBayRenderData` | src/cargoPlanCore.js:988 | 3개 파일 | - | 1개 |
| `computeShiftingMap` | src/utils.js:5677 | 1개 파일 | cone.html, public/cone.html | 5개 |
| `craneBaysByTime` | src/utils.js:7586 | 1개 파일 | cone.html, public/cone.html | 3개 |
| `crewCraneNo` | src/utils.js:7426 | 3개 파일 | - | **없음** |
| `deckPlanDate` | src/components/PrintableDeckPlan.jsx:335 | 3개 파일 | - | 1개 |
| `describeMovePath` | src/utils.js:10519 | 3개 파일 | - | **없음** |
| `describeQuery` | src/nlSearch.js:1087 | 3개 파일 | - | **없음** |
| `dupSealMap` | src/utils.js:5563 | 3개 파일 | - | **없음** |
| `ediByUnitCn` | src/utils.js:9722 | 3개 파일 | - | **없음** |
| `ediMapFromRaw` | src/utils.js:9016 | 3개 파일 | - | 3개 |
| `ediWtField` | src/utils.js:2881 | 3개 파일 | - | 2개 |
| `fbAddClaudeMemo` | src/firebase.js:4468 | 3개 파일 | - | 1개 |
| `fbGetAdminGuard` | src/firebase.js:4156 | 3개 파일 | - | 1개 |
| `fbListArchive` | src/firebase.js:2759 | 3개 파일 | - | 2개 |
| `fbSaveShipBayDict` | src/firebase.js:3714 | 3개 파일 | - | 2개 |
| `fbSetInspectorActivity` | src/firebase.js:2323 | 3개 파일 | - | 5개 |
| `fbSetVoyageGangs` | src/firebase.js:261 | 3개 파일 | - | 4개 |
| `fbSetVoyageWorkStart` | src/firebase.js:280 | 3개 파일 | - | 4개 |
| `fbSubscribeFeedback` | src/firebase.js:2894 | 3개 파일 | - | 1개 |
| `fbSubscribeMatrixEditors` | src/firebase.js:4094 | 3개 파일 | - | 1개 |
| `fbSubscribeShipBayDict` | src/firebase.js:3920 | 3개 파일 | - | 1개 |
| `fbSubscribeShipPolicies` | src/shipPolicies.js:45 | 3개 파일 | - | **없음** |
| `fbUpdateRecordSeal` | src/firebase.js:683 | 3개 파일 | - | 2개 |
| `ferryReportCuts` | src/utils.js:4815 | 3개 파일 | - | 2개 |
| `findTwinCandidate` | src/twin.js:92 | 3개 파일 | - | 1개 |
| `frBundlesOf` | src/tallyReport.js:460 | 3개 파일 | - | 4개 |
| `gangKeyFromWords` | src/utils.js:8677 | 3개 파일 | - | 4개 |
| `generatePdfBays` | src/cargoPlanCore.js:100 | 3개 파일 | - | 1개 |
| `getMeToday` | src/meToday.js:30 | 3개 파일 | - | 1개 |
| `getShipIdentity` | src/shipStructure.js:446 | 3개 파일 | - | **없음** |
| `hasAnyCondition` | src/nlSearch.js:1127 | 3개 파일 | - | 4개 |
| `hatchEvenOf` | src/cargoPlanCore.js:1063 | 3개 파일 | - | 2개 |
| `hatchSegCols` | src/utils.js:6097 | 3개 파일 | - | **없음** |
| `inspectorAllDone` | src/utils.js:6939 | 3개 파일 | - | 1개 |
| `inspectorStatus` | src/inspectorStatus.js:7 | 3개 파일 | - | 2개 |
| `isAdminName` | src/adminGuard.js:97 | 3개 파일 | - | 1개 |
| `isAdminUser` | src/workChoice.js:74 | 3개 파일 | - | 3개 |
| `isChatCandidate` | src/mir.js:3307 | 1개 파일 | mir-core.js, public/mir-core.js | 1개 |
| `isHiddenStaff` | src/staffList.js:166 | 3개 파일 | - | **없음** |
| `isLen45Iso` | src/utils.js:832 | 3개 파일 | - | **없음** |
| `isoCheckDigit` | src/utils.js:4335 | 3개 파일 | - | 2개 |
| `isoConflictOf` | src/utils.js:1188 | 3개 파일 | - | 3개 |
| `isoFeet` | src/utils.js:5479 | 3개 파일 | - | **없음** |
| `isoFixLastDigit` | src/utils.js:4349 | 3개 파일 | - | 1개 |
| `isoOtHeightConflict` | src/utils.js:1215 | 3개 파일 | - | **없음** |
| `isOppositeDirRecord` | src/utils.js:5417 | 3개 파일 | - | 4개 |
| `isPredShift` | src/cargoPlanCore.js:1056 | 3개 파일 | - | 4개 |
| `isPtkPort` | cone.html:589 | 0개 파일 | cone.html, merge_entry.js, public/cone.html | 1개 |
| `isPtkResolved` | src/utils.js:1282 | 3개 파일 | - | 1개 |
| `isReeferCheckSkipped` | src/utils.js:10686 | 3개 파일 | - | 1개 |
| `isSealError` | src/utils.js:9970 | 3개 파일 | - | 2개 |
| `isSentenceQuery` | src/utils.js:30 | 3개 파일 | - | 2개 |
| `isShipAskText` | src/mir.js:1031 | 1개 파일 | mir-core.js, public/mir-core.js | 2개 |
| `isSlotEntry` | src/utils.js:1587 | 3개 파일 | - | 1개 |
| `isTester` | src/staffList.js:186 | 3개 파일 | - | **없음** |
| `isViewOnlyNow` | src/workChoice.js:63 | 3개 파일 | - | 3개 |
| `isVisibleStaff` | src/staffList.js:170 | 3개 파일 | - | **없음** |
| `keepConfirmedFromMaps` | src/utils.js:9469 | 1개 파일 | cone.html, public/cone.html | 2개 |
| `keepConfirmedOf` | src/utils.js:9440 | 3개 파일 | - | 2개 |
| `loadingNoPosAsk` | src/utils.js:11363 | 3개 파일 | - | 2개 |
| `MADE_UNIT_LABEL` | src/utils.js:9786 | 3개 파일 | - | **없음** |
| `MIR_BUSY_FREE_PER_HOUR` | src/mir.js:4102 | 1개 파일 | mir-core.js, public/mir-core.js | **없음** |
| `MIR_CATALOG` | src/mir.js:3213 | 1개 파일 | mir-core.js, public/mir-core.js | 2개 |
| `MIR_DEFER_TEXT` | src/mir.js:4104 | 1개 파일 | mir-core.js, public/mir-core.js | 1개 |
| `MIR_PHOTO_CSS` | src/components/mirPhotoArt.js:61 | 1개 파일 | mir-core.js, public/mir-core.js | 1개 |
| `MIR_PHOTO_KEYS` | src/components/mirPhotoArt.js:15 | 1개 파일 | mir-core.js, public/mir-core.js | 1개 |
| `MIR_POSES` | src/components/mirPhotoArt.js:19 | 1개 파일 | mir-core.js, public/mir-core.js | 1개 |
| `mirBusyNow` | src/mir.js:4106 | 1개 파일 | mir-core.js, public/mir-core.js | 1개 |
| `mirDeferredPending` | src/mir.js:4160 | 1개 파일 | mir-core.js, public/mir-core.js | 1개 |
| `mirLeftover` | src/mir.js:3021 | 1개 파일 | mir-core.js, public/mir-core.js | 4개 |
| `mirMoodNow` | src/mir.js:4368 | 1개 파일 | mir-core.js, public/mir-core.js | 1개 |
| `mirPoseNo` | src/components/mirPhotoArt.js:35 | 1개 파일 | mir-core.js, public/mir-core.js | 1개 |
| `mirSee` | src/mir.js:1748 | 3개 파일 | - | 4개 |
| `mirWorkCtx` | src/workChoice.js:95 | 3개 파일 | - | **없음** |
| `overDims` | src/utils.js:5489 | 3개 파일 | - | **없음** |
| `parseSpokenTimeMs` | src/utils.js:7053 | 3개 파일 | - | 1개 |
| `parseXrayList` | src/utils.js:4008 | 2개 파일 | merge_entry.js | **없음** |
| `pauseTargetsOf` | src/mir.js:4309 | 1개 파일 | mir-core.js, public/mir-core.js | 2개 |
| `pickSpeechAlternative` | src/voice.js:287 | 3개 파일 | - | **없음** |
| `podConflictOf` | src/utils.js:1236 | 3개 파일 | - | 2개 |
| `predictedShiftingForDisplay` | src/utils.js:9548 | 1개 파일 | cone.html, public/cone.html | 3개 |
| `readMirYard` | src/mir.js:4453 | 1개 파일 | mir-core.js, public/mir-core.js | 1개 |
| `requestPermission` | src/mailboxFs.js:78 | 3개 파일 | - | **없음** |
| `resolvedPod` | src/utils.js:1277 | 3개 파일 | - | **없음** |
| `restowMapFromDoc` | src/utils.js:9227 | 1개 파일 | cone.html, public/cone.html | 6개 |
| `shiftEvidenceCore` | src/utils.js:10112 | 1개 파일 | cone.html, public/cone.html | 5개 |
| `shiftingListOf` | src/utils.js:9321 | 3개 파일 | - | 7개 |
| `shipPickCodes` | src/mir.js:1017 | 1개 파일 | mir-core.js, public/mir-core.js | 1개 |
| `slotAdjacencyError` | src/utils.js:10275 | 3개 파일 | - | **없음** |
| `speakLong` | src/voice.js:151 | 3개 파일 | - | 1개 |
| `SPECIAL_FILL` | src/components/PrintableCargoPlanV2.jsx:61 | 3개 파일 | - | 2개 |
| `StatsTab` | bulk_tally.html:1752 | 2개 파일 | bulk_tally.html | 6개 |
| `tagForecastMarks` | src/utils.js:10386 | 3개 파일 | - | 2개 |
| `termBoardOf` | src/termBoard.js:58 | 1개 파일 | mir-core.js, public/mir-core.js | 1개 |
| `useBackHandler` | src/backHandler.js:27 | 3개 파일 | - | **없음** |
| `useHatchCountConfirm` | src/components/HatchCountConfirm.jsx:94 | 3개 파일 | - | **없음** |
| `voyagePlanEndMs` | src/utils.js:8715 | 3개 파일 | - | 2개 |
| `voyagePlanMs` | src/utils.js:8709 | 3개 파일 | - | 2개 |
| `voyageReportSpan` | src/nlSearch.js:3370 | 3개 파일 | - | **없음** |
| `listRevisionDrops` | src/listRevision.js:52 | 1개 파일 | merge_entry.js | 1개 |
| `Section` | bulk_tally.html:1827 | 1개 파일 | bulk_tally.html | **없음** |
