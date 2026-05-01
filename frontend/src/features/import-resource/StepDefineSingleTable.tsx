
import styles from './PromptImportResource.module.scss';
import { TpConceptTableDefinition } from "../../data/interfaces";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { promptImportPropertyImportSettings } from "./prompt-property-import-settings/PrompPropertyImportSettings";
import { createInternalError } from "../../util/errors";
import { executeForm, TpFormExecutionContext } from "../../util/components/form/Form";
import { createFormString } from "../../util/components/form/formFieldTypes";
import { guid } from "../../util/misc";
import { TpDataSource } from "../../util/data-sources/file-parsers/interface";

const LABELPROP_ABSENT = "_none_";

interface TpProps {
    dataSource: TpDataSource;
    tableDef: TpConceptTableDefinition;
    updateTableDef: (tableDef: TpConceptTableDefinition) => void;
}

export function StepDefineSingleTable({ dataSource, tableDef, updateTableDef }: TpProps) {

    function editPropertyGroup(id: string) {
        const idx = tableDef.propertyGroups.findIndex(group => group.id == id)!;
        if (idx < 0) throw createInternalError(`Could not find property group ${id}`);

        const fieldGroupName = createFormString('groupName', 'Property group name', tableDef.propertyGroups[idx].name, 1);
        fieldGroupName.validator = (ctx: TpFormExecutionContext, value: any) => {
            if (!value) throw "Property name should not be empty";
        };
        executeForm({
            name: 'Edit property group',
            fields: [fieldGroupName],
            buttons: [],

        })
            .then((result) => {
                tableDef.propertyGroups[idx].name = (result as any).data.groupName;
                updateTableDef(tableDef);
            })
            .catch(() => { })
    }

    function promptAddPropertyGroup() {
        const fieldGroupName = createFormString('groupName', 'Property group name', '', 1);
        fieldGroupName.validator = (ctx: TpFormExecutionContext, value: any) => {
            if (!value) throw "Property name should not be empty";
        };
        executeForm({
            name: 'Create property group',
            fields: [fieldGroupName],
            buttons: [],

        })
            .then((result) => {
                const name = (result as any).data.groupName;
                tableDef.propertyGroups.push({
                    id: guid(),
                    name,
                });
                updateTableDef(tableDef);
            })
            .catch(() => { })
    }

    function deletePropertyGroup(id: string) {
        tableDef.propertyGroups = tableDef.propertyGroups.filter(group => group.id != id);
        for (const prop of tableDef.properties)
            if (prop.groupId == id)
                prop.groupId = null;
        updateTableDef(tableDef);
    }


    function deleteProperty(path: string) {
        tableDef.properties = tableDef.properties.filter(prop => prop.path != path);
        if (tableDef.labelColumnPath == path) tableDef.labelColumnPath = LABELPROP_ABSENT;
        updateTableDef(tableDef);
    }

    function editProperty(path: string) {
        const idx = tableDef.properties.findIndex(prop => prop.path == path)!;
        if (idx < 0) throw createInternalError(`Could not find property path ${path}`);
        promptImportPropertyImportSettings(dataSource, tableDef, tableDef.properties[idx]).then(({ prop }) => {
            tableDef.properties[idx] = prop;
            updateTableDef(tableDef);
        });
    }

    const propertyGroups = tableDef.propertyGroups.map(group => (
        <div
            key={group.id}
            className={styles.addedItemLine}
            onClick={() => editPropertyGroup(group.id)}
        >
            {group.name}
            <div
                className={styles.addedItemLineCloseButton}
                onClick={(ev) => { ev.stopPropagation(); deletePropertyGroup(group.id) }}
            >
                <FontAwesomeIcon icon="times" />
            </div>
        </div>
    ));

    const properties = tableDef.properties.map(prop => {
        return (
            <div
                key={prop.path}
                className={styles.addedItemLine}
                onClick={() => editProperty(prop.path)}
            >
                {prop.name}
                <div
                    className={styles.addedItemLineCloseButton}
                    onClick={(ev) => { ev.stopPropagation(); deleteProperty(prop.path) }}
                >
                    <FontAwesomeIcon icon="times" />
                </div>
            </div>
        );
    });

    return (
        <div>
            <div className={styles.sectionTitle}>Name</div>
            <input
                value={tableDef.namePlural}
                onChange={(ev) => {
                    tableDef.namePlural = ev.target.value;
                    updateTableDef(tableDef);
                }}
            />


            <div className={styles.sectionTitle}>Description</div>
            <textarea
                rows={2}
                value={tableDef.description}
                onChange={(ev) => {
                    tableDef.description = ev.target.value;
                    updateTableDef(tableDef);
                }}
            />


            <div className={styles.sectionTitle}>Property Groups</div>
            <p>Property groups are use to structure the set of properties in sections, making it easier to navigate them.</p>
            {propertyGroups}
            <button
                onClick={() => promptAddPropertyGroup()}
            >
                New property group...
            </button>
            <div className={styles.sectionTitle}>Properties</div>
            <div>Click on the <FontAwesomeIcon icon="plus" /> button of entries in the left tree to add them to the table</div>
            {properties}


            <div className={styles.sectionTitle}>Record labels</div>
            <p>Select the property to be used as a display label for records.</p>
            <select
                value={tableDef.labelColumnPath || LABELPROP_ABSENT}
                onChange={(ev) => {
                    let propId: string | null = ev.target.value;
                    if (propId == LABELPROP_ABSENT) propId = null;
                    tableDef.labelColumnPath = propId;
                    updateTableDef(tableDef);
                }}
            >
                <option key={LABELPROP_ABSENT} value={""}>
                    -- None --
                </option>
                {tableDef.properties.map(prop => (
                    <option key={prop.path} value={prop.path}>
                        {prop.name}
                    </option>
                ))}
            </select>

        </div>
    )
}