import { useEffect } from 'react';
import styles from './App.module.scss';
import { useAppAPIContext } from '../api/api';
import { Sidebar } from '../features/sidebar/Sidebar';
import { TpAppConfig } from '../data/interfaces';
import { Outlet } from 'react-router-dom';



// ====================== IMPORT ICONS ==================================

import { library } from "@fortawesome/fontawesome-svg-core";

import {
    faAnchorCircleXmark, faArrowDown, faBars, faCalculator, faCaretDown, faCaretLeft, faCaretRight,
    faCaretUp, faCheck, faChevronDown, faChevronLeft, faChevronRight, faChevronUp, faCircle, faCircleCheck, faCircleInfo, faInfo, faClipboard,
    faCoffee, faCompress, faCropSimple, faCross, faDesktop, faDisplay, faDownload, faDrawPolygon, faEllipsis,
    faEllipsisVertical, faExpand, faEye, faFileImport, faFilter, faFilterCircleXmark, faFloppyDisk, faGear, faHashtag, faHome,
    faLayerGroup,
    faLocationCrosshairs, faMagnifyingGlass, faMaximize, faObjectUngroup, faPaste, faPause, faPencil, faPenToSquare,
    faPlay, faPlus, faSpinner, faSquareBinary, faTimes, faTrash, faTrashCan, faUpload, faUser,
    faQuestion
} from "@fortawesome/free-solid-svg-icons";

import { faClipboard as farClipboard } from "@fortawesome/free-regular-svg-icons";

import Loader from '../util/components/loader/Loader';
import { selectConfig, _setConfig } from '../data/store/configSlice';
import { useDispatch } from 'react-redux';
import { useAppSelector } from '../util/hooks';
import { FormModal } from '../util/components/form/Form';
import { CreateWidgetModal } from '../features/resource-view/data-widget/create-widget/PromptCreateWidget';
import { ConfirmationPopup } from '../util/components/simple-modals/ConfirmationPopup';
import { MessagePopup } from '../util/components/simple-modals/MessagePopup';
import { PromptComputeDerivedPropertiesModal } from '../features/resource-view/compute-derived/PromptComputeDerivedProperties';
import { initComputationEnvironment } from '../util/table-computations/tableComputationExpression';

import { ConfigureLocalResourceModal } from '../features/import-resource/PromptImportResource';
import { initHDF5 } from '../util/data-sources/file-parsers/HDF5';
import { locDb, TpLocDBLoadInfo } from '../data/local-database/localDatabase';
import { loadLocalResources, loadLocalTemplates } from '../data/store/localResourcesSlice';
import { getTableConceptId } from '../data/helpers';
import { ConfigurePropertyImportSettingsModal } from '../features/import-resource/prompt-property-import-settings/PrompPropertyImportSettings';
import { ContextMenu } from '../util/components/context-menu/ContextMenu';
import { WaitPopup } from '../util/processWithWait';
import { ConfigureImportGlobalAttributeModal } from '../features/import-resource/prompt-globlal-attribute/PromptGlobalAttribute';
import { loadStaticData, TpLoadingContext } from './loadStaticResources';
import { useLocalResourcesStorage } from '../data/usage/useLocalResourcesStorage';
import { PromptDashboardActionsModal } from '../features/resource-view/dashboard-actions/DashboardActions';
import { DocViewer } from '../features/help/ShowHelp';
import { FilterEditorModal } from '../features/resource-view/filter-panel/FilterEditor';
import { RootErrorBoundary } from '../util/error-boundaries/RootErrorBoundary';


library.add(faCoffee, faHome, faUser, faCross, faTimes, faPlus, faSpinner, faArrowDown, faBars, faEllipsisVertical, faEllipsis,
    faMagnifyingGlass, faCropSimple, faLocationCrosshairs, faAnchorCircleXmark, faFilter, faFilterCircleXmark, faObjectUngroup, faDrawPolygon, faEye,
    faDesktop, faDisplay, faExpand, faMaximize, faCompress, faTrash, faTrashCan, faPenToSquare, faPencil,
    faChevronRight, faChevronLeft, faChevronDown, faChevronUp, faCaretLeft, faCaretRight, faCaretUp, faCaretDown,
    faFloppyDisk, faDownload, faUpload, faFileImport, faCalculator,
    faCircleCheck, faCheck, faCircle, faPause, faPlay, faClipboard, faPaste,
    faSquareBinary, faLayerGroup, faHashtag, faGear, faCircleInfo, faInfo, faQuestion,
    farClipboard,
);





function configAddConcepts(config: TpAppConfig, db: TpLocDBLoadInfo) {
    for (const concept of db.localConcepts) {
        config.ontology.concepts.push(concept);
        for (const tableConcept of concept.tableConcepts) {
            config.ontology.concepts.push({
                isLocal: true,
                isTable: true,
                id: getTableConceptId(concept.id, tableConcept.path),
                name: tableConcept.nameSingle,
                namePlural: tableConcept.namePlural,
                description: tableConcept.description,
                tableConcepts: [],
                globalAttributeDefs: [],
            })
        }
    }
}


export function initApp() {
    initComputationEnvironment();
    initHDF5();
}


async function loadAppData(ctx: TpLoadingContext) {
    const db = await locDb.read();
    ctx.theLocalDb = db;
    const localResources = loadLocalResources(db, ctx.dispatch);
    await loadStaticData(ctx, localResources);
    const config = await ctx.api.getConfig();
    configAddConcepts(config, db);
    setTimeout(() => {
        ctx.dispatch(_setConfig({ config }));
        loadLocalTemplates(db, ctx.dispatch);
    }, 250);
}


// ====================== THE ONE AND ONLY APP ==================================

function App() {

    const api = useAppAPIContext();
    const dispatch = useDispatch();
    const localResourcesStorage = useLocalResourcesStorage();

    const theConfig = useAppSelector(selectConfig).theConfig;

    function setDownloadProgress(uri: string, progress: number) {
        localResourcesStorage.setDownloadProgress(uri, progress);
    }

    useEffect(() => {
        loadAppData({ api, dispatch, theLocalDb: null, setDownloadProgress });
    }, []);

    if (!theConfig)
        return (
            <div className={styles.App}>
                <div style={{ textAlign: 'center', paddingTop: '50px' }}>
                    <Loader message='Loading...' />
                </div>
            </div>
        );

    return (
        <div className={styles.App}>
            <RootErrorBoundary>
                <div className={styles.AppBody}>
                    <Outlet />
                </div>
                <Sidebar />
                <div id="modalPopupElem" style={{ position: 'absolute', top: 0, left: 0 }}></div>
                <ConfigureLocalResourceModal />
                <ConfigurePropertyImportSettingsModal />
                <ConfigureImportGlobalAttributeModal />
                <CreateWidgetModal />
                <PromptComputeDerivedPropertiesModal />
                <PromptDashboardActionsModal />
                <FilterEditorModal />
                <FormModal />
                <DocViewer />
                <ConfirmationPopup />
                <MessagePopup />
                <ContextMenu />
                <WaitPopup />

                <div id="contextMenuElem" style={{ position: 'absolute', top: 0, left: 0, zIndex: 999 }}></div>
                <div id="tooltipElem" style={{ position: 'absolute', top: 0, left: 0, zIndex: 999 }}></div>

            </RootErrorBoundary>
        </div>
    );
}

export default App;
