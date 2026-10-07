export type Evidence = { id: string; source: string; text: string; url?: string };

export function chunkEvidence(profile: string, github?: { readme: string; url: string }): Evidence[] {
  const sources = [{ text: profile, source: '用户提供的经历' }, ...(github ? [{ text: github.readme, source: 'GitHub README', url: github.url }] : [])];
  return sources.flatMap(({ text, source, url }, sourceIndex) => {
    const paragraphs = text.split(/\n\s*\n|\n(?=[#*-] )/).map(x => x.trim()).filter(Boolean);
    const chunks: Evidence[] = [];
    for (const paragraph of paragraphs) {
      for (let offset = 0; offset < paragraph.length; offset += 550) {
        const slice = paragraph.slice(offset, offset + 650);
        if (slice.length >= 8) chunks.push({ id: `E${sourceIndex + 1}-${chunks.length + 1}`, source, text: slice, ...(url ? { url } : {}) });
      }
    }
    return chunks.slice(0, 30);
  });
}

export function retrieveEvidence(query: string, chunks: Evidence[], limit = 6): Evidence[] {
  const terms = [...new Set((query.toLowerCase().match(/[a-z][a-z\d+#.]{1,}|[\u4e00-\u9fff]{2,4}/g) ?? []).filter(x => !/^(岗位|工作|要求|职责|经验|熟悉|能够|相关)$/.test(x)))];
  return chunks.map((chunk, index) => ({ chunk, index, score: terms.reduce((score, term) => score + (chunk.text.toLowerCase().includes(term) ? term.length : 0), 0) }))
    .sort((a, b) => b.score - a.score || a.index - b.index).slice(0, limit).map(x => x.chunk);
}

