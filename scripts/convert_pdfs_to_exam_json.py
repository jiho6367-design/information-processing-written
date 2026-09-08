from __future__ import annotations

import argparse
import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

import pdfplumber


SUBJECTS = {
    1: "소프트웨어 설계",
    2: "소프트웨어 개발",
    3: "데이터베이스 구축",
    4: "프로그래밍 언어 활용",
    5: "정보시스템 구축 관리",
}

MANUAL_ANSWER_OVERRIDES = {
    ("2022-2", 5): 2,
}

MANUAL_CHOICE_OVERRIDES = {
    ("2020-4", 50): [
        "과목이름\nDB",
        "과목이름\nDB\nDB",
        "과목이름\nDB\nDB\n운영체제",
        "과목이름\nDB\n운영체제",
    ],
    ("2020-4", 51): [
        "과목이름\nDB",
        "과목이름\nDB\nDB",
        "과목이름\nDB\nDB\n운영체제",
        "과목이름\nDB\n운영체제",
    ],
}

MANUAL_QUESTION_OVERRIDES = {
    ("2020-4", 49): "DBA가 사용자 PARK에게 테이블 [STUDENT]의 데이터를 갱신할\n수 있는 시스템 권한을 부여하고자 하는 SQL문을 작성하고자\n한다. 다음에 주어진 SQL문의 빈칸을 알맞게 채운 것은?",
    ("2020-4", 51): "다음 SQL문의 실행 결과는?",
    ("2020-4", 67): "다음 자바 코드를 실행한 결과는?",
    ("2020-4", 68): "다음 파이썬으로 구현된 프로그램의 실행 결과로 옳은 것은?",
    ("2020-4", 77): "다음과 같은 세그먼트 테이블을 가지는 시스템에서 논리 주소(2,\n176)에 대한 물리 주소는?",
}

MANUAL_CODE_OVERRIDES = {
    ("2020-4", 49): "SQL>GRANT ㉠__ ㉡__ STUDENT TO PARK;",
    ("2020-4", 51): "SELECT 과목이름\nFROM 성적\nWHERE EXISTS (SELECT 학번\nFROM 학생 WHERE 학생.학번=성적.학번 AND 학생.학과 IN ('전산', '전기') AND 학생.주소='경기');",
    ("2020-4", 67): 'int x = 1, y = 6;\nwhile (y--) {\n  x++;\n}\nSystem.out.println("x=" + x + "y=" + y);',
    ("2020-4", 68): ">>> a = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90]\n>>> a[:7:2]",
}

MANUAL_TABLE_OVERRIDES = {
    ("2020-4", 77): {
        "headers": ["세그먼트번호", "시작주소", "길이(바이트)"],
        "rows": [
            ["0", "670", "248"],
            ["1", "1752", "422"],
            ["2", "222", "198"],
            ["3", "996", "604"],
        ],
    },
}

MANUAL_TABLES_OVERRIDES = {
    ("2020-4", 51): [
        {
            "title": "[학생] 테이블",
            "headers": ["학번", "이름", "학년", "학과", "주소"],
            "rows": [
                ["1000", "김철수", "1", "전산", "서울"],
                ["2000", "고영준", "1", "전기", "경기"],
                ["3000", "유진호", "2", "전자", "경기"],
                ["4000", "김영진", "2", "전산", "경기"],
                ["5000", "정현영", "3", "전자", "서울"],
            ],
        },
        {
            "title": "[성적] 테이블",
            "headers": ["학번", "과목번호", "과목이름", "학점", "점수"],
            "rows": [
                ["1000", "A100", "자료구조", "A", "91"],
                ["2000", "A200", "DB", "A+", "99"],
                ["3000", "A100", "자료구조", "B+", "88"],
                ["3000", "A200", "DB", "B", "85"],
                ["4000", "A200", "DB", "A", "94"],
                ["4000", "A300", "운영체제", "B+", "89"],
                ["5000", "A300", "운영체제", "B", "88"],
            ],
        },
    ],
}

