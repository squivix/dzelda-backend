import {EntityManager, FilterQuery} from "@mikro-orm/core";
import {Lesson} from "@/src/models/entities/Lesson.js";
import {SqlEntityManager} from "@mikro-orm/postgresql";
import {LessonRepo} from "@/src/models/repos/LessonRepo.js";
import {AnonymousUser, User} from "@/src/models/entities/auth/User.js";
import lessonService from "@/src/services/LessonService.js";
import {lessonSerializer} from "@/src/schemas/response/serializers/LessonSerializer.js";
import {Course} from "@/src/models/entities/Course.js";
import {LanguageLevel} from "@/src/models/enums/LanguageLevel.js";

class LessonService {
    em: SqlEntityManager;
    lessonRepo: LessonRepo;

    constructor(em: EntityManager) {
        this.em = em as SqlEntityManager;
        this.lessonRepo = this.em.getRepository(Lesson) as LessonRepo;
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
}

export default LessonService;