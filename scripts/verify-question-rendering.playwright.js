/* eslint-disable */
async (page) => {
  const ids = [
    '2020-4-049',
    '2020-4-051',
    '2020-4-067',
    '2020-4-077',
    '2020-3-078',
    '2021-3-063',
    '2023-3-048',
    '2024-2-075',
    '2025-2-076',
    '2020-2-021',
    '2021-1-048',
    '2021-2-045',
    '2022-2-044',
    '2023-2-052',
    '2020-4-048',
    '2024-1-041',
    '2026-1-053',
    '2026-2-022',
    '2026-2-024',
    '2026-2-039',
    '2026-2-046',
    '2026-2-067',
    '2026-2-092',
  ];

  const expected = {
    '2020-4-049': [1, 0],
    '2020-4-051': [1, 2],
    '2020-4-067': [1, 0],
    '2020-4-077': [0, 1],
    '2020-3-078': [1, 0],
    '2021-3-063': [1, 0],
    '2023-3-048': [1, 0],
    '2024-2-075': [1, 0],
    '2025-2-076': [1, 0],
    '2020-2-021': [0, 1],
    '2021-1-048': [1, 2],
    '2021-2-045': [0, 3],
    '2022-2-044': [0, 1],
    '2023-2-052': [0, 1],
    '2020-4-048': [0, 0],
    '2024-1-041': [0, 0],
    '2026-1-053': [0, 0],
    '2026-2-022': [0, 0, 1],
    '2026-2-024': [0, 1, 0],
    '2026-2-039': [0, 1, 0],
    '2026-2-046': [0, 1, 0],
    '2026-2-067': [1, 0, 0],
    '2026-2-092': [0, 0, 1],
  };

  await page.evaluate(async (questionIds) => {
    const byExam = {};

    for (const id of questionIds) {
      const examId = id.split('-').slice(0, 2).join('-');
      byExam[examId] ||= await (await fetch(`/data/exams/${examId}.json`)).json();
    }

    const questions = questionIds.map((id) => {
      const examId = id.split('-').slice(0, 2).join('-');
      const data = byExam[examId];
      const question = data.questions.find((item) => item.id === id);

      return {
        ...question,
        examId,
        exam: data.exam,
        runtimeChoices: question.choices.map((text, index) => ({
          displayNumber: index + 1,
          originalNumber: index + 1,
          text,
        })),
      };
    });

    const config = {
      examId: 'render-test',
      source: 'exam',
      count: 'all',
      shuffleQuestions: false,
      shuffleChoices: false,
      questionIds,
    };

    localStorage.setItem(
      'info-processing-quiz:current-session',
      JSON.stringify({
        id: 'quiz-render-test',
        config,
        questions,
        currentIndex: 0,
        answers: {},
        startedAt: new Date().toISOString(),
      }),
    );
  }, ids);

  await page.reload();
  await page.waitForSelector('.question-card');

  const failures = [];
  const widths = [360, 390, 768, 1024, 1440];

  for (const width of widths) {
    await page.setViewportSize({ width, height: 820 });

    for (let index = 0; index < ids.length; index += 1) {
      await page.locator('.question-dot').nth(index).click();
      await page.waitForTimeout(20);

      const result = await page.evaluate(() => {
        document.querySelector('.choice-button')?.click();

        return {
          title: document.querySelector('.question-title-row h2')?.innerText ?? '',
          codeCount: document.querySelectorAll('.code-block').length,
          tableCount: document.querySelectorAll('.question-table').length,
          imageCount: document.querySelectorAll('.question-image').length,
          choiceCount: document.querySelectorAll('.choice-button').length,
          answerShown: Boolean(document.querySelector('.answer-panel')),
          pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
          codeOverflowHandled: [...document.querySelectorAll('.code-block')].every(
            (element) => getComputedStyle(element).overflowX === 'auto',
          ),
          tableOverflowHandled: [...document.querySelectorAll('.question-table-wrap')].every(
            (element) => getComputedStyle(element).overflowX === 'auto',
          ),
        };
      });
      await page.waitForTimeout(20);
      result.answerShown = await page.evaluate(() => Boolean(document.querySelector('.answer-panel')));

      const [codeCount, tableCount, imageCount = 0] = expected[ids[index]];

      if (
        result.codeCount !== codeCount ||
        result.tableCount !== tableCount ||
        result.imageCount !== imageCount ||
        result.choiceCount !== 4 ||
        !result.answerShown ||
        result.pageOverflow ||
        !result.codeOverflowHandled ||
        !result.tableOverflowHandled
      ) {
        failures.push({
          id: ids[index],
          width,
          result,
          expected: { codeCount, tableCount, imageCount },
        });
      }
    }
  }

  await page.setViewportSize({ width: 1024, height: 820 });
  await page.locator('.question-dot').nth(0).click();
  await page.getByRole('button', { name: /다음 문제/ }).click();
  const afterNext = await page.locator('.question-title-row h2').innerText();
  await page.getByRole('button', { name: /이전 문제/ }).click();
  const afterPrev = await page.locator('.question-title-row h2').innerText();

  const report = {
    checked: ids.length * widths.length,
    failures,
    navigation: { afterNext, afterPrev },
  };

  if (failures.length > 0) throw new Error(JSON.stringify(report));
  console.info(`[verify-question-rendering] ${JSON.stringify(report)}`);
  return JSON.stringify(report);
}
