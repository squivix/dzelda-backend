import {EntityManager, FilterQuery, PopulateHint} from "@mikro-orm/core";
import {Course} from "@/src/models/entities/Course.js";
import {CourseRepo} from "@/src/models/repos/CourseRepo.js";
import {AnonymousUser, User} from "@/src/models/entities/auth/User.js";
import {Language} from "@/src/models/entities/Language.js";
import {defaultVocabsByLevel} from "@/src/models/enums/VocabLevel.js";
import {Lesson} from "@/src/models/entities/Lesson.js";
import {LessonRepo} from "@/src/models/repos/LessonRepo.js";
import {QueryOrderMap} from "@mikro-orm/core/enums.js";
import {EntityField} from "@mikro-orm/core/drivers/IDatabaseDriver.js";
import {MapBookmarkerCourse} from "@/src/models/entities/MapBookmarkerCourse.js";

export class CourseService {
    em: EntityManager;
    courseRepo: CourseRepo;
    lessonRepo: LessonRepo;

    constructor(em: EntityManager) {
        this.em = em;
        this.courseRepo = this.em.getRepository(Course) as CourseRepo;
        this.lessonRepo = this.em.getRepository(Lesson) as LessonRepo;
    }

    async getPaginatedCourses(filters: {
        languageCode?: string, addedBy?: string, searchQuery?: string, isBookmarked?: boolean
    }, sort: {
        sortBy: "title" | "createdDate" | "avgPastViewersCountPerLesson",
        sortOrder: "asc" | "desc"
    }, pagination: { page: number, pageSize: number }, user: User | AnonymousUser | null): Promise<[Course[], number]> {
        const dbFilters: FilterQuery<Course> = {$and: []};

        if (user && user instanceof User) {
            if (filters.isBookmarked)
                dbFilters.$and!.push({bookmarkers: user.profile});
        }
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
        else if (sort.sortBy == "avgPastViewersCountPerLesson")
            dbOrderBy.push({avgPastViewersCountPerLesson: sort.sortOrder});
        dbOrderBy.push({id: "asc"});

        const [courses, totalCount] = await this.courseRepo.findAndCount(dbFilters, {
            populate: ["language", "addedBy.user"],
            orderBy: dbOrderBy,
            limit: pagination.pageSize,
            offset: pagination.pageSize * (pagination.page - 1),
        });
        if (user && !(user instanceof AnonymousUser))
            await this.courseRepo.annotateCoursesWithUserData(courses, user);

        return [courses, totalCount];
    }

    async createCourse(fields: {
        language: Language, title: string, description?: string, image?: string
    }, user: User) {
        const newCourse = this.courseRepo.create({
            title: fields.title,
            addedBy: user.profile,
            language: fields.language,
            description: fields.description,
            image: fields.image,
        });
        newCourse.vocabsByLevel = defaultVocabsByLevel();
        await this.em.flush();
        return newCourse;
    }

    async getCourse(courseId: number, user: User | AnonymousUser | null) {
        const course = await this.courseRepo.findOne({id: courseId}, {populate: ["language", "addedBy", "addedBy.user"]});
        if (course) {
            const privateFilter: FilterQuery<Lesson> = user instanceof User ? {$or: [{isPublic: true}, {addedBy: user.profile}]} : {isPublic: true};
            await course.lessons.init({where: privateFilter, orderBy: {orderInCourse: "asc"}});
            if (user && !(user instanceof AnonymousUser)) {
                await this.courseRepo.annotateCoursesWithUserData([course], user);
                await this.lessonRepo.annotateLessonsWithUserData(course.lessons.getItems(), user);
            }
        }
        return course;
    }

    async updateCourse(course: Course, updatedCourseData: {
        title: string;
        description: string;
        image?: string;
        lessonsOrder: number[]
    }, user: User) {
        course.title = updatedCourseData.title;
        course.description = updatedCourseData.description;

        if (updatedCourseData.image !== undefined)
            course.image = updatedCourseData.image;

        const idToOrder: Record<number, number> = updatedCourseData.lessonsOrder.reduce((acc, curr, index) => ({
            ...acc,
            [curr]: index
        }), {});
        const courseLessons = course.lessons.getItems();
        courseLessons.forEach(l => l.orderInCourse = idToOrder[l.id]);
        this.em.persist(course);
        this.em.persist(courseLessons);
        await this.em.flush();

        return (await this.getCourse(course.id, user))!;
    }

    async getNextLessonInCourse(course: Course, lessonId: number, user: User | AnonymousUser | null) {
        const queryBuilder = this.lessonRepo.createQueryBuilder("l0");
        const subQueryBuilder = this.lessonRepo.createQueryBuilder("l1").select("orderInCourse").where({id: lessonId}).getKnexQuery();
        const privateFilter: FilterQuery<Lesson> = user instanceof User ? {$or: [{isPublic: true}, {addedBy: user.profile}]} : {isPublic: true};

        return await queryBuilder.select("*")
            .where({course: course.id})
            .andWhere({"orderInCourse": {$gt: queryBuilder.raw(`(${subQueryBuilder})`)}})
            .andWhere(privateFilter)
            .orderBy({orderInCourse: "asc"})
            .limit(1)
            .execute("get");
    }

    async findCourse(where: FilterQuery<Course>, fields: EntityField<Course>[] = ["id", "addedBy"]) {
        return await this.courseRepo.findOne(where, {fields});
    }

    async findBookMarkerCourseMapping(where: FilterQuery<MapBookmarkerCourse>, fields: EntityField<MapBookmarkerCourse>[] = ["course"]) {
        return await this.em.findOne(MapBookmarkerCourse, where, {fields});
    }

    async addCourseToUserBookmarks(course: Course, user: User) {
        const mapping = this.em.create(MapBookmarkerCourse, {bookmarker: user.profile, course: course});
        await this.em.flush();
        await this.courseRepo.annotateCoursesWithUserData([course], user);
        return mapping;
    }

    async removeCourseFromUserBookmarks(course: Course, user: User) {
        await this.em.nativeDelete(MapBookmarkerCourse, {course: course, bookmarker: user.profile}, {});
    }

}
