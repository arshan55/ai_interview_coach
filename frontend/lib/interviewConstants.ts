export const VIDEO_ANSWER_PLACEHOLDER =
  '[Video answer submitted — recording not stored]';

export function isVideoAnswerPlaceholder(text: string | null | undefined): boolean {
  return text === VIDEO_ANSWER_PLACEHOLDER;
}
