import {EntityData} from "@mikro-orm/core";
import {PendingJob} from "@/src/models/entities/PendingJob.js";
import {CustomFactory} from "@/devtools/factories/CustomFactory.js";


export class PendingJobFactory extends CustomFactory<PendingJob> {
    readonly model = PendingJob;

    protected definition(): EntityData<PendingJob> {
        return {
            createdDate: new Date(Math.round(Date.now() / 1000) * 1000),
        };
    }
}
