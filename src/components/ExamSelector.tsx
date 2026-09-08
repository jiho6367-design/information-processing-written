import { Check, ListFilter, Shuffle } from 'lucide-react';
import type {
  LoadedExam,
  QuestionCountOption,
  QuizFilterState,
  SubjectNumber,
} from '../types/quiz';
import { SUBJECTS } from '../types/quiz';
import { getAvailableYears, getSubjectSummary } from '../utils/quizUtils';

interface ExamSelectorProps {
  exams: LoadedExam[];
  filter: QuizFilterState;
  availableQuestionCount: number;
  onToggleYear: (year: number) => void;
  onSelectYears: (years: number[]) => void;
  onClearYears: () => void;
  onToggleExam: (examId: string) => void;
  onSetYearExams: (year: number, selected: boolean) => void;
  onSelectAllExams: () => void;
  onClearExams: () => void;
  onToggleSubject: (subject: SubjectNumber) => void;
  onSelectAllSubjects: () => void;
  onClearSubjects: () => void;
  onCountChange: (count: QuestionCountOption) => void;
  onShuffleQuestionsChange: (value: boolean) => void;
  onShuffleChoicesChange: (value: boolean) => void;
}

const COUNT_OPTIONS: Array<{ value: QuestionCountOption; label: string }> = [
  { value: 10, label: '10문제' },
  { value: 20, label: '20문제' },
  { value: 40, label: '40문제' },
  { value: 60, label: '60문제' },
  { value: 100, label: '100문제' },
  { value: 'all', label: '전체 문제' },
];

function parseCount(value: string): QuestionCountOption {
  return value === 'all' ? 'all' : (Number(value) as QuestionCountOption);
}

interface ChoiceChipProps {
  selected: boolean;
  label: string;
  onClick: () => void;
}

function ChoiceChip({ selected, label, onClick }: ChoiceChipProps) {
  return (
    <button
      className={`choice-chip ${selected ? 'is-selected' : ''}`}
      type="button"
      aria-pressed={selected}
      onClick={onClick}
    >
      <span className="choice-chip-mark" aria-hidden="true">
        {selected ? <Check size={15} /> : null}
      </span>
      {label}
    </button>
  );
}

