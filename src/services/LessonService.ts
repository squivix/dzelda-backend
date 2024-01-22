import {EntityManager, FilterQuery} from "@mikro-orm/core";
import {Lesson} from "@/src/models/entities/Lesson.js";
import {Language} from "@/src/models/entities/Language.js";
import {SqlEntityManager} from "@mikro-orm/postgresql";
import {LessonRepo} from "@/src/models/repos/LessonRepo.js";
import {AnonymousUser, User} from "@/src/models/entities/auth/User.js";
import {Course} from "@/src/models/entities/Course.js";
import {getParser} from "dzelda-common";
import {Vocab} from "@/src/models/entities/Vocab.js";
import {MapLessonVocab} from "@/src/models/entities/MapLessonVocab.js";
import {CourseRepo} from "@/src/models/repos/CourseRepo.js";
import {MapPastViewerLesson} from "@/src/models/entities/MapPastViewerLesson.js";
import {QueryOrderMap} from "@mikro-orm/core/enums.js";
import {EntityField} from "@mikro-orm/core/drivers/IDatabaseDriver.js";
import {LanguageLevel} from "@/src/models/enums/LanguageLevel.js";

export class LessonService {
    em: SqlEntityManager;
    lessonRepo: LessonRepo;
    courseRepo: CourseRepo;

    constructor(em: EntityManager) {
        this.em = em as SqlEntityManager;
        this.lessonRepo = this.em.getRepository(Lesson) as LessonRepo;
        this.courseRepo = this.em.getRepository(Course) as CourseRepo;
    }

    async getPaginatedLessons(filters: {
                                  languageCode?: string,
                                  addedBy?: string,
                                  searchQuery?: string,
                                  level?: LanguageLevel[],
                                  hasAudio?: boolean;
                              },
                              sort: { sortBy: "title" | "createdDate" | "pastViewersCount", sortOrder: "asc" | "desc" },
                              pagination: { page: number, pageSize: number },
                              user: User | AnonymousUser | null): Promise<[Lesson[], number]> {
        const dbFilters: FilterQuery<Lesson> = {$and: []};
        if (user && user instanceof User)
            dbFilters.$and!.push({$or: [{isPublic: true}, {addedBy: (user as User).profile}]});
        else
            dbFilters.$and!.push({isPublic: true});

        if (filters.languageCode !== undefined)
            dbFilters.$and!.push({language: {code: filters.languageCode}});
        if (filters.addedBy !== undefined)
            dbFilters.$and!.push({addedBy: {user: {username: filters.addedBy}}});
        if (filters.searchQuery !== undefined && filters.searchQuery !== "")
            dbFilters.$and!.push({title: {$ilike: `%${filters.searchQuery}%`}});
        if (filters.level !== undefined)
            dbFilters.$and!.push({$or: filters.level.map(level => ({level}))});
        if (filters.hasAudio !== undefined)
            dbFilters.$and!.push({audio: {[filters.hasAudio ? "$ne" : "$eq"]: ""}});

        const dbOrderBy: QueryOrderMap<Lesson>[] = [];
        if (sort.sortBy == "title")
            dbOrderBy.push({title: sort.sortOrder});
        else if (sort.sortBy == "createdDate")
            dbOrderBy.push({addedOn: sort.sortOrder});
        else if (sort.sortBy == "pastViewersCount")
            dbOrderBy.push({pastViewersCount: sort.sortOrder});
        dbOrderBy.push({id: "asc"});

        let [lessons, totalCount] = await this.lessonRepo.findAndCount(dbFilters, {
            populate: ["course", "course.language", "course.addedBy.user"],
            orderBy: dbOrderBy,
            limit: pagination.pageSize,
            offset: pagination.pageSize * (pagination.page - 1),
        });

        if (user && !(user instanceof AnonymousUser))
            await this.lessonRepo.annotateLessonsWithUserData(lessons, user);
        return [lessons, totalCount];
    }

