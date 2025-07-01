import {EntityFetchSpecs} from "@/src/models/viewResolver.js";
import {Notification} from "@/src/models/entities/Notification.js"
import {profileFetchSpecs} from "@/src/models/fetchSpecs/profileFetchSpecs.js";

export const notificationFetchSpecs = () => ({
    id: {type: "db-column"},
    text: {type: "db-column"},
    createdDate: {type: "db-column"},
    recipient: {type: "relation", populate: "recipient", relationType: "to-one", entityFetchSpecs: profileFetchSpecs},
}) as const satisfies EntityFetchSpecs<Notification>

export type NotificationFetchSpecsType = ReturnType<typeof notificationFetchSpecs>;