import {EntityData} from "@mikro-orm/core";
import {Notification} from "@/src/models/entities/Notification.js";
import {CustomFactory} from "@/devtools/factories/CustomFactory.js";
import {faker} from "@faker-js/faker";

export class NotificationFactory extends CustomFactory<Notification> {
    readonly model = Notification;

    protected definition(): EntityData<Notification> {
        return {
            text: `This is an example notification used for testing: ${faker.random.words(5)}`,
            createdDate: new Date(Math.round(Date.now() / 1000) * 1000),
        };
    }
}
