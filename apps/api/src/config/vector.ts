import { QdrantClient } from "@qdrant/js-client-rest";
import { config } from "./env.js";

export const qdrantClient = new QdrantClient({
  url: config.qdrantUrl,
  apiKey: config.qdrantApiKey,
  checkCompatibility: false,
});

/**
 * Cascading vector deletion: deletes all vector points tagged with repositoryId.
 */
export async function deleteRepoVectors(repositoryId: string): Promise<void> {
  try {
    await qdrantClient.delete(config.qdrantCollectionName, {
      filter: {
        must: [
          {
            key: "repositoryId",
            match: { value: repositoryId },
          },
        ],
      },
    });
    console.log(`[RepoMind Qdrant] Deleted vectors for repository: ${repositoryId}`);
  } catch (err: any) {
    // If Qdrant is offline or collection doesn't exist yet, log warning and do not crash
    console.warn(
      `[RepoMind Qdrant] Note: Could not delete vectors for repo ${repositoryId} (Qdrant offline or uninitialized): ${err.message}`,
    );
  }
}
