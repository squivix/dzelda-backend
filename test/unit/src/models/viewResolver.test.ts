import {describe, expect, test, TestContext, vi} from "vitest";
import {buildFetchPlan, FieldFetchSpecsMap, ViewDescription} from "@/src/models/viewResolver.js";
import {collectionFieldFetchMap} from "@/src/models/fetchSpecs/collectionFieldFetchMap.js";
import {textFieldFetchMap} from "@/src/models/fetchSpecs/textFieldFetchMap.js";
import {CollectionLoggedInSerializer} from "@/src/presentation/response/serializers/Collection/CollectionLoggedInSerializer.js";
import {vocabFieldFetchMap} from "@/src/models/fetchSpecs/vocabFieldFetchMap.js";


/**{@link buildFetchPlan}*/
describe("buildFetchPlan()", function () {
    describe("Field Selection (db / formula)", function () {
        test<TestContext>("should select simple db fields from the root view", async (testContext) => {
            const fetchSpecsMap: FieldFetchSpecsMap<any> = {
                columnField: {type: "db-column"},
                otherField: {type: "db-column"},
            }
            const view: ViewDescription = {
                fields: ["columnField"]
            }
            const context = {user: null};

            const relationFilters = {};
            const {
                fields: topLevelFields,
                populate: topLevelPopulate,
                filteredPopulates,
                annotatedFields
            } = buildFetchPlan(view, fetchSpecsMap, context, relationFilters);
            expect(topLevelFields).toEqual(["columnField"]);
            expect(topLevelPopulate).toEqual([]);
            expect(filteredPopulates).toEqual(expect.arrayEqualRegardlessOfOrder([]))
            expect(annotatedFields).toEqual(expect.arrayEqualRegardlessOfOrder([]))
        });
        test<TestContext>("should select formula fields from the root view", async (testContext) => {
            const fetchSpecsMap: FieldFetchSpecsMap<any> = {
                formulaField: {type: "formula"},
                otherField: {type: "formula"},
            }
            const view: ViewDescription = {
                fields: ["formulaField"]
            }

            const context = {user: null};
            const relationFilters = {};
            const {
                fields: topLevelFields,
                populate: topLevelPopulate,
                filteredPopulates,
                annotatedFields
            } = buildFetchPlan(view, fetchSpecsMap, context, relationFilters);
            expect(topLevelFields).toEqual(["formulaField"]);
            expect(topLevelPopulate).toEqual([]);
            expect(filteredPopulates).toEqual(expect.arrayEqualRegardlessOfOrder([]))
            expect(annotatedFields).toEqual(expect.arrayEqualRegardlessOfOrder([]))
        });
        test<TestContext>("should throw an error on non-existent fields in the view", async (testContext) => {
            const fetchSpecsMap: FieldFetchSpecsMap<any> = {
                field1: {type: "db-column"},
                field2: {type: "formula"},
                otherField: {type: "db-column"},
            }
            const view: ViewDescription = {
                fields: ["field1", "field2", "nonExistentField"]
            }

            const context = {user: null};
            const relationFilters = {};
            await expect(async () => buildFetchPlan(view, fetchSpecsMap, context, relationFilters)).rejects.toThrowError();
        });
    });
    describe("Annotated Fields", function () {
        test<TestContext>("should call annotated fetchSpecs with the result and context", async (testContext) => {
            const annotateField1 = vi.fn();
            const annotateField2 = vi.fn();
            const fetchSpecsMap: FieldFetchSpecsMap<any> = {
                annotatedField1: {type: "annotated", annotate: annotateField1},
                annotatedField2: {type: "annotated", annotate: annotateField2},
                otherField: {type: "db-column"},
            }
            const view: ViewDescription = {
                fields: ["annotatedField1", "annotatedField2"]
            }

            const context = {user: null};
            const relationFilters = {};
            const {
                fields: topLevelFields,
                populate: topLevelPopulate,
                filteredPopulates,
                annotatedFields
            } = buildFetchPlan(view, fetchSpecsMap, context, relationFilters);
            expect(topLevelFields).toEqual([]);
            expect(topLevelPopulate).toEqual([]);
            expect(filteredPopulates).toEqual(expect.arrayEqualRegardlessOfOrder([]))
            expect(annotatedFields).toEqual(expect.arrayEqualRegardlessOfOrder([{path: "", annotate: annotateField1}, {path: "", annotate: annotateField2}]))
        });
        test<TestContext>("should handle nested annotated fetchSpecs", async (testContext) => {
            const annotateField1 = vi.fn();
            const annotateField2 = vi.fn();
            const subFetchSpecsMap: FieldFetchSpecsMap<any> = {
                annotatedField1: {type: "annotated", annotate: annotateField1},
                annotatedField2: {type: "annotated", annotate: annotateField2},
            }
            const fetchSpecsMap: FieldFetchSpecsMap<any> = {
                columnField: {type: "db-column"},
                relationField: {
                    type: "relation",
                    populate: "relationField",
                    getFieldFetchSpecsMap: subFetchSpecsMap,
                    relationType: "to-many"
                },
            }
            const view: ViewDescription = {
                fields: ["columnField"],
                relations: {
                    relationField: {
                        fields: ["annotatedField1", "annotatedField2"]
                    }
                }
            }

            const context = {user: null};
            const relationFilters = {};
            const {
                fields: topLevelFields,
                populate: topLevelPopulate,
                filteredPopulates,
                annotatedFields
            } = buildFetchPlan(view, fetchSpecsMap, context, relationFilters);
            expect(topLevelFields).toEqual(["columnField"]);
            expect(topLevelPopulate).toEqual(["relationField"]);
            expect(filteredPopulates).toEqual(expect.arrayEqualRegardlessOfOrder([]))
            expect(annotatedFields).toEqual(expect.arrayEqualRegardlessOfOrder([{path: "relationField", annotate: annotateField1}, {path: "relationField", annotate: annotateField2}]))
        });
    })
    describe("Simple Relations", function () {
        test<TestContext>("should populate direct relations defined in the view", async (testContext) => {
            const subFetchSpecsMap: FieldFetchSpecsMap<any> = {
                subfield1: {type: "db-column"},
                subfield2: {type: "formula"},
            }
            const fetchSpecsMap: FieldFetchSpecsMap<any> = {
                relationField: {type: "relation", populate: "relationField", getFieldFetchSpecsMap: subFetchSpecsMap, relationType: "to-many"},
                columnField: {type: "db-column"},
            }

            const view: ViewDescription = {
                fields: ["columnField"],
                relations: {
                    relationField: {fields: ["subfield1", "subfield2"]}
                }
            }


            const context = {user: null};
            const relationFilters = {};
            const {
                fields: topLevelFields,
                populate: topLevelPopulate,
                filteredPopulates,
                annotatedFields
            } = buildFetchPlan(view, fetchSpecsMap, context, relationFilters);
            expect(topLevelFields).toEqual(["columnField", "relationField.subfield1", "relationField.subfield2"]);
            expect(topLevelPopulate).toEqual(["relationField"]);
            expect(filteredPopulates).toEqual(expect.arrayEqualRegardlessOfOrder([]))
            expect(annotatedFields).toEqual(expect.arrayEqualRegardlessOfOrder([]))
        });
        test<TestContext>("should handle nested relation paths`", async (testContext) => {
            const subSubFetchSpecsMap: FieldFetchSpecsMap<any> = {
                subSubfield1: {type: "db-column"},
                subSubfield2: {type: "formula"},
            }
            const subFetchSpecsMap: FieldFetchSpecsMap<any> = {
                subfield1: {type: "db-column"},
                subfield2: {type: "formula"},
                subRelationField: {type: "relation", populate: "subRelationField", getFieldFetchSpecsMap: subSubFetchSpecsMap, relationType: "to-many"},
            }
            const fetchSpecsMap: FieldFetchSpecsMap<any> = {
                relationField: {type: "relation", populate: "relationField", getFieldFetchSpecsMap: subFetchSpecsMap, relationType: "to-many"},
                field1: {type: "db-column"},
            }

            const view: ViewDescription = {
                fields: ["field1"],
                relations: {
                    relationField: {
                        fields: ["subfield1", "subfield2"],
                        relations: {
                            subRelationField: {
                                fields: ["subSubfield1", "subSubfield2"]
                            }
                        }
                    },
                }
            }

            const context = {user: null};
            const relationFilters = {};
            const {
                fields: topLevelFields,
                populate: topLevelPopulate,
                filteredPopulates,
                annotatedFields
            } = buildFetchPlan(view, fetchSpecsMap, context, relationFilters);
            expect(topLevelFields).toEqual(["field1", "relationField.subfield1", "relationField.subfield2", "relationField.subRelationField.subSubfield1", "relationField.subRelationField.subSubfield2"]);
            expect(topLevelPopulate).toEqual(["relationField", "relationField.subRelationField"]);
            expect(filteredPopulates).toEqual(expect.arrayEqualRegardlessOfOrder([]))
            expect(annotatedFields).toEqual(expect.arrayEqualRegardlessOfOrder([]))
        });
    })
    describe("Context-Filtered Relations", function () {
        test<TestContext>("should apply context-based filters using `repo.populate`", async (testContext) => {
            const subFetchSpecsMap: FieldFetchSpecsMap<any> = {
                subfield1: {type: "db-column"},
                subfield2: {type: "formula"},
            }
            const contextualFilter = {};
            const populateWithContextFilter = vi.fn().mockReturnValue(contextualFilter);
            const fetchSpecsMap: FieldFetchSpecsMap<any> = {
                field1: {type: "db-column"},
                relationField: {
                    type: "relation",
                    populate: "relationField",
                    relationType: "to-many",
                    getFieldFetchSpecsMap: subFetchSpecsMap,
                    defaultContextFilter: populateWithContextFilter
                },
            }

            const view: ViewDescription = {
                fields: ["field1"],
                relations: {
                    relationField: {fields: ["subfield1", "subfield2"]}
                }
            }
            const context = {user: null};
            const relationFilters = {};
            const {
                fields: topLevelFields,
                populate: topLevelPopulate,
                filteredPopulates,
                annotatedFields
            } = buildFetchPlan(view, fetchSpecsMap, context, relationFilters);
            expect(topLevelFields).toEqual(["field1"]);
            expect(topLevelPopulate).toEqual([]);
            expect(filteredPopulates).toEqual(expect.arrayEqualRegardlessOfOrder([
                {populate: ["relationField"], filter: {relationField: contextualFilter}, fields: ["relationField.subfield1", "relationField.subfield2"]}
            ]))
            expect(annotatedFields).toEqual(expect.arrayEqualRegardlessOfOrder([]))
        });
        test<TestContext>("should support multiple filtered relations", async (testContext) => {
            const subFetchSpecsMap1: FieldFetchSpecsMap<any> = {sub1field: {type: "db-column"}}, subFetchSpecsMap2: FieldFetchSpecsMap<any> = {sub2field: {type: "db-column"}}
            const contextualFilter1 = {}, contextualFilter2 = {};
            const populateWithContextFilter1 = vi.fn().mockReturnValue(contextualFilter1),
                populateWithContextFilter2 = vi.fn().mockReturnValue(contextualFilter2);
            const fetchSpecsMap: FieldFetchSpecsMap<any> = {
                field1: {type: "db-column"},
                relationField1: {
                    type: "relation",
                    populate: "relationField1",
                    relationType: "to-many",
                    getFieldFetchSpecsMap: subFetchSpecsMap1,

                    defaultContextFilter: populateWithContextFilter1
                },
                relationField2: {
                    type: "relation",
                    populate: "relationField2",
                    relationType: "to-many",
                    getFieldFetchSpecsMap: subFetchSpecsMap2,
                    defaultContextFilter: populateWithContextFilter2
                },
            }

            const view: ViewDescription = {
                fields: ["field1"],
                relations: {
                    relationField1: {fields: ["sub1field"]},
                    relationField2: {fields: ["sub2field"]}
                }
            }
            const context = {user: null};
            const relationFilters = {};
            const {
                fields: topLevelFields,
                populate: topLevelPopulate,
                filteredPopulates,
                annotatedFields
            } = buildFetchPlan(view, fetchSpecsMap, context, relationFilters);
            expect(topLevelFields).toEqual(["field1"]);
            expect(topLevelPopulate).toEqual([]);
            expect(filteredPopulates).toEqual(expect.arrayEqualRegardlessOfOrder([
                {populate: ["relationField1"], filter: {relationField1: contextualFilter1}, fields: ["relationField1.sub1field"]},
                {populate: ["relationField2"], filter: {relationField2: contextualFilter2}, fields: ["relationField2.sub2field"]},
            ]))
            expect(annotatedFields).toEqual(expect.arrayEqualRegardlessOfOrder([]))
        });
        test.todo<TestContext>("should work with combinations of filtered and unfiltered relations", async (testContext) => {
        });
    });
    describe("Recursive View Handling", function () {
        test.todo<TestContext>("should recurse into relation subviews and collect their fields", async (testContext) => {
        });
        test.todo<TestContext>("should stop recursion if no fetchSpecs are provided for a relation", async (testContext) => {
        });
        test.todo<TestContext>("should handle both array-style and object-style subviews", async (testContext) => {
        });
        test.todo<TestContext>("should call annotated fetchSpecs in nested views", async (testContext) => {
        });
    });
    describe("Integration Scenarios", function () {
        test.todo<TestContext>("should resolve fields, relations, and annotated fields together", async (testContext) => {
        });
        test.todo<TestContext>("should resolve multiple nested levels of relations, filters, and annotated fields", async (testContext) => {
        });
        test.todo<TestContext>("should handle an empty view without errors", async (testContext) => {
        });
    });
    describe("Error/Edge Handling", function () {
        test.todo<TestContext>("should handle missing fetchSpecs gracefully", async (testContext) => {
        });
        test.todo<TestContext>("should ignore unknown fields in the view", async (testContext) => {
        });
        test.todo<TestContext>("should not throw if `view.relations` is missing or empty", async (testContext) => {
        });
        test.todo<TestContext>("should not fail when `fetchSpecsMap.contextFilter` is absent", async (testContext) => {
        });
    });
    describe("Optional / Stretch", function () {
        test.todo<TestContext>("should work with async `contextFilter` functions", async (testContext) => {
        });
        test.todo<TestContext>("should handle circular view references safely (if possible)", async (testContext) => {
        });
    });
    describe("Realistic endpoints", function () {
        test<TestContext>("Get text vocabs (with meanings)", async (testContext) => {
            const user = testContext.userFactory.makeOne();
            const fetchSpecsMap = vocabFieldFetchMap;
            const view: ViewDescription = {
                fields: ["id", "text", "isPhrase", "learnersCount"],
                relations: {
                    language: {fields: ["code"]},
                    tags: {
                        fields: ["id", "name"],
                        relations: {category: {fields: ["id", "name"]}}
                    },
                    ttsPronunciations: {
                        fields: ["url"],
                    },
                    meanings: {
                        fields: ["id", "text", "learnersCount", "addedOn", "attribution"],
                        relations: {
                            addedBy: {fields: [], relations: {user: {fields: ["username"]}}},
                            language: {fields: ["code"]},
                            attributionSource: {fields: ["id", "name", "url", "logoUrl"]}
                        }
                    },
                    learnerMeanings: {
                        fields: ["id", "text", "learnersCount", "addedOn", "attribution"],
                        relations: {
                            addedBy: {fields: [], relations: {user: {fields: ["username"]}}},
                            language: {fields: ["code"]},
                            attributionSource: {fields: ["id", "name", "url", "logoUrl"]}
                        }
                    }
                }
            }
            const context = {user: user};
            const relationFilters = {
                "meanings": {language: {prefererEntries: {learnerLanguageMapping: {learner: user.profile}}}},
                "ttsPronunciations": {voice: {$or: [{prefererLanguageMappings: {learner: user.profile}}, {isDefault: true}]}}
            };
            const {
                fields: topLevelFields,
                populate: topLevelPopulate,
                filteredPopulates,
                annotatedFields
            } = buildFetchPlan(view, fetchSpecsMap, context, relationFilters);
            expect(topLevelFields).toEqual([
                "id", "text", "isPhrase", "learnersCount",
                "language.code",
                "tags.id", "tags.name",
                "tags.category.id", "tags.category.name",
            ]);
            expect(topLevelPopulate).toEqual(["language", "tags", "tags.category"]);
            expect(filteredPopulates).toEqual(expect.arrayEqualRegardlessOfOrder([
                {
                    populate: ["ttsPronunciations"],
                    filter: {ttsPronunciations: {voice: {$or: [{prefererLanguageMappings: {learner: user.profile}}, {isDefault: true}]}}},
                    fields: ["ttsPronunciations.url"]
                },
                {
                    populate: [
                        "meanings", "meanings.addedBy", "meanings.addedBy.user", "meanings.language", "meanings.attributionSource"
                    ],
                    filter: {meanings: {language: {prefererEntries: {learnerLanguageMapping: {learner: user.profile}}}}},
                    fields: [
                        "meanings.id", "meanings.text", "meanings.learnersCount", "meanings.addedOn", "meanings.attribution",
                        "meanings.addedBy.user.username",
                        "meanings.language.code",
                        "meanings.attributionSource.id", "meanings.attributionSource.name", "meanings.attributionSource.url", "meanings.attributionSource.logoUrl",
                    ]
                },
                {
                    populate: [
                        "learnerMeanings", "learnerMeanings.addedBy", "learnerMeanings.addedBy.user", "learnerMeanings.language", "learnerMeanings.attributionSource"
                    ],
                    filter: {learnerMeanings: {learners: context.user.profile}},
                    fields: [
                        "learnerMeanings.id", "learnerMeanings.text", "learnerMeanings.learnersCount", "learnerMeanings.addedOn", "learnerMeanings.attribution",
                        "learnerMeanings.addedBy.user.username",
                        "learnerMeanings.language.code",
                        "learnerMeanings.attributionSource.id", "learnerMeanings.attributionSource.name", "learnerMeanings.attributionSource.url", "learnerMeanings.attributionSource.logoUrl",
                    ]
                },
            ]))
            expect(annotatedFields).toEqual(expect.arrayEqualRegardlessOfOrder([]))
        });
        test<TestContext>("Get collections logged in", async (testContext) => {
            const collectionAnnotateMocks = ["vocabsByLevel", "isBookmarked"].map(c => vi.spyOn(collectionFieldFetchMap[c] as any, "annotate").mockResolvedValue(undefined))
            const textAnnotateMocks = ["vocabsByLevel", "isBookmarked"].map(c => vi.spyOn(textFieldFetchMap[c] as any, "annotate").mockResolvedValue(undefined))

            const fetchSpecsMap = collectionFieldFetchMap;
            const view = CollectionLoggedInSerializer.view;

            const context = {user: null};
            const relationFilters = {};
            const {
                fields: topLevelFields,
                populate: topLevelPopulate,
                filteredPopulates,
                annotatedFields
            } = buildFetchPlan(view, fetchSpecsMap, context, relationFilters);


            expect(topLevelFields).toEqual(["id", "title", "description", "image", "addedOn", "isPublic", "avgPastViewersCountPerText",
                "language.code",
                "addedBy.user.username",
                "texts.id", "texts.title", "texts.audio", "texts.image", "texts.orderInCollection", "texts.isLastInCollection", "texts.isProcessing", "texts.addedOn", "texts.isPublic", "texts.level", "texts.pastViewersCount", "texts.addedBy.user.username"
            ]);
            expect(topLevelPopulate).toEqual([
                "language",
                "addedBy",
                "addedBy.user",
                "texts",
                "texts.addedBy",
                "texts.addedBy.user",
            ]);
            expect(filteredPopulates).toEqual(expect.arrayEqualRegardlessOfOrder([]))
            expect(annotatedFields).toEqual(expect.arrayEqualRegardlessOfOrder([
                ...collectionAnnotateMocks.map(a => ({path: "", annotate: a})),
                ...textAnnotateMocks.map(a => ({path: "texts", annotate: a})),
            ]));
        });
    });
});