MANUAL_QUESTION_OVERRIDES.update(
    {
        ("2026-2", 24): (
            "평가 점수에 따른 성적부여는 다음 표와 같다. 이를 구현한 소프트웨어를 "
            "경계 값 분석 기법으로 테스트하고자 할 때 다음 중 테스트 케이스의 입력 값으로 "
            "옳지 않은 것은?"
        ),
        ("2026-2", 39): "화이트박스 검사 기법에 해당하는 것으로만 짝지어진 것은?",
        ("2026-2", 46): "다음 관계형 데이터 모델에 대한 설명으로 옳은 것은?",
        ("2026-2", 60): (
            "사용자 ‘PARK’에게 테이블을 생성할 수 있는 권한을 부여하기 위한 SQL문의 "
            "구성으로 빈칸에 적합한 내용은?"
        ),
        ("2026-2", 67): "다음 Python 프로그램이 실행되었을 때, 실행 결과는?",
    }
)

MANUAL_CHOICE_OVERRIDES.update(
    {
        ("2026-2", 67): [
            "대한민국",
            "대\n한\n민\n국",
            "대",
            "대대대대",
        ],
    }
)

MANUAL_CODE_OVERRIDES.update(
    {
        ("2026-2", 60): "[SQL문]\nGRANT [          ] PARK;",
        ("2026-2", 62): (
            "public class Test {\n"
            "    public static void main(String[] args) {\n"
            "        int r = 4 | 7;\n"
            "        System.out.print(r);\n"
            "    }\n"
            "}"
        ),
        ("2026-2", 67): (
            'a = ["대", "한", "민", "국"]\n'
            "for i in a:\n"
            "    print(i)"
        ),
        ("2026-2", 72): (
            "#include <stdio.h>\n"
            "int main(int argc, char* argv[]) {\n"
            "    ㉠ str[3] = {'A', 'B', 'C'};\n"
            "    ㉡ n[3] = {84.55, 74.85, 93.57};\n"
            "    for (int i = 0; i < 3; i++) {\n"
            '        printf("%c, %.5f\\n", str[i], n[i]);\n'
            "    }\n"
            "    return 0;\n"
            "}\n\n"
            "[실행 결과]\n"
            "A, 84.55000\n"
            "B, 74.85000\n"
            "C, 93.57000"
        ),
        ("2026-2", 78): (
            "#include <stdio.h>\n"
            "struct st {\n"
            "    int a;\n"
            "    int c[10];\n"
            "};\n"
            "int main(int argc, char* argv[]) {\n"
            "    int i = 0;\n"
            "    struct st ob1;\n"
            "    struct st ob2;\n"
            "    ob1.a = 0;\n"
            "    ob2.a = 0;\n"
            "    for (i = 0; i < 10; i++) {\n"
            "        ob1.c[i] = i;\n"
            "        ob2.c[i] = ob1.c[i] + i;\n"
            "    }\n"
            "    for (i = 0; i < 10; i = i + 2) {\n"
            "        ob1.a = ob1.a + ob1.c[i];\n"
            "        ob2.a = ob2.a + ob2.c[i];\n"
            "    }\n"
            '    printf("%d", ob1.a + ob2.a);\n'
            "    return 0;\n"
            "}"
        ),
    }
)

MANUAL_TABLE_OVERRIDES.update(
    {
        ("2026-2", 24): {
            "title": "성적부여 기준",
            "headers": ["평가 점수", "성적"],
            "rows": [["80~100", "A"], ["60~79", "B"], ["0~59", "C"]],
        },
        ("2026-2", 39): {
            "title": "검사 기법",
            "headers": ["기호", "검사 기법", "기호", "검사 기법"],
            "rows": [
                ["㉠", "데이터 흐름 검사", "㉡", "루프 검사"],
                ["㉢", "동등 분할 검사", "㉣", "경계값 분석"],
                ["㉤", "원인 결과 그래프 기법", "㉥", "오류예측 기법"],
            ],
        },
        ("2026-2", 46): {
            "title": "고객 릴레이션",
            "headers": ["고객ID", "고객이름", "거주도시"],
            "rows": [
                ["S1", "홍길동", "서울"],
                ["S2", "이정재", "인천"],
                ["S3", "신보라", "인천"],
                ["S4", "김흥국", "서울"],
                ["S5", "도요새", "용인"],
            ],
        },
    }
)

