/* eslint-disable */
async (page) => {
  const failures = [];
  const scenarios = [];

  page.on('dialog', (dialog) => dialog.accept());

  const fail = (name, details) => failures.push({ name, details });

  const resetHome = async () => {
    if ((await page.locator('.selector-panel').count()) === 0) {
      await page.locator('.brand-button').click();
      await page.waitForSelector('.selector-panel');
    }
    await page.evaluate(() => localStorage.removeItem('info-processing-quiz:current-session'));
  };

  const reloadSavedSession = async () => {
    await page.locator('.brand-button').click();
    await page.waitForSelector('.selector-panel');
    await page.reload();
    await page.waitForSelector('.question-card');
  };

  const configure = async ({ years, exams, subjects, count = 'all', random = false }) => {
    await resetHome();
    const blocks = page.locator('.selection-block');
    const yearBlock = blocks.nth(0);
    const examBlock = blocks.nth(1);
    const subjectBlock = blocks.nth(2);

    await yearBlock.getByRole('button', { name: '전체 해제', exact: true }).click();
    for (const year of years) {
      await yearBlock.getByRole('button', { name: `${year}년`, exact: true }).click();
    }

    if (exams) {
      await examBlock.getByRole('button', { name: '전체 회차 해제', exact: true }).click();
      for (const examId of exams) {
        const [year, session] = examId.split('-').map(Number);
        const group = examBlock.locator('.exam-year-group').filter({ hasText: `${year}년` });
        await group.getByRole('button', { name: `${session}회`, exact: true }).click();
      }
    }

    await subjectBlock.getByRole('button', { name: '전체 해제', exact: true }).click();
    for (const subject of subjects) {
      await subjectBlock
        .getByRole('button', { name: new RegExp(`^${subject}과목 `) })
        .click();
    }

    await page.getByRole('combobox', { name: '문제 수' }).selectOption(String(count));
    const randomCheckbox = page.getByRole('checkbox', { name: '문제 순서 섞기' });
    if ((await randomCheckbox.isChecked()) !== random) await randomCheckbox.click();
  };

  const startAndRead = async (name, expected) => {
    const startButton = page.getByRole('button', { name: '선택한 범위 학습 시작' });
    if (await startButton.isDisabled()) {
      fail(name, '학습 시작 버튼이 비활성화됨');
      return null;
    }
    await startButton.click();
    await page.waitForSelector('.question-card');
    await page.waitForTimeout(100);
    const session = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('info-processing-quiz:current-session')),
    );
    const examIds = [...new Set(session.questions.map((question) => question.examId))].sort();
    const subjectNumbers = [...new Set(session.questions.map((question) => question.subjectNumber))].sort();
    const questionIds = session.questions.map((question) => question.id);
    const result = {
      questionCount: questionIds.length,
      uniqueCount: new Set(questionIds).size,
      configExamIds: [...(session.config.examIds || [])].sort(),
      configSubjectNumbers: [...(session.config.subjectNumbers || [])].sort(),
      examIds,
      subjectNumbers,
    };
    scenarios.push({ name, ...result });
    if (result.questionCount !== expected.count) fail(name, { expected: expected.count, result });
    if (result.uniqueCount !== result.questionCount) fail(name, { duplicateIds: result });
    if (expected.examIds && JSON.stringify(result.configExamIds) !== JSON.stringify([...expected.examIds].sort())) {
      fail(name, { expectedExamIds: expected.examIds, result });
    }
    if (JSON.stringify(result.configSubjectNumbers) !== JSON.stringify([...expected.subjects].sort()) ||
        result.subjectNumbers.some((subject) => !expected.subjects.includes(subject))) {
      fail(name, { expectedSubjects: expected.subjects, result });
    }
    return session;
  };

  await configure({ years: [2025], exams: ['2025-1'], subjects: [1], count: 20 });
  const legacySession = await startAndRead('기존 방식', {
    count: 20,
    examIds: ['2025-1'],
    subjects: [1],
  });

  if (legacySession) {
    await page.evaluate(() => {
      const session = JSON.parse(localStorage.getItem('info-processing-quiz:current-session'));
      delete session.config.examIds;
      delete session.config.subjectNumbers;
      delete session.config.years;
      localStorage.setItem('info-processing-quiz:current-session', JSON.stringify(session));
    });
    await reloadSavedSession();
    await page.waitForTimeout(100);
    const migrated = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('info-processing-quiz:current-session')).config,
    );
    if (JSON.stringify(migrated.examIds) !== JSON.stringify(['2025-1']) ||
        JSON.stringify(migrated.subjectNumbers) !== JSON.stringify([1])) {
      fail('과거 세션 마이그레이션', migrated);
    }
  }

  await configure({ years: [2025], subjects: [1, 2] });
  await startAndRead('한 연도 여러 과목', {
    count: 120,
    examIds: ['2025-1', '2025-2', '2025-3'],
    subjects: [1, 2],
  });

  await configure({ years: [2020, 2021, 2022], subjects: [3] });
  await startAndRead('여러 연도 한 과목', { count: 180, subjects: [3] });

  await configure({ years: [2023, 2024, 2025], subjects: [1, 4] });
  await startAndRead('여러 연도 여러 과목', { count: 360, subjects: [1, 4] });

  await configure({
    years: [2020, 2022, 2025],
    exams: ['2020-4', '2022-1', '2025-1'],
    subjects: [2],
  });
  await startAndRead('서로 다른 회차 직접 선택', {
    count: 60,
    examIds: ['2020-4', '2022-1', '2025-1'],
    subjects: [2],
  });

  await configure({ years: [2020, 2021, 2022, 2023, 2024, 2025, 2026], subjects: [1, 2, 3, 4, 5] });
  await startAndRead('전체 선택', { count: 2000, subjects: [1, 2, 3, 4, 5] });

  await resetHome();
  const blocks = page.locator('.selection-block');
  await blocks.nth(0).getByRole('button', { name: '전체 해제', exact: true }).click();
  const noYearDisabled = await page.getByRole('button', { name: '선택한 범위 학습 시작' }).isDisabled();
  const noYearMessage = await page.getByText('한 개 이상의 연도를 선택해주세요.').count();
  if (!noYearDisabled || noYearMessage === 0) fail('연도 선택 없음', { noYearDisabled, noYearMessage });

  await blocks.nth(0).getByRole('button', { name: '2025년', exact: true }).click();
  await blocks.nth(2).getByRole('button', { name: '전체 해제', exact: true }).click();
  const noSubjectDisabled = await page.getByRole('button', { name: '선택한 범위 학습 시작' }).isDisabled();
  const noSubjectMessage = await page.getByText('한 개 이상의 과목을 선택해주세요.').count();
  if (!noSubjectDisabled || noSubjectMessage === 0) {
    fail('과목 선택 없음', { noSubjectDisabled, noSubjectMessage });
  }

  await configure({ years: [2023, 2024], subjects: [1, 4], count: 20, random: true });
  const randomSession = await startAndRead('무작위 복원 준비', { count: 20, subjects: [1, 4] });
  if (randomSession) {
    await page.locator('.choice-button').first().click();
    await page.getByRole('button', { name: /다음 문제/ }).click();
    await page.locator('.choice-button').first().click();
    const beforeReload = await page.evaluate(() => {
      const session = JSON.parse(localStorage.getItem('info-processing-quiz:current-session'));
      return { ids: session.questions.map((question) => question.id), answers: session.answers, index: session.currentIndex };
    });
    await reloadSavedSession();
    const afterReload = await page.evaluate(() => {
      const session = JSON.parse(localStorage.getItem('info-processing-quiz:current-session'));
      return { ids: session.questions.map((question) => question.id), answers: session.answers, index: session.currentIndex };
    });
    if (JSON.stringify(beforeReload) !== JSON.stringify(afterReload)) {
      fail('무작위 순서와 답변 새로고침 복원', { beforeReload, afterReload });
    }
  }

  await configure({
    years: [2020, 2022],
    exams: ['2020-4', '2022-1'],
    subjects: [2],
  });
  const wrongSession = await startAndRead('오답 ID 준비', {
    count: 40,
    examIds: ['2020-4', '2022-1'],
    subjects: [2],
  });
  if (wrongSession) {
    const expectedWrongIds = [wrongSession.questions[0].id, wrongSession.questions[20].id];
    const answerWrongAt = async (index) => {
      await page.locator('.question-dot').nth(index).click();
      const wrongDisplay = await page.evaluate(() => {
        const session = JSON.parse(localStorage.getItem('info-processing-quiz:current-session'));
        const question = session.questions[session.currentIndex];
        return question.runtimeChoices.find((choice) => choice.originalNumber !== question.answer).displayNumber;
      });
      await page.locator('.choice-button').nth(wrongDisplay - 1).click();
    };
    await answerWrongAt(0);
    await answerWrongAt(20);
    const wrongNotes = await page.evaluate((questionIds) =>
      JSON.parse(localStorage.getItem('info-processing-quiz:wrong-answers') || '[]')
        .filter((note) => questionIds.includes(note.questionId)),
      expectedWrongIds,
    );
    const ids = wrongNotes.map((note) => note.questionId);
    const examIds = wrongNotes.map((note) => note.examId).sort();
    if (new Set(ids).size !== 2 || JSON.stringify(examIds) !== JSON.stringify(['2020-4', '2022-1'])) {
      fail('여러 연도 오답 ID 저장', { ids, examIds });
    }
  }

  await configure({
    years: [2024, 2025],
    exams: ['2024-1', '2025-1'],
    subjects: [1, 2],
    count: 10,
  });
  const resultSession = await startAndRead('결과 화면 준비', {
    count: 10,
    examIds: ['2024-1', '2025-1'],
    subjects: [1, 2],
  });
  if (resultSession) {
    for (let index = 0; index < resultSession.questions.length; index += 1) {
      await page.locator('.question-dot').nth(index).click();
      await page.locator('.choice-button').first().click();
    }
    await page.getByRole('button', { name: '결과 확인' }).click();
    await page.waitForSelector('.result-summary');
    const resultView = {
      scope: await page.locator('.result-scope').innerText(),
      yearAnalysis: await page.getByRole('heading', { name: '연도별 정답률' }).count(),
      examAnalysis: await page.getByRole('heading', { name: '회차별 정답률' }).count(),
      subjectAnalysis: await page.getByRole('heading', { name: '과목별 정답률' }).count(),
      record: await page.evaluate(() =>
        JSON.parse(localStorage.getItem('info-processing-quiz:study-records') || '[]')[0],
      ),
    };
    if (!resultView.scope.includes('2024~2025년') ||
        !resultView.scope.includes('전체 2개 회차') ||
        !resultView.scope.includes('소프트웨어 설계, 소프트웨어 개발') ||
        resultView.yearAnalysis !== 1 || resultView.examAnalysis !== 1 || resultView.subjectAnalysis !== 1 ||
        JSON.stringify(resultView.record?.years) !== JSON.stringify([2025, 2024]) ||
        JSON.stringify(resultView.record?.subjectNumbers) !== JSON.stringify([1, 2])) {
      fail('결과 범위와 학습 기록', resultView);
    }
    if (resultView.record?.wrong > 0) {
      await page.getByRole('button', { name: '틀린 문제 다시 풀기' }).click();
      await page.waitForSelector('.question-card');
      const retrySession = await page.evaluate(() =>
        JSON.parse(localStorage.getItem('info-processing-quiz:current-session')),
      );
      if (retrySession.questions.length !== resultView.record.wrong ||
          JSON.stringify([...(retrySession.config.examIds || [])].sort()) !==
            JSON.stringify(['2024-1', '2025-1'])) {
        fail('복수 시험 오답 다시 풀기', {
          questionCount: retrySession.questions.length,
          examIds: retrySession.config.examIds,
          expectedWrongCount: resultView.record.wrong,
        });
      }
    }
  }

  await resetHome();
  await page.evaluate(() => {
    localStorage.setItem('info-processing-quiz:filter-state', JSON.stringify({
      selectedYear: 2025,
      selectedSession: 1,
      selectedSubject: 3,
      count: 20,
    }));
  });
  await page.reload();
  await page.waitForSelector('.selector-panel');
  const legacyFilter = {
    year: await page.getByRole('button', { name: '2025년', exact: true }).getAttribute('aria-pressed'),
    session: await page.locator('.exam-year-group').filter({ hasText: '2025년' })
      .getByRole('button', { name: '1회', exact: true }).getAttribute('aria-pressed'),
    subject: await page.getByRole('button', { name: /^3과목 / }).getAttribute('aria-pressed'),
  };
  if (Object.values(legacyFilter).some((value) => value !== 'true')) fail('과거 필터 마이그레이션', legacyFilter);

  const responsive = [];
  for (const width of [360, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    const result = await page.evaluate(() => ({
      width: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
      selectedChips: document.querySelectorAll('.choice-chip.is-selected').length,
    }));
    responsive.push({ viewport: width, ...result });
    if (result.overflow) fail('모바일 가로 넘침', { viewport: width, result });
  }

  const report = { failures, scenarios, responsive };
  if (failures.length > 0) throw new Error(JSON.stringify(report));
  console.info(`[verify-multi-select] ${JSON.stringify(report)}`);
  return JSON.stringify(report);
}
