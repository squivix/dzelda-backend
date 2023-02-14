import {LanguageLevel} from "@/src/models/enums/LanguageLevel.js";

export interface LanguageOnlySchema {
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

export interface LanguageWithMappingSchema {
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
    addedOn: string,
    lastOpened: string,
}

export type LanguageSchema = LanguageOnlySchema | LanguageWithMappingSchema