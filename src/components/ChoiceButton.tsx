import type { ChoiceNumber, QuizAnswer, QuizChoice } from '../types/quiz';

const CHOICE_MARKERS: Record<ChoiceNumber, string> = {
  1: '①',
  2: '②',
  3: '③',
  4: '④',
};

interface ChoiceButtonProps {
  choice: QuizChoice;
  answer: QuizAnswer | undefined;
  correctChoice: ChoiceNumber;
  onSelect: (displayNumber: ChoiceNumber) => void;
}

export function ChoiceButton({ choice, answer, correctChoice, onSelect }: ChoiceButtonProps) {
  const isAnswered = Boolean(answer);
  const isCorrectChoice = isAnswered && choice.originalNumber === correctChoice;
  const isSelectedWrong =
    isAnswered &&
    answer?.selectedDisplayNumber === choice.displayNumber &&
    choice.originalNumber !== correctChoice;
  const stateClass = isCorrectChoice ? 'is-correct' : isSelectedWrong ? 'is-wrong' : '';
  const choiceTableColumnCount = choice.table
    ? choice.table.headers.length || choice.table.rows[0]?.length || 1
    : 1;

  return (
    <button
      className={`choice-button ${stateClass}`}
      type="button"
      onClick={() => onSelect(choice.displayNumber)}
      disabled={isAnswered}
      aria-pressed={answer?.selectedDisplayNumber === choice.displayNumber}
    >
      <span className="choice-marker" aria-hidden="true">
        {CHOICE_MARKERS[choice.displayNumber]}
      </span>
      {choice.image ? (
        <img className="choice-image" src={choice.image} alt={choice.text} />
      ) : choice.table ? (
        <span className="choice-table" role="table" aria-label={choice.text}>
          {choice.table.title ? <span className="choice-table-title">{choice.table.title}</span> : null}
          {choice.table.headers.length > 0 ? (
            <span
              className="choice-table-row choice-table-header"
              role="row"
              style={{ gridTemplateColumns: `repeat(${choiceTableColumnCount}, minmax(72px, 1fr))` }}
            >
              {choice.table.headers.map((header, index) => (
                <span className="choice-table-cell" role="columnheader" key={`${header}-${index}`}>
                  {header}
                </span>
              ))}
            </span>
          ) : null}
          {choice.table.rows.map((row, rowIndex) => (
            <span
              className="choice-table-row"
              role="row"
              style={{ gridTemplateColumns: `repeat(${choiceTableColumnCount}, minmax(72px, 1fr))` }}
              key={`row-${rowIndex}`}
            >
              {row.map((cell, cellIndex) => (
                <span className="choice-table-cell" role="cell" key={`${cell}-${cellIndex}`}>
                  {cell}
                </span>
              ))}
            </span>
          ))}
        </span>
      ) : (
        <span className="choice-text">{choice.text}</span>
      )}
    </button>
  );
}