MANUAL_IMAGE_OVERRIDES = {
    ("2026-2", 22): "/images/exams/2026-2-022.png",
    ("2026-2", 92): "/images/exams/2026-2-092.png",
}

MANUALLY_REVIEWED_QUESTIONS = {
    ("2026-2", number)
    for number in (22, 24, 27, 39, 46, 49, 60, 62, 67, 72, 73, 78, 79, 92)
}

CIRCLED_TO_ANSWER = {
    "①": 1,
    "②": 2,
    "③": 3,
    "④": 4,
}

QUESTION_START_RE = re.compile(r"(?m)^(\d{1,3})\.\s+")
PDF_NAME_RE = re.compile(
    r"(?P<year>20\d{2})년?\s*(?P<session>\d)회.*(?:정보처리기사\s*필기|기사필기).*\.pdf$"
)
ANSWER_RE = re.compile(r"(\d{1,3})\.\s*([①②③④](?:\s*,\s*[①②③④])*)")
CHOICE_MARKER_RE = re.compile(r"([①②③④])")


@dataclass
class PdfExam:
    path: Path
    year: int
    session: int

    @property
    def exam_id(self) -> str:
        return f"{self.year}-{self.session}"

    @property
    def title(self) -> str:
        return f"{self.year}년 {self.session}회 정보처리기사 필기"


def discover_pdfs(root: Path) -> list[PdfExam]:
    exams: list[PdfExam] = []
    for path in sorted(root.glob("*.pdf")):
        match = PDF_NAME_RE.match(path.name)
        if not match:
            continue

        exams.append(PdfExam(path=path, year=int(match["year"]), session=int(match["session"])))

    return exams


def clean_line(line: str) -> str:
    line = line.strip()
    line = re.sub(r"\s+", " ", line)
    return line


def is_noise_line(line: str, year: int, session: int) -> bool:
    if not line:
        return True
    if re.fullmatch(r"-?\s*\d+\s*-?", line):
        return True
    if re.fullmatch(r"\d회", line):
        return True
    if line in {"기출문제 & 정답", "저작권 안내", "정답"}:
        return True
    if line.startswith(f"{year}년") or line.startswith(f"{year} 년"):
        return True
    if line.startswith("이 자료는") or line.startswith("다른 매체에"):
        return True
    if line.startswith("※ 다음 문제를") or line.startswith("답란("):
        return True
    if line.startswith("제") and "과목" in line:
        return True
    return False


def extract_column_text(page: pdfplumber.page.Page, *, left: float, right: float) -> str:
    cropped = page.crop((left, 0, right, page.height))
    return cropped.extract_text(x_tolerance=1, y_tolerance=3) or ""


def extract_problem_text(pdf: pdfplumber.PDF, exam: PdfExam) -> str:
    chunks: list[str] = []
    for page in pdf.pages:
        page_text = page.extract_text(x_tolerance=1, y_tolerance=3) or ""
        if re.search(r"(?m)^\s*정답 및 해설\s*$", page_text):
            break

        mid = page.width / 2
        columns = [
            extract_column_text(page, left=0, right=mid),
            extract_column_text(page, left=mid, right=page.width),
        ]
        for column_text in columns:
            lines = [clean_line(line) for line in column_text.splitlines()]
            lines = [line for line in lines if not is_noise_line(line, exam.year, exam.session)]
            chunks.append("\n".join(lines))

    text = "\n".join(chunks)
    text = text.replace("\ufeff", "")
    return re.sub(r"\n{3,}", "\n\n", text)


def parse_answer_markers(markers: str) -> tuple[int, str | None]:
    found_markers = [marker for marker in markers if marker in CIRCLED_TO_ANSWER]
    if not found_markers:
        return 1, "정답표 값을 읽지 못함"

    answer = CIRCLED_TO_ANSWER[found_markers[0]]
    if len(found_markers) > 1:
        return answer, markers

    return answer, None


