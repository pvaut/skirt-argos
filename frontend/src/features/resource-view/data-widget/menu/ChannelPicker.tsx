import { useState } from "react";
import { TpColumnData, TpTableData } from "../../../../data/tables/interface";
import { isColumnCompatileWithChannel, TpVisualSetup } from "../../element-types/helpers/helpers";

import { TpDataWidgetChannelDef } from "../../element-types/interface"
import { ColumnPickerList } from "../create-widget/ColumnPickerList";

import styles from './Menu.module.scss';


interface TpProps {
    tableData: TpTableData;
    layerIdx: number | null;// not null in case of multi-layer widgets
    channelDef: TpDataWidgetChannelDef;
    visualSetup: TpVisualSetup;
    updateChannelBinding: (layerIdx: number | null, channelId: string, newBindingColId: string) => void;
}


export function ChannelPicker(props: TpProps) {
    const tableData = props.tableData;
    const visualSetup = props.visualSetup;
    const channelDef = props.channelDef;
    const [expanded, setExpanded] = useState(false);
    const [showChoices, setShowChoices] = useState(false);
    return (
        <div className={styles.channelPickWrapper}>
            <div
                className={showChoices ? styles.channelBindingNameOpened: styles.channelBindingName}
                onClick={() => {
                    if (!expanded) {
                        setExpanded(true);
                        setShowChoices(true);
                    } else {
                        setExpanded(false);
                        setTimeout(() => { setShowChoices(false) }, 200);
                    }
                }}
            >
                {visualSetup.channelEncodings[channelDef.id]?.name || "- Not set -"}
            </div>

            <div
                className={styles.channelPickList}
                style={{ maxHeight: expanded ? '300px' : '0px' }}
            >
                {showChoices && (
                    <>
                        {!channelDef.required && (
                            <div
                                style={{ paddingTop: '10px', cursor: 'pointer' }}
                                onClick={() => props.updateChannelBinding(props.layerIdx, channelDef.id, '')}
                            >
                                - Do not use -
                            </div>
                        )}
                        <ColumnPickerList
                            dataTable={tableData}
                            multiSelectedColumns={[]}
                            singleSelectedColumn={visualSetup.channelEncodings[channelDef.id]?.id || null}
                            isColumnCompatible={(colInfo: TpColumnData) => isColumnCompatileWithChannel(channelDef, colInfo)}
                            onClickColumn={(colId: string) => {
                                props.updateChannelBinding(props.layerIdx, channelDef.id, colId);
                            }}
                        />
                    </>
                )}
            </div>

        </div>
    )
}