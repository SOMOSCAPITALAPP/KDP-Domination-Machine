import type { BookProject, Chapter } from "@/lib/types";

export function chapterImagePrompt(project: BookProject, chapter: Chapter) {
  return `Create a premium editorial photo illustration for a book chapter.

Book context:
- Title: ${project.title}
- Language: ${project.language}
- Audience: ${project.audience}
- Niche: ${project.niche}
- Tone: ${project.tone}

Chapter context:
- Title: ${chapter.title}
- Summary: ${chapter.summary}
- Learning goal: ${chapter.learningGoal}
- Emotional shift: ${chapter.emotionalShift}
- Existing visual direction: ${chapter.illustrationPrompt || "Simple, strong, photorealistic editorial image."}

Creative direction:
- photorealistic image
- simple composition
- premium editorial look
- no text
- no collage
- no split screen
- one clear idea per image
- suitable for an interior chapter illustration or marketing visual
- strong lighting
- clean subject separation
- realistic details

Return three distinct visual interpretations of the same chapter idea.`;
}
