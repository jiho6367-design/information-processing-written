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
  const readRecords = () => read('info-processing-quiz:study-records', []);
  const readNotes = () => read('info-processing-quiz:wrong-answers', []);
  const readSets = async () => (await read(
    'info-processing-quiz:saved-wrong-sets',
    { version: 1, items: [] },
  )).items;

  await page.evaluate(() => {
    localStorage.clear();
    const ids = ['2020-4-049', '2020-4-051', '2020-4-077', '2020-2-022', '2025-1-001'];
    const now = new Date().toISOString();
    localStorage.setItem('info-processing-quiz:saved-wrong-sets', JSON.stringify({
      version: 1,
      items: [{
        id: 'parent-set',
        title: '부모 오답 세트',
        createdAt: now,
        updatedAt: now,
        sourceAttemptId: 'parent-attempt',
        sourceType: 'exam',
        years: [2025, 2020],
        examKeys: ['2025-1', '2020-4', '2020-2'],
        subjectNumbers: [1, 2, 3, 4],
        originalQuestionIds: ids,
        originalQuestionOrder: ids,
        remainingQuestionIds: ids,
        masteredQuestionIds: [],
        originalWrongCount: ids.length,
        retryCount: 0,
        isBookmarked: false,
      }],
    }));
  });
  await page.reload();
  await page.waitForSelector('.selector-panel');
  await page.locator('.app-header').getByRole('button', { name: '저장된 오답 세트' }).click();
  const parentCard = page.locator('.saved-set-card').filter({ hasText: '부모 오답 세트' });
  await parentCard.getByRole('button', { name: '전체 다시 풀기' }).click();
  await page.waitForSelector('.question-card');
  await page.waitForFunction(() => localStorage.getItem('info-processing-quiz:current-session') !== null);

  const parentSession = await readSession();
  const wrongIds = ['2020-4-051', '2020-2-022'];
  for (let index = 0; index < parentSession.questions.length; index += 1) {
    await page.locator('.question-dot').nth(index).click();
    const displayNumber = await page.evaluate((shouldBeWrong) => {
      const session = JSON.parse(localStorage.getItem('info-processing-quiz:current-session'));
      const question = session.questions[session.currentIndex];
      return question.runtimeChoices.find((choice) => shouldBeWrong
        ? choice.originalNumber !== question.answer
        : choice.originalNumber === question.answer).displayNumber;
    }, wrongIds.includes(parentSession.questions[index].id));
    await page.locator('.choice-button').nth(displayNumber - 1).click();
  }
  await page.locator('.question-dot').last().click();
  await page.getByRole('button', { name: '결과 확인' }).click();
  await page.waitForSelector('.result-summary');

  let sets = await readSets();
  let parent = sets.find((item) => item.id === 'parent-set');
  const attemptRecord = (await readRecords())[0];
  check('부모 진행률 갱신',
    parent.originalQuestionIds.length === 5 && parent.remainingQuestionIds.length === 2 &&
      parent.masteredQuestionIds.length === 3 && parent.retryCount === 1,
    parent);
  check('저장 세트 결과의 오답 스냅샷',
    attemptRecord.sourceType === 'saved-wrong-set' &&
      attemptRecord.savedWrongSetId === 'parent-set' &&
      attemptRecord.wrongQuestionIds.length === 2 &&
      attemptRecord.wrongQuestionIds.every((id) => wrongIds.includes(id)),
    attemptRecord);
  check('파생 세트 저장 폼과 기본 이름',
    await page.getByRole('button', { name: '이번 오답 세트 저장 · 2문제' }).count() === 1 &&
      await page.getByRole('textbox', { name: '오답 세트 이름' }).inputValue() ===
        '부모 오답 세트 재풀이 오답 2문제',
    await page.locator('body').innerText());

  const responsive = [];
  for (const width of [360, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    const state = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    responsive.push({ viewport: width, ...state });
    check(`결과 화면 ${width}px`, state.scrollWidth <= state.clientWidth + 2, state);
  }

  await page.reload();
  await page.waitForSelector('.selector-panel');
  await page.getByRole('button', { name: '최근 결과' }).click();
  await page.waitForSelector('.result-summary');
  check('새로고침 후 파생 세트 저장 가능',
    await page.getByRole('button', { name: '이번 오답 세트 저장 · 2문제' }).count() === 1,
    await page.locator('body').innerText());
  await page.getByRole('button', { name: '이번 오답 세트 저장 · 2문제' }).click();
  await page.getByText('이번 재풀이에서 틀린 2문제를 새 오답 세트로 저장했습니다.').waitFor();

  sets = await readSets();
  parent = sets.find((item) => item.id === 'parent-set');
  const child = sets.find((item) => item.id !== 'parent-set');
  const linkedRecord = (await readRecords()).find((item) => item.id === attemptRecord.id);
  check('이번 오답 2개만 파생 세트 저장',
    sets.length === 2 && child.sourceType === 'saved-wrong-set' &&
      child.sourceAttemptId === attemptRecord.id &&
      child.originalQuestionIds.length === 2 &&
      child.originalQuestionIds.every((id) => wrongIds.includes(id)) &&
      JSON.stringify(child.remainingQuestionIds) === JSON.stringify(child.originalQuestionIds) &&
      child.masteredQuestionIds.length === 0,
    { parent, child });
  check('부모와 생성 세트 ID 분리',
    linkedRecord.savedWrongSetId === 'parent-set' &&
      linkedRecord.createdSavedWrongSetId === child.id,
    linkedRecord);
  check('저장 후 부모 상태 불변',
    parent.originalQuestionIds.length === 5 && parent.remainingQuestionIds.length === 2 &&
      parent.masteredQuestionIds.length === 3,
    parent);
  check('동일 시도 중복 저장 방지',
    await page.getByRole('button', { name: '저장됨' }).isDisabled() && sets.length === 2,
    sets);

  await page.getByRole('button', { name: '오답 세트로 돌아가기' }).click();
  await page.evaluate(() => { window.confirm = () => true; });
  await page.locator('.saved-set-card').filter({
    has: page.getByRole('heading', { name: '부모 오답 세트', exact: true }),
  })
    .getByRole('button', { name: '삭제' }).click();
  sets = await readSets();
  check('부모 삭제 후 파생 세트 유지',
    sets.length === 1 && sets[0].id === child.id && (await readNotes()).length === 2,
    { sets, notes: await readNotes() });

  const childCard = page.locator('.saved-set-card').filter({ hasText: child.title });
  await childCard.getByRole('button', { name: '전체 다시 풀기' }).click();
  await page.waitForSelector('.question-card');
  await page.waitForFunction(() => localStorage.getItem('info-processing-quiz:current-session') !== null);
  const childSession = await readSession();
  check('파생 세트 독립 재풀이',
    childSession.questions.length === 2 &&
      childSession.questions.every((question) => wrongIds.includes(question.id)),
    childSession.questions.map((question) => question.id));

  const derivedRendering = [];
  for (let index = 0; index < childSession.questions.length; index += 1) {
    await page.locator('.question-dot').nth(index).click();
    derivedRendering.push(await page.evaluate(() => ({
      code: document.querySelectorAll('.code-block').length,
      table: document.querySelectorAll('.question-table').length,
      image: document.querySelectorAll('.question-image').length,
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
    })));
  }
  check('파생 세트 코드 표 이미지 렌더링',
    derivedRendering.some((item) => item.code > 0) &&
      derivedRendering.some((item) => item.table > 0) &&
      derivedRendering.some((item) => item.image > 0) &&
      derivedRendering.every((item) => !item.overflow),
    derivedRendering);

  for (let index = 0; index < childSession.questions.length; index += 1) {
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
  check('오답 0개 파생 세트 생성 차단',
    await page.getByRole('button', { name: /이번 오답 세트 저장/ }).count() === 0 &&
      (await readSets()).length === 1,
    await page.locator('body').innerText());

  return JSON.stringify({ failures, checks, responsive, parentWrongIds: wrongIds, childId: child.id });
}
