import {EntityManager, EntityRepository} from "@mikro-orm/core";
import {cleanObject} from "@/src/utils/utils.js";
import {Course} from "@/src/models/entities/Course";

class CourseService {
    em: EntityManager;
    courseRepo: EntityRepository<Course>;

    constructor(em: EntityManager) {
        this.em = em;
        this.courseRepo = this.em.getRepository(Course);
    }

    async getCourses(filters: {}) {
        const courses = await this.courseRepo.find(cleanObject(filters), {populate:["addedBy"]});
        await this.em.flush();
        return courses;
    }
}

export default CourseService;