    async getPaginatedLessonHistory(filters: {
                                        languageCode?: string,
                                        addedBy?: string,
                                        searchQuery?: string,
                                        level?: LanguageLevel[],
                                        hasAudio?: boolean;
                                    },
                                    sort: {
                                        sortBy: "timeViewed" | "title" | "createdDate" | "pastViewersCount",
                                        sortOrder: "asc" | "desc"
                                    },
                                    pagination: { page: number, pageSize: number },
                                    user: User): Promise<[MapPastViewerLesson[], number]> {
        const dbFilters: FilterQuery<MapPastViewerLesson> = {$and: []};
        dbFilters.$and!.push({$or: [{lesson: {isPublic: true}}, {lesson: {addedBy: user.profile}}]});
        dbFilters.$and!.push({pastViewer: user.profile});

        if (filters.languageCode !== undefined)
            dbFilters.$and!.push({lesson: {language: {code: filters.languageCode}}});
        if (filters.addedBy !== undefined)
            dbFilters.$and!.push({lesson: {addedBy: {user: {username: filters.addedBy}}}});
        if (filters.searchQuery !== undefined && filters.searchQuery !== "")
            dbFilters.$and!.push({lesson: {title: {$ilike: `%${filters.searchQuery}%`}}});
        if (filters.level !== undefined)
            dbFilters.$and!.push({lesson: {$or: filters.level.map(level => ({level}))}});
        if (filters.hasAudio !== undefined)
            dbFilters.$and!.push({lesson: {audio: {[filters.hasAudio ? "$ne" : "$eq"]: ""}}});

        const dbOrderBy: QueryOrderMap<MapPastViewerLesson>[] = [];
        if (sort.sortBy == "title")
            dbOrderBy.push({lesson: {title: sort.sortOrder}});
        else if (sort.sortBy == "createdDate")
            dbOrderBy.push({lesson: {addedOn: sort.sortOrder}});
        else if (sort.sortBy == "pastViewersCount")
            dbOrderBy.push({lesson: {pastViewersCount: sort.sortOrder}});
        else if (sort.sortBy == "timeViewed")
            dbOrderBy.push({timeViewed: sort.sortOrder});
        dbOrderBy.push({lesson: {id: "asc"}});

        let [lessonHistoryEntries, totalCount] = await this.em.findAndCount(MapPastViewerLesson, dbFilters, {
            populate: ["lesson.course", "lesson.course.language", "lesson.course.addedBy.user"],
            orderBy: dbOrderBy,
            limit: pagination.pageSize,
            offset: pagination.pageSize * (pagination.page - 1),
        });

        if (user && !(user instanceof AnonymousUser))
            await this.lessonRepo.annotateLessonsWithUserData(lessonHistoryEntries.map(e => e.lesson), user);
        return [lessonHistoryEntries, totalCount];
    }

    async createLesson(fields: {
        title: string;
        text: string;
        language: Language;
        course?: Course;
        isPublic: boolean,
        level?: LanguageLevel,
        image?: string;
        audio?: string;
    }, user: User) {
        const parser = getParser(fields.language.code);
        const lessonParsedTitle = parser.parseText(fields.title);
        const lessonParsedText = parser.parseText(fields.text);
        const lessonWords: string[] = [
            ...parser.splitWords(lessonParsedTitle, {keepDuplicates: false}),
            ...parser.splitWords(lessonParsedText, {keepDuplicates: false})
        ];

        let newLesson = this.lessonRepo.create({
            title: fields.title,
            text: fields.text,
            language: fields.language,
            addedBy: user,
            parsedText: lessonParsedText,
            parsedTitle: lessonParsedTitle,
            image: fields.image,
            audio: fields.audio,
            course: fields.course,
            isPublic: fields.isPublic,
            level: fields.level,
            orderInCourse: fields.course?.lessons?.count(),
            isLastInCourse: true,
            pastViewersCount: 0
        });
        await this.em.flush();
        //TODO: test this a lot
        await this.em.upsertMany(Vocab, lessonWords.map(word => ({text: word, language: fields.language.id})));
        const lessonVocabs = await this.em.createQueryBuilder(Vocab).select("*").where({language: fields.language}).andWhere(`? LIKE '% ' || text || ' %'`, [` ${lessonParsedTitle} ${lessonParsedText} `]);
        await this.em.insertMany(MapLessonVocab, lessonVocabs.map(vocab => ({lesson: newLesson.id, vocab: vocab.id})));

        await this.lessonRepo.annotateLessonsWithUserData([newLesson], user);
        if (newLesson.course)
            await this.courseRepo.annotateCoursesWithUserData([newLesson.course], user);
        return newLesson;
    }

