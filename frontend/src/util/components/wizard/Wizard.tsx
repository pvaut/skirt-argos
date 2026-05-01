import styles from './Wizard.module.scss';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";


export interface TpWizardDef {
    steps: {
        id: string;
        name: string;
    }[];
    finishButtonText: string;
}


interface TpProps {
    wizardDef: TpWizardDef;
    children: React.ReactNode;
    currentStepNr: number;
    onStepChange: (newStepNr: number) => void;
}


export function Wizard({ wizardDef, currentStepNr, onStepChange, children }: TpProps) {
    return (
        <div className={styles.stepWrapper}>
            <div className={styles.stepHeader}>
                <div className={styles.stepTitle}>
                    {wizardDef.steps[currentStepNr].name}
                </div>
            </div>
            <div className={styles.stepBody}>
                {children}
            </div>
            <div className={styles.stepFooter}>

                {currentStepNr > 0 && (
                    <div
                        className={styles.wizardButton}
                        onClick={() => { onStepChange(currentStepNr - 1) }}
                    >
                        <>
                            <div className={styles.wizardButtonIcon}>
                                <FontAwesomeIcon icon="chevron-left" />
                            </div>
                            <div className={styles.wizardButtonText}>
                                <div className={styles.wizardButtonDirHint}>Previous</div>
                                {wizardDef.steps[currentStepNr - 1].name}
                            </div>
                        </>
                    </div>
                )}

                <div
                    className={styles.wizardButton}
                    onClick={() => { onStepChange(currentStepNr + 1) }}
                >
                    {currentStepNr < wizardDef.steps.length - 1 && (
                        <>
                            <div className={styles.wizardButtonText}>
                                <div className={styles.wizardButtonDirHint}>Next</div>
                                {wizardDef.steps[currentStepNr + 1].name}
                            </div>
                            <div className={styles.wizardButtonIcon}>
                                <FontAwesomeIcon icon="chevron-right" />
                            </div>
                        </>
                    )}
                    {currentStepNr == wizardDef.steps.length - 1 && (
                        <>
                            <div className={styles.wizardButtonText}>
                                <div className={styles.wizardButtonDirHint}>Finish</div>
                                {wizardDef.finishButtonText}
                            </div>
                            <div className={styles.wizardButtonIcon}>
                                <FontAwesomeIcon icon="check" />
                            </div>
                        </>
                    )}
                </div>

            </div>
        </div>
    );
}
