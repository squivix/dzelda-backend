import {CustomDTO} from "@/src/presentation/response/dtos/CustomDTO.js";
import {Notification} from "@/src/models/entities/Notification.js";

class NotificationDTO extends CustomDTO<Notification> {
    serialize(notification: Notification): any {
        return {
            id: notification.id,
            text: notification.text,
            createdDate: notification.createdDate.toISOString(),
        }
    }
}

export const notificationDTO = new NotificationDTO();