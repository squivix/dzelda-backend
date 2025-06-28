import {CustomSerializer} from "@/src/presentation/response/serializers/CustomSerializer.js";
import {Notification} from "@/src/models/entities/Notification.js";
import {ViewDescription} from "@/src/models/viewResolver.js";

class NotificationSerializer extends CustomSerializer<Notification> {
    readonly view: ViewDescription = {
        fields: ["id", "text", "createdDate"]
    }

    serialize(notification: Notification, {assertNoUndefined = true} = {}): any {
        return this.finalizePojo({
            id: notification.id,
            text: notification.text,
            createdDate: notification.createdDate.toISOString(),
        }, assertNoUndefined);
    }
}

export const notificationSerializer = new NotificationSerializer();
