// ChessMate AI Coach — provider-agnostic coaching architecture (Phase 1).
// See COACH_ARCHITECTURE.md for the system overview.

export { askChessMentor, inferTask, type MentorContext } from './api/askCoach';
export { CoachOrchestrator, type CoachOrchestratorDeps } from './api/coachOrchestrator';
export { CoachService } from './api/coachService';
export { createCoachService, getCoachService } from './api/defaultCoachService';
export type { CoachAnswer, CoachRequest } from './api/types';
export { DEFAULT_PROVIDER, PROVIDER_IDS, resolveCoachConfig, type CoachConfig, type ProviderId } from './config';
export { buildCoachContext, ChessContextBuilder, renderContext, type ContextBuilder } from './context/contextBuilder';
export type { CoachContext, CoachGameAnalysis } from './context/types';
export { CoachUnavailableError, type CoachUnavailableReason } from './errors';
export { PrecomputedEvaluationProvider } from './evaluation/precomputedEvaluation';
export type { EvaluationProvider } from './evaluation/types';
export { KNOWLEDGE_BASE, type KnowledgeCategory, type KnowledgeDoc } from './knowledge';
export { SessionConversationMemory, SessionMemoryProvider } from './memory/sessionMemory';
export type { ConversationMemory, MemoryProvider } from './memory/types';
export { assemblePrompt } from './prompts/assemble';
export { TemplatePromptBuilder, type PromptBuilder, type PromptInput } from './prompts/promptBuilder';
export { getPromptTemplate, renderTemplate, type CoachTask } from './prompts/templates';
export { ChessMentorTransport, type CoachTransport } from './providers/chessMentorTransport';
export { createProvider } from './providers/factory';
export { GeminiProvider } from './providers/geminiProvider';
export type { CoachProvider, ProviderRequest, ProviderResponse } from './providers/types';
export { queryFromContext, retrieveKnowledge, StructuredRetriever, type RetrievalQuery } from './retrieval/retriever';
export type { KnowledgeRetriever } from './retrieval/types';
