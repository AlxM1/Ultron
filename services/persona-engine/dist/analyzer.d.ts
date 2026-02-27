export interface PersonaProfile {
    creator_id: number;
    creator_name: string;
    transcript_count: number;
    total_words: number;
    communication_style: {
        avg_sentence_length: number;
        vocabulary_richness: number;
        avg_words_per_transcript: number;
        exclamation_rate: number;
        question_rate: number;
    };
    top_topics: Array<{
        topic: string;
        count: number;
    }>;
    vocabulary_patterns: {
        top_words: Array<{
            word: string;
            count: number;
        }>;
        top_bigrams: Array<{
            bigram: string;
            count: number;
        }>;
        catchphrases: string[];
    };
    recurring_themes: string[];
    key_quotes: string[];
    updated_at: string;
}
export declare function buildProfile(creatorName: string): Promise<PersonaProfile | null>;
export declare function saveProfile(profile: PersonaProfile): Promise<void>;
export declare function getProfile(creatorName: string): Promise<PersonaProfile | null>;
export declare function getAllCreators(): Promise<Array<{
    id: number;
    name: string;
    transcript_count: number;
}>>;
