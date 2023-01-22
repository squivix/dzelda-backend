export interface LanguageDetailsSchema {
    id: number;
    code: string;
    name: string;
    greeting: string;
    /** Format: uri */
    flag?: string;
    /** Format: uri */
    flagCircular?: string;
    flagEmoji?: string;
    isSupported: boolean;
    levelThresholds: {
        beginner1: number;
        beginner2: number;
        intermediate1: number;
        intermediate2: number;
        advanced1: number;
        advanced2: number;
    };
    learnersCount: number;
}