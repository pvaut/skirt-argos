
import styles from './PromptImportResource.module.scss';
import { TpImportResourceContext } from "./interfaces";
import { TpConcept, TpResourceInfo } from "../../data/interfaces";


export const ID_NEW_CONCEPT = "__new_concept__";

interface TpProps {
    importResourceCtx: TpImportResourceContext;
    resourceDef: TpResourceInfo;
    compatibleExistingConcepts: TpConcept[];
    updateResourceDef: (newResourceDef: TpResourceInfo) => void;
    newConceptDef: TpConcept | null;
    updateNewConceptDef: (newConceptDef: TpConcept) => void;
}

export function StepDefineResourceInfo({
    importResourceCtx, resourceDef, compatibleExistingConcepts,
    updateResourceDef,
    newConceptDef, updateNewConceptDef,
}: TpProps) {

    function updateResource() { updateResourceDef(resourceDef) }
    function updateConcept() { updateNewConceptDef(newConceptDef!) }

    const conceptId = resourceDef.conceptId;

    const conceptPicker = (
        <div className={styles.listWrapper}>
            {compatibleExistingConcepts.map(concept => (
                <div
                    key={concept.id}
                    className={conceptId == concept.id ? styles.listItemSelected : styles.listItem}
                    onClick={() => { resourceDef.conceptId = concept.id; updateResource() }}
                >
                    {concept.name}
                </div>
            ))}
            <div
                className={conceptId == ID_NEW_CONCEPT ? styles.listItemSelected : styles.listItem}
                onClick={() => { resourceDef.conceptId = ID_NEW_CONCEPT; updateResource() }}
            >
                <i>{"< Create new concept >"}</i>
            </div>
        </div>
    );

    return (
        <div>
            <p>This wizard will guide you through the process of importing the selected source data file as a resource in Argos.</p>

            <div className={styles.formItemWrapper}>
                <div className={styles.sectionTitle}>Name</div>
                <div>
                    <input
                        value={resourceDef.name || ''}
                        onChange={(ev) => { resourceDef.name = ev.target.value; updateResource() }}
                    />
                </div>
            </div>

            <div className={styles.formItemWrapper}>
                <div className={styles.sectionTitle}>Description</div>
                <div>
                    <textarea
                        rows={2}
                        value={resourceDef.description || ""}
                        onChange={(ev) => { resourceDef.description = ev.target.value; updateResource() }}
                    />
                </div>
            </div>

            <div className={styles.formItemWrapper}>
                <div className={styles.sectionTitle}>Concept</div>
                <p>A Concept defines how source data files of a certain type, with a specified set of properties, are imported and visualized in Argos.</p>
                {(compatibleExistingConcepts.length > 0) && (<>
                    <p>Existing concept(s) compatible with the new data file:</p>

                    {conceptPicker}

                </>
                )}
                {(compatibleExistingConcepts.length == 0) && (
                    <p><i>There are no existing concepts found to be compatible with the structure of the selected new data file. The wizard will guide you through the creation of a new concept.</i></p>
                )}
            </div>

            {newConceptDef && (
                <>
                <div className={styles.formItemWrapper}>
                    <div className={styles.sectionTitle}>New concept name</div>
                    <div>
                        <input
                            value={newConceptDef.name || ''}
                            onChange={(ev) => { newConceptDef.name = ev.target.value; updateConcept() }}
                        />
                    </div>
                </div>
                <div className={styles.formItemWrapper}>
                    <div className={styles.sectionTitle}>New concept description</div>
                    <div>
                        <textarea
                        rows={2}
                            value={newConceptDef.description || ''}
                            onChange={(ev) => { newConceptDef.description = ev.target.value; updateConcept() }}
                        />
                    </div>
                </div>
                </>
            )}
        </div>
    )
}