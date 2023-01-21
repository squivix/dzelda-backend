import {EntityManager} from "@mikro-orm/core";
import {cleanObject} from "@/src/utils/utils.js";
import {Course} from "@/src/models/entities/Course.js";
import {courseSerializer} from "@/src/schemas/serializers/CourseSerializer.js";
import {CourseRepo} from "@/src/models/repos/CourseRepo.js";

class CourseService {
    em: EntityManager;
    courseRepo: CourseRepo;

    constructor(em: EntityManager) {
        this.em = em;
        this.courseRepo = this.em.getRepository(Course) as CourseRepo;
    }

    async getCourses(filters: {}, userId: number) {
        const courses = await this.courseRepo.find(cleanObject(filters), {populate: ["addedBy.user"]});

        return courseSerializer.serializeList(await this.courseRepo.annotateVocabsByLevel(courses, userId));
    }
}

export default CourseService;