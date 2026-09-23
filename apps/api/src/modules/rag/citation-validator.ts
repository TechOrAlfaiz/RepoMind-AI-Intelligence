import type { RetrievedChunk, ValidatedCitation } from "@repomind/shared-types";

export interface ValidationResult {
  validatedCitations: ValidatedCitation[];
  sanitizedResponse: string;
  citedIndices: number[];
  validCount: number;
  invalidCount: number;
}

export class CitationValidator {
  /**
   * Parses and validates all [CTX-n] citations against the actual candidate chunks.
   * Strips hallucinated or out-of-range citations before client delivery.
   */
  validate(responseText: string, candidateChunks: RetrievedChunk[]): ValidationResult {
    const citationRegex = /\[CTX-(\d+)\]/g;
    const validatedCitations: ValidatedCitation[] = [];
    const seenIndices = new Set<number>();
    const citedIndices: number[] = [];
    let validCount = 0;
    let invalidCount = 0;

    // Scan all citations
    const matches = Array.from(responseText.matchAll(citationRegex));

    for (const match of matches) {
      const index = parseInt(match[1], 10);
      citedIndices.push(index);

      if (index >= 1 && index <= candidateChunks.length) {
        validCount++;
        if (!seenIndices.has(index)) {
          seenIndices.add(index);
          const chunk = candidateChunks[index - 1];
          const lines = chunk.content.split(/\r?\n/);
          const snippetPreview = lines.slice(0, 6).join("\n");

          validatedCitations.push({
            chunkId: chunk.chunkId,
            filePath: chunk.filePath,
            startLine: chunk.startLine,
            endLine: chunk.endLine,
            symbolName: chunk.symbolName,
            snippet: snippetPreview,
            contextIndex: index,
          });
        }
      } else {
        invalidCount++;
        console.warn(
          `[RepoMind Citation] Detected and suppressed hallucinated citation: [CTX-${index}] (Context blocks available: 1..${candidateChunks.length})`,
        );
      }
    }

    // Strip hallucinated citations from text
    const sanitizedResponse = responseText.replace(citationRegex, (fullMatch, indexStr) => {
      const idx = parseInt(indexStr, 10);
      if (idx >= 1 && idx <= candidateChunks.length) {
        return fullMatch; // Keep valid citation
      }
      return ""; // Strip invalid hallucination
    });

    return {
      validatedCitations,
      sanitizedResponse,
      citedIndices,
      validCount,
      invalidCount,
    };
  }
}

export const citationValidator = new CitationValidator();
