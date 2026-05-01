import styles from './PromptImportResource.module.scss';
import { TpImportResourceContext } from "./interfaces";
import { TpConcept } from "../../data/interfaces";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";


interface TpProps {
    importResourceCtx: TpImportResourceContext;
    newConceptDef: TpConcept | null;
    updateNewConceptDef: (newConceptDef: TpConcept) => void;
}

export function StepDefineTables({
    newConceptDef, updateNewConceptDef,
}: TpProps) {

    function deleteTable(path: string) {
        newConceptDef!.tableConcepts = newConceptDef!.tableConcepts.filter(table => table.path != path);
        updateNewConceptDef(newConceptDef!)
    }

    return (
        <div>
            <div>Add tables to this concept by clicking the <FontAwesomeIcon icon="plus" /> button on items in the left tree.</div>
            {newConceptDef?.tableConcepts.map(table => (
                <div key={table.path} className={styles.addedItemLine}>
                    {table.path}
                    <div
                        className={styles.addedItemLineCloseButton}
                        onClick={(ev) => { ev.stopPropagation(); deleteTable(table.path) }}
                    >
                        <FontAwesomeIcon icon="times" />
                    </div>
                </div>
            ))}
        </div>
    )
}