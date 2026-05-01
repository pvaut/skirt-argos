
import styles from './PromptImportResource.module.scss';
import { TpConcept } from "../../data/interfaces";



interface TpProps {
    conceptDef: TpConcept;
    updateConceptDef: (newConceptDef: TpConcept) => void;
}

export function StepIntroUpdateExistingConcept({ conceptDef, updateConceptDef }: TpProps) {

    function updateConcept() { updateConceptDef(conceptDef!) }


    return (
        <div>
            <div>
                <p>This wizard will update the data configuration of the existing concept "{conceptDef?.name}", using the selected resource as a reference.</p>
                <p><b>WARNING: upon completion, you will need to reload the app in order to update resources that have already been opened.</b></p>
            </div>

            <div className={styles.formItemWrapper}>
                <div className={styles.sectionTitle}>Concept Name</div>
                <div>
                    <input
                        value={conceptDef?.name || ''}
                        onChange={(ev) => { conceptDef.name = ev.target.value; updateConcept() }}
                    />
                </div>
            </div>

            <div className={styles.formItemWrapper}>
                <div className={styles.sectionTitle}>Concept Description</div>
                <div>
                    <input
                        value={conceptDef?.description || ''}
                        onChange={(ev) => {
                            if (conceptDef) {
                                conceptDef.description = ev.target.value; updateConcept();
                            }
                        }}
                    />
                </div>
            </div>


        </div>
    )
}