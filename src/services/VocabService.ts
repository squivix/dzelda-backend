import {EntityManager, FilterQuery} from "@mikro-orm/core";
import {Language} from "@/src/models/entities/Language.js";
import {Vocab} from "@/src/models/entities/Vocab.js";
import {User} from "@/src/models/entities/auth/User.js";
import {MapLearnerVocab} from "@/src/models/entities/MapLearnerVocab.js";
import {VocabRepo} from "@/src/models/repos/VocabRepo.js";
import {TTSProvider, VocabLevel} from "dzelda-common";
import {Text} from "@/src/models/entities/Text.js";
import {QueryOrderMap} from "@mikro-orm/core/enums.js";
import {MapLearnerMeaning} from "@/src/models/entities/MapLearnerMeaning.js";
import {EntityField} from "@mikro-orm/core/drivers/IDatabaseDriver.js";
import {Profile} from "@/src/models/entities/Profile.js";
import {MapTextVocab} from "@/src/models/entities/MapTextVocab.js";
import {escapeRegExp} from "@/src/utils/utils.js";
import {TTSVoice} from "@/src/models/entities/TTSVoice.js";
import textToSpeech from "@google-cloud/text-to-speech";
import {GoogleTTSSynthesizeParams} from "@/src/models/interfaces/TTSSynthesizerParams.js";
import {s3Client} from "@/src/storageClient.js";
import process from "process";
import {TTSPronunciation} from "@/src/models/entities/TTSPronunciation.js";
import urlJoin from "url-join";
import {VocabVariant} from "@/src/models/entities/VocabVariant.js";

export class VocabService {
    em: EntityManager;
    vocabRepo: VocabRepo;

    constructor(em: EntityManager) {
        this.em = em;

        this.vocabRepo = this.em.getRepository(Vocab);
    }

    async getPaginatedVocabs(filters: { languageCode?: string, searchQuery?: string },
                             sort: { sortBy: "text" | "textsCount" | "learnersCount", sortOrder: "asc" | "desc" },
                             pagination: { page: number, pageSize: number }) {
        const dbFilters: FilterQuery<Vocab> = {$and: []};

        if (filters.languageCode !== undefined)
            dbFilters.$and!.push({language: {code: filters.languageCode}});
        if (filters.searchQuery !== undefined && filters.searchQuery !== "")
            dbFilters.$and!.push({text: {$ilike: `%${filters.searchQuery}%`}});
        const dbOrderBy: QueryOrderMap<Vocab>[] = [];
        if (sort.sortBy == "text")
            dbOrderBy.push({text: sort.sortOrder});
        else if (sort.sortBy == "learnersCount")
            dbOrderBy.push({learnersCount: sort.sortOrder});
        else if (sort.sortBy == "textsCount")
            dbOrderBy.push({textsCount: sort.sortOrder});
        dbOrderBy.push({id: "asc"});

        return await this.vocabRepo.findAndCount(dbFilters, {
            populate: ["language", "meanings", "meanings.language", "meanings.addedBy.user", "learnersCount", "textsCount", "tags.category", "rootForms", "vocabVariants.ttsPronunciations.voice"],
            orderBy: dbOrderBy,
            limit: pagination.pageSize,
            offset: pagination.pageSize * (pagination.page - 1),
        });
    }

    async createVocab(vocabData: { text: string; language: Language; isPhrase: boolean }) {
        const newVocab = this.vocabRepo.create({
            text: vocabData.text,
            language: vocabData.language,
            isPhrase: vocabData.isPhrase,
            learnersCount: 0,
            textsCount: 0
        });
        await this.em.flush();
        //TODO move vocab in text regex somewhere centralized and test the heck out of it
        new Promise(async (resolve) => {
            const vocabFindRegex = new RegExp(`(\\s|^)${escapeRegExp(newVocab.text)}(\\s|$)`);
            const textsWithVocab = await this.em.find(Text, {
                language: vocabData.language,
                $or: [{parsedContent: vocabFindRegex}, {parsedTitle: vocabFindRegex}]
            }, {fields: ["id"]});
            await this.em.insertMany(MapTextVocab, textsWithVocab.map(text => ({text: text.id, vocab: newVocab})));
            resolve(undefined);
        });
        return newVocab;
    }

