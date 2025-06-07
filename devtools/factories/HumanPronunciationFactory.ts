import {EntityData} from "@mikro-orm/core";
import {CustomFactory} from "@/devtools/factories/CustomFactory.js";
import {HumanPronunciation} from "@/src/models/entities/HumanPronunciation.js";
import {faker} from "@faker-js/faker";
import {parsers} from "dzelda-common";

export class HumanPronunciationFactory extends CustomFactory<HumanPronunciation> {
    readonly model = HumanPronunciation;

    protected definition(): EntityData<HumanPronunciation> {
        const text = faker.random.words(faker.datatype.number({min: 4, max: 10}));

        return {
            text: text,
            parsedText: parsers["en"].parseText(text),
            url: faker.internet.url(),
            attribution: null,
        };
    }
}
