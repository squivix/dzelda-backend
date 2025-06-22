import {CustomSerializer} from "@/src/presentation/response/serializers/CustomSerializer.js";
import {Notification} from "@/src/models/entities/Notification.js";

class NotificationSerializer extends CustomSerializer<Notification> {
    serialize(notification: Notification): any {
        return {
            id: notification.id,
            text: notification.text,
            createdDate: notification.createdDate.toISOString(),
        };
    }
}

export const notificationSerializer = new NotificationSerializer();