import { embed } from "./embedding.ts";
import { splitChunks } from "./generation.ts";
import elizaLogger from "./logger.ts";
import {
    type IAgentRuntime,
    type IRAGKnowledgeManager,
    type RAGKnowledgeItem,
    type UUID,
    KnowledgeScope,
} from "./types.ts";
import { stringToUuid } from "./uuid.ts";
import { existsSync, statSync } from "fs";
import { join } from "path";

/**
 * Manage knowledge in the database.
 */
export class RAGKnowledgeManager implements IRAGKnowledgeManager {
    /**
     * The AgentRuntime instance associated with this manager.
     */
    runtime: IAgentRuntime;

    /**
     * The name of the database table this manager operates on.
     */
    tableName: string;

    /**
     * The root directory where RAG knowledge files are located (internal)
     */
    knowledgeRoot: string;

    /**
     * Constructs a new KnowledgeManager instance.
     * @param opts Options for the manager.
     * @param opts.tableName The name of the table this manager will operate on.
     * @param opts.runtime The AgentRuntime instance associated with this manager.
     */
    constructor(opts: {
        tableName: string;
        runtime: IAgentRuntime;
        knowledgeRoot: string;
    }) {
        this.runtime = opts.runtime;
        this.tableName = opts.tableName;
        this.knowledgeRoot = opts.knowledgeRoot;
    }

    private readonly defaultRAGMatchThreshold = 0.85;
    private readonly defaultRAGMatchCount = 8;

    /**
     * Common English stop words to filter out from query analysis
     */
    private readonly stopWords = new Set([
        "a",
        "an",
        "and",
        "are",
        "as",
        "at",
        "be",
        "by",
        "does",
        "for",
        "from",
        "had",
        "has",
        "have",
        "he",
        "her",
        "his",
        "how",
        "hey",
        "i",
        "in",
        "is",
        "it",
        "its",
        "of",
        "on",
        "or",
        "that",
        "the",
        "this",
        "to",
        "was",
        "what",
        "when",
        "where",
        "which",
        "who",
        "will",
        "with",
        "would",
        "there",
        "their",
        "they",
        "your",
        "you",
    ]);

    /**
     * Filters out stop words and returns meaningful terms
     */
    private getQueryTerms(query: string): string[] {
        return query
            .toLowerCase()
            .split(" ")
            .filter((term) => term.length > 2) // Filter very short words
            .filter((term) => !this.stopWords.has(term)); // Filter stop words
    }

    /**
     * Preprocesses text content for better RAG performance.
     * @param content The text content to preprocess.
     * @returns The preprocessed text.
     */

