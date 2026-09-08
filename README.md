# 정보처리기사 필기 기출문제 퀴즈

정보처리기사 필기 기출문제를 개인 학습용으로 연습하는 로컬 웹 앱입니다. 서버와 유료 API 없이 브라우저의 `localStorage`에 학습 기록, 진행 중인 풀이, 오답노트를 저장합니다.

## 실행 방법

```bash
npm install
npm run dev
```

브라우저에서 터미널에 표시되는 로컬 주소를 열면 됩니다.

## 검증 방법

```bash
npm run validate-data
npm run lint
npm run build
```

`npm run build`는 `src/data/exams`의 JSON을 `public/data/exams`로 동기화한 뒤 TypeScript 검사와 Vite 프로덕션 빌드를 함께 실행합니다.

## PDF 변환 방법

프로젝트 루트에 `202N년 N회_정보처리기사 필기 기출문제.pdf` 형식의 PDF가 있으면 다음 명령으로 JSON을 생성할 수 있습니다.

```bash
npm run convert-pdfs
npm run validate-data
```

변환 스크립트는 문제 번호 1~100, 보기 4개, 정답 범위를 검증 가능한 JSON 구조로 저장합니다. PDF의 표, 코드, 그림, 정답표가 불확실한 문항은 `needsReview: true`로 표시하고, 복수 정답이나 전항 정답처럼 숫자 하나로 표현하기 어려운 경우 `answerNote`를 함께 남깁니다.

## 문제 추가 방법

1. `src/data/exams` 폴더에 `연도-회차.json` 형식의 파일을 추가합니다.
2. JSON 구조는 기존 샘플과 같은 형태를 사용합니다.
3. `answer` 값은 정답 보기의 원래 번호인 `1`, `2`, `3`, `4` 중 하나로 입력합니다.
4. 확실하지 않은 문제는 `needsReview: true`를 추가해 검수 상태로 표시합니다.
5. 이미지나 표가 필요한 문제는 `image` 필드에 앱에서 접근 가능한 이미지 경로를 넣을 수 있습니다.

새 JSON 파일은 `npm run build` 또는 `npm run sync-data` 실행 시 `public/data/exams/manifest.json`에 반영되어 시험 목록에 나타납니다.

## 주요 파일

- `src/data/exams`: 시험별 문제 JSON
- `src/types/quiz.ts`: 시험, 문제, 풀이 결과 타입
- `src/utils/quizUtils.ts`: 문제 선택, 랜덤 섞기, 결과 계산
- `src/utils/storageUtils.ts`: 오답노트와 학습 기록 저장
- `src/hooks/useQuiz.ts`: 풀이 진행 상태 관리
- `src/pages`: 메인, 문제풀이, 결과, 오답노트 화면

저작권이 있는 기출문제 데이터는 개인 학습 목적으로만 사용하고, 원본 PDF나 문제 데이터를 외부에 자동 배포하지 않도록 주의하세요.

## GitHub 백업 안내

개인 학습용 비공개 저장소입니다. 실행에 필요한 코드, 변환된 문제 데이터와 이미지를 포함합니다. 원본 PDF, 설치 의존성(node_modules), 빌드 결과와 임시 파일은 제외했습니다. PDF 재추출 작업은 기존 PC의 원본 PDF가 필요합니다. 학습 기록은 브라우저에 저장되며 이 저장소에 포함되지 않습니다.

