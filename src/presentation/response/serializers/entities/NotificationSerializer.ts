import {
    CustomCallbackObject,
    CustomEntitySerializer
} from "@/src/presentation/response/serializers/CustomEntitySerializer.js";
import {NotificationSchema} from "dzelda-common";
import {Notification} from "@/src/models/entities/Notification.js";


class NotificationSerializer extends CustomEntitySerializer<Notification, NotificationSchema> {

    definition(notification: Notification): CustomCallbackObject<Partial<NotificationSchema>> {
        return {
            id: () => notification.id,
            text: () => notification.text,
            createdDate: () => notification.createdDate.toISOString(),
        };
    }
}

export const notificationSerializer = new NotificationSerializer();
