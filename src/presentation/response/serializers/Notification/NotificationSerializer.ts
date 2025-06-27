import {CustomSerializer} from "@/src/presentation/response/serializers/CustomSerializer.js";
import {Notification} from "@/src/models/entities/Notification.js";
import {assertNoUndefinedProps} from "@/src/presentation/response/serializers/serializerUtils.js";

class NotificationSerializer extends CustomSerializer<Notification> {
    serialize(notification: Notification, {assertNoUndefined = true} = {}): any {
        const pojo = {
            id: notification.id,
            text: notification.text,
            createdDate: notification.createdDate.toISOString(),
        };
        if (assertNoUndefined)
            assertNoUndefinedProps(pojo);
        return pojo;
    }
}

export const notificationSerializer = new NotificationSerializer();