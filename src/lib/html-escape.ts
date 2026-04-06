/**
 * HTML 특수문자 이스케이프.
 * route handler에서 raw HTML 응답을 생성할 때 사용자 입력에 적용.
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
