// ChessMate AI Coach — provider-agnostic coaching architecture (Phase 1).
// See COACH_ARCHITECTURE.md for the system overview.

export { askChessMentor, type MentorContext } from './api/askCoach';
export { CoachService, type CoachServiceDeps } from './api/coachService';
export { createCoachService, getCoachService } from './api/defaultCoachService';
export type { CoachAnswer, CoachRequest } from './api/types';
export { DEFAULT_PROVIDER, PROVIDER_IDS, resolveCoachConfig, type CoachConfig, type ProviderId } from './config';
export { buildCoachContext, renderContext } from './context/contextBuilder';
export type { CoachContext } from './context/types';
export { CoachUnavailableError, type CoachUnavailableReason } from './errors';
export { KNOWLEDGE_BASE, type KnowledgeCategory, type KnowledgeDoc } from './knowledge';
export { SessionConversationMemory } from './memory/sessionMemory';
export type { CoachMemory, ConversationMemory } from './memory/types';
export { assemblePrompt } from './prompts/assemble';
export { getPromptTemplate, renderTemplate, type CoachTask } from './prompts/templates';
export { createProvider } from './providers/factory';
export { GeminiProvider } from './providers/geminiProvider';
export type { CoachProvider, ProviderRequest, ProviderResponse } from './providers/types';
export { queryFromContext, retrieveKnowledge, type RetrievalQuery } from './retrieval/retriever';
