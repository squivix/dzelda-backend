import {EntityManager} from "@mikro-orm/core";
import {Lesson} from "@/src/models/entities/Lesson.js";
import {SqlEntityManager} from "@mikro-orm/postgresql";
import {LessonRepo} from "@/src/models/repos/LessonRepo.js";
import {User} from "@/src/models/entities/auth/User.js";

class LessonService {
    em: SqlEntityManager;
    lessonRepo: LessonRepo;

    constructor(em: EntityManager) {
        this.em = em as SqlEntityManager;
        this.lessonRepo = this.em.getRepository(Lesson) as LessonRepo;
    }

    async getLessons(filters: {}, user: User) {
        const lessons = await this.lessonRepo.find({});
        return await this.lessonRepo.annotateVocabsByLevel(lessons, user.id);
    }
}

export default LessonService;