export function ExamSelector({
  exams,
  filter,
  availableQuestionCount,
  onToggleYear,
  onSelectYears,
  onClearYears,
  onToggleExam,
  onSetYearExams,
  onSelectAllExams,
  onClearExams,
  onToggleSubject,
  onSelectAllSubjects,
  onClearSubjects,
  onCountChange,
  onShuffleQuestionsChange,
  onShuffleChoicesChange,
}: ExamSelectorProps) {
  const years = getAvailableYears(exams);
  const recentYears = years.slice(0, 3);
  const selectedYearSet = new Set(filter.selectedYears);
  const selectedExamSet = new Set(filter.selectedExamKeys);
  const selectedSubjectSet = new Set(filter.selectedSubjectNumbers);
  const validationMessages = [
    filter.selectedYears.length === 0 ? '한 개 이상의 연도를 선택해주세요.' : null,
    filter.selectedExamKeys.length === 0 ? '한 개 이상의 시험 회차를 선택해주세요.' : null,
    filter.selectedSubjectNumbers.length === 0 ? '한 개 이상의 과목을 선택해주세요.' : null,
    filter.selectedYears.length > 0 &&
    filter.selectedExamKeys.length > 0 &&
    filter.selectedSubjectNumbers.length > 0 &&
    availableQuestionCount === 0
      ? '선택한 조건에 해당하는 문제가 없습니다.'
      : null,
  ].filter((message): message is string => message !== null);

  return (
    <section className="selector-panel" aria-label="시험 선택">
      <div className="section-heading">
        <ListFilter size={20} aria-hidden="true" />
        <h2>시험 선택</h2>
      </div>

      <div className="selection-block">
        <div className="selection-toolbar">
          <div>
            <h3>연도</h3>
            <span>{filter.selectedYears.length}개 선택</span>
          </div>
          <div className="selection-actions">
            <button type="button" onClick={() => onSelectYears(years)}>전체 선택</button>
            <button type="button" onClick={onClearYears}>전체 해제</button>
            <button type="button" onClick={() => onSelectYears(recentYears)}>최근 3개 연도</button>
          </div>
        </div>
        <div className="chip-grid compact" aria-label="연도 복수 선택">
          {years.map((year) => (
            <ChoiceChip
              key={year}
              selected={selectedYearSet.has(year)}
              label={`${year}년`}
              onClick={() => onToggleYear(year)}
            />
          ))}
        </div>
        <p className="selection-summary">
          선택 연도: {filter.selectedYears.length > 0
            ? [...filter.selectedYears].sort((a, b) => a - b).map((year) => `${year}년`).join(', ')
            : '없음'}
        </p>
      </div>

      <div className="selection-block">
        <div className="selection-toolbar">
          <div>
            <h3>시험 회차</h3>
            <span>{filter.selectedExamKeys.length}개 선택</span>
          </div>
          <div className="selection-actions">
            <button type="button" onClick={onSelectAllExams}>전체 회차 선택</button>
            <button type="button" onClick={onClearExams}>전체 회차 해제</button>
          </div>
        </div>
        {filter.selectedYears.length === 0 ? (
          <p className="empty-state compact">연도를 선택하면 등록된 회차가 표시됩니다.</p>
        ) : (
          <div className="exam-year-list">
            {[...filter.selectedYears].sort((a, b) => b - a).map((year) => {
              const yearExams = exams.filter((exam) => exam.exam.year === year);
              const allSelected = yearExams.length > 0 && yearExams.every((exam) => selectedExamSet.has(exam.id));
              return (
                <div className="exam-year-group" key={year}>
                  <div className="exam-year-heading">
                    <strong>{year}년</strong>
                    <button type="button" onClick={() => onSetYearExams(year, !allSelected)}>
                      {allSelected ? '연도별 전체 해제' : '연도별 전체 선택'}
                    </button>
                  </div>
                  <div className="chip-grid compact">
                    {yearExams.map((exam) => (
                      <ChoiceChip
                        key={exam.id}
                        selected={selectedExamSet.has(exam.id)}
                        label={`${exam.exam.session}회`}
                        onClick={() => onToggleExam(exam.id)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="selection-block">
        <div className="selection-toolbar">
          <div>
            <h3>과목</h3>
            <span>{filter.selectedSubjectNumbers.length}개 선택</span>
          </div>
          <div className="selection-actions">
            <button type="button" onClick={onSelectAllSubjects}>전체 선택</button>
            <button type="button" onClick={onClearSubjects}>전체 해제</button>
          </div>
        </div>
        <div className="chip-grid" aria-label="과목 복수 선택">
          {SUBJECTS.map((subject) => (
            <ChoiceChip
              key={subject.number}
              selected={selectedSubjectSet.has(subject.number)}
              label={`${subject.number}과목 ${subject.name}`}
              onClick={() => onToggleSubject(subject.number)}
            />
          ))}
        </div>
        <p className="selection-summary">
          선택 과목: {getSubjectSummary(filter.selectedSubjectNumbers, true)}
        </p>
      </div>

      <div className="form-grid selector-options">
        <label className="field">
          <span>문제 수</span>
          <select
            value={filter.count}
            onChange={(event) => onCountChange(parseCount(event.target.value))}
            disabled={availableQuestionCount === 0}
          >
            {COUNT_OPTIONS.map((option) => (
              <option
                key={option.value}
                value={option.value}
                disabled={option.value !== 'all' && option.value > availableQuestionCount}
              >
                {option.value === 'all'
                  ? `${option.label} (${availableQuestionCount}문제)`
                  : option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="toggle-row">
        <label className="toggle">
          <input
            type="checkbox"
            checked={filter.shuffleQuestions}
            onChange={(event) => onShuffleQuestionsChange(event.target.checked)}
          />
          <Shuffle size={18} aria-hidden="true" />
          문제 순서 섞기
        </label>
        <label className="toggle">
          <input
            type="checkbox"
            checked={filter.shuffleChoices}
            onChange={(event) => onShuffleChoicesChange(event.target.checked)}
          />
          <Shuffle size={18} aria-hidden="true" />
          보기 순서 섞기
        </label>
      </div>

      <div className="selection-preview" aria-live="polite">
        <h3>선택 결과</h3>
        <dl>
          <div><dt>선택 연도</dt><dd>{filter.selectedYears.length}개</dd></div>
          <div><dt>선택 시험</dt><dd>{filter.selectedExamKeys.length}개 회차</dd></div>
          <div><dt>선택 과목</dt><dd>{filter.selectedSubjectNumbers.length}개</dd></div>
          <div><dt>출제 가능 문제</dt><dd><strong>{availableQuestionCount}문제</strong></dd></div>
        </dl>
        {validationMessages.map((message) => (
          <p className="validation-message" key={message}>{message}</p>
        ))}
      </div>
    </section>
  );
}
