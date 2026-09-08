/* eslint-disable */
async (page) => {
  const failures = [];
  const checks = [];
  const check = (name, condition, details) => {
    checks.push({ name, passed: Boolean(condition) });
    if (!condition) failures.push({ name, details });
  };
  const read = (key, fallback) => page.evaluate(
    ([storageKey, defaultValue]) => JSON.parse(localStorage.getItem(storageKey) || JSON.stringify(defaultValue)),
    [key, fallback],
  );
  const readSession = () => read('info-processing-quiz:current-session', null);
  const readSets = async () => (await read('info-processing-quiz:saved-wrong-sets', { version: 1, items: [] })).items;
  const readNotes = () => read('info-processing-quiz:wrong-answers', []);
  const readRecords = () => read('info-processing-quiz:study-records', []);

  await page.evaluate(async () => {
    localStorage.clear();
    const ids = [
      '2020-4-049', '2020-4-051', '2020-2-022', '2020-4-077',
      '2025-1-001', '2025-1-002', '2025-1-003', '2025-1-004', '2025-1-005', '2025-1-006',
    ];
    const cache = {};
    const now = new Date().toISOString();
    const notes = [];
    for (const id of ids) {
      const examId = id.split('-').slice(0, 2).join('-');
      cache[examId] ||= await (await fetch(`/data/exams/${examId}.json`)).json();
      const data = cache[examId];
      const question = data.questions.find((item) => item.id === id);
      notes.push({
        questionId: id,
        examId,
        exam: data.exam,
        question,
        selectedChoice: question.answer === 1 ? 2 : 1,
        addedAt: now,
        updatedAt: now,
        wrongCount: 1,
        correctCount: 0,
        attempts: 1,
      });
    }
    localStorage.setItem('info-processing-quiz:wrong-answers', JSON.stringify(notes));
    localStorage.setItem('info-processing-quiz:keep-wrong-until-manual-delete', JSON.stringify(true));
  });
  await page.reload();
  await page.waitForSelector('.selector-panel');
  await page.locator('.app-header').getByRole('button', { name: '오답노트' }).click();
  await page.getByRole('heading', { name: '오답노트' }).waitFor();
  await page.getByRole('button', { name: '전체 오답 다시 풀기' }).click();
  await page.waitForSelector('.question-card');
  await page.waitForFunction(() => localStorage.getItem('info-processing-quiz:current-session') !== null);

  const initialSession = await readSession();
  const targetWrongIds = ['2020-4-049', '2020-4-051', '2020-2-022', '2020-4-077'];
  const wrongIndices = targetWrongIds.map((id) => initialSession.questions.findIndex((question) => question.id === id));
  const expectedWrongIds = initialSession.questions
    .map((question) => question.id)
    .filter((id) => targetWrongIds.includes(id));
  for (let index = 0; index < initialSession.questions.length; index += 1) {
    await page.locator('.question-dot').nth(index).click();
    const displayNumber = await page.evaluate((shouldBeWrong) => {
      const session = JSON.parse(localStorage.getItem('info-processing-quiz:current-session'));
      const question = session.questions[session.currentIndex];
      return question.runtimeChoices.find((choice) => shouldBeWrong
        ? choice.originalNumber !== question.answer
        : choice.originalNumber === question.answer).displayNumber;
    }, wrongIndices.includes(index));
    await page.locator('.choice-button').nth(displayNumber - 1).click();
  }
  await page.locator('.question-dot').last().click();
  await page.getByRole('button', { name: '결과 확인' }).click();
  await page.waitForSelector('.result-summary');

  let records = await readRecords();
  let record = records[0];
  check('wrong-note 학습 기록 스냅샷',
    record.sourceType === 'wrong-note' && record.questionIds.length === 10 &&
      record.correctQuestionIds.length === 6 &&
      JSON.stringify(record.wrongQuestionIds) === JSON.stringify(expectedWrongIds),
    record);
  check('재풀이 결과 정보',
    (await page.locator('[aria-label="현재 오답노트 재풀이 결과"]').innerText()).includes('이번 오답\n4문제'),
    await page.locator('body').innerText());
  check('저장 버튼과 대상 수 표시',
    await page.getByRole('button', { name: '이번 오답 세트 저장 · 4문제' }).count() === 1,
    await page.locator('body').innerText());

  await page.reload();
  await page.waitForSelector('.selector-panel');
  await page.getByRole('button', { name: '최근 결과' }).click();
  await page.waitForSelector('.result-summary');
  check('새로고침 후 저장 버튼 복원',
    await page.getByRole('button', { name: '이번 오답 세트 저장 · 4문제' }).count() === 1,
    await page.locator('body').innerText());

  await page.getByRole('textbox', { name: '오답 세트 이름' }).fill('현재 오답 재풀이 4문제');
  await page.getByRole('button', { name: '이번 오답 세트 저장 · 4문제' }).click();
  await page.getByText('이번 재풀이에서 틀린 4문제를 오답 세트로 저장했습니다.').waitFor();
  let sets = await readSets();
  records = await readRecords();
  record = records.find((item) => item.id === record.id);
  const savedSet = sets.find((item) => item.title === '현재 오답 재풀이 4문제');
  check('이번 시도의 4개 오답만 저장',
    savedSet.originalQuestionIds.length === 4 &&
      new Set(savedSet.originalQuestionIds).size === 4 &&
      JSON.stringify(savedSet.originalQuestionOrder) === JSON.stringify(expectedWrongIds) &&
      JSON.stringify(savedSet.remainingQuestionIds) === JSON.stringify(expectedWrongIds) &&
      savedSet.masteredQuestionIds.length === 0 && savedSet.sourceType === 'wrong-note',
    savedSet);
  check('학습 기록 저장 세트 연결', record.savedWrongSetId === savedSet.id, record);
  check('현재 오답노트 독립 유지', (await readNotes()).length === 10, await readNotes());
  check('중복 저장 차단',
    await page.getByRole('button', { name: '저장됨' }).isDisabled() && sets.length === 1,
    sets);

  await page.getByRole('button', { name: '저장된 오답 세트 보기' }).click();
  const card = page.locator('.saved-set-card').filter({ hasText: '현재 오답 재풀이 4문제' });
  await card.getByRole('button', { name: '전체 다시 풀기' }).click();
  await page.waitForSelector('.question-card');
  await page.waitForFunction(() => localStorage.getItem('info-processing-quiz:current-session') !== null);
  const retrySession = await readSession();
  check('저장 세트 4문제 재출제',
    retrySession.questions.length === 4 &&
      JSON.stringify(retrySession.questions.map((question) => question.id)) === JSON.stringify(expectedWrongIds),
    retrySession.questions.map((question) => question.id));
  const rendering = [];
  for (let index = 0; index < retrySession.questions.length; index += 1) {
    await page.locator('.question-dot').nth(index).click();
    rendering.push(await page.evaluate(() => ({
      code: document.querySelectorAll('.code-block').length,
      table: document.querySelectorAll('.question-table').length,
      image: document.querySelectorAll('.question-image').length,
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
    })));
  }
  check('코드 표 이미지 재출제 렌더링',
    rendering.some((item) => item.code > 0) && rendering.some((item) => item.table > 0) &&
      rendering.some((item) => item.image > 0) && rendering.every((item) => !item.overflow),
    rendering);

  const responsive = [];
  for (const width of [360, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    const state = await page.evaluate(() => ({
      width: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    responsive.push({ viewport: width, ...state });
    check(`반응형 ${width}px`, state.scrollWidth <= state.width + 2, state);
  }

  await page.locator('.brand-button').click();
  await page.waitForSelector('.selector-panel');
  await page.locator('.app-header').getByRole('button', { name: '오답노트' }).click();
  await page.getByRole('button', { name: '전체 오답 다시 풀기' }).click();
  await page.waitForSelector('.question-card');
  await page.waitForFunction(() => localStorage.getItem('info-processing-quiz:current-session') !== null);
  const allCorrectSession = await readSession();
  for (let index = 0; index < allCorrectSession.questions.length; index += 1) {
    await page.locator('.question-dot').nth(index).click();
    const correctDisplay = await page.evaluate(() => {
      const session = JSON.parse(localStorage.getItem('info-processing-quiz:current-session'));
      const question = session.questions[session.currentIndex];
      return question.runtimeChoices.find((choice) => choice.originalNumber === question.answer).displayNumber;
    });
    await page.locator('.choice-button').nth(correctDisplay - 1).click();
  }
  await page.locator('.question-dot').last().click();
  await page.getByRole('button', { name: '결과 확인' }).click();
  await page.waitForSelector('.result-summary');
  check('오답 0개 빈 세트 차단',
    await page.getByRole('button', { name: /이번 오답 세트 저장/ }).count() === 0 &&
      (await readSets()).length === 1,
    await page.locator('body').innerText());

  await page.getByRole('button', { name: '현재 오답노트로 돌아가기' }).click();
  await page.evaluate(() => { window.confirm = () => true; });
  await page.getByRole('button', { name: '오답노트 비우기' }).click();
  check('오답노트 삭제 후 세트 원본 유지',
    (await readNotes()).length === 0 &&
      (await readSets())[0].originalQuestionIds.length === 4,
    { notes: await readNotes(), sets: await readSets() });
  await page.getByRole('tab', { name: '저장된 오답 세트' }).click();
  const independentCard = page.locator('.saved-set-card').filter({ hasText: '현재 오답 재풀이 4문제' });
  await independentCard.getByRole('button', { name: '삭제' }).click();
  check('세트 삭제 후 오답노트 독립 유지',
    (await readSets()).length === 0 && (await readNotes()).length === 0,
    { notes: await readNotes(), sets: await readSets() });

  return JSON.stringify({ failures, checks, responsive, savedIds: savedSet.originalQuestionIds });
}
