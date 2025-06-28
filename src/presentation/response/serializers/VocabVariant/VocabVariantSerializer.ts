import {CustomSerializer} from "@/src/presentation/response/serializers/CustomSerializer.js";
import {VocabVariant} from "@/src/models/entities/VocabVariant.js";
import {ViewDescription} from "@/src/models/viewResolver.js";

class VocabVariantSerializer extends CustomSerializer<VocabVariant> {
    readonly view: ViewDescription = {
        fields: ["id", "text"],
        relations: {ttsPronunciations: {fields: ["url"]}}
    }

    serialize(vocabVariant: VocabVariant, {assertNoUndefined = true} = {}): any {
        return this.finalizePojo({
            id: vocabVariant.id,
            text: vocabVariant.text,

            ttsPronunciationUrl: vocabVariant.ttsPronunciations.getItems().pop()?.url ?? null,
        }, assertNoUndefined);
    }
}

export const vocabVariantSerializer = new VocabVariantSerializer();
