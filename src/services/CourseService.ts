import {EntityManager} from "@mikro-orm/core";
import {cleanObject} from "@/src/utils/utils.js";
import {Course} from "@/src/models/entities/Course.js";
import {courseSerializer} from "@/src/schemas/serializers/CourseSerializer.js";
import {CourseRepo} from "@/src/models/repos/CourseRepo.js";
import {AnonymousUser, User} from "@/src/models/entities/auth/User.js";

class CourseService {
    em: EntityManager;
    courseRepo: CourseRepo;

    constructor(em: EntityManager) {
        this.em = em;
        this.courseRepo = this.em.getRepository(Course) as CourseRepo;
    }

    async getCourses(filters: {}, user: User | AnonymousUser | null) {
        let courses = await this.courseRepo.find(cleanObject(filters), {populate: ["addedBy.user"]});
        if (user && !(user instanceof AnonymousUser))
            courses = await this.courseRepo.annotateVocabsByLevel(courses, user.id)

        return courseSerializer.serializeList(courses);
    }
}

export default CourseService;