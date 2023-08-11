import {EntityManager, FilterQuery} from "@mikro-orm/core";
import {Course} from "@/src/models/entities/Course.js";
import {CourseRepo} from "@/src/models/repos/CourseRepo.js";
import {AnonymousUser, User} from "@/src/models/entities/auth/User.js";
import {Language} from "@/src/models/entities/Language.js";
import {defaultVocabsByLevel} from "@/src/models/enums/VocabLevel.js";
import {Lesson} from "@/src/models/entities/Lesson.js";
import {LessonRepo} from "@/src/models/repos/LessonRepo.js";
import {QueryOrderMap} from "@mikro-orm/core/enums.js";

export class CourseService {
    em: EntityManager;
    courseRepo: CourseRepo;
    lessonRepo: LessonRepo;

    constructor(em: EntityManager) {
        this.em = em;
        this.courseRepo = this.em.getRepository(Course) as CourseRepo;
        this.lessonRepo = this.em.getRepository(Lesson) as LessonRepo;
    }

    async getPaginatedCourses(filters: { languageCode?: string, addedBy?: string, searchQuery?: string, isLearning?: boolean }, sort: {
        sortBy: "title" | "createdDate" | "learnersCount",
        sortOrder: "asc" | "desc"
    }, pagination: { page: number, pageSize: number }, user: User | AnonymousUser | null): Promise<[Course[], number]> {
        const dbFilters: FilterQuery<Course> = {$and: []};

        if (user && user instanceof User) {
            dbFilters.$and!.push({$or: [{isPublic: true}, {addedBy: (user as User).profile}]});
            if (filters.isLearning)
                dbFilters.$and!.push({lessons: {learners: user.profile}});
        } else
            dbFilters.$and!.push({isPublic: true});

        if (filters.languageCode !== undefined)
            dbFilters.$and!.push({language: {code: filters.languageCode}});
        if (filters.addedBy !== undefined)
            dbFilters.$and!.push({addedBy: {user: {username: filters.addedBy}}});
        if (filters.searchQuery !== undefined && filters.searchQuery !== "")
            dbFilters.$and!.push({$or: [{title: {$ilike: `%${filters.searchQuery}%`}}, {description: {$ilike: `%${filters.searchQuery}%`}}]});

        const dbOrderBy: QueryOrderMap<Course>[] = [];
        if (sort.sortBy == "title")
            dbOrderBy.push({title: sort.sortOrder});
        else if (sort.sortBy == "createdDate")
            dbOrderBy.push({addedOn: sort.sortOrder});
        else if (sort.sortBy == "learnersCount")
            dbOrderBy.push({learnersCount: sort.sortOrder});
        dbOrderBy.push({id: "asc"});

        const [courses, totalCount] = await this.courseRepo.findAndCount(dbFilters, {
            populate: ["language", "addedBy.user"],
            orderBy: dbOrderBy,
            limit: pagination.pageSize,
            offset: pagination.pageSize * (pagination.page - 1),
        });
        if (user && !(user instanceof AnonymousUser))
            await this.courseRepo.annotateVocabsByLevel(courses, user.id);

        return [courses, totalCount];
    }

    async createCourse(fields: {
        language: Language, title: string, description?: string, isPublic?: boolean, image?: string
    }, user: User) {
        const newCourse = this.courseRepo.create({
            title: fields.title,
            addedBy: user.profile,
            language: fields.language,
            description: fields.description,
            image: fields.image,
            isPublic: fields.isPublic,
        });
        newCourse.vocabsByLevel = defaultVocabsByLevel();
        await this.em.flush();
        return newCourse;
    }

    async getCourse(courseId: number, user: User | AnonymousUser | null) {
        let course = await this.courseRepo.findOne({id: courseId}, {populate: ["language", "addedBy", "addedBy.user"]});
        if (course) {
            await this.em.populate(course, ["lessons"], {orderBy: {lessons: {orderInCourse: "asc"}}, refresh: true});
            if (user && !(user instanceof AnonymousUser))
                await this.courseRepo.annotateVocabsByLevel([course], user.id);
        }
        return course;
    }

    async updateCourse(course: Course, updatedCourseData: {
        title: string;
        description: string;
        isPublic: boolean;
        image?: string;
        lessonsOrder: number[]
    }, user: User) {
        course.title = updatedCourseData.title;
        course.description = updatedCourseData.description;
        course.isPublic = updatedCourseData.isPublic;
        if (updatedCourseData.image !== undefined)
            course.image = updatedCourseData.image;

        const idToOrder: Record<number, number> = updatedCourseData.lessonsOrder.reduce((acc, curr, index) => ({
            ...acc,
            [curr]: index
        }), {});
        const courseLessons = course.lessons.getItems();
        courseLessons.forEach(l => l.orderInCourse = idToOrder[l.id]);
        this.courseRepo.persist(course);
        this.lessonRepo.persist(courseLessons);
        await this.courseRepo.flush();

        await this.courseRepo.findOne({id: course.id}, {populate: ["language", "addedBy", "addedBy.user", "addedBy.languagesLearning"]});
        await this.em.populate(course, ["lessons"], {orderBy: {lessons: {orderInCourse: "asc"}}, refresh: true});
        if (user && !(user instanceof AnonymousUser))
            await this.courseRepo.annotateVocabsByLevel([course], user.id);
        return course;
    }


}
