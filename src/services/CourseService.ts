import {EntityManager, FilterQuery} from "@mikro-orm/core";
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
import {LanguageLevel} from "@/src/models/enums/LanguageLevel.js";

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
        languageCode?: string, addedBy?: string,
        level?: LanguageLevel[], searchQuery?: string, isBookmarked?: boolean
    }, sort: {
        sortBy: "title" | "createdDate" | "avgPastViewersCountPerLesson",
        sortOrder: "asc" | "desc"
    }, pagination: { page: number, pageSize: number }, user: User | AnonymousUser | null): Promise<[Course[], number]> {
        const dbFilters: FilterQuery<Course> = {$and: []};

        if (user && user instanceof User) {
            dbFilters.$and!.push({$or: [{isPublic: true}, {addedBy: (user as User).profile}]});
            if (filters.isBookmarked)
                dbFilters.$and!.push({bookmarkers: user.profile});
        } else
            dbFilters.$and!.push({isPublic: true});

        if (filters.languageCode !== undefined)
            dbFilters.$and!.push({language: {code: filters.languageCode}});
        if (filters.addedBy !== undefined)
            dbFilters.$and!.push({addedBy: {user: {username: filters.addedBy}}});
        if (filters.searchQuery !== undefined && filters.searchQuery !== "")
            dbFilters.$and!.push({$or: [{title: {$ilike: `%${filters.searchQuery}%`}}, {description: {$ilike: `%${filters.searchQuery}%`}}]});
        if (filters.level !== undefined)
            dbFilters.$and!.push({$or: filters.level.map(level => ({level}))});

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
        language: Language, title: string, description?: string, level?: LanguageLevel, isPublic?: boolean, image?: string
    }, user: User) {
        const newCourse = this.courseRepo.create({
            title: fields.title,
            addedBy: user.profile,
            level: fields.level,
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
        const course = await this.courseRepo.findOne({id: courseId}, {populate: ["language", "addedBy", "addedBy.user"]});
        if (course) {
            await this.em.populate(course, ["lessons"], {orderBy: {lessons: {orderInCourse: "asc"}}, refresh: true});
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
        isPublic: boolean;
        level: LanguageLevel
        image?: string;
        lessonsOrder: number[]
    }, user: User) {
        course.title = updatedCourseData.title;
        course.description = updatedCourseData.description;
        course.isPublic = updatedCourseData.isPublic;
        course.level = updatedCourseData.level;

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

    async getNextLessonInCourse(course: Course, lessonId: number) {
        const queryBuilder = this.lessonRepo.createQueryBuilder("l0");
        const subQueryBuilder = this.lessonRepo.createQueryBuilder("l1").select("orderInCourse").where({id: lessonId}).getKnexQuery();
        return await queryBuilder.select(["id", "orderInCourse"])
            .where({course: course.id})
            .andWhere({'orderInCourse': queryBuilder.raw(`(${subQueryBuilder}) + 1`)})
            .execute("get")
    }

    async findCourse(where: FilterQuery<Course>, fields: EntityField<Course>[] = ["id", "isPublic", "addedBy"]) {
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