def extract_answers(pdf: pdfplumber.PDF) -> tuple[dict[int, int], dict[int, str]]:
    answers: dict[int, int] = {}
    answer_notes: dict[int, str] = {}
    for page in pdf.pages:
        text = page.extract_text(x_tolerance=1, y_tolerance=3) or ""
        if "정답" not in text:
            continue

        for number, markers in ANSWER_RE.findall(text):
            parsed_number = int(number)
            if 1 <= parsed_number <= 100:
                answer, note = parse_answer_markers(markers)
                answers[parsed_number] = answer
                if note:
                    answer_notes[parsed_number] = note

        for number, marker in find_compacted_answer_entries(text).items():
            answers[number] = marker

        for match in re.finditer(r"(\d{1,3})\.\s*전항정답", text):
            parsed_number = int(match.group(1))
            if 1 <= parsed_number <= 100:
                answers[parsed_number] = 1
                answer_notes[parsed_number] = "전항정답"

    missing = sorted(set(range(1, 101)) - set(answers))
    for number in missing:
        answers[number] = 1
        answer_notes[number] = "정답표에서 누락"

    return answers, answer_notes


def find_compacted_answer_entries(text: str) -> dict[int, int]:
    entries: dict[int, int] = {}

    for number in range(10, 100):
        tens, ones = str(number)
        match = re.search(rf"(?<!\d){number}\.{tens}([①②③④]){ones}\.?", text)
        if match:
            entries[number] = CIRCLED_TO_ANSWER[match.group(1)]

    match = re.search(r"(?<!\d)1001\.0([①②③④])0\.?", text)
    if match:
        entries[100] = CIRCLED_TO_ANSWER[match.group(1)]

    return entries


