import {EntityManager, FilterQuery} from "@mikro-orm/core";
import {Course} from "@/src/models/entities/Course.js";
import {courseSerializer} from "@/src/schemas/response/serializers/CourseSerializer.js";
import {CourseRepo} from "@/src/models/repos/CourseRepo.js";
import {AnonymousUser, User} from "@/src/models/entities/auth/User.js";

class CourseService {
    em: EntityManager;
    courseRepo: CourseRepo;

    constructor(em: EntityManager) {
        this.em = em;
        this.courseRepo = this.em.getRepository(Course) as CourseRepo;
    }

    async getCourses(filters: { languageCode?: string, addedBy?: string, searchQuery?: string }, user: User | AnonymousUser | null) {
        const dbFilters: FilterQuery<Course> = {$and: []}

        if (user && user instanceof User)
            dbFilters.$and!.push({$or: [{isPublic: true}, {addedBy: (user as User).profile}]});
        else
            dbFilters.$and!.push({isPublic: true})

        if (filters.languageCode)
            dbFilters.$and!.push({language: {code: filters.languageCode}})
        if (filters.addedBy)
            dbFilters.$and!.push({addedBy: {user: {username: filters.addedBy}}})
        if (filters.searchQuery)
            dbFilters.$and!.push({$or: [{title: {$ilike: `%${filters.searchQuery}5`}}, {description: {$ilike: `%${filters.searchQuery}5`}}]})

        let courses = await this.courseRepo.find(dbFilters, {populate: ["addedBy.user"]});

        if (courses.length > 0 && user && !(user instanceof AnonymousUser))
            courses = await this.courseRepo.annotateVocabsByLevel(courses, user.id)

        return courseSerializer.serializeList(courses);
    }
}

export default CourseService;