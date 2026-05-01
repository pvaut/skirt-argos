
import styles from './PromptImportResource.module.scss';
import { TpImportResourceContext } from "./interfaces";
import { TpConcept, TpConceptGlobalAttributeDef, TpResourceInfo } from "../../data/interfaces";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { promptGlobalAttributeSettings } from "./prompt-globlal-attribute/PromptGlobalAttribute";
import { createInternalError } from "../../util/errors";


interface TpProps {
    importResourceCtx: TpImportResourceContext;
    newConceptDef: TpConcept;
    updateNewConceptDef: (newConceptDef: TpConcept) => void;
}

export function StepDefineAttribs({
    importResourceCtx, newConceptDef, updateNewConceptDef,
}: TpProps) {

    function deleteAttrib(identifier: string) {
        newConceptDef!.globalAttributeDefs = newConceptDef.globalAttributeDefs.filter(attrib => attrib.identifier != identifier);
        updateNewConceptDef(newConceptDef!)
    }

    function promptAddAttrib() {
        const newAttrib: TpConceptGlobalAttributeDef = {
            identifier: '',
            expression: '',
        }
        promptGlobalAttributeSettings(importResourceCtx.dataSource, newConceptDef, newAttrib).then(({ attrib }) => {
            newConceptDef.globalAttributeDefs.push(attrib);
            updateNewConceptDef(newConceptDef);
        })
    }

    function editAttribute(identifier: string) {
        const idx = newConceptDef.globalAttributeDefs.findIndex(attrib => attrib.identifier == identifier)!;
        if (idx < 0) throw createInternalError(`Could not find attrib ${identifier}`);

        promptGlobalAttributeSettings(importResourceCtx.dataSource, newConceptDef, newConceptDef.globalAttributeDefs[idx]).then(({ attrib }) => {
            newConceptDef.globalAttributeDefs[idx] = attrib;
            updateNewConceptDef(newConceptDef);
        })

    }

    return (
        <div>
            <div style={{paddingBottom:'10px'}}>Resource attributes are computed from the data, and can be used downstream when configuring a dashboard.
                For example in the expression of a derived property, or in displayed text.
            </div>
            {newConceptDef?.globalAttributeDefs.map(attrib => (
                <div
                    key={attrib.identifier}
                    className={styles.addedItemLine}
                    onClick={() => editAttribute(attrib.identifier)}

                >
                    {attrib.identifier}
                    <div
                        className={styles.addedItemLineCloseButton}
                        onClick={(ev) => { ev.stopPropagation(); deleteAttrib(attrib.identifier) }}
                    >
                        <FontAwesomeIcon icon="times" />
                    </div>
                </div>
            ))}

            <button
                onClick={() => promptAddAttrib()}
            >
                New attribute...
            </button>

        </div>
    )
}