import { BarChart3, CheckCircle2, Target, XCircle } from 'lucide-react';
import type { QuizResult, ScopeStat } from '../types/quiz';
import {
  formatRate,
  getConfigExamIds,
  getConfigSubjectNumbers,
  getLowestSubjectStat,
  getSubjectSummary,
  getYearSummary,
} from '../utils/quizUtils';
import { ProgressBar } from './ProgressBar';

interface ResultSummaryProps {
  result: QuizResult;
}

interface StatsTableProps {
  title: string;
  labelHeading: string;
  stats: ScopeStat[];
}

function StatsTable({ title, labelHeading, stats }: StatsTableProps) {
  if (stats.length === 0) return null;

  return (
    <div className="analysis-block">
      <h3>{title}</h3>
      <div className="subject-table-wrap">
        <table className="subject-table">
          <thead>
            <tr>
              <th scope="col">{labelHeading}</th>
              <th scope="col">정답</th>
              <th scope="col">오답</th>
              <th scope="col">정답률</th>
            </tr>
          </thead>
          <tbody>
            {stats.map((stat) => (
              <tr key={stat.key}>
                <th scope="row">{stat.label}</th>
                <td>{stat.correct} / {stat.total}</td>
                <td>{stat.wrong}</td>
                <td>{formatRate(stat.correctRate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function ResultSummary({ result }: ResultSummaryProps) {
  const lowestSubject = getLowestSubjectStat(result.subjectStats);
  const selectedYears = result.config.years?.length
    ? result.config.years
    : (result.yearStats ?? []).map((stat) => Number(stat.key));
  const selectedExamIds = getConfigExamIds(result.config);
  const selectedSubjects = getConfigSubjectNumbers(result.config);

  return (
    <section className="result-summary" aria-label="결과 요약">
      <div className="summary-grid">
        <div className="metric-box">
          <Target size={22} aria-hidden="true" />
          <span>총 문제</span>
          <strong>{result.total}</strong>
        </div>
        <div className="metric-box is-correct">
          <CheckCircle2 size={22} aria-hidden="true" />
          <span>정답</span>
          <strong>{result.correct}</strong>
        </div>
        <div className="metric-box is-wrong">
          <XCircle size={22} aria-hidden="true" />
          <span>오답</span>
          <strong>{result.wrong}</strong>
        </div>
        <div className="metric-box">
          <BarChart3 size={22} aria-hidden="true" />
          <span>정답률</span>
          <strong>{formatRate(result.correctRate)}</strong>
        </div>
      </div>

      <ProgressBar value={result.correctRate} label="전체 정답률" />

      <div className="result-scope">
        <h3>학습 범위</h3>
        <dl>
          <div><dt>연도</dt><dd>{getYearSummary(selectedYears)}</dd></div>
          <div><dt>회차</dt><dd>전체 {selectedExamIds.length}개 회차</dd></div>
          <div><dt>과목</dt><dd>{getSubjectSummary(selectedSubjects, true)}</dd></div>
          <div><dt>출제 문제</dt><dd>{result.total}문제</dd></div>
        </dl>
      </div>

      {result.unanswered > 0 ? (
        <p className="notice-text">미응답 {result.unanswered}문제는 결과에서 정답 처리되지 않았습니다.</p>
      ) : null}

      {lowestSubject ? (
        <p className="notice-text">
          가장 보완이 필요한 과목은 {lowestSubject.subject}이며 정답률은{' '}
          {formatRate(lowestSubject.correctRate)}입니다.
        </p>
      ) : null}

      <div className="analysis-block">
        <h3>과목별 정답률</h3>
        <div className="subject-table-wrap">
        <table className="subject-table">
          <thead>
            <tr>
              <th scope="col">과목</th>
              <th scope="col">정답</th>
              <th scope="col">오답</th>
              <th scope="col">정답률</th>
            </tr>
          </thead>
          <tbody>
            {result.subjectStats.map((stat) => (
              <tr key={stat.subjectNumber}>
                <th scope="row">
                  {stat.subjectNumber}과목 {stat.subject}
                </th>
                <td>
                  {stat.correct} / {stat.total}
                </td>
                <td>{stat.wrong}</td>
                <td>{formatRate(stat.correctRate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      <StatsTable title="연도별 정답률" labelHeading="연도" stats={result.yearStats ?? []} />
      <StatsTable title="회차별 정답률" labelHeading="시험" stats={result.examStats ?? []} />
    </section>
  );
}