    async getVocab(vocabId: number) {
        return await this.vocabRepo.findOne({
            id: vocabId
        }, {populate: ["language", "meanings", "ttsPronunciations", "ttsPronunciations.voice", "tags.category", "rootForms"]});
    }

    async getVocabByStringSearch(vocabData: { text: string; language: Language }) {
        return await this.vocabRepo.findOne({
            text: vocabData.text,
            language: vocabData.language
        }, {populate: ["meanings", "meanings.addedBy.user", "tags.category", "vocabVariants.ttsPronunciations.voice"]});
    }

    async getPaginatedLearnerVocabs(filters: { languageCode?: string, level?: VocabLevel[], searchQuery?: string },
                                    sort: { sortBy: "text" | "textsCount" | "learnersCount", sortOrder: "asc" | "desc" },
                                    pagination: { page: number, pageSize: number }, user: User): Promise<[MapLearnerVocab[], number]> {
        const dbFilters: FilterQuery<MapLearnerVocab> = {$and: []};
        dbFilters.$and!.push({learner: user.profile});

        if (filters.languageCode !== undefined)
            dbFilters.$and!.push({vocab: {language: {code: filters.languageCode}}});
        if (filters.level !== undefined)
            dbFilters.$and!.push({level: filters.level});
        if (filters.searchQuery !== undefined && filters.searchQuery !== "")
            dbFilters.$and!.push({vocab: {text: {$ilike: `%${filters.searchQuery}%`}}});

        const dbOrderBy: QueryOrderMap<MapLearnerVocab>[] = [];
        if (sort.sortBy == "text")
            dbOrderBy.push({vocab: {text: sort.sortOrder}});
        else if (sort.sortBy == "learnersCount")
            dbOrderBy.push({vocab: {learnersCount: sort.sortOrder}});
        else if (sort.sortBy == "textsCount")
            dbOrderBy.push({vocab: {textsCount: sort.sortOrder}});
        dbOrderBy.push({vocab: {id: "asc"}});

        const [mappings, totalCount] = await this.em.findAndCount(MapLearnerVocab, dbFilters, {
            populate: ["vocab", "vocab.language", "vocab.ttsPronunciations", "vocab.ttsPronunciations.voice", "vocab.tags.category", "vocab.rootForms", "vocab.vocabVariants.ttsPronunciations.voice"],
            orderBy: dbOrderBy,
            limit: pagination.pageSize,
            offset: pagination.pageSize * (pagination.page - 1),
        });
        await this.em.populate(mappings, ["vocab.meanings", "vocab.meanings.language", "vocab.meanings.addedBy.user"], {
            where: {vocab: {meanings: {language: {prefererEntries: {learnerLanguageMapping: {learner: user.profile}}}}}},
        });
        await this.em.populate(mappings, ["vocab.learnerMeanings", "vocab.learnerMeanings.language", "vocab.learnerMeanings.addedBy.user"], {
            where: {vocab: {learnerMeanings: {learners: user.profile}}}
        });
        await this.em.populate(mappings, ["vocab.ttsPronunciations", "vocab.ttsPronunciations.voice"], {
            where: {vocab: {ttsPronunciations: {voice: {$or: [{prefererLanguageMappings: {learner: user.profile}}, {isDefault: true}]}}}}
        });
        return [mappings, totalCount];
    }

    async addVocabToUserLearning(vocab: Vocab, user: User, level?: VocabLevel) {
        this.em.create(MapLearnerVocab, {
            learner: user.profile,
            vocab: vocab,
            level: level
        });
        await this.em.flush();
        return (await this.getUserVocab(vocab.id, user.profile))!;
    }

