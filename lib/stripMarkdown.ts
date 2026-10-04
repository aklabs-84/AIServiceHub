// 목록 카드처럼 짧게 보여주는 곳에서 마크다운 기호를 지우고 한 줄 글로 만든다.
// 저장된 원본(마크다운)은 그대로 두고 화면에 보여줄 때만 사용한다.
export function stripMarkdown(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .replace(/```[\s\S]*?```/g, ' ') // 코드 블록
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ') // 이미지
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // 링크 → 글자만
    .replace(/^\s{0,3}#{1,6}\s*/gm, '') // 제목 ##
    .replace(/^\s{0,3}>\s?/gm, '') // 인용 >
    .replace(/^\s*[-*+]\s+/gm, '') // 목록 - * +
    .replace(/^\s*\d+\.\s+/gm, '') // 번호 목록 1.
    .replace(/^\s*([-*_]\s*){3,}$/gm, ' ') // 구분선
    .replace(/(\*\*|__)(.*?)\1/g, '$2') // 굵게
    .replace(/(\*|_)(.*?)\1/g, '$2') // 기울임
    .replace(/~~(.*?)~~/g, '$1') // 취소선
    .replace(/`([^`]*)`/g, '$1') // 인라인 코드
    .replace(/<[^>]+>/g, ' ') // HTML 태그
    .replace(/\s+/g, ' ')
    .trim();
}