def subject_number_for(question_number: int) -> int:
    return min(((question_number - 1) // 20) + 1, 5)


def split_question_blocks(text: str) -> dict[int, str]:
    matches = list(QUESTION_START_RE.finditer(text))
    blocks: dict[int, str] = {}

    for index, match in enumerate(matches):
        number = int(match.group(1))
        if not 1 <= number <= 100:
            continue

        start = match.start()
        end = matches[index + 1].start() if index + 1 < len(matches) else len(text)
        blocks[number] = text[start:end].strip()

    return blocks


def split_choices(block: str) -> tuple[str, list[str], bool]:
    block = re.sub(r"^\d{1,3}\.\s*", "", block, count=1).strip()
    parts = CHOICE_MARKER_RE.split(block)
    question_text = clean_multiline(parts[0])
    choices_by_marker: dict[str, str] = {}
    needs_review = False

    for index in range(1, len(parts), 2):
        marker = parts[index]
        content = parts[index + 1] if index + 1 < len(parts) else ""
        choices_by_marker[marker] = clean_multiline(content)

    choices = [choices_by_marker.get(marker, "") for marker in ["①", "②", "③", "④"]]
    if len([choice for choice in choices if choice]) != 4:
        needs_review = True

    if CHOICE_MARKER_RE.search(question_text):
        needs_review = True

    return question_text, choices, needs_review


def clean_multiline(text: str) -> str:
    lines = [clean_line(line) for line in text.splitlines()]
    lines = [line for line in lines if line]
    return "\n".join(lines)


def looks_like_code(text: str) -> bool:
    markers = [
        "#include",
        "int main",
        "public static",
        "class ",
        "printf",
        "println",
        "SELECT ",
        "FROM ",
        "WHERE ",
    ]
    return any(marker in text for marker in markers)


def split_code_field(question_text: str) -> tuple[str, str | None]:
    lines = question_text.splitlines()
    code_start = None
    code_markers = (
        "#include",
        "int main",
        "public class",
        "class ",
        "SELECT ",
        "CREATE ",
        "INSERT ",
        "UPDATE ",
        "DELETE ",
    )

    for index, line in enumerate(lines):
        stripped = line.strip()
        if any(stripped.startswith(marker) for marker in code_markers):
            code_start = index
            break

    if code_start is None:
        return question_text, None

    prose = "\n".join(lines[:code_start]).strip()
    code = "\n".join(lines[code_start:]).strip()
    return prose, code or None


def extraction_needs_review(question_text: str, choices: Iterable[str]) -> bool:
    combined = "\n".join([question_text, *choices])
    if not question_text:
        return True
    if "�" in combined:
        return True
    if re.search(r"(다음|아래).*(그림|트리|표|프로그램|코드|SQL|JAVA|C언어|Python)", combined, re.I):
        return True
    if looks_like_code(combined):
        return True
    return False


def build_questions(
    exam: PdfExam,
    blocks: dict[int, str],
    answers: dict[int, int],
    answer_notes: dict[int, str],
) -> list[dict[str, object]]:
    questions: list[dict[str, object]] = []

    for number in range(1, 101):
        subject_number = subject_number_for(number)
        subject = SUBJECTS[subject_number]
        block = blocks.get(number, "")
        question_text, choices, split_needs_review = split_choices(block) if block else ("", ["", "", "", ""], True)
        question_text = MANUAL_QUESTION_OVERRIDES.get((exam.exam_id, number), question_text)
        choices = MANUAL_CHOICE_OVERRIDES.get((exam.exam_id, number), choices)
        question_text, code = split_code_field(question_text)
        code = MANUAL_CODE_OVERRIDES.get((exam.exam_id, number), code)
        table = MANUAL_TABLE_OVERRIDES.get((exam.exam_id, number))
        tables = MANUAL_TABLES_OVERRIDES.get((exam.exam_id, number))
        image = MANUAL_IMAGE_OVERRIDES.get((exam.exam_id, number))
        answer = answers.get(number)
        needs_review = (
            split_needs_review
            or answer not in {1, 2, 3, 4}
            or number in answer_notes
            or extraction_needs_review(question_text, choices)
        )
        if (exam.exam_id, number) in MANUALLY_REVIEWED_QUESTIONS:
            needs_review = False

        questions.append(
            {
                "id": f"{exam.exam_id}-{number:03d}",
                "number": number,
                "subjectNumber": subject_number,
                "subject": subject,
                "question": question_text,
                "code": code,
                "table": table,
                "tables": tables,
                "choices": choices,
                "answer": answer if answer in {1, 2, 3, 4} else 1,
                "answerNote": answer_notes.get(number),
                "explanation": "",
                "image": image,
                "needsReview": needs_review,
            }
        )

    return questions


def convert_pdf(exam: PdfExam) -> dict[str, object]:
    with pdfplumber.open(exam.path) as pdf:
        problem_text = extract_problem_text(pdf, exam)
        answers, answer_notes = extract_answers(pdf)

    for (exam_id, question_number), answer in MANUAL_ANSWER_OVERRIDES.items():
        if exam_id == exam.exam_id:
            answers[question_number] = answer
            answer_notes.pop(question_number, None)

    non_standard_answers = sorted(answer_notes)
    if non_standard_answers:
        print(f"warning: {exam.exam_id} answer review needed={non_standard_answers}")

    blocks = split_question_blocks(problem_text)
    return {
        "exam": {
            "year": exam.year,
            "session": exam.session,
            "title": exam.title,
        },
        "questions": build_questions(exam, blocks, answers, answer_notes),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Convert exam PDFs into app JSON data.")
    parser.add_argument("--root", type=Path, default=Path.cwd())
    parser.add_argument("--out", type=Path, default=Path("src/data/exams"))
    parser.add_argument("--only", nargs="*", help="Optional exam ids such as 2025-1")
    args = parser.parse_args()

    exams = discover_pdfs(args.root)
    if args.only:
        requested = set(args.only)
        exams = [exam for exam in exams if exam.exam_id in requested]

    if not exams:
        raise SystemExit("No matching PDF files found.")

    args.out.mkdir(parents=True, exist_ok=True)
    for exam in exams:
        data = convert_pdf(exam)
        output_path = args.out / f"{exam.exam_id}.json"
        output_path.write_text(
            json.dumps(data, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        needs_review = sum(1 for question in data["questions"] if question["needsReview"])
        print(f"wrote {output_path} ({needs_review} needsReview)")


if __name__ == "__main__":
    main()
