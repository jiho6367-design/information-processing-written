/* eslint-disable */
async (page) => {
  const failures = [];
  const checks = [];
  const fail = (name, details) => failures.push({ name, details });
  const check = (name, condition, details) => {
    checks.push({ name, passed: Boolean(condition) });
    if (!condition) fail(name, details);
  };

  const readJson = async (key, fallback) => page.evaluate(
    ([storageKey, storageFallback]) => JSON.parse(localStorage.getItem(storageKey) || JSON.stringify(storageFallback)),
    [key, fallback],
  );
  const readSession = () => readJson('info-processing-quiz:current-session', null);
  const readSets = async () => (await readJson('info-processing-quiz:saved-wrong-sets', { version: 1, items: [] })).items;
  const readNotes = () => readJson('info-processing-quiz:wrong-answers', []);
  const readRecords = () => readJson('info-processing-quiz:study-records', []);

  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForSelector('.selector-panel');

  const goHome = async () => {
    if ((await page.locator('.selector-panel').count()) === 0) {
      await page.locator('.brand-button').click();
      await page.waitForSelector('.selector-panel');
    }
    await page.evaluate(() => localStorage.removeItem('info-processing-quiz:current-session'));
  };

  const configure = async ({ years, exams, subjects, count }) => {
    await goHome();
    const blocks = page.locator('.selection-block');
    await blocks.nth(0).getByRole('button', { name: '전체 해제', exact: true }).click();
    for (const year of years) await blocks.nth(0).getByRole('button', { name: `${year}년`, exact: true }).click();
    if (exams) {
      await blocks.nth(1).getByRole('button', { name: '전체 회차 해제', exact: true }).click();
      for (const examId of exams) {
        const [year, session] = examId.split('-').map(Number);
        const group = blocks.nth(1).locator('.exam-year-group').filter({ hasText: `${year}년` });
        await group.getByRole('button', { name: `${session}회`, exact: true }).click();
      }
    }
    await blocks.nth(2).getByRole('button', { name: '전체 해제', exact: true }).click();
    for (const subject of subjects) await blocks.nth(2).getByRole('button', { name: new RegExp(`^${subject}과목 `) }).click();
    await page.getByRole('combobox', { name: '문제 수' }).selectOption(String(count));
    await page.getByRole('button', { name: '선택한 범위 학습 시작' }).click();
    await page.waitForSelector('.question-card');
    await page.waitForFunction(() => localStorage.getItem('info-processing-quiz:current-session') !== null);
  };

  const answerAt = async (index, shouldBeCorrect) => {
    await page.locator('.question-dot').nth(index).click();
    const displayNumber = await page.evaluate(({ correct, requestedIndex }) => {
      const session = JSON.parse(localStorage.getItem('info-processing-quiz:current-session'));
      if (!session) throw new Error(`answerAt(${requestedIndex}): current session is missing`);
      const question = session.questions[session.currentIndex];
      const choice = question.runtimeChoices.find((item) => correct
        ? item.originalNumber === question.answer
        : item.originalNumber !== question.answer);
      return choice.displayNumber;
    }, { correct: shouldBeCorrect, requestedIndex: index });
    await page.locator('.choice-button').nth(displayNumber - 1).click();
  };

  const answerAll = async (wrongIndices, startIndex = 0) => {
    const session = await readSession();
    if (!session) throw new Error(`answerAll(${startIndex}): current session is missing`);
    for (let index = startIndex; index < session.questions.length; index += 1) {
      await answerAt(index, !wrongIndices.includes(index));
    }
  };

  const finish = async () => {
    await page.locator('.question-dot').last().click();
    await page.getByRole('button', { name: '결과 확인' }).click();
    await page.waitForSelector('.result-summary');
  };

  const saveCurrentResult = async (title, bookmarked) => {
    const input = page.getByRole('textbox', { name: '오답 세트 이름' });
    await input.fill(title);
    const bookmark = page.getByRole('checkbox', { name: '북마크' });
    if ((await bookmark.isChecked()) !== bookmarked) await bookmark.click();
    await page.getByRole('button', { name: '이번 오답 세트 저장' }).click();
    await page.getByText(/오답 \d+문제를 세트로 저장했습니다/).waitFor();
  };

  const openSavedSets = async () => {
    await page.locator('.app-header').getByRole('button', { name: '저장된 오답 세트' }).click();
    await page.getByRole('heading', { name: '저장된 오답 세트' }).waitFor();
  };

  // 1. 일반 퀴즈 20문제에서 정확히 5개 오답을 생성하고 스냅샷으로 저장한다.
  await configure({ years: [2025], exams: ['2025-1'], subjects: [1], count: 20 });
  await answerAll([1, 5, 9, 13, 17]);
  await finish();
  await page.reload();
  await page.waitForSelector('.selector-panel');
  await page.locator('.app-header').getByRole('button', { name: '최근 결과' }).click();
  await page.waitForSelector('.result-summary');
  const firstRecord = (await readRecords())[0];
  check('학습 기록 문제별 ID 저장', firstRecord.questionIds.length === 20 && firstRecord.wrongQuestionIds.length === 5, firstRecord);
  await saveCurrentResult('기본 오답 세트', false);
  let sets = await readSets();
  const firstSetId = sets[0]?.id;
  check('오답 세트 5문제 생성', sets.length === 1 && sets[0].originalQuestionIds.length === 5, sets);
  check('오답 세트 문제 ID 중복 없음', new Set(sets[0].originalQuestionIds).size === 5, sets[0]);
  check('중복 저장 방지', await page.getByRole('button', { name: '저장됨' }).isDisabled(), '저장됨 버튼이 비활성화되지 않음');

  // 이름 변경, 북마크, 문제 목록과 상세를 UI로 검증한다.
  await openSavedSets();
  let card = page.locator('.saved-set-card').filter({ hasText: '기본 오답 세트' });
  await card.getByRole('button', { name: '이름 변경' }).click();
  card = page.locator('.saved-set-card').first();
  await card.getByRole('textbox', { name: '오답 세트 이름' }).fill('이름 변경된 오답 세트');
  await card.getByRole('button', { name: '저장', exact: true }).click();
  card = page.locator('.saved-set-card').filter({ hasText: '이름 변경된 오답 세트' });
  await card.getByRole('button', { name: '오답 세트 북마크 추가' }).click();
  await card.getByRole('button', { name: '문제 목록 보기' }).click();
  check('문제 목록 5개 표시', await card.locator('.saved-question-entry').count() === 5, await card.innerText());
  await card.locator('.saved-question-row').first().click();
  check('문제 상세 표시', await card.locator('.saved-question-detail').count() === 1, await card.innerText());
  sets = await readSets();
  check('이름과 북마크 저장', sets[0].title === '이름 변경된 오답 세트' && sets[0].isBookmarked, sets[0]);

  // 2. 최초 오답 전체 5문제: 3개 정답, 2개 오답. 중간 새로고침도 같은 순서/답변으로 복원한다.
  await card.getByRole('button', { name: '전체 다시 풀기' }).click();
  await page.waitForSelector('.question-card');
  await answerAt(0, true);
  const beforeReload = await readSession();
  await page.locator('.brand-button').click();
  await page.waitForSelector('.selector-panel');
  await page.reload();
  await page.waitForSelector('.question-card');
  const afterReload = await readSession();
  check('재풀이 새로고침 복원',
    JSON.stringify(beforeReload.questions.map((q) => q.id)) === JSON.stringify(afterReload.questions.map((q) => q.id)) &&
      Object.keys(afterReload.answers).length === 1,
    { beforeReload, afterReload });
  await answerAll([3, 4], 1);
  await finish();
  sets = await readSets();
  let firstSet = sets.find((set) => set.id === firstSetId);
  check('전체 재풀이 3숙달 2남음', firstSet.originalQuestionIds.length === 5 && firstSet.remainingQuestionIds.length === 2 && firstSet.masteredQuestionIds.length === 3, firstSet);
  check('재풀이 결과 범위 표시', (await page.locator('.saved-retry-summary').innerText()).includes('5 → 2'), await page.locator('.saved-retry-summary').innerText());
  check('기존 오답노트 독립 유지', (await readNotes()).length === 5, await readNotes());

  // 3. 남은 2문제를 모두 맞혀 완료한다. 원본 5개는 유지한다.
  await page.getByRole('button', { name: '현재 남은 문제 다시 풀기' }).click();
  await answerAll([]);
  await finish();
  firstSet = (await readSets()).find((set) => set.id === firstSetId);
  check('남은 문제 완료', firstSet.remainingQuestionIds.length === 0 && firstSet.masteredQuestionIds.length === 5 && firstSet.originalQuestionIds.length === 5, firstSet);
  check('복습 완료 메시지', await page.getByText('저장된 오답 세트의 모든 문제를 맞혔습니다.').count() === 1, await page.locator('body').innerText());

  // 4-5. 완료된 세트 전체 5개를 다시 풀고 한 문제를 틀려 남은 목록으로 되돌린다.
  await page.getByRole('button', { name: '최초 오답 전체 다시 풀기' }).click();
  const completedRetrySession = await readSession();
  check('완료 세트 최초 5문제 재출제', completedRetrySession.questions.length === 5, completedRetrySession);
  await answerAll([0]);
  await finish();
  firstSet = (await readSets()).find((set) => set.id === firstSetId);
  check('다시 틀린 문제 남음으로 복귀', firstSet.remainingQuestionIds.length === 1 && firstSet.masteredQuestionIds.length === 4 && firstSet.originalQuestionIds.length === 5, firstSet);

  // 11. 세 연도의 서로 다른 시험에서 동일 번호 충돌 없이 두 번째 세트를 만든다.
  await page.locator('.brand-button').click();
  await page.waitForSelector('.selector-panel');
  await configure({ years: [2020, 2021, 2022], exams: ['2020-4', '2021-1', '2022-1'], subjects: [3], count: 60 });
  await answerAll([0, 20, 40]);
  await finish();
  await saveCurrentResult('여러 연도 오답 세트', true);
  sets = await readSets();
  const multiYearSet = sets.find((set) => set.title === '여러 연도 오답 세트');
  const multiYearExamIds = [...new Set(multiYearSet.originalQuestionIds.map((id) => id.split('-').slice(0, 2).join('-')))].sort();
  check('여러 연도 문제 ID 안정성', multiYearSet.originalQuestionIds.length === 3 && new Set(multiYearSet.originalQuestionIds).size === 3 && JSON.stringify(multiYearExamIds) === JSON.stringify(['2020-4', '2021-1', '2022-1']), multiYearSet);
  await openSavedSets();
  const cards = page.locator('.saved-set-card');
  check('북마크 세트 상단 정렬', (await cards.first().innerText()).includes('여러 연도 오답 세트'), await cards.allInnerTexts());

  // 저장 세트의 시험 순 정렬과 무작위 순서 새로고침 복원을 확인한다.
  let multiCard = page.locator('.saved-set-card').filter({ hasText: '여러 연도 오답 세트' });
  await multiCard.getByRole('combobox', { name: '재풀이 순서' }).selectOption('exam');
  await multiCard.getByRole('button', { name: '전체 다시 풀기' }).click();
  let orderSession = await readSession();
  check('연도 회차 문제 번호 순서', JSON.stringify(orderSession.questions.map((question) => question.examId)) === JSON.stringify(['2022-1', '2021-1', '2020-4']), orderSession.questions.map((question) => question.id));
  await page.locator('.brand-button').click();
  await page.waitForSelector('.selector-panel');
  await page.evaluate(() => localStorage.removeItem('info-processing-quiz:current-session'));
  await openSavedSets();
  multiCard = page.locator('.saved-set-card').filter({ hasText: '여러 연도 오답 세트' });
  await multiCard.getByRole('combobox', { name: '재풀이 순서' }).selectOption('random');
  await multiCard.getByRole('button', { name: '전체 다시 풀기' }).click();
  const randomBeforeReload = await readSession();
  await page.locator('.brand-button').click();
  await page.waitForSelector('.selector-panel');
  await page.reload();
  await page.waitForSelector('.question-card');
  const randomAfterReload = await readSession();
  check('저장 세트 무작위 순서 복원',
    randomBeforeReload.config.questionOrder === 'random' &&
      new Set(randomBeforeReload.questions.map((question) => question.id)).size === randomBeforeReload.questions.length &&
      JSON.stringify(randomBeforeReload.questions.map((question) => question.id)) === JSON.stringify(randomAfterReload.questions.map((question) => question.id)),
    { randomBeforeReload, randomAfterReload });
  await page.locator('.brand-button').click();
  await page.waitForSelector('.selector-panel');
  await page.evaluate(() => localStorage.removeItem('info-processing-quiz:current-session'));
  await openSavedSets();

  // 8, 17, 19. 새로고침 유지와 잘못된/누락 데이터의 안전한 정규화를 확인한다.
  await page.evaluate(() => {
    const store = JSON.parse(localStorage.getItem('info-processing-quiz:saved-wrong-sets'));
    const sampleIds = store.items[0].originalQuestionIds.slice(0, 2);
    store.items.push({
      id: 'malformed-set', title: '정규화 테스트', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      years: [2025], examKeys: ['2025-1'], subjectNumbers: [1],
      originalQuestionIds: [sampleIds[0], sampleIds[0], sampleIds[1], '2099-9-999'],
      originalQuestionOrder: [sampleIds[0], sampleIds[0], '2099-9-999'],
      remainingQuestionIds: [sampleIds[0], 'outside-id'],
      masteredQuestionIds: [sampleIds[0], sampleIds[1], 'outside-id'],
      originalWrongCount: 3, retryCount: 0, isBookmarked: false,
    });
    localStorage.setItem('info-processing-quiz:saved-wrong-sets', JSON.stringify(store));
  });
  await page.reload();
  await page.waitForSelector('.selector-panel');
  await openSavedSets();
  const malformedCard = page.locator('.saved-set-card').filter({ hasText: '정규화 테스트' });
  check('잘못된 세트 데이터 정규화 후 화면 유지', await malformedCard.count() === 1 && (await malformedCard.innerText()).includes('찾을 수 없는 문제 1개'), await page.locator('body').innerText());
  const refreshedFirstSet = (await readSets()).find((set) => set.id === firstSetId);
  check('새로고침 후 진행 상태 유지', refreshedFirstSet.remainingQuestionIds.length === 1 && refreshedFirstSet.originalQuestionIds.length === 5, refreshedFirstSet);
  await malformedCard.getByRole('button', { name: '남은 문제만 풀기' }).click();
  await answerAll([]);
  await finish();
  const malformedAfterRetry = (await readSets()).find((set) => set.id === 'malformed-set');
  check('누락 문제 완료 오인 방지',
    malformedAfterRetry.remainingQuestionIds.includes('2099-9-999') &&
      await page.getByText('저장된 오답 세트의 모든 문제를 맞혔습니다.').count() === 0,
    malformedAfterRetry);
  await page.getByRole('button', { name: '오답 세트로 돌아가기' }).click();
  await page.getByRole('heading', { name: '저장된 오답 세트' }).waitFor();

  // 모바일과 데스크톱에서 가로 넘침을 검사하고 대표 화면을 저장한다.
  const responsive = [];
  for (const width of [360, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    const viewportResult = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
    }));
    responsive.push({ width, ...viewportResult });
    if (viewportResult.overflow) fail('반응형 가로 넘침', { width, viewportResult });
  }
  await page.setViewportSize({ width: 390, height: 900 });
  await page.screenshot({ path: 'output/playwright/saved-wrong-sets-mobile.png', fullPage: true });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.screenshot({ path: 'output/playwright/saved-wrong-sets-desktop.png', fullPage: true });

  // 9-10. 첫 세트를 삭제해도 오답노트, 학습 기록, 다른 세트는 유지된다.
  const notesBeforeDelete = await readNotes();
  const recordsBeforeDelete = await readRecords();
  await page.evaluate(() => { window.confirm = () => true; });
  const firstCard = page.locator('.saved-set-card').filter({ hasText: '이름 변경된 오답 세트' });
  await firstCard.getByRole('button', { name: '삭제' }).click();
  sets = await readSets();
  check('세트 단독 삭제', !sets.some((set) => set.id === firstSetId) && sets.some((set) => set.title === '여러 연도 오답 세트'), sets);
  check('삭제 후 오답노트와 학습 기록 유지', (await readNotes()).length === notesBeforeDelete.length && (await readRecords()).length === recordsBeforeDelete.length, {
    notesBefore: notesBeforeDelete.length, notesAfter: (await readNotes()).length,
    recordsBefore: recordsBeforeDelete.length, recordsAfter: (await readRecords()).length,
  });

  // 과거 학습 기록에는 문제별 ID가 없을 때 저장 버튼 안내가 표시된다.
  await page.evaluate(() => {
    const result = JSON.parse(localStorage.getItem('info-processing-quiz:last-result'));
    result.config.source = 'exam';
    delete result.config.savedWrongSetId;
    delete result.config.savedWrongSetTitle;
    localStorage.setItem('info-processing-quiz:last-result', JSON.stringify(result));
    const records = JSON.parse(localStorage.getItem('info-processing-quiz:study-records'));
    const record = records.find((item) => item.attemptId === result.sessionId);
    if (record) {
      delete record.questionIds;
      delete record.correctQuestionIds;
      delete record.wrongQuestionIds;
    }
    localStorage.setItem('info-processing-quiz:study-records', JSON.stringify(records));
  });
  await page.reload();
  await page.waitForSelector('.selector-panel');
  await page.locator('.app-header').getByRole('button', { name: '최근 결과' }).click();
  check('과거 기록 오답 정보 없음 안내', await page.getByText('이 학습 기록에는 문제별 오답 정보가 없어 오답 세트를 저장할 수 없습니다.').count() === 1, await page.locator('body').innerText());

  return JSON.stringify({ failures, checks, responsive, finalSetCount: (await readSets()).length });
}
