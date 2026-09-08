import { Fragment } from 'react';
import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import type { ChoiceNumber, QuizAnswer, RuntimeQuestion } from '../types/quiz';
import { getExamLabel } from '../utils/quizUtils';
import { ChoiceButton } from './ChoiceButton';
import { ProgressBar } from './ProgressBar';

interface QuestionCardProps {
  question: RuntimeQuestion;
  answer: QuizAnswer | undefined;
  currentIndex: number;
  total: number;
  progressRate: number;
  onSelect: (displayNumber: ChoiceNumber) => void;
}

export function QuestionCard({
  question,
  answer,
  currentIndex,
  total,
  progressRate,
  onSelect,
}: QuestionCardProps) {
  return (
    <article className="question-card">
      <div className="question-meta">
        <span>{getExamLabel(question.exam)}</span>
        <span>{question.subject}</span>
        <span>
          {currentIndex + 1} / {total}
        </span>
      </div>

      <ProgressBar value={progressRate} label="현재 문제 위치" />

      <div className="question-title-row">
        <h2>
          {question.number}. {question.question}
        </h2>
        {question.needsReview ? (
          <span className="review-badge">
            <AlertTriangle size={16} aria-hidden="true" />
            검수 필요
          </span>
        ) : null}
      </div>

      {question.image ? (
        <img className="question-image" src={question.image} alt={`${question.number}번 문제 자료`} />
      ) : null}

      {question.code ? <pre className="code-block">{question.code}</pre> : null}

      {question.table ? (
        <div className="question-table-wrap">
          {question.table.title ? <h3 className="table-title">{question.table.title}</h3> : null}
          <table className="question-table">
            <thead>
              <tr>
                {question.table.headers.map((header) => (
                  <th key={header} scope="col">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {question.table.rows.map((row, rowIndex) => (
                <tr key={`${question.id}-row-${rowIndex}`}>
                  {row.map((cell, cellIndex) => (
                    <td key={`${question.id}-row-${rowIndex}-cell-${cellIndex}`}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {question.tables ? (
        <div className={question.tableSeparator ? 'question-tables-stack' : 'question-tables-grid'}>
          {question.tables.map((table, tableIndex) => (
            <Fragment key={`${question.id}-table-${tableIndex}`}>
              <div className="question-table-wrap">
                {table.title ? <h3 className="table-title">{table.title}</h3> : null}
                <table className="question-table">
                  <thead>
                    <tr>
                      {table.headers.map((header) => (
                        <th key={header} scope="col">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {table.rows.map((row, rowIndex) => (
                      <tr key={`${question.id}-table-${tableIndex}-row-${rowIndex}`}>
                        {row.map((cell, cellIndex) => (
                          <td key={`${question.id}-table-${tableIndex}-row-${rowIndex}-cell-${cellIndex}`}>
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {question.tableSeparator && tableIndex < (question.tables?.length ?? 0) - 1 ? (
                <div className="question-table-separator" aria-hidden="true">
                  {question.tableSeparator}
                </div>
              ) : null}
            </Fragment>
          ))}
        </div>
      ) : null}

      <div className="choice-list" aria-label="객관식 보기">
        {question.runtimeChoices.map((choice) => (
          <ChoiceButton
            key={`${question.id}-${choice.displayNumber}`}
            choice={choice}
            answer={answer}
            correctChoice={question.answer}
            onSelect={onSelect}
          />
        ))}
      </div>

      {answer ? (
        <div className={`answer-panel ${answer.isCorrect ? 'is-correct' : 'is-wrong'}`} role="status">
          <div className="answer-message">
            {answer.isCorrect ? (
              <CheckCircle2 size={20} aria-hidden="true" />
            ) : (
              <XCircle size={20} aria-hidden="true" />
            )}
          <strong>{answer.isCorrect ? '정답입니다' : '오답입니다'}</strong>
        </div>
          {question.answerNote ? <p>정답표 참고: {question.answerNote}</p> : null}
          {question.explanation ? <p>{question.explanation}</p> : null}
        </div>
      ) : null}
    </article>
  );
}
