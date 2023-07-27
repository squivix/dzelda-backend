import {EntityRepository} from "@mikro-orm/postgresql";
import {Vocab} from "@/src/models/entities/Vocab.js";
import {MapLearnerVocab} from "@/src/models/entities/MapLearnerVocab.js";

export class VocabRepo extends EntityRepository<Vocab> {


}
