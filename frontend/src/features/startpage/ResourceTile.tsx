import { useNavigate } from "react-router-dom";
import { LOAD_STATUS, TpConcept, TpResourceInfo } from "../../data/interfaces";
import { useActiveResourcesStorage } from "../../data/usage/useActiveResourcesStorage";
import { useLocalResourcesStorage } from "../../data/usage/useLocalResourcesStorage";
import { useRef } from "react";
import { executeForm } from "../../util/components/form/Form";
import { createFormString } from "../../util/components/form/formFieldTypes";
import { locDb } from "../../data/local-database/localDatabase";
import { getConfirmation } from "../../util/components/simple-modals/ConfirmationPopup";
import { contextMenuSeparator, promptContextMenuItems } from "../../util/components/context-menu/ContextMenu";
import Loader from "../../util/components/loader/Loader";

import styles from './StartPage.module.scss';
import { CircularButton } from "../../util/components/buttons/circular-button/CircularButton";
import { ResourceThumbnail, setResourceThumbnail } from "./ResourceThumbnail";
import { highlightText, MarkdownWithHighlight } from "../../util/components/highlight-text/HighlightText";
import { messagePopup, showError } from "../../util/components/simple-modals/MessagePopup";
import ProgressBar from "../../util/components/loader/ProgressBar";


interface TpResourceTileProps {
    resource: TpResourceInfo;
    associatedConcept: TpConcept;
    searchText: string;
    editExistingLocalConcept: (referenceResourceUri: string) => void;
    exportConceptDef: (referenceResourceUri: string) => void;
}


export function ResourceTile({ resource, associatedConcept, searchText, editExistingLocalConcept, exportConceptDef }: TpResourceTileProps) {
    const navigate = useNavigate();

    const activeResourcesStorage = useActiveResourcesStorage();
    const localResourcesStorage = useLocalResourcesStorage();


    const refResourceContextMenuButton = useRef<HTMLDivElement>(null);
    const thumbnailInputRef = useRef<HTMLInputElement | null>(null);

    function editExistingResource() {
        executeForm({
            name: 'Edit resource',
            fields: [
                createFormString("name", "Name", resource.name, 1),
                createFormString("description", "Description", resource.description, 4),
            ],
            buttons: [],
        }).then((result: any) => {
            const updatedResource = structuredClone(resource);
            updatedResource.name = result.data.name;
            updatedResource.description = result.data.description;
            locDb.updateResource(updatedResource);
            localResourcesStorage.addResource(updatedResource);
        });
    }

    function openResource() {
        if (resource.status == LOAD_STATUS.LOADING_STATIC_DATA) {
            messagePopup({ title: "Resource is loading", description: "This resource is still loading. Please wait until loading is completed (this only needs to happen once)." });
            return;
        }
        activeResourcesStorage.addActiveResource(resource.uri, resource.name, resource.description, true);
        navigate(`/resource/${resource.uri}`);
    }

    function removeLocalResource() {
        getConfirmation({ title: "Confirmation", description: "Are you sure you want to permanently delete this locally stored resource?" }).then((accepted) => {
            if (!accepted) return;
            localResourcesStorage.deleteResource(resource.uri);
            locDb.removeResource(resource.uri);
        });
    }

    async function handleThumbnailFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        if (!file) return;
        const buffer = await file.arrayBuffer();
        setResourceThumbnail(resource.uri, buffer);
    }

    function promptResourceContextMenu(resourceUri: string) {
        promptContextMenuItems(refResourceContextMenuButton.current!, {
            items: [
                {
                    name: 'Edit resource',
                    description: 'Modify the resource name or description.',
                    action: () => { editExistingResource() }
                },
                {
                    name: 'Set thumbnail',
                    description: 'Upload a local image file to be used as resource thumbnail.',
                    action: () => { if (thumbnailInputRef.current) { thumbnailInputRef.current.click(); } }
                },
                {
                    name: 'Delete resource',
                    description: 'Permanently remove this resource from your local storage.',
                    action: () => { removeLocalResource() }
                },
                contextMenuSeparator,
                {
                    name: 'Edit concept definition',
                    description: `Edit the definition of the concept "${associatedConcept.name}", associated with this resource.`,
                    action: () => { editExistingLocalConcept(resourceUri) }
                },
                {
                    name: 'Export concept definition',
                    description: `Download the definition of the concept "${associatedConcept.name}" as a yaml file, which can be re-imported in Argos.`,
                    action: () => { exportConceptDef(resourceUri) }
                }
            ]
        })
    }

    const isLoading = resource.status == LOAD_STATUS.LOADING_STATIC_DATA;

    return (
        <div
            className={styles.linkTileWrapper}
            key={resource.uri}
            ref={refResourceContextMenuButton}
        >
            <div
                className={styles.linkTile}
                onClick={() => openResource()}
            >
                <ResourceThumbnail resource={resource} />

                <div className={styles.linkTileContent}>
                    <div className={styles.linkConceptName}>
                        {highlightText(associatedConcept.name, searchText)}
                    </div>
                    <div className={styles.linkResourceName}>
                        {highlightText(resource.name, searchText)}
                    </div>
                    <div className={styles.linkResourceDescr}>
                        <MarkdownWithHighlight
                            markdown={resource.description}
                            search={searchText}
                        />
                        {/* {highlightText(resource.description, searchText)} */}
                        {/* <SmartMarkdown >
                            {resource.description}
                        </SmartMarkdown> */}
                    </div>
                </div>
            </div>

            {!isLoading && (
                <div
                    className={styles.linkHoverButtonWrapper}
                >
                    <CircularButton
                        icon="bars"
                        stopPropagation={true}
                        onClick={() => { promptResourceContextMenu(resource.uri)/*removeLocalResource(resource.uri)*/ }}
                    />
                </div>
            )}
            {(isLoading) && (
                <div className={styles.loadingOverlay}>
                    <ProgressBar percentage={resource.downloadProgress} />
                    <Loader size={50} paddingTop={30} message="Fetching resource..." />
                </div>
            )}
            {/* this hidden input is used to prompt for the thumbnail file */}
            <input
                ref={thumbnailInputRef}
                type="file"
                accept=".jpg,.jpeg,.png"
                style={{ display: 'none' }}
                onChange={handleThumbnailFileSelect}
            />
        </div>

    );
}
