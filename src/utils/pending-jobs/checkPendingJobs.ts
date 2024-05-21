import {EntityManager} from "@mikro-orm/core";
import {PendingJob} from "@/src/models/entities/PendingJob.js";
import {Collection} from "@/src/models/entities/Collection.js";
import {Notification} from "@/src/models/entities/Notification.js";

type JobTypeToParams = {
    "bulk-import-collection": { collectionId: number }
};
export type JobType = keyof JobTypeToParams

export async function checkPendingJobs(jobs: PendingJob[], em: EntityManager) {
    for (const job of jobs) {
        if (job.jobType === "bulk-import-collection") {
            const {collectionId} = job.jobParams as JobTypeToParams[typeof job.jobType];

            const collection = await em.findOne(Collection, {id: collectionId}, {populate: ["texts"], fields: ["title", "texts.isProcessing"]});
            if (!collection)
                return;
            if (!collection.texts.getItems().some(t => t.isProcessing)) {
                em.create(Notification, {
                    recipient: job.initiator,
                    text: `Collection "${collection.title}" finished importing`,
                });
                em.remove(job);
                await em.flush();
            }
        }
    }
}
