import fs from 'node:fs';
import path from 'node:path';

const EXAMS_DIR = path.resolve('src/data/exams');

const overrides = {
  '2020-2-021': {
    question: '평가 점수에 따른 성적부여는 다음 표와 같다. 이를 구현한 소프트웨\n어를 경계 값 분석 기법으로 테스트 하고자 할 때 다음 중 테스트\n케이스의 입력 값으로 옳지 않은 것은?',
    table: {
      title: '성적부여 기준',
      headers: ['평가점수', '성적'],
      rows: [
        ['80~100', 'A'],
        ['60~79', 'B'],
        ['0~59', 'C'],
      ],
    },
  },
  '2020-2-042': {
    question: 'STUDENT 테이블에 독일어과 학생 50명, 중국어과 학생 30명,\n영어영문학과 학생 50명의 정보가 저장되어 있을 때, 다음 두\nSQL문의 실행 결과 튜플 수는? (단, DEPT 컬럼은 학과명)',
    code: 'ⓐ SELECT DEPT FROM STUDENT;\nⓑ SELECT DISTINCT DEPT FROM STUDENT;',
  },
  '2020-3-053': {
    question: 'player 테이블에는 player_name, team_id, height 컬럼이 존재한다.\n아래 SQL문에서 문법적 오류가 있는 부분은?',
    code: "(1) SELECT player_name, height\n(2) FROM player\n(3) WHERE team_id = 'korea'\n(4) AND height BETWEEN 170 OR 180;",
  },
  '2020-3-061': {
    question: '다음 자바 프로그램 조건문에 대해 삼항 조건 연산자를 사용하여\n옳게 나타낸 것은?',
    code: 'int i = 7, j = 9;\nint k;\nif (i > j)\nk = i - j;\nelse\nk = i + j;',
  },
  '2020-3-075': {
    question: '다음은 사용자로부터 입력받은 문자열에서 처음과 끝의 3글자를\n추출한 후 합쳐서 출력하는 파이썬 코드이다. ㉠에 들어갈 내용은?',
    code: 'String = input("7문자 이상 문자열을 입력하시오 :")\nm = ( ㉠ )\nprint(m)',
  },
  '2020-3-078': {
    question: '다음 C 프로그램의 결과 값은?',
    code: 'main(void) {\nint i;\nint sum = 0;\nfor(i = 1; i <= 10; i = i + 2)\nsum = sum + i;\nprintf("%d", sum);\n}',
  },
  '2020-3-097': {
    question: '다음 JAVA 코드에서 밑줄로 표시된 부분에는 어떤 보안 약점이\n존재하는가? (단, key는 암호화 키를 저장하는 변수이다.)',
    code: 'import javax.crypto,KeyGenerator;\nimport javax.crypto.spec.ScretKeySpec;\nimport javax.crypto.Cipher;\n......생략\npublic String encripString(String usr) {\nString key = "22df3023sf~2;asn!@#/>as";\nif (key != null)\nbyte[] bToEncrypt = usr.getBytes("UTF-8");\n......생략',
  },
  '2020-3-044': {
    question: '관계 데이터베이스인 테이블 R1에 대한 아래 SQL 문의 실행결과로\n옳은 것은?',
    table: {
      title: '[R1]',
      headers: ['학번', '이름', '학년', '학과', '주소'],
      rows: [
        ['1000', '홍길동', '1', '컴퓨터공학', '서울'],
        ['2000', '김철수', '1', '전기공학', '경기'],
        ['3000', '강남길', '2', '전기공학', '경기'],
        ['4000', '오말자', '2', '컴퓨터공학', '경기'],
        ['5000', '장미화', '3', '전기공학', '서울'],
      ],
    },
  },
  '2021-1-048': {
    question: '아래의 SQL문을 실행한 결과는?',
    code: "SELECT 이름\nFROM R1\nWHERE 학번 IN\n(SELECT 학번\nFROM R2\nWHERE 과목번호 = 'C100');",
    tables: [
      {
        title: '[R1 테이블]',
        headers: ['학번', '이름', '학년', '학과', '주소'],
        rows: [
          ['1000', '홍길동', '4', '컴퓨터', '서울'],
          ['2000', '김철수', '3', '전기', '경기'],
          ['3000', '강남길', '1', '컴퓨터', '경기'],
          ['4000', '오말자', '4', '컴퓨터', '경기'],
          ['5000', '장미화', '2', '전자', '서울'],
        ],
      },
      {
        title: '[R2 테이블]',
        headers: ['학번', '과목번호', '성적', '점수'],
        rows: [
          ['1000', 'C100', 'A', '91'],
          ['1000', 'C200', 'A', '94'],
          ['2000', 'C300', 'B', '85'],
          ['3000', 'C400', 'A', '90'],
          ['3000', 'C500', 'C', '75'],
          ['3000', 'C100', 'A', '90'],
          ['4000', 'C400', 'A', '95'],
          ['4000', 'C500', 'A', '91'],
          ['4000', 'C100', 'B', '80'],
          ['4000', 'C200', 'C', '74'],
          ['5000', 'C400', 'B', '85'],
        ],
      },
    ],
  },
  '2021-1-074': {
    question: '다음 JAVA 코드 출력문의 결과는?',
    code: '..생략..\nSystem.out.println("5 + 2 = " + 3 + 4);\nSystem.out.println("5 + 2 = " + (3 + 4));\n..todfir..',
  },
  '2021-1-075': {
    question: '다음은 파이썬으로 만들어진 반복문 코드이다. 이 코드의 결과는?',
    code: ">> while(True) :\nprint('A')\nprint('B')\nprint('C')\ncontinue\nprint('D')",
  },
  '2021-2-045': {
    question: '다음 R1과 R2의 테이블에서 아래의 실행 결과를 얻기 위한 SQL문은?',
    tables: [
      {
        title: '[R1] 테이블',
        headers: ['학번', '이름', '학년', '학과', '주소'],
        rows: [
          ['1000', '홍길동', '1', '컴퓨터공학', '서울'],
          ['2000', '김철수', '1', '전기공학', '경기'],
          ['3000', '강남길', '2', '전자공학', '경기'],
          ['4000', '오말자', '2', '컴퓨터공학', '경기'],
          ['5000', '장미화', '3', '전자공학', '서울'],
        ],
      },
      {
        title: '[R2] 테이블',
        headers: ['학번', '과목번호', '과목이름', '성적', '점수'],
        rows: [
          ['1000', 'C100', '컴퓨터구조', 'A', '91'],
          ['2000', 'C200', '데이터베이스', 'A+', '99'],
          ['3000', 'C100', '컴퓨터구조', 'B+', '89'],
          ['3000', 'C200', '데이터베이스', 'B', '85'],
          ['4000', 'C200', '데이터베이스', 'A', '93'],
          ['4000', 'C300', '운영체제', 'B+', '88'],
          ['5000', 'C300', '운영체제', 'B', '82'],
        ],
      },
      {
        title: '[실행결과]',
        headers: ['과목번호', '과목이름'],
        rows: [
          ['C100', '컴퓨터구조'],
          ['C200', '데이터베이스'],
        ],
      },
    ],
  },
  '2021-2-053': {
    question: '테이블 R1, R2에 대하여 다음 SQL문의 결과는?',
    code: '(SELECT 학번 FROM R1)\nINTERSECT\n(SELECT 학번 FROM R2)',
    tables: [
      {
        title: '[R1] 테이블',
        headers: ['학번', '학점 수'],
        rows: [
          ['20201111', '15'],
          ['20202222', '20'],
        ],
      },
      {
        title: '[R2] 테이블',
        headers: ['학번', '과목번호'],
        rows: [
          ['20202222', 'CS200'],
          ['20203333', 'CS300'],
        ],
      },
    ],
  },
  '2021-3-027': {
    question: '다음은 스택의 자료 삭제 알고리즘이다. ⓐ에 들어갈 내용으로\n옳은 것은? (단, Top : 스택포인터, S : 스택의 이름)',
    code: 'if Top = 0 Then\n( ⓐ )\nElse {\nremove S(Top)\nTop = Top - 1\n}',
  },
  '2021-3-063': {
    question: '다음 파이썬(Python) 프로그램이 실행되었을 때의 결과는?',
    code: 'def cs(n):\ns= 0\nfor num in range(n+1):\ns += num\nreturn s\nprint(cs(11))',
  },
  '2022-1-059': {
    question: '테이블 두 개를 조인하여 뷰 V_1을 정의하고, V_1을 이용하여 뷰\nV_2를 정의하였다. 다음 명령 수행 후 결과로 옳은 것은?',
    code: 'DROP VIEW V_1 CASCADE;',
  },
  '2022-1-077': {
    question: '다음 Python 프로그램이 실행되었을 때, 실행 결과는?',
    code: "a = 100\nlist_data = ['a','b','c']\ndict_data = {'a':90, 'b':95}\nprint(list_data[0])\nprint(dict_data['a'])",
  },
  '2022-1-079': {
    question: '다음 Python 프로그램이 실행되었을 때, 실행 결과는?',
    code: 'a = ["대", "한", "민", "국"]\nfor i in a:\nprint(i)',
  },
  '2022-2-060': {
    question: '사용자 ‘PARK’에게 테이블을 생성할 수 있는 권한을 부여하기 위한\nSQL문의 구성으로 빈칸에 적합한 내용은?',
    code: '[SQL문]\nGRANT [ ] PARK;',
  },
  '2022-2-065': {
    question: '다음 Python 프로그램의 실행 결과가 [실행결과]와 같을 때, 빈칸에\n적합한 것은?',
    code: "x = 20\nif x == 10:\nprint('10')\n( ) x == 20:\nprint('20')\nelse:\nprint('other')\n[실행결과]",
  },
  '2022-2-044': {
    question: '다음 테이블을 보고 강남지점의 판매량이 많은 제품부터 출력되도록\n할 때 다음 중 가장 적절한 SQL 구문은? (단, 출력은 제품명과\n판매량이 출력되도록 한다.)',
    table: {
      title: '<푸드> 테이블',
      headers: ['지점명', '제품명', '판매량'],
      rows: [
        ['강남지점', '비빔밥', '500'],
        ['강북지점', '도시락', '300'],
        ['강남지점', '도시락', '200'],
        ['강남지점', '미역국', '550'],
        ['수원지점', '비빔밥', '600'],
        ['인천지점', '비빔밥', '800'],
        ['강남지점', '잡채밥', '250'],
      ],
    },
  },
  '2022-3-047': {
    question: '다음 SQL문의 실행 결과를 가장 올바르게 설명한 것은?',
    code: 'ALTER TABLE 학생 DROP 학년 CASCADE;',
  },
  '2022-3-065': {
    question: '다음 파이썬 코드에서 ‘53t44’를 입력했을 때 출력 결과는?',
    code: 'a, b = map(int, input().split("t"));\nprint(a, b)',
  },
  '2023-1-042': {
    question: '테이블 두 개를 조인하여 뷰 V_1을 정의하고, V_1을 이용하여 뷰\nV_2를 정의하였다. 다음 명령 수행 후 결과로 옳은 것은?',
    code: 'DROP VIEW V_1 CASCADE;',
  },
  '2023-1-080': {
    question: '다음 Python 프로그램이 실행되었을 때, 실행 결과는?',
    code: "a = 100\nlist_data = [‘a’,‘b’,‘c’]\ndict_data = {‘a’:90, ‘b’:95}\nprint(list_data[0])\nprint(dict_data['a'])",
  },
  '2023-2-063': {
    question: '다음 Python 프로그램이 실행되었을 때, 실행 결과는?',
    code: "a = 100\nlist_data = ['a','b','c']\ndict_data = {'a':90, 'b':95}\nprint(list_data[0])\nprint(dict_data['a'])",
  },
  '2023-2-077': {
    question: '다음 자바 프로그램 조건문에 대해 삼항 조건 연산자를 사용하여\n옳게 나타낸 것은?',
    code: 'int i = 7, j = 9;\nint k;\nif (i > j)\nk = i - j;\nelse\nk = i + j;',
  },
  '2023-2-052': {
    question: '다음 표와 같은 판매실적 테이블에서 서울지역에 한하여 판매액\n내림차순으로 지점명과 판매액을 출력하고자 한다. 가장 적절한\nSQL 구문은?',
    table: {
      title: '[테이블명 : 판매실적]',
      headers: ['도시', '지점명', '판매액'],
      rows: [
        ['서울', '강남 지점', '330'],
        ['서울', '강북 지점', '168'],
        ['광주', '광주 지점', '197'],
        ['서울', '강서 지점', '158'],
        ['서울', '강동 지점', '197'],
        ['대전', '대전 지점', '165'],
      ],
    },
  },
  '2023-3-043': {
    question: 'STUDENT 테이블에 독일어과 학생 50명, 중국어과 학생 30명,\n영어영문학과 학생 50명의 정보가 저장되어 있을 때, 다음 두 SQL문\n의 실행 결과 튜플 수는? (단, DEPT 컬럼은 학과명)',
    code: 'ⓐ SELECT DEPT FROM STUDENT;\nⓑ SELECT DISTINCT DEPT FROM STUDENT;',
  },
  '2023-3-048': {
    question: 'DBA가 사용자 PARK에게 테이블 [STUDENT]의 데이터를 갱신할\n수 있는 시스템 권한을 부여하고자 하는 SQL문을 작성하고자 한다.\n다음에 주어진 SQL문의 빈칸을 알맞게 채운 것은?',
    code: 'SQL＞GRANT ㉠ ㉡ STUDENT TO PARK;',
  },
  '2023-3-075': {
    question: '다음은 파이썬으로 만들어진 반복문 코드이다. 이 코드의 결과는?',
    code: ">> while(True) :\nprint('A')\nprint('B')\nprint('C')\ncontinue\nprint('D')",
  },
  '2024-1-067': {
    question: '다음 자바 코드를 실행한 결과는?',
    code: 'int x=1, y=6;\nwhile (y--) {\nx++;\n}\nSystem.out.println("x=" x+"y=" y);',
  },
  '2024-2-075': {
    question: '다음은 Java로 만들어진 반복문 코드이다. 이 코드의 결과는?',
    code: '..생략..\nint a = 0, sum = 0;\ndo {\na++;\nsum += a;\n} while(a > 10);\n..생략..',
  },
  '2024-2-084': {
    question: '다음 Java 코드에서 밑줄로 표시된 부분에는 어떤 보안 약점이\n존재하는가?',
    code: 'public static void main(String[] args) {\nint a = 5;\na = func(a);\n}\nstatic int func(int a) {\nreturn a <= 5 ? func(a) : 3;\n}',
  },
  '2024-3-047': {
    question: 'DBA가 사용자 PARK에게 테이블 [STUDENT]의 데이터를 갱신할\n수 있는 시스템 권한을 부여하고자 하는 SQL문을 작성하고자 한다.\n다음에 주어진 SQL문의 빈칸을 알맞게 채운 것은?',
    code: 'SQL＞GRANT ㉠ ㉡ STUDENT TO PARK;',
  },
  '2024-3-057': {
    question: '테이블 두 개를 조인하여 뷰 V_1을 정의하고, V_1을 이용하여 뷰\nV_2를 정의하였다. 다음 명령 수행 후 결과로 옳은 것은?',
    code: 'DROP VIEW V_1 CASCADE;',
  },
  '2024-3-074': {
    question: '다음은 Python 프로그램이 실행되었을 때의 결과는?',
    code: "String = ‘Conceptual Schema’\nr = String[-4:6:-2]\nprint(r)",
  },
  '2025-1-065': {
    question: '다음 파이썬 코드에서 ‘53t44’를 입력했을 때 출력 결과는?',
    code: 'a, b = map(int, input().split("t"));\nprint(a, b)',
  },
  '2025-1-072': {
    question: '다음 자바 코드를 실행한 결과는?',
    code: 'int x＝1, y＝6;\nwhile (y--) {\nx＋＋;\n}\nSystem.out.println(“x＝” x＋“y＝” y);',
  },
  '2025-2-044': {
    question: 'STUDENT 테이블에 독일어과 학생 50명, 중국어과 학생 30명,\n영어영문학과 학생 50명의 정보가 저장되어 있을 때, 다음 두 SQL문\n의 실행 결과 튜플 수는? (단, DEPT 컬럼은 학과명)',
    code: 'ⓐ SELECT DEPT FROM STUDENT;\nⓑ SELECT DISTINCT DEPT FROM STUDENT;',
  },
  '2025-2-065': {
    question: '다음 Python 프로그램이 실행되었을 때, 실행 결과는?',
    code: "strA = 'Information Technology'\nstrL = list()\nfor i in range(0, len(strA), 2):\nstrL.append(strA[i])\nfor j in range(len(strL) - 1, 0, -2):\nprint(strL[j], end='')",
  },
  '2025-2-074': {
    question: '다음 Python 코드 출력문의 결과는?',
    code: "print(4, 1, 2, sep=',', end='')\nprint(3, 5, sep='/')",
  },
  '2025-2-076': {
    question: '다음은 파이썬으로 만들어진 반복문 코드이다. 이 코드의 결과는?',
    code: "while(True) :\nprint('A')\nprint('B')\nbreak\nprint('C')\nprint('D')",
  },
  '2025-3-045': {
    question: 'player 테이블에는 player_name, team_id, height 컬럼이 존재한다.\n아래 SQL문에서 문법적 오류가 있는 부분은?',
    code: '(1) SELECT player_name, height\n(2) FROM player\n(3) WHERE team_id = ‘korea’\n(4) AND height BETWEEN 170 OR 180;',
  },
  '2025-3-073': {
    question: '다음 파이썬 코드에서 ‘53t44’를 입력했을 때 출력 결과는?',
    code: 'a, b = map(int, input( ).split(“t”));\nprint(a, b)',
  },
  '2026-1-080': {
    question: '다음 파이썬 코드에서 ‘53t44’를 입력했을 때 출력 결과는?',
    code: 'a, b = map(int, input( ).split(“t”));\nprint(a, b)',
  },
};

const byExam = new Map();
for (const [id, override] of Object.entries(overrides)) {
  const [year, session] = id.split('-');
  const examId = `${year}-${session}`;
  if (!byExam.has(examId)) {
    byExam.set(examId, []);
  }
  byExam.get(examId).push([id, override]);
}

let changed = 0;
for (const [examId, examOverrides] of byExam) {
  const filePath = path.join(EXAMS_DIR, `${examId}.json`);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  for (const [id, override] of examOverrides) {
    const question = data.questions.find((item) => item.id === id);
    if (!question) {
      throw new Error(`Question not found: ${id}`);
    }

    const before = JSON.stringify(question);
    question.question = override.question;
    if ('code' in override) {
      question.code = override.code;
    }
    if (override.tables) {
      question.tables = override.tables;
    }
    if (override.table) {
      question.table = override.table;
    }
    if (JSON.stringify(question) !== before) {
      changed += 1;
    }
  }

  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

console.log(`applied ${changed} question format overrides`);
