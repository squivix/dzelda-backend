import {EntityManager} from "@mikro-orm/core";
import {Lesson} from "@/src/models/entities/Lesson.js";
import {SqlEntityManager} from "@mikro-orm/postgresql";
import {LessonRepo} from "@/src/models/repos/LessonRepo.js";
import {AnonymousUser, User} from "@/src/models/entities/auth/User.js";
import lessonService from "@/src/services/LessonService.js";
import {lessonSerializer} from "@/src/schemas/response/serializers/LessonSerializer.js";

class LessonService {
    em: SqlEntityManager;
    lessonRepo: LessonRepo;

    constructor(em: EntityManager) {
        this.em = em as SqlEntityManager;
        this.lessonRepo = this.em.getRepository(Lesson) as LessonRepo;
    }

    async getLessons(filters: {}, user: User | AnonymousUser | null) {
        let lessons = await this.lessonRepo.find({}, {populate: ["course", "course.addedBy.user"]});
        if (user && !(user instanceof AnonymousUser))
            lessons = await this.lessonRepo.annotateVocabsByLevel(lessons, user.id);
        return lessonSerializer.serializeList(lessons);
    }
}

export default LessonService;