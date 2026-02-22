// GuidePage - 사용법 페이지
// 스크롤 식 매뉴얼

import type { AppView } from '../../types/config';

interface GuidePageProps {
  onNavigate: (view: AppView) => void;
}

interface GuideSection {
  id: string;
  icon: string;
  title: string;
  content: React.ReactNode;
}

const GUIDE_SECTIONS: GuideSection[] = [
  {
    id: 'intro',
    icon: '👋',
    title: 'moldClaw 소개',
    content: (
      <div className="space-y-4">
        <p>
          <strong>moldClaw</strong>는 OpenClaw를 쉽게 설치하고 관리할 수 있는 Windows용 앱입니다.
        </p>
        <p>
          OpenClaw는 AI 어시스턴트를 다양한 메신저(Telegram, Discord, WhatsApp 등)와 연결해주는 도구입니다.
          한 번 설정하면 언제 어디서나 AI와 대화할 수 있습니다.
        </p>
        <div className="card p-4 bg-forge-copper/10 border-forge-copper/30">
          <p className="text-sm">
            💡 moldClaw를 사용하면 복잡한 터미널 명령어 없이도 OpenClaw를 설정할 수 있습니다!
          </p>
        </div>
      </div>
    ),
  },
  {
    id: 'dashboard',
    icon: '🎛️',
    title: '대시보드 사용법',
    content: (
      <div className="space-y-4">
        <p>대시보드는 moldClaw의 메인 화면입니다.</p>
        
        <h4 className="font-medium text-forge-copper">전원 버튼 (중앙)</h4>
        <ul className="list-disc list-inside space-y-1 text-sm">
          <li><strong>클릭</strong>하면 Gateway가 켜지거나 꺼집니다</li>
          <li>용광로처럼 빛나면 실행 중입니다</li>
          <li>회전하는 빛은 시작 중임을 의미합니다</li>
        </ul>

        <h4 className="font-medium text-forge-copper">주변 버튼들</h4>
        <ul className="list-disc list-inside space-y-1 text-sm">
          <li><strong>⚙️ 설정</strong>: AI 모델, 메신저 등 설정 변경</li>
          <li><strong>🔔 알림</strong>: 예약된 알림 관리</li>
          <li><strong>📁 파일</strong>: AI 워크스페이스 파일 확인</li>
          <li><strong>📋 로그</strong>: Gateway 활동 기록</li>
          <li><strong>🌐 웹</strong>: 웹 인터페이스 열기</li>
          <li><strong>⚠️ 삭제</strong>: moldClaw & OpenClaw 삭제</li>
          <li><strong>📖 사용법</strong>: 이 페이지</li>
        </ul>
      </div>
    ),
  },
  {
    id: 'model',
    icon: '🤖',
    title: 'AI 모델 설정',
    content: (
      <div className="space-y-4">
        <p>OpenClaw는 다양한 AI 서비스를 지원합니다.</p>

        <h4 className="font-medium text-forge-copper">지원 서비스</h4>
        <ul className="list-disc list-inside space-y-1 text-sm">
          <li><strong>Anthropic</strong>: Claude (추천)</li>
          <li><strong>OpenAI</strong>: GPT-4, o1</li>
          <li><strong>Google</strong>: Gemini</li>
          <li><strong>OpenRouter</strong>: 다양한 모델 통합</li>
          <li><strong>Groq</strong>: 초고속 추론</li>
        </ul>

        <h4 className="font-medium text-forge-copper">API 키 발급</h4>
        <p className="text-sm">
          각 서비스의 공식 사이트에서 계정을 만들고 API 키를 발급받으세요.
          설정 화면에서 "키 발급받기" 링크를 클릭하면 해당 사이트로 이동합니다.
        </p>

        <div className="card p-4 bg-forge-success/10 border-forge-success/30">
          <p className="text-sm">
            🔒 API 키는 이 컴퓨터에만 저장되며, 외부로 전송되지 않습니다.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: 'messenger',
    icon: '💬',
    title: '메신저 연결',
    content: (
      <div className="space-y-4">
        <p>AI와 대화할 메신저를 선택하고 연결합니다.</p>

        <h4 className="font-medium text-forge-copper">Telegram (추천)</h4>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>Telegram에서 @BotFather 검색</li>
          <li>/newbot 명령으로 봇 생성</li>
          <li>받은 토큰을 moldClaw에 입력</li>
        </ol>

        <h4 className="font-medium text-forge-copper">WhatsApp</h4>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>moldClaw에서 QR 코드 열기 클릭</li>
          <li>휴대폰 WhatsApp에서 QR 스캔</li>
          <li>연결 완료!</li>
        </ol>

        <h4 className="font-medium text-forge-copper">Discord</h4>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>Discord Developer Portal에서 앱 생성</li>
          <li>Bot 토큰 복사</li>
          <li>MESSAGE CONTENT INTENT 활성화</li>
          <li>봇을 서버에 초대</li>
        </ol>
      </div>
    ),
  },
  {
    id: 'features',
    icon: '✨',
    title: '주요 기능',
    content: (
      <div className="space-y-4">
        <h4 className="font-medium text-forge-copper">알림 설정</h4>
        <p className="text-sm">
          AI에게 "내일 아침 9시에 날씨 알려줘"라고 말하면 자동으로 알림이 설정됩니다.
        </p>

        <h4 className="font-medium text-forge-copper">웹 검색</h4>
        <p className="text-sm">
          Brave Search API를 연동하면 AI가 실시간 정보를 검색할 수 있습니다.
        </p>

        <h4 className="font-medium text-forge-copper">브라우저 제어</h4>
        <p className="text-sm">
          Chrome 확장 프로그램을 설치하면 AI가 웹페이지를 읽고 조작할 수 있습니다.
        </p>

        <h4 className="font-medium text-forge-copper">Gmail 연동</h4>
        <p className="text-sm">
          Google Cloud 설정 후 AI가 이메일을 읽고, 작성하고, 관리할 수 있습니다.
        </p>

        <h4 className="font-medium text-forge-copper">TTS (음성 합성)</h4>
        <p className="text-sm">
          ElevenLabs 또는 OpenAI TTS를 연동하면 AI가 음성으로 응답합니다.
        </p>
      </div>
    ),
  },
  {
    id: 'troubleshoot',
    icon: '🔧',
    title: '문제 해결',
    content: (
      <div className="space-y-4">
        <h4 className="font-medium text-forge-copper">Gateway가 시작되지 않아요</h4>
        <ul className="list-disc list-inside space-y-1 text-sm">
          <li>Node.js가 설치되어 있는지 확인하세요</li>
          <li>포트 18789가 사용 중인지 확인하세요</li>
          <li>백신 프로그램이 차단하지 않는지 확인하세요</li>
        </ul>

        <h4 className="font-medium text-forge-copper">메신저에서 응답이 없어요</h4>
        <ul className="list-disc list-inside space-y-1 text-sm">
          <li>Gateway가 실행 중인지 확인하세요 (대시보드 전원 버튼)</li>
          <li>API 키가 유효한지 확인하세요</li>
          <li>메신저 토큰이 올바른지 확인하세요</li>
          <li>DM 정책이 "pairing" 또는 "open"인지 확인하세요</li>
        </ul>

        <h4 className="font-medium text-forge-copper">로그에서 에러 확인</h4>
        <p className="text-sm">
          대시보드 → 📋 로그에서 상세한 에러 메시지를 확인할 수 있습니다.
        </p>

        <div className="card p-4 bg-forge-amber/10 border-forge-amber/30">
          <p className="text-sm">
            💡 문제가 해결되지 않으면 <a href="mailto:hexagon0678@gmail.com" className="text-forge-copper hover:underline">hexagon0678@gmail.com</a>으로 문의하세요!
          </p>
        </div>
      </div>
    ),
  },
];

export default function GuidePage({ onNavigate }: GuidePageProps) {
  return (
    <div className="min-h-screen gradient-bg">
      {/* 헤더 */}
      <div className="sticky top-0 z-10 p-6 border-b border-white/10 bg-forge-night/80 backdrop-blur-md">
        <div className="flex items-center gap-4 max-w-3xl mx-auto">
          <button
            onClick={() => onNavigate('dashboard')}
            className="
              w-10 h-10 rounded-xl bg-forge-surface hover:bg-white/10
              flex items-center justify-center text-forge-muted hover:text-forge-text
              transition-colors
            "
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-xl font-bold text-forge-text">📖 사용법</h1>
            <p className="text-sm text-forge-muted">moldClaw 사용 가이드</p>
          </div>
        </div>
      </div>

      {/* 컨텐츠 */}
      <div className="p-6 max-w-3xl mx-auto">
        <div className="space-y-8">
          {GUIDE_SECTIONS.map((section) => (
            <section key={section.id} className="card p-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">{section.icon}</span>
                <h2 className="text-xl font-bold text-forge-text">{section.title}</h2>
              </div>
              <div className="text-forge-text/90">
                {section.content}
              </div>
            </section>
          ))}
        </div>

        {/* 하단 */}
        <div className="mt-12 text-center pb-8">
          <p className="text-forge-muted text-sm mb-4">
            moldClaw를 사용해 주셔서 감사합니다! 🙏
          </p>
          <button
            onClick={() => onNavigate('dashboard')}
            className="px-6 py-3 rounded-xl btn-primary"
          >
            대시보드로 돌아가기
          </button>
        </div>
      </div>
    </div>
  );
}