    private preprocess(content: string): string {
        if (!content || typeof content !== "string") {
            elizaLogger.warn("Invalid input for preprocessing");
            return "";
        }

        return (
            content
                .replace(/```[\s\S]*?```/g, "")
                .replace(/`.*?`/g, "")
                .replace(/#{1,6}\s*(.*)/g, "$1")
                .replace(/!\[(.*?)\]\(.*?\)/g, "$1")
                .replace(/\[(.*?)\]\(.*?\)/g, "$1")
                .replace(/(https?:\/\/)?(www\.)?([^\s]+\.[^\s]+)/g, "$3")
                .replace(/<@[!&]?\d+>/g, "")
                .replace(/<[^>]*>/g, "")
                .replace(/^\s*[-*_]{3,}\s*$/gm, "")
                .replace(/\/\*[\s\S]*?\*\//g, "")
                .replace(/\/\/.*/g, "")
                .replace(/\s+/g, " ")
                .replace(/\n{3,}/g, "\n\n")
                // .replace(/[^a-zA-Z0-9\s\-_./:?=&]/g, "") --this strips out CJK characters
                .trim()
                .toLowerCase()
        );
    }

    private hasProximityMatch(text: string, terms: string[]): boolean {
        if (!text || !terms.length) {
            return false;
        }

        const words = text.toLowerCase().split(" ").filter(w => w.length > 0);

        // Find all positions for each term (not just first occurrence)
        const allPositions = terms.flatMap(term =>
            words.reduce((positions, word, idx) => {
                if (word.includes(term)) positions.push(idx);
                return positions;
            }, [] as number[])
        ).sort((a, b) => a - b);

        if (allPositions.length < 2) return false;

        // Check proximity
        for (let i = 0; i < allPositions.length - 1; i++) {
            if (Math.abs(allPositions[i] - allPositions[i + 1]) <= 5) {
                elizaLogger.debug("[Proximity Match]", {
                    terms,
                    positions: allPositions,
                    matchFound: `${allPositions[i]} - ${allPositions[i + 1]}`
                });
                return true;
            }
        }

        return false;
    }

    async getKnowledge(params: {
        query?: string;
        id?: UUID;
        conversationContext?: string;
        limit?: number;
        agentId?: UUID;
    }): Promise<RAGKnowledgeItem[]> {
        const agentId = params.agentId || this.runtime.agentId;

        // If id is provided, do direct lookup first
        if (params.id) {
            const directResults =
                await this.runtime.databaseAdapter.getKnowledge({
                    id: params.id,
                    agentId: agentId,
                });

            if (directResults.length > 0) {
                return directResults;
            }
        }

        // If no id or no direct results, perform semantic search
        if (params.query) {
            try {
                const processedQuery = this.preprocess(params.query);

                // Build search text with optional context
                let searchText = processedQuery;
                if (params.conversationContext) {
                    const relevantContext = this.preprocess(
                        params.conversationContext
                    );
                    searchText = `${relevantContext} ${processedQuery}`;
                }

                elizaLogger.debug("getKnowledge, Embedding search text", {
                    searchText,
                });
                const embeddingArray = await embed(this.runtime, searchText);

                const embedding = new Float32Array(embeddingArray);

                // Get results with single query
                const results =
                    await this.runtime.databaseAdapter.searchKnowledge({
                        agentId: this.runtime.agentId,
                        embedding: embedding,
                        match_threshold: this.defaultRAGMatchThreshold,
                        match_count:
                            (params.limit || this.defaultRAGMatchCount) * 2,
                        searchText: processedQuery,
                    });

                // Enhanced reranking with sophisticated scoring
                const rerankedResults = results
                    .map((result) => {
                        let score = result.similarity;

                        // Check for direct query term matches
                        const queryTerms = this.getQueryTerms(processedQuery);

                        const matchingTerms = queryTerms.filter((term) =>
                            result.content.text.toLowerCase().includes(term)
                        );

                        if (matchingTerms.length > 0) {
                            // Much stronger boost for matches
                            score *=
                                1 +
                                (matchingTerms.length / queryTerms.length) * 2; // Double the boost

                            if (
                                this.hasProximityMatch(
                                    result.content.text,
                                    matchingTerms
                                )
                            ) {
                                score *= 1.5; // Stronger proximity boost
                            }
                        } else {
                            // More aggressive penalty
                            if (!params.conversationContext) {
                                score *= 0.3; // Stronger penalty
                            }
                        }

                        return {
                            ...result,
                            score,
                            matchedTerms: matchingTerms, // Add for debugging
                        };
                    })
                    .sort((a, b) => b.score - a.score);

                // Filter and return results
                return rerankedResults
                    .filter(
                        (result) =>
                            result.score >= this.defaultRAGMatchThreshold
                    )
                    .slice(0, params.limit || this.defaultRAGMatchCount);
            } catch (error) {
                console.log(`[RAG Search Error] ${error}`);
                return [];
            }
        }

        // If neither id nor query provided, return empty array
        return [];
    }

    async createKnowledge(item: RAGKnowledgeItem): Promise<void> {
        if (!item.content.text) {
            elizaLogger.warn("Empty content in knowledge item");
            return;
        }

        try {
            // Process main document
            elizaLogger.debug("Creating knowledge item:", {
                id: item.id,
                text: item.content.text,
                metadata: item.content.metadata,
            });
            const processedContent = this.preprocess(item.content.text);
            const mainEmbeddingArray = await embed(
                this.runtime,
                processedContent
            );

            const mainEmbedding = new Float32Array(mainEmbeddingArray);

            // Create main document
            await this.runtime.databaseAdapter.createKnowledge({
                id: item.id,
                agentId: this.runtime.agentId,
                content: {
                    text: item.content.text,
                    metadata: {
                        ...item.content.metadata,
                        isMain: true,
                    },
                },
                embedding: mainEmbedding,
                createdAt: Date.now(),
            });

            // Generate and store chunks
            elizaLogger.debug("Splitting chunks:");
            const chunks = await splitChunks(processedContent, 512, 20);

            for (const [index, chunk] of chunks.entries()) {
                elizaLogger.debug("Embedding chunk");
                const chunkEmbeddingArray = await embed(this.runtime, chunk);
                const chunkEmbedding = new Float32Array(chunkEmbeddingArray);
                const chunkId = `${item.id}-chunk-${index}` as UUID;

                await this.runtime.databaseAdapter.createKnowledge({
                    id: chunkId,
                    agentId: this.runtime.agentId,
                    content: {
                        text: chunk,
                        metadata: {
                            ...item.content.metadata,
                            isChunk: true,
                            originalId: item.id,
                            chunkIndex: index,
                        },
                    },
                    embedding: chunkEmbedding,
                    createdAt: Date.now(),
                });
            }
        } catch (error) {
            elizaLogger.error(`Error processing knowledge ${item.id}:`, error);
            throw error;
        }
    }

    async searchKnowledge(params: {
        agentId: UUID;
        embedding: Float32Array | number[];
        match_threshold?: number;
        match_count?: number;
        searchText?: string;
    }): Promise<RAGKnowledgeItem[]> {
        const {
            match_threshold = this.defaultRAGMatchThreshold,
            match_count = this.defaultRAGMatchCount,
            embedding,
            searchText,
        } = params;

        const float32Embedding = Array.isArray(embedding)
            ? new Float32Array(embedding)
            : embedding;

        return await this.runtime.databaseAdapter.searchKnowledge({
            agentId: params.agentId || this.runtime.agentId,
            embedding: float32Embedding,
            match_threshold,
            match_count,
            searchText,
        });
    }

    async removeKnowledge(id: UUID): Promise<void> {
        await this.runtime.databaseAdapter.removeKnowledge(id);
    }

    /**
     * Remove um arquivo e todos os seus chunks do banco de dados.
     * @param scopedId ID do arquivo no banco de dados
     */
    private async removeFileAndChunks(scopedId: UUID): Promise<void> {
        try {
            // Remover o documento principal
            await this.removeKnowledge(scopedId);

            // Buscar todos os chunks relacionados a este arquivo usando o parâmetro query
            const chunks = await this.runtime.databaseAdapter.getKnowledge({
                agentId: this.runtime.agentId,
                query: `originalId = '${scopedId}' AND isChunk = 1`,
            });

            // Remover todos os chunks
            for (const chunk of chunks) {
                await this.removeKnowledge(chunk.id);
            }

            elizaLogger.info(
                `Removed file ${scopedId} and ${chunks.length} chunks`
            );
        } catch (error) {
            elizaLogger.error(`Error removing file and chunks: ${error}`);
        }
    }

    async clearKnowledge(shared?: boolean): Promise<void> {
        await this.runtime.databaseAdapter.clearKnowledge(
            this.runtime.agentId,
            shared ? shared : false
        );
    }

    /**
     * Verifica se um arquivo já foi processado e convertido em conhecimento.
     * @param scopedId O ID do arquivo a ser verificado
     * @returns true se o arquivo já foi processado, false caso contrário
     */
    async isFileProcessed(scopedId: UUID): Promise<boolean> {
        try {
            // Buscar o último chunk para este documento usando o parâmetro query
            // Ordenamos por chunkIndex em ordem decrescente e limitamos a 1 resultado
            const lastChunk = await this.runtime.databaseAdapter.getKnowledge({
                agentId: this.runtime.agentId,
                query: `SELECT * FROM knowledge WHERE (agentId = ? OR isShared = 1) AND originalId = '${scopedId}' ORDER BY chunkIndex DESC LIMIT 1`,
            });

            if (lastChunk.length === 0) {
                return false; // Nenhum chunk encontrado
            }

            // Verificar se o último chunk indica que o processamento foi concluído
            return (
                lastChunk[0].content.metadata?.processingStatus === "completed"
            );
        } catch (error) {
            elizaLogger.error(`Error checking if file is processed: ${error}`);
            return false;
        }
    }

    /**
     * Verifica se um arquivo foi modificado desde a última vez que foi processado.
     * @param filePath Caminho do arquivo
     * @param scopedId ID do arquivo no banco de dados
     * @returns true se o arquivo foi modificado, false caso contrário
     */
    private async isFileModified(
        filePath: string,
        scopedId: UUID
    ): Promise<boolean> {
        try {
            // Buscar o último chunk para este documento
            const lastChunk = await this.runtime.databaseAdapter.getKnowledge({
                agentId: this.runtime.agentId,
                query: `originalId = '${scopedId}' AND isChunk = 1 ORDER BY chunkIndex DESC LIMIT 1`,
                limit: 1,
            });

            if (lastChunk.length === 0) {
                return true; // Se não encontramos o arquivo no banco, consideramos como modificado
            }

            // Obter a data de processamento do último chunk
            const processedAt = lastChunk[0].content.metadata?.processedAt || 0;

            // Obter a data de modificação do arquivo no sistema de arquivos
            const filePathFull = join(this.knowledgeRoot, filePath);
            const fileExists = existsSync(filePathFull);

            if (!fileExists) {
                return true; // Se o arquivo não existe mais, consideramos como modificado
            }

            // Obter a data de modificação do arquivo
            const fileStat = statSync(filePathFull);
            const fileModifiedAt = fileStat.mtimeMs;

            // Se o arquivo foi modificado após o processamento, consideramos como modificado
            return fileModifiedAt > (processedAt as number);
        } catch (error) {
            elizaLogger.error(`Error checking if file is modified: ${error}`);
            return true; // Em caso de erro, assumimos que o arquivo foi modificado
        }
    }

    /**
     * Lists all knowledge entries for an agent without semantic search or reranking.
     * Used primarily for administrative tasks like cleanup.
     *
     * @param agentId The agent ID to fetch knowledge entries for
     * @returns Array of RAGKnowledgeItem entries
     */
    async listAllKnowledge(agentId: UUID): Promise<RAGKnowledgeItem[]> {
        elizaLogger.debug(
            `[Knowledge List] Fetching all entries for agent: ${agentId}`
        );

        try {
            // Only pass the required agentId parameter
            const results = await this.runtime.databaseAdapter.getKnowledge({
                agentId: agentId,
            });

            elizaLogger.debug(
                `[Knowledge List] Found ${results.length} entries`
            );
            return results;
        } catch (error) {
            elizaLogger.error(
                "[Knowledge List] Error fetching knowledge entries:",
                error
            );
            throw error;
        }
    }

    async cleanupDeletedKnowledgeFiles() {
        try {
            elizaLogger.debug(
                "[Cleanup] Starting knowledge cleanup process, agent: ",
                this.runtime.agentId
            );

            elizaLogger.debug(
                `[Cleanup] Knowledge root path: ${this.knowledgeRoot}`
            );

            const existingKnowledge = await this.listAllKnowledge(
                this.runtime.agentId
            );
            // Only process parent documents, ignore chunks
            const parentDocuments = existingKnowledge.filter(
                (item) =>
                    !item.id.includes("chunk") && item.content.metadata?.source // Must have a source path
            );

            elizaLogger.debug(
                `[Cleanup] Found ${parentDocuments.length} parent documents to check`
            );

            for (const item of parentDocuments) {
                const relativePath = item.content.metadata?.source;
                const filePath = join(this.knowledgeRoot, relativePath);

                elizaLogger.debug(
                    `[Cleanup] Checking joined file path: ${filePath}`
                );

                if (!existsSync(filePath)) {
                    elizaLogger.warn(
                        `[Cleanup] File not found, starting removal process: ${filePath}`
                    );

                    const idToRemove = item.id;
                    elizaLogger.debug(
                        `[Cleanup] Using ID for removal: ${idToRemove}`
                    );

                    try {
                        // Just remove the parent document - this will cascade to chunks
                        await this.removeKnowledge(idToRemove);

                        // // Clean up the cache
                        // const baseCacheKeyWithWildcard = `${this.generateKnowledgeCacheKeyBase(
                        //     idToRemove,
                        //     item.content.metadata?.isShared || false
                        // )}*`;
                        // await this.cacheManager.deleteByPattern({
                        //     keyPattern: baseCacheKeyWithWildcard,
                        // });

                        elizaLogger.success(
                            `[Cleanup] Successfully removed knowledge for file: ${filePath}`
                        );
                    } catch (deleteError) {
                        elizaLogger.error(
                            `[Cleanup] Error during deletion process for ${filePath}:`,
                            deleteError instanceof Error
                                ? {
                                      message: deleteError.message,
                                      stack: deleteError.stack,
                                      name: deleteError.name,
                                  }
                                : deleteError
                        );
                    }
                }
            }

            elizaLogger.debug("[Cleanup] Finished knowledge cleanup process");
        } catch (error) {
            elizaLogger.error(
                "[Cleanup] Error cleaning up deleted knowledge files:",
                error
            );
        }
    }

    public generateScopedId(path: string, isShared: boolean): UUID {
        // Prefix the path with scope before generating UUID to ensure different IDs for shared vs private
        const scope = isShared ? KnowledgeScope.SHARED : KnowledgeScope.PRIVATE;
        const scopedPath = `${scope}-${path}`;
        return stringToUuid(scopedPath);
    }

    async processFile(file: {
        path: string;
        content: string;
        type: "pdf" | "md" | "txt";
        isShared?: boolean;
    }): Promise<void> {
        const timeMarker = (label: string) => {
            const time = (Date.now() - startTime) / 1000;
            elizaLogger.info(`[Timing] ${label}: ${time.toFixed(2)}s`);
        };

        const startTime = Date.now();
        const content = file.content;

        try {
            const fileSizeKB = new TextEncoder().encode(content).length / 1024;
            elizaLogger.info(
                `[File Progress] Starting ${file.path} (${fileSizeKB.toFixed(2)} KB)`
            );

            // Generate scoped ID for the file
            const scopedId = this.generateScopedId(
                file.path,
                file.isShared || false
            );

            // Check if the file has already been processed
            const isProcessed = await this.isFileProcessed(scopedId);

            if (isProcessed) {
                // Verificar se o arquivo foi modificado desde a última vez que foi processado
                const isModified = await this.isFileModified(
                    file.path,
                    scopedId
                );

                if (!isModified) {
                    elizaLogger.info(
                        `[File Progress] File ${file.path} already processed and not modified. Skipping.`
                    );
                    return;
                } else {
                    elizaLogger.info(
                        `[File Progress] File ${file.path} was modified since last processing. Reprocessing.`
                    );
                    // Remover o conhecimento existente para evitar duplicatas
                    await this.removeFileAndChunks(scopedId);
                }
            }

            // Add detailed logging for content type and sample
            elizaLogger.debug(
                `[File Content] Type: ${file.type}, Content sample: ${content.substring(0, 100)}`
            );

            // Check for binary content in text
            if (
                file.type === "pdf" &&
                /[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(content)
            ) {
                elizaLogger.warn(
                    `[File Content] Binary content detected in PDF file. This may indicate improper PDF processing.`
                );
            }

            // Step 1: Preprocessing
            const processedContent = this.preprocess(content);
            timeMarker("Preprocessing");

            // Log preprocessed content sample
            elizaLogger.debug(
                `[Preprocessed Content] Sample: ${processedContent.substring(
                    0,
                    100
                )}`
            );

            // Calculate dynamic chunk size based on content length
            // Target around 2000 tokens per chunk (approximately 8000 characters)
            const contentLength = processedContent.length;
            const baseChunkSize = 8000;
            const chunkSize = Math.min(
                baseChunkSize,
                Math.floor(contentLength / 10)
            );
            const chunkOverlap = Math.floor(chunkSize * 0.1); // 10% overlap

            // Split content into smaller chunks
            const chunks = await splitChunks(
                processedContent,
                chunkSize,
                chunkOverlap
            );
            const totalChunks = chunks.length;
            elizaLogger.info(
                `Generated ${totalChunks} chunks with size ${chunkSize} and overlap ${chunkOverlap}`
            );

            // Log first chunk sample
            if (chunks.length > 0) {
                elizaLogger.debug(
                    `[First Chunk] Sample: ${chunks[0].substring(0, 100)}`
                );
            }

            timeMarker("Chunk generation");

            // Calculate dynamic batch size based on chunk length
            const calculateBatchSize = (chunkLength: number) => {
                // Assuming roughly 4 characters per token
                const estimatedTokens = chunkLength / 4;
                // Target staying under 8000 tokens per batch
                const tokensPerBatch = 7000;
                const recommendedBatchSize = Math.max(
                    1,
                    Math.floor(tokensPerBatch / estimatedTokens)
                );
                return Math.min(10, recommendedBatchSize); // Cap at 10 chunks per batch
            };

            // Process chunks with dynamic batch sizes
            let processedChunks = 0;
            let failedChunks = 0;

            for (let i = 0; i < chunks.length; ) {
                const currentChunk = chunks[i];
                const batchSize = calculateBatchSize(currentChunk.length);
                const batchStart = Date.now();

                const batch = chunks.slice(
                    i,
                    Math.min(i + batchSize, chunks.length)
                );
                elizaLogger.info(
                    `Processing batch of ${batch.length} chunks (chunks ${i} to ${i + batch.length - 1})`
                );

                try {
                    // Process embeddings in parallel with error handling for each chunk
                    const embeddings = await Promise.all(
                        batch.map(async (chunk, index) => {
                            try {
                                const embedding = await embed(
                                    this.runtime,
                                    chunk
                                );
                                return { success: true, embedding, index };
                            } catch (error) {
                                elizaLogger.error(
                                    `Error embedding chunk ${i + index}:`,
                                    error
                                );
                                failedChunks++;
                                return { success: false, index };
                            }
                        })
                    );

                    // Process successful embeddings
                    await Promise.all(
                        embeddings
                            .filter(
                                (
                                    result
                                ): result is {
                                    success: true;
                                    embedding: number[];
                                    index: number;
                                } =>
                                    result.success &&
                                    Array.isArray(result.embedding)
                            )
                            .map(async ({ embedding, index }) => {
                                const chunkId = `${scopedId}-chunk-${
                                    i + index
                                }` as UUID;
                                const chunkEmbedding = new Float32Array(
                                    embedding
                                );

                                await this.runtime.databaseAdapter.createKnowledge(
                                    {
                                        id: chunkId,
                                        agentId: this.runtime.agentId,
                                        content: {
                                            text: batch[index],
                                            metadata: {
                                                source: file.path,
                                                type: file.type,
                                                isShared: file.isShared || false,
                                                isChunk: true,
                                                originalId: scopedId,
                                                chunkIndex: i + index,
                                                originalPath: file.path,
                                                // only add completed status if it's the last chunk
                                                ...(i + index ===
                                                totalChunks - 1
                                                    ? {
                                                          processingStatus:
                                                              "completed",
                                                          totalChunks:
                                                              totalChunks,
                                                          processedAt:
                                                              Date.now(),
                                                      }
                                                    : {}),
                                            },
                                        },
                                        embedding: chunkEmbedding,
                                        createdAt: Date.now(),
                                    }
                                );
                            })
                    );

                    processedChunks += batch.length;
                    const batchTime = (Date.now() - batchStart) / 1000;
                    elizaLogger.info(
                        `[Batch Progress] ${file.path}: Processed ${processedChunks}/${totalChunks} chunks (${batchTime.toFixed(2)}s for batch)`
                    );

                    i += batch.length;
                } catch (error) {
                    elizaLogger.error(
                        `Error processing batch starting at chunk ${i}:`,
                        error
                    );
                    // Move to next batch even if current fails
                    i += batch.length;
                    failedChunks += batch.length;
                }
            }

            const totalTime = (Date.now() - startTime) / 1000;
            elizaLogger.info(
                `[Complete] Processed ${file.path} in ${totalTime.toFixed(2)}s. ` +
                `Successfully processed ${processedChunks - failedChunks}/${totalChunks} chunks. ` +
                `Failed chunks: ${failedChunks}`
            );

            if (failedChunks > 0) {
                elizaLogger.warn(
                    `Some chunks (${failedChunks}) failed to process for ${file.path}. ` +
                    `The document will be partially indexed.`
                );
            }
        } catch (error) {
            elizaLogger.error(`Error processing file ${file.path}:`, error);
            throw error;
        }
    }
}
