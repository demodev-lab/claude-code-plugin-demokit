/**
 * UserPromptSubmit Hook
 * 사용자 프롬프트에서 의도를 감지하고 적절한 Skill/Agent를 트리거
 *
 * 감지 패턴:
 * - "엔티티 만들어줘", "Entity 생성" → /entity skill
 * - "컨트롤러 만들어줘" → /controller skill
 * - "서비스 만들어줘" → /service skill
 * - "CRUD 만들어줘", "스캐폴드" → /crud skill
 * - "리뷰해줘", "코드 리뷰" → /review skill
 * - "테스트 만들어줘" → /test skill
 * - "도커", "Docker" → /docker skill
 */

async function main() {
  let input = '';
  for await (const chunk of process.stdin) {
    input += chunk;
  }

  const hookData = JSON.parse(input);
  const userPrompt = hookData.user_prompt || hookData.prompt || '';

  if (!userPrompt.trim()) {
    console.log(JSON.stringify({}));
    return;
  }

  const detected = detectIntent(userPrompt);

  if (detected) {
    console.log(JSON.stringify({
      systemMessage: `[demokit] 의도 감지: ${detected.description}\n추천 명령: ${detected.command}`,
    }));
  } else {
    console.log(JSON.stringify({}));
  }
}

/**
 * 의도 감지 패턴
 */
const INTENT_PATTERNS = [
  {
    patterns: [/커밋\s*[-]?\s*푸시/i, /commit[-\s]*push/i],
    command: '/commit-push',
    description: '커밋 + 푸시',
    skill: 'commit-push',
  },
  {
    patterns: [/커밋|commit/i],
    command: '/commit',
    description: '변경사항 커밋',
    skill: 'commit',
  },
  {
    patterns: [/푸시|push/i],
    command: '/push',
    description: '원격 푸시',
    skill: 'push',
  },
  {
    patterns: [/\bpr\b|풀리퀘|풀리퀘스트|pull\s*request/i],
    command: '/pr',
    description: 'PR 생성',
    skill: 'pr',
  },
  {
    patterns: [/엔티티|entity/i, /도메인\s*(모델|클래스|객체)/i],
    command: '/entity',
    description: 'JPA Entity 생성',
    skill: 'entity',
  },
  {
    patterns: [/리포지토리|repository/i],
    command: '/repository',
    description: 'Repository 생성',
    skill: 'repository',
  },
  {
    patterns: [/서비스\s*(만들|생성|추가)|service\s*(만들|생성|추가)/i, /비즈니스\s*로직/i],
    command: '/service',
    description: 'Service 레이어 생성',
    skill: 'service',
  },
  {
    patterns: [/컨트롤러|controller/i, /api\s*(만들|생성|추가)/i, /엔드포인트/i],
    command: '/controller',
    description: 'REST Controller 생성',
    skill: 'controller',
  },
  {
    patterns: [/dto/i, /request|response\s*(객체|클래스)/i],
    command: '/dto',
    description: 'DTO 생성',
    skill: 'dto',
  },
  {
    patterns: [/crud|스캐폴드|scaffold/i, /전체\s*(만들|생성)/i],
    command: '/crud',
    description: '도메인 CRUD 일괄 생성',
    skill: 'crud',
  },
  {
    patterns: [/리뷰|review|검토/i],
    command: '/review',
    description: '코드 리뷰',
    skill: 'review',
  },
  {
    patterns: [/테스트|test/i],
    command: '/test',
    description: '테스트 생성',
    skill: 'test',
  },
  {
    patterns: [/도커|docker|컨테이너/i],
    command: '/docker',
    description: 'Docker 설정',
    skill: 'docker',
  },
  {
    patterns: [/시큐리티|security|인증|인가|jwt|oauth/i],
    command: '/security',
    description: 'Spring Security 설정',
    skill: 'security',
  },
  {
    patterns: [/예외|exception|에러\s*처리/i],
    command: '/exception',
    description: '예외 처리 설정',
    skill: 'exception',
  },
  {
    patterns: [/캐시|cache|redis/i],
    command: '/cache',
    description: '캐싱 전략',
    skill: 'cache',
  },
  {
    patterns: [/마이그레이션|migration|flyway|liquibase/i],
    command: '/migration',
    description: 'DB 마이그레이션',
    skill: 'migration',
  },
  {
    patterns: [/gradle|의존성|dependency/i],
    command: '/gradle',
    description: 'Gradle 의존성 관리',
    skill: 'gradle',
  },
  {
    patterns: [/pdca/i],
    command: '/pdca',
    description: 'PDCA 워크플로우',
    skill: 'pdca',
  },
  {
    patterns: [/루프|loop|반복\s*(실행|수행|돌려)/i, /자동\s*(반복|루프)/i],
    command: '/loop',
    description: '자율 반복 루프',
    skill: 'loop',
  },
];

/**
 * 프롬프트에서 의도 감지
 */
function detectIntent(prompt) {
  const normalized = prompt.toLowerCase().trim();

  // "만들어줘", "생성해줘", "추가해줘" 등 생성 동사가 포함되어야 더 정확
  const hasActionVerb = /만들|생성|추가|설정|구현|작성|세팅/.test(normalized);

  for (const intent of INTENT_PATTERNS) {
    for (const pattern of intent.patterns) {
      if (pattern.test(prompt)) {
        // 일부 패턴은 동사 없이도 의미가 명확함
        const isStrongPattern = /crud|스캐폴드|리뷰|review|pdca|loop|루프|커밋|commit|푸시|push|\bpr\b|풀리퀘/.test(normalized);
        if (hasActionVerb || isStrongPattern) {
          return intent;
        }
      }
    }
  }

  return null;
}

main().catch(err => {
  console.error(`[demokit] user-prompt-handler 오류: ${err.message}`);
  console.log(JSON.stringify({}));
});
