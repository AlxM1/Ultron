import { PersonaProfile } from './analyzer.js';
interface LLMResponse {
    text: string;
    source: 'ollama' | 'fallback';
}
export declare function queryPersona(profile: PersonaProfile, question: string): Promise<LLMResponse>;
export declare function queryBoard(profiles: Array<{
    profile: PersonaProfile;
    member: string;
}>, question: string): Promise<{
    perspectives: Array<{
        member: string;
        response: string;
        source: string;
    }>;
    consensus: string;
}>;
export {};
