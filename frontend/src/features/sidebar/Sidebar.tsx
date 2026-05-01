
import { useLocation, useNavigate } from 'react-router-dom';
import styles from './Sidebar.module.scss';
import { TpResourceInfo } from '../../data/interfaces';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { getConceptName, getTableUri, useConfig } from '../../data/helpers';
import { useActiveResourcesStorage } from '../../data/usage/useActiveResourcesStorage';
import { removeResourceElemTrState } from '../../data/elemTrState';
import { TpTableStorage, useTablesStorage } from '../../data/usage/useTablesStorage';
import { showHelp } from '../help/ShowHelp';


function removeResourceDataTables(tablesStorage: TpTableStorage, resourceInfo: TpResourceInfo) {
    for (const table of resourceInfo.tables) {
        const tableData = tablesStorage.removeTableData(getTableUri(resourceInfo.uri, table.id));
    }
}


export function Sidebar() {

    const activeResourcesStorage = useActiveResourcesStorage();
    const navigate = useNavigate();
    const location = useLocation();
    const config = useConfig();
    const tablesStorage = useTablesStorage();

    const atStartPage = (location.pathname == '/');
    const resourceIsActive = (resource: TpResourceInfo) => (location.pathname == `/resource/${resource.uri}`);

    function closeResource(resource: TpResourceInfo) {
        if (resourceIsActive(resource)) {
            navigate('/');
        }
        setTimeout(() => {
            removeResourceElemTrState(resource.uri);
            removeResourceDataTables(tablesStorage, resource);
            activeResourcesStorage.closeActiveResource(resource.uri);
        }, 350);
    }

    return (
        <div className={styles.sidebar}>
            <div >
                <img src="/logo512.png" style={{ width: '140px', marginLeft: '20px', marginTop: '20px', opacity: 1 }} id="logo" />
            </div>

            <div style={{ height: "1px", borderBottom: "1px solid rgba(255,255,255,0.5)", margin: "20px 20px" }} />

            <div
                key="startpage"
                className={atStartPage ? styles.tabActive : styles.tab}
                onClick={() => {
                    navigate('/')
                }}
            >
                Start page
                {atStartPage && (<div className={styles.tabHighlight} />)}
            </div>

            {activeResourcesStorage.getActiveResourcesList().map(resource => (
                <div
                    key={resource.uri}
                    className={resourceIsActive(resource) ? styles.tabActive : styles.tab}
                    onClick={() => {
                        navigate(`/resource/${resource.uri}`)
                    }}
                >


                    <div className={styles.conceptName}>
                        {getConceptName(config, resource.conceptId)}
                    </div>


                    <div className={styles.title}>{resource.name}</div>

                    {resourceIsActive(resource) && (<div className={styles.tabHighlight} />)}

                    {(
                        <div
                            className={styles.closeButton}
                            onClick={(ev) => {
                                ev.stopPropagation();
                                closeResource(resource)
                            }}
                        >
                            <FontAwesomeIcon icon="times" />
                        </div>
                    )}

                </div>
            ))}

            <div style={{textAlign: 'right'}}>
                <div onClick={() => showHelp(null)} className={styles.helpButton}>
                    <FontAwesomeIcon icon="question" />
                </div>
            </div>

        </div>
    );
}