    async getUserVocab(vocabId: number, learner: Profile) {
        const mapping = await this.em.findOne(MapLearnerVocab, {
            vocab: vocabId,
            learner
        }, {
            populate: ["vocab.ttsPronunciations", "vocab.ttsPronunciations.voice", "vocab.tags.category", "vocab.rootForms"],
            refresh: true
        });
        if (mapping) {
            await this.em.populate(mapping, ["vocab.meanings", "vocab.meanings.learnersCount", "vocab.meanings.addedBy.user", "vocab.meanings.language", "vocab.vocabVariants.ttsPronunciations.voice"], {
                where: {vocab: {meanings: {language: {prefererEntries: {learnerLanguageMapping: {learner: learner}}}}}},
            });
            await this.em.populate(mapping, ["vocab.learnerMeanings", "vocab.learnerMeanings.addedBy.user"], {
                where: {vocab: {learnerMeanings: {learners: learner}}}
            });
        }
        return mapping;
    }

    async updateUserVocab(mapping: MapLearnerVocab, updatedUserVocabData: { level?: VocabLevel; notes?: string; }) {
        if (updatedUserVocabData.level !== undefined) {
            mapping.level = updatedUserVocabData.level;
            if (updatedUserVocabData.level == VocabLevel.IGNORED) {
                const meaningMappings = await this.em.find(MapLearnerMeaning, {
                    learner: mapping.learner,
                    meaning: {vocab: mapping.vocab}
                });
                this.em.remove(meaningMappings);
                mapping.notes = "";
            }
        }
        if (updatedUserVocabData.notes !== undefined && updatedUserVocabData.level !== VocabLevel.IGNORED)
            mapping.notes = updatedUserVocabData.notes;

        this.em.persist(mapping);
        await this.em.flush();
        return (await this.getUserVocab(mapping.vocab.id, mapping.learner))!;
    }

    async deleteUserVocab(mapping: MapLearnerVocab) {
        const meaningMappings = await this.em.find(MapLearnerMeaning, {
            learner: mapping.learner,
            meaning: {vocab: mapping.vocab}
        });
        this.em.remove(meaningMappings);
        this.em.remove(mapping);
        await this.em.flush();
    }

    async getTextVocabs(text: Text, user: User) {
        const existingMappings = await this.em.find(MapLearnerVocab, {
            vocab: {textsAppearingIn: text},
            learner: user.profile
        }, {
            populate: ["vocab.language", "vocab.tags.category", "vocab.rootForms", "vocab.vocabVariants"],
        });
        await this.em.populate(existingMappings, ["vocab.ttsPronunciations", "vocab.ttsPronunciations.voice"], {
            where: {vocab: {ttsPronunciations: {voice: {$or: [{prefererLanguageMappings: {learner: user.profile}}, {isDefault: true}]}}}}
        });
        await this.em.populate(existingMappings, ["vocab.vocabVariants.ttsPronunciations.voice"], {
            where: {vocab: {vocabVariants: {ttsPronunciations: {voice: {$or: [{prefererLanguageMappings: {learner: user.profile}}, {isDefault: true}]}}}}}
        });
        const newVocabs = await this.em.find(Vocab, {
            textsAppearingIn: text,
            $nin: existingMappings.map(m => m.vocab)
        }, {
            populate: ["language", "tags.category", "rootForms", "vocabVariants"],
            populateWhere: {meanings: {language: {prefererEntries: {learnerLanguageMapping: {learner: user.profile}}}},}
        });
        await this.em.populate(newVocabs, ["ttsPronunciations", "ttsPronunciations.voice"], {where: {ttsPronunciations: {voice: {$or: [{prefererLanguageMappings: {learner: user.profile}}, {isDefault: true}]}}}});
        await this.em.populate(newVocabs, ["vocabVariants.ttsPronunciations.voice"], {
            where: {vocabVariants: {ttsPronunciations: {voice: {$or: [{prefererLanguageMappings: {learner: user.profile}}, {isDefault: true}]}}}}
        });
        return [...existingMappings, ...newVocabs];
    }

