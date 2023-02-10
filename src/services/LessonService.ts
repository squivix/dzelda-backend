import {EntityManager, FilterQuery} from "@mikro-orm/core";
import {Lesson} from "@/src/models/entities/Lesson.js";
import {SqlEntityManager} from "@mikro-orm/postgresql";
import {LessonRepo} from "@/src/models/repos/LessonRepo.js";
import {AnonymousUser, User} from "@/src/models/entities/auth/User.js";
import {LanguageLevel} from "@/src/models/enums/LanguageLevel.js";
import {Course} from "@/src/models/entities/Course.js";
import {parsers} from "@/src/utils/parsers/parsers.js";
import {Vocab} from "@/src/models/entities/Vocab.js";
import {MapLessonVocab} from "@/src/models/entities/MapLessonVocab.js";
import {CourseRepo} from "@/src/models/repos/CourseRepo.js";

class LessonService {
    em: SqlEntityManager;
    lessonRepo: LessonRepo;
    courseRepo: CourseRepo;

    constructor(em: EntityManager) {
        this.em = em as SqlEntityManager;
        this.lessonRepo = this.em.getRepository(Lesson) as LessonRepo;
        this.courseRepo = this.em.getRepository(Course) as CourseRepo;

    }

    async getLessons(filters: { languageCode?: string, addedBy?: string, searchQuery?: string, level?: LanguageLevel, hasAudio?: boolean }, user: User | AnonymousUser | null) {
        const dbFilters: FilterQuery<Lesson> = {$and: []};
        if (user && user instanceof User)
            dbFilters.$and!.push({$or: [{course: {isPublic: true}}, {course: {addedBy: (user as User).profile}}]});
        else
            dbFilters.$and!.push({course: {isPublic: true}});

        if (filters.languageCode !== undefined)
            dbFilters.$and!.push({course: {language: {code: filters.languageCode}}});
        if (filters.addedBy !== undefined)
            dbFilters.$and!.push({course: {addedBy: {user: {username: filters.addedBy}}}});
        if (filters.searchQuery !== undefined)
            dbFilters.$and!.push({title: {$ilike: `%${filters.searchQuery}%`}});
        if (filters.hasAudio !== undefined)
            dbFilters.$and!.push({audio: {[filters.hasAudio ? "$ne" : "$eq"]: ""}});
        if (filters.level !== undefined)
            dbFilters.$and!.push({course: {level: filters.level}});

        let lessons = await this.lessonRepo.find(dbFilters, {populate: ["course", "course.addedBy.user"]});

        if (user && !(user instanceof AnonymousUser))
            lessons = await this.lessonRepo.annotateVocabsByLevel(lessons, user.id);
        return lessons;
    }

    async createLesson(fields: { title: string; text: string; course: Course; image?: string; audio?: string; }, user: User) {
        let newLesson = await this.lessonRepo.create({
            title: fields.title,
            text: fields.text,
            image: fields.image,
            audio: fields.audio,
            course: fields.course,
            orderInCourse: fields.course.lessons.count()
        });
        await this.em.flush();

        const language = fields.course.language;
        //TODO replace default english for tests with specifying english in test and avoid collisions somehow...
        const parser = parsers[language.code] ?? parsers["en"];
        const lessonWords = parser.parseText(fields.text);

        await this.em.upsertMany(Vocab, lessonWords.map(word => ({text: word, language: language.id})));
        const lessonVocabs = await this.em.find(Vocab, {text: lessonWords, language: language.id});

        await this.em.insertMany(MapLessonVocab, lessonVocabs.map(vocab => ({lesson: newLesson.id, vocab: vocab.id})));

        await this.lessonRepo.annotateVocabsByLevel([newLesson], user.id);
        await this.courseRepo.annotateVocabsByLevel([newLesson.course], user.id);
        return newLesson;
    }

    async getLesson(lessonId: number, user: User | AnonymousUser | null) {
        let lesson = await this.lessonRepo.findOne({id: lessonId}, {populate: ["course", "course.addedBy.user"]});
        if (lesson) {
            if (user && !(user instanceof AnonymousUser)) {
                await this.lessonRepo.annotateVocabsByLevel([lesson], user.id);
                await this.courseRepo.annotateVocabsByLevel([lesson.course], user.id);
            }
        }
        return lesson;
    }
}

export default LessonService;
