import type { ExamData, LoadedExam } from '../../types/quiz';

export interface ExamManifestEntry {
  id: string;
  fileName: string;
  path: string;
}

export async function loadExams(): Promise<LoadedExam[]> {
  const manifestResponse = await fetch('/data/exams/manifest.json');

  if (!manifestResponse.ok) {
    throw new Error('시험 목록을 불러오지 못했습니다.');
  }

  const manifest = (await manifestResponse.json()) as ExamManifestEntry[];
  const loadedExams = await Promise.all(
    manifest.map(async (entry) => {
      const response = await fetch(entry.path);

      if (!response.ok) {
        throw new Error(`${entry.fileName} 데이터를 불러오지 못했습니다.`);
      }

      const data = (await response.json()) as ExamData;

      return {
        ...data,
        id: entry.id,
        fileName: entry.fileName,
      };
    }),
  );

  return loadedExams
  .sort((a, b) => {
    if (b.exam.year !== a.exam.year) {
      return b.exam.year - a.exam.year;
    }

    return b.exam.session - a.exam.session;
  });
}
