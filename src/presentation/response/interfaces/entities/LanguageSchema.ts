import {LanguageLevel} from "@/src/models/enums/LanguageLevel.js";

export interface LanguageSchema {
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
    levelThresholds: Record<LanguageLevel, number>;
    learnersCount: number;
}
