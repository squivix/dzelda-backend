import {CustomSerializer} from "@/src/presentation/response/serializers/CustomSerializer.js";
import {Meaning} from "@/src/models/entities/Meaning.js";
import {vocabVariantSerializer} from "@/src/presentation/response/serializers/VocabVariant/VocabVariantSerializer.js";
import {ViewDescription} from "@/src/models/viewResolver.js";

class MeaningSummerySerializer extends CustomSerializer<Meaning> {
    readonly view: ViewDescription = {
        fields: ["id", "text", "learnersCount", "addedOn", "attribution", "vocab", "attributionSource"],
        relations: {
            language: {fields: ["code"]},
            addedBy: {
                fields: [],
                relations: {user: {fields: ["username"]}}
            },
            vocabVariant: vocabVariantSerializer.view,
        }
    }

    serialize(meaning: Meaning, {assertNoUndefined = true} = {}): any {
        return this.finalizePojo({
            id: meaning.id,
            text: meaning.text,
            learnersCount: Number(meaning?.learnersCount),
            addedOn: meaning.addedOn.toISOString(),
            attribution: meaning.attribution,

            language: meaning.language.code,
            addedBy: meaning.addedBy == null ? "anonymous" : meaning.addedBy.user.username,
            vocab: meaning.vocab.id,
            vocabVariant: meaning.vocabVariant ? vocabVariantSerializer.serialize(meaning.vocabVariant) : null,
            attributionSource: meaning.attributionSource ? meaning.attributionSource.id : null,
        }, assertNoUndefined);
    }
}

export const meaningSummerySerializer = new MeaningSummerySerializer();
