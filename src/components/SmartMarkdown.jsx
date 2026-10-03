/**
 * SmartMarkdown — renders plain text with line breaks as beautiful structured HTML.
 * Handles:
 * - Section headers (short lines without colons)
 * - Key: value lines
 * - Bullet points (- or •)
 * - Numbered lists (1. 2. 3.)
 * - Regular paragraphs
 * - Bold key terms
 */
export default function SmartMarkdown({ text }) {
  if (!text) return null;

  const lines = text.split("\n");
  const blocks = [];
  let currentParagraph = [];

  const flushParagraph = () => {
    if (currentParagraph.length > 0) {
      const joined = currentParagraph.join(" ").trim();
      if (joined) {
        blocks.push({ type: "paragraph", content: joined });
      }
      currentParagraph = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      flushParagraph();
      blocks.push({ type: "spacer", content: "" });
      continue;
    }

    // Section header — short, no colon, no bullet, ends without period
    if (
      trimmed.length < 70 &&
      !trimmed.includes(":") &&
      !trimmed.endsWith(".") &&
      !trimmed.startsWith("-") &&
      !trimmed.startsWith("•") &&
      !/^\d+\./.test(trimmed) &&
      currentParagraph.length === 0
    ) {
      flushParagraph();
      blocks.push({ type: "header", content: trimmed });
      continue;
    }

    // Bullet
    if (trimmed.startsWith("-") || trimmed.startsWith("•")) {
      flushParagraph();
      blocks.push({ type: "bullet", content: trimmed.replace(/^[-•]\s*/, "") });
      continue;
    }

    // Numbered
    const numMatch = trimmed.match(/^(\d+)\.\s*(.+)/);
    if (numMatch) {
      flushParagraph();
      blocks.push({ type: "numbered", content: numMatch[2], number: numMatch[1] });
      continue;
    }

    // Key: value line
    const keyMatch = trimmed.match(/^([A-Z][A-Za-z\s/\-&]+?):\s*(.+)/);
    if (keyMatch) {
      flushParagraph();
      blocks.push({ type: "kv", key: keyMatch[1].trim(), value: keyMatch[2].trim() });
      continue;
    }

    // Regular paragraph accumulation
    currentParagraph.push(trimmed);
  }
  flushParagraph();

  return (
    <div className="space-y-3">
      {blocks.map((block, i) => {
        if (block.type === "spacer") return <div key={i} className="h-1" />;

        if (block.type === "header") {
          return (
            <h3 key={i} className="font-heading font-bold text-primary text-lg mt-6 mb-2 flex items-center gap-2">
              <span className="h-4 w-1 rounded-full bg-primary" />
              {block.content}
            </h3>
          );
        }

        if (block.type === "bullet") {
          return (
            <div key={i} className="flex gap-3 text-sm leading-relaxed">
              <span className="text-primary font-bold shrink-0 mt-0.5">•</span>
              <span className="text-muted-foreground">{block.content}</span>
            </div>
          );
        }

        if (block.type === "numbered") {
          return (
            <div key={i} className="flex gap-3 text-sm leading-relaxed">
              <span className="shrink-0 h-5 w-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center mt-0.5">
                {block.number}
              </span>
              <span className="text-muted-foreground">{block.content}</span>
            </div>
          );
        }

        if (block.type === "kv") {
          return (
            <p key={i} className="text-sm">
              <span className="font-semibold text-foreground">{block.key}:</span>{" "}
              <span className="text-muted-foreground">{block.value}</span>
            </p>
          );
        }

        return (
          <p key={i} className="text-sm text-muted-foreground leading-relaxed">
            {block.content}
          </p>
        );
      })}
    </div>
  );
}