    async getLesson(lessonId: number, user: User | AnonymousUser | null) {
        let lesson = await this.lessonRepo.findOne({id: lessonId}, {populate: ["course", "course.language", "course.addedBy.user"]});
        if (lesson) {
            if (user && !(user instanceof AnonymousUser)) {
                await this.lessonRepo.annotateLessonsWithUserData([lesson], user);
                if (lesson.course)
                    await this.courseRepo.annotateCoursesWithUserData([lesson.course], user);
            }
        }
        return lesson;
    }

    async updateLesson(lesson: Lesson, updatedLessonData: {
        title: string;
        text: string;
        course?: Course | null,
        level?: LanguageLevel,
        isPublic?: boolean,
        image?: string;
        audio?: string;
    }, user: User) {
        if (lesson.title !== updatedLessonData.title || lesson.text !== updatedLessonData.text) {
            const parser = getParser(lesson.language.code);
            const lessonParsedTitle = parser.parseText(updatedLessonData.title);
            const lessonParsedText = parser.parseText(updatedLessonData.text);
            const lessonWords: string[] = [
                ...parser.splitWords(lessonParsedTitle, {keepDuplicates: false}),
                ...parser.splitWords(lessonParsedText, {keepDuplicates: false})
            ];

            lesson.title = updatedLessonData.title;
            lesson.text = updatedLessonData.text;
            lesson.parsedTitle = lessonParsedTitle;
            lesson.parsedText = lessonParsedText;

            await this.em.nativeDelete(MapLessonVocab, {lesson: lesson, vocab: {text: {$nin: lessonWords}}});
            await this.em.upsertMany(Vocab, lessonWords.map(word => ({text: word, language: lesson.language.id})));
            const lessonVocabs = await this.em.createQueryBuilder(Vocab).select(["id"]).where(`? ~ text`, [` ${lessonParsedTitle} ${lessonParsedText} `]);
            await this.em.upsertMany(MapLessonVocab, lessonVocabs.map(vocab => ({lesson: lesson.id, vocab: vocab.id})));
        }
        if (updatedLessonData.course !== undefined) {
            if (updatedLessonData.course == null) {
                lesson.course = null;
                lesson.orderInCourse = null;
            } else if (lesson.course?.id !== updatedLessonData.course.id) {
                lesson.course = updatedLessonData.course;
                lesson.orderInCourse = await updatedLessonData.course.lessons.loadCount(true);
            }
        }
        if (updatedLessonData.isPublic !== undefined)
            lesson.isPublic = updatedLessonData.isPublic;

        if (updatedLessonData.level !== undefined)
            lesson.level = updatedLessonData.level;

        if (updatedLessonData.image !== undefined)
            lesson.image = updatedLessonData.image;

        if (updatedLessonData.audio !== undefined)
            lesson.audio = updatedLessonData.audio;

        this.em.persist(lesson);
        await this.em.flush();

        if (user && !(user instanceof AnonymousUser)) {
            await this.lessonRepo.annotateLessonsWithUserData([lesson], user);
            if (lesson.course)
                await this.courseRepo.annotateCoursesWithUserData([lesson.course], user);
        }
        return lesson;
    }

    async deleteLesson(lesson: Lesson) {
        await this.em.nativeDelete(Lesson, {id: lesson.id});
    }

    async addLessonToUserHistory(lesson: Lesson, user: User) {
        const mapping = this.em.create(MapPastViewerLesson, {pastViewer: user.profile, lesson: lesson});
        await this.em.flush();
        await this.em.refresh(mapping.lesson);
        return mapping;
    }

    async findLesson(where: FilterQuery<Lesson>, fields: EntityField<Lesson>[] = ["id", "course", "isPublic", "addedBy"]) {
        return await this.lessonRepo.findOne(where, {fields});
    }
}
