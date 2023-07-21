import {Faker} from "@mikro-orm/seeder";
import {User} from "@/src/models/entities/auth/User.js";
import {EntityData, EntityManager} from "@mikro-orm/core";
import {CustomFactory} from "@/src/seeders/factories/CustomFactory.js";
import {Lesson} from "@/src/models/entities/Lesson.js";
import {parsers} from "@/src/utils/parsers/parsers.js";
import {Vocab} from "@/src/models/entities/Vocab.js";
import {MapLessonVocab} from "@/src/models/entities/MapLessonVocab.js";
import {Language} from "@/src/models/entities/Language.js";
import {randomEnum} from "@/tests/utils.js";
import {LanguageLevel} from "@/src/models/enums/LanguageLevel.js";

export class LessonFactory extends CustomFactory<Lesson> {
    readonly model = Lesson;


    public static makeDefinition(faker: Faker): EntityData<Lesson> {
        return {
            title: faker.random.words(faker.datatype.number({min: 4, max: 10})),
            text: faker.random.words(faker.datatype.number({min: 50, max: 100})),
            image: faker.image.imageUrl(100, 100),
            level: randomEnum(LanguageLevel),
            audio: "https://upload.wikimedia.org/wikipedia/commons/d/de/Lorem_ipsum.ogg"
        };
    }


    // async createOne(overrideParameters?: EntityData<Lesson>): Promise<Lesson> {
    //     const lesson = await super.createOne(overrideParameters);
    //     const em = ((this as any).em as EntityManager);
    //     const language = await em.findOneOrFail(Language, {courses: {lessons: lesson}})
    //
    //     const lessonWords = parsers["en"].parseText(`${lesson.title} ${lesson.text}`);
    //     await em.upsertMany(Vocab, lessonWords.map(word => ({text: word, language: lesson.course.language.id})));
    //     const lessonVocabs = await em.find(Vocab, {text: lessonWords, language: language.id});
    //     await em.insertMany(MapLessonVocab, lessonVocabs.map(vocab => ({lesson: lesson.id, vocab: vocab.id})));
    //     return lesson;
    // }

    protected definition(faker: Faker): EntityData<User> {
        return LessonFactory.makeDefinition(faker);
    }
}
