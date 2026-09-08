from __future__ import annotations

import argparse
import json
import re
from pathlib import Path


SUBJECTS = {
    1: "소프트웨어 설계",
    2: "소프트웨어 개발",
    3: "데이터베이스 구축",
    4: "프로그래밍 언어 활용",
    5: "정보시스템 구축 관리",
}


def subject_number_for(question_number: int) -> int:
    return min(((question_number - 1) // 20) + 1, 5)


def validate_file(path: Path) -> list[str]:
    errors: list[str] = []
    data = json.loads(path.read_text(encoding="utf-8"))
    questions = data.get("questions")

    if not isinstance(questions, list):
        return [f"{path}: questions is not a list"]

    if len(questions) != 100:
        errors.append(f"{path}: expected 100 questions, found {len(questions)}")

    seen_numbers = set()
    for index, question in enumerate(questions, start=1):
        prefix = f"{path}: question index {index}"
        number = question.get("number")
        if number != index:
            errors.append(f"{prefix}: expected number {index}, found {number}")
        if number in seen_numbers:
            errors.append(f"{prefix}: duplicate number {number}")
        seen_numbers.add(number)

        expected_subject_number = subject_number_for(index)
        if question.get("subjectNumber") != expected_subject_number:
            errors.append(
                f"{prefix}: expected subjectNumber {expected_subject_number}, "
                f"found {question.get('subjectNumber')}"
            )
        if question.get("subject") != SUBJECTS[expected_subject_number]:
            errors.append(f"{prefix}: unexpected subject {question.get('subject')!r}")

        choices = question.get("choices")
        if not isinstance(choices, list) or len(choices) != 4:
            errors.append(f"{prefix}: choices must have length 4")
        else:
            for choice_index, choice in enumerate(choices, start=1):
                if not isinstance(choice, str):
                    errors.append(f"{prefix}: choice {choice_index} is not a string")

        answer = question.get("answer")
        if answer not in {1, 2, 3, 4}:
            errors.append(f"{prefix}: answer out of range {answer!r}")

        if not isinstance(question.get("question"), str):
            errors.append(f"{prefix}: question text is not a string")

        expected_id_pattern = rf"{data['exam']['year']}-{data['exam']['session']}-{index:03d}"
        if question.get("id") != expected_id_pattern:
            errors.append(f"{prefix}: expected id {expected_id_pattern}, found {question.get('id')}")

    expected_numbers = set(range(1, 101))
    if seen_numbers != expected_numbers:
        missing = sorted(expected_numbers - seen_numbers)
        extra = sorted(seen_numbers - expected_numbers)
        errors.append(f"{path}: number mismatch missing={missing} extra={extra}")

    return errors


def main() -> None:
    parser = argparse.ArgumentParser(description="Validate generated exam JSON files.")
    parser.add_argument("paths", nargs="*", type=Path)
    parser.add_argument("--dir", type=Path, default=Path("src/data/exams"))
    args = parser.parse_args()

    paths = args.paths
    if not paths:
        paths = sorted(
            path
            for path in args.dir.glob("*.json")
            if re.match(r"20\d{2}-\d\.json$", path.name)
        )

    errors: list[str] = []
    for path in paths:
        errors.extend(validate_file(path))

    if errors:
        print("\n".join(errors))
        raise SystemExit(1)

    print(f"validated {len(paths)} files")


if __name__ == "__main__":
    main()