    async getUserSavedVocabsCount(user: User, options: {
        groupBy?: "language",
        filters: { savedOnFrom?: Date, savedOnTo?: Date, levels?: VocabLevel[], isPhrase?: boolean }
    }) {
        return await this.vocabRepo.countSavedVocabs(user.profile, {groupBy: options.groupBy, filters: options.filters});
    }

    async getUserSavedVocabsCountTimeSeries(user: User, options: {
        groupBy: "language" | undefined;
        savedOnInterval: "day" | "month" | "year";
        savedOnTo: Date;
        savedOnFrom: Date,
        filters: {
            isPhrase?: boolean;
            levels?: VocabLevel[]
        };
    }) {
        return await this.vocabRepo.countSavedVocabsTimeSeries(user.profile, options);
    }

    async createVocabTTSPronunciation(vocab: Vocab, variant: VocabVariant | null, voice: TTSVoice) {
        //TODO move to separate synthesize speech function which selects for provider
        if (voice.provider !== TTSProvider.GOOGLE_CLOUD)
            throw new Error("Unidentified TTS voice provider");

        const ttsClient = new textToSpeech.TextToSpeechClient();
        const voiceParams = voice.synthesizeParams as GoogleTTSSynthesizeParams;
        const [response] = await ttsClient.synthesizeSpeech({
            input: {text: variant ? variant.text : vocab.text},
            voice: {languageCode: voiceParams.languageCode, name: voiceParams.voiceName},
            audioConfig: {audioEncoding: "MP3"},
        });
        const bucket = process.env.SPACES_BUCKET!;
        if (!response.audioContent)
            throw new Error("Error generating TTS");
        const newTTSPronunciations = this.em.create(TTSPronunciation, {
            url: "",
            vocab: variant === null ? vocab : null,
            vocabVariant: variant,
            voice: voice,
        });
        await this.em.flush();
        try {
            const objectKey = `pronunciations/tts/${vocab.language.code}/${voice.code}/tts_${newTTSPronunciations.id}.mp3`;
            await s3Client.putObject({
                Bucket: bucket,
                Key: objectKey,
                Body: response.audioContent,
                ACL: "public-read"
            });
            newTTSPronunciations.url = urlJoin(process.env.SPACES_CDN_ENDPOINT!, objectKey);
            await this.em.flush();
            return newTTSPronunciations;
        } catch (e) {
            this.em.remove(newTTSPronunciations);
            await this.em.flush();
            throw e;
        }
    }

    async createOrGetVocabVariant(vocab: Vocab, variantText: string) {
        const variant = await this.em.upsert(VocabVariant, {vocab: vocab, text: variantText}, {onConflictAction: "ignore"});
        await this.em.populate(vocab, ["vocabVariants.ttsPronunciations"])
        return variant;
    }

    async getVocabVariants(vocab: Vocab) {
        return await this.em.find(VocabVariant, {vocab: vocab}, {populate: ["ttsPronunciations"]});
    }

    async createVocabVariant(vocab: Vocab, text: string) {
        const variant = await this.em.upsert(VocabVariant, {vocab: vocab, text: text}, {onConflictAction: "ignore"});
        await this.em.populate(variant, ["ttsPronunciations"])
        return variant;
    }

    async findVocab(where: FilterQuery<Vocab>, fields: EntityField<Vocab>[] = ["*", "language"]) {
        return await this.vocabRepo.findOne(where, {fields: fields as any});
    }

    async findLearnerVocab(where: FilterQuery<MapLearnerVocab>, fields?: EntityField<MapLearnerVocab>[]) {
        return await this.em.findOne(MapLearnerVocab, where, {fields: fields as any});
    }

    async findTTSVoice(where: FilterQuery<TTSVoice>, fields?: EntityField<TTSVoice>[]) {
        return await this.em.findOne(TTSVoice, where, {fields});
    }

    async findVocabVariant(where: FilterQuery<VocabVariant>, fields: EntityField<VocabVariant>[] = ["id", "text", "ttsPronunciations"]) {
        return await this.em.findOne(VocabVariant, where, {fields});
    }
}
