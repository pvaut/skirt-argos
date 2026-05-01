import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { getColorSchemaGray } from "../../util/color/appColorSchema";
import { changeOpacity, color2String } from "../../util/color/color";
import styles from './PromptImportResource.module.scss';
import InfoTooltip from "../../util/components/info-tooltip/InfoTooltip";
import { TpDtSrcAttribute, TpDtSrcData, TpDtSrcGroup, TpDtSrcShape } from "../../util/data-sources/file-parsers/interface";

function shapeToString(shape: TpDtSrcShape): string {
    return shape.map(number => String(number)).join(' x ');
}

function renderAttributes(attributes: TpDtSrcAttribute[]): any {
    if (attributes.length == 0) return "No attributes";
    return <>
        {attributes.map((attrib, idx) => (
            <div key={`attrib_${idx}`} style={{lineBreak: 'loose', paddingTop: '3px'}}>
                {attrib.name} <span className={styles.treeItemTechnicalData}>
                    {attrib.dataType} {shapeToString(attrib.shape)}
                </span> <span style={{color: 'var(--color-sp1)'}}>{String(attrib.value)}</span>
            </div>
        ))}
    </>
}

interface TpProps {
    rootGroup: TpDtSrcGroup;
    addableNodes: string[];
    addedNodes: string[];
    onAddNode: (path: string) => void;
}

export function DataSourcetree({ rootGroup, addableNodes, addedNodes, onAddNode }: TpProps) {

    const lineColor = color2String(changeOpacity(getColorSchemaGray(100), 0.5));

    function renderDataSourceData(data: TpDtSrcData) {
        return (
            <div
                key={data.path}
                className={addedNodes.includes(data.path) ? styles.sourceTreeLineAdded : styles.sourceTreeLine}
                style={{ position: "relative" }}>
                <div>
                    {addableNodes.includes(data.path) && !addedNodes.includes(data.path) && (
                        <button onClick={() => onAddNode(data.path)} style={{ boxSizing: "border-box", width: "30px" }}>
                            <FontAwesomeIcon icon="plus" />
                        </button>
                    )}
                    {addedNodes.includes(data.path) && (
                        <div style={{ display: "inline-block", boxSizing: "border-box", width: "30px", textAlign: "center", fontSize: '120%' }}><FontAwesomeIcon icon="circle-check" /></div>
                    )}
                    <div className={styles.treeItemIcon}><FontAwesomeIcon icon="hashtag" /></div>
                    {data.id}
                    <InfoTooltip>
                        <div style={{fontSize: '85%'}}>
                            <div className={styles.treeItemTechnicalData}>
                                <div>{data.path}</div>
                                <div>{data.dataType} {shapeToString(data.shape)}</div>
                            </div>
                            <div style={{ paddingTop: '10px' }}>{renderAttributes(data.attributes)}</div>
                        </div>
                    </InfoTooltip>
                </div>
                <div style={{ position: 'absolute', left: "-15px", top: "15px", width: '10px', height: "1px", backgroundColor: lineColor }} />
            </div>);
    }

    function renderDataSourceGroup(group: TpDtSrcGroup) {
        const renderedChildren: any[] = [];
        for (const childGroup of group.memberGroups)
            renderedChildren.push(renderDataSourceGroup(childGroup));
        for (const childData of group.memberData)
            renderedChildren.push(renderDataSourceData(childData));
        return (
            <div key={group.path} style={{ position: "relative" }}>
                <div className={addedNodes.includes(group.path) ? styles.sourceTreeLineAdded : styles.sourceTreeLine}>
                    <div className={styles.treeItemIcon}>
                        <FontAwesomeIcon icon="layer-group" />
                    </div>
                    {group.id}

                    <InfoTooltip>
                        <div style={{fontSize: '85%'}}>
                            <div style={{ paddingTop: '10px' }}>{renderAttributes(group.attributes)}</div>
                        </div>
                    </InfoTooltip>

                    {addableNodes.includes(group.path) && !addedNodes.includes(group.path) && (
                        <div><button onClick={() => onAddNode(group.path)}>
                            <FontAwesomeIcon icon="plus" />
                        </button></div>
                    )}
                    {addedNodes.includes(group.path) && (
                        <span>&nbsp;<FontAwesomeIcon icon="circle-check" /></span>
                    )}
                </div>
                {renderedChildren.length > 0 && (
                    <div>
                        <div style={{ display: 'inline-block', width: '30px' }}>
                        </div>
                        <div style={{ display: 'inline-block' }}>
                            <div style={{ display: 'inline-block', position: 'relative' }}>
                                {renderedChildren.slice(0, renderedChildren.length - 1)}
                                <div style={{ position: 'absolute', left: "-15px", top: 0, bottom: "-15px", width: '1px', backgroundColor: lineColor }} />
                            </div>
                            {renderedChildren[renderedChildren.length - 1]}
                        </div>
                    </div>
                )}
                <div style={{ position: 'absolute', left: "-15px", top: "15px", width: '10px', height: "1px", backgroundColor: lineColor }} />
            </div>);
    }

    return <div>{renderDataSourceGroup(rootGroup)}</